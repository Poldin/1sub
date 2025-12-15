/**
 * Database Integrity Tests
 *
 * Tests to ensure database consistency, constraints, and triggers work correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTestSupabase,
  createTestUserWithBalance,
  cleanupTestUser,
  getBalance,
  addTestCredits,
} from '../../helpers/db-helpers';

describe('Database Integrity', () => {
  let testUserId: string;
  const supabase = getTestSupabase();

  beforeEach(async () => {
    const user = await createTestUserWithBalance(100);
    testUserId = user.id;
  });

  afterEach(async () => {
    if (testUserId) {
      await cleanupTestUser(testUserId);
    }
  });

  describe('Balance Consistency', () => {
    it('should match balance in user_balances with sum of transactions', async () => {
      // Add some transactions
      await addTestCredits(testUserId, 50);

      // Get balance from user_balances table
      const storedBalance = await getBalance(testUserId);

      // Calculate balance from transactions
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('credits_amount, type')
        .eq('user_id', testUserId);

      const calculatedBalance = transactions!.reduce((sum, txn) => {
        return sum + (txn.type === 'add' ? txn.credits_amount : -txn.credits_amount);
      }, 0);

      expect(storedBalance).toBe(calculatedBalance);
    });

    it('should auto-update balance via trigger', async () => {
      const initialBalance = await getBalance(testUserId);

      // Insert transaction directly
      await supabase.from('credit_transactions').insert({
        user_id: testUserId,
        credits_amount: 25,
        type: 'add',
        reason: 'Trigger test',
      });

      // Wait a moment for trigger to execute
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Balance should be updated automatically
      const newBalance = await getBalance(testUserId);
      expect(newBalance).toBe(initialBalance + 25);
    });

    it('should handle concurrent transactions correctly', async () => {
      const initialBalance = await getBalance(testUserId);

      // Create multiple concurrent transactions
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          supabase.from('credit_transactions').insert({
            user_id: testUserId,
            credits_amount: 5,
            type: 'add',
            reason: `Concurrent test ${i}`,
          })
        );
      }

      await Promise.all(promises);

      // Wait for triggers to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Final balance should be exactly initial + 50
      const finalBalance = await getBalance(testUserId);
      expect(finalBalance).toBe(initialBalance + 50);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should prevent orphaned credit transactions', async () => {
      // Try to create transaction for non-existent user
      const { error } = await supabase.from('credit_transactions').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        credits_amount: 10,
        type: 'add',
        reason: 'Test',
      });

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23503'); // Foreign key violation
    });
  });

  describe('Check Constraints', () => {
    it('should prevent negative balance', async () => {
      // Try to set negative balance
      const { error } = await supabase
        .from('user_balances')
        .update({ balance: -10 })
        .eq('user_id', testUserId);

      expect(error).toBeTruthy();
      expect(error?.message).toContain('check');
    });
  });

  describe('Idempotency', () => {
    it('should enforce unique idempotency keys', async () => {
      const idempotencyKey = `test-key-${Date.now()}`;

      // First insert
      const { error: error1 } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: testUserId,
          credits_amount: 10,
          type: 'add',
          reason: 'Test',
          idempotency_key: idempotencyKey,
        });

      expect(error1).toBeNull();

      // Second insert with same key
      const { error: error2 } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: testUserId,
          credits_amount: 10,
          type: 'add',
          reason: 'Test',
          idempotency_key: idempotencyKey,
        });

      expect(error2).toBeTruthy();
      expect(error2?.code).toBe('23505'); // Unique violation
    });
  });
});
