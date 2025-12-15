/**
 * Credit Management API Integration Tests
 *
 * Tests the credit add and consume endpoints with real database interactions.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, cleanupTestUser, getBalance, getTestSupabase } from '../../helpers/db-helpers';

describe('Credit Management API', () => {
  let testUserId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    const testUser = await createTestUser();
    testUserId = testUser.userId;
    testUserEmail = testUser.email;
  });

  afterAll(async () => {
    await cleanupTestUser(testUserId);
  });

  describe('POST /api/credits/add', () => {
    it('should add credits successfully with valid parameters', async () => {
      const supabase = getTestSupabase();

      // Add 50 credits
      const { data, error } = await supabase.rpc('add_user_credits', {
        p_user_id: testUserId,
        p_amount: 50,
        p_description: 'Test credit addition',
        p_idempotency_key: `test-${Date.now()}-1`,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Verify balance updated
      const balance = await getBalance(testUserId);
      expect(balance).toBeGreaterThanOrEqual(50);
    });

    it('should enforce idempotency - duplicate requests should not double-add', async () => {
      const supabase = getTestSupabase();
      const idempotencyKey = `test-${Date.now()}-2`;
      const initialBalance = await getBalance(testUserId);

      // First request
      await supabase.rpc('add_user_credits', {
        p_user_id: testUserId,
        p_amount: 25,
        p_description: 'Idempotency test',
        p_idempotency_key: idempotencyKey,
      });

      const balanceAfterFirst = await getBalance(testUserId);
      expect(balanceAfterFirst).toBe(initialBalance + 25);

      // Duplicate request with same idempotency key
      await supabase.rpc('add_user_credits', {
        p_user_id: testUserId,
        p_amount: 25,
        p_description: 'Idempotency test duplicate',
        p_idempotency_key: idempotencyKey,
      });

      const balanceAfterDuplicate = await getBalance(testUserId);
      // Balance should NOT increase again
      expect(balanceAfterDuplicate).toBe(balanceAfterFirst);
    });

    it('should reject negative credit amounts', async () => {
      const supabase = getTestSupabase();

      const { error } = await supabase.rpc('add_user_credits', {
        p_user_id: testUserId,
        p_amount: -10,
        p_description: 'Negative amount test',
        p_idempotency_key: `test-${Date.now()}-3`,
      });

      // Should fail - check constraint prevents negative amounts
      expect(error).not.toBeNull();
    });

    it('should reject invalid user_id', async () => {
      const supabase = getTestSupabase();

      const { error } = await supabase.rpc('add_user_credits', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 10,
        p_description: 'Invalid user test',
        p_idempotency_key: `test-${Date.now()}-4`,
      });

      expect(error).not.toBeNull();
    });
  });

  describe('Credit Consumption', () => {
    it('should consume credits successfully when sufficient balance', async () => {
      const supabase = getTestSupabase();

      // First add credits
      await supabase.rpc('add_user_credits', {
        p_user_id: testUserId,
        p_amount: 100,
        p_description: 'Setup for consumption test',
        p_idempotency_key: `test-${Date.now()}-5`,
      });

      const initialBalance = await getBalance(testUserId);

      // Consume credits
      const { data, error } = await supabase.rpc('consume_user_credits', {
        p_user_id: testUserId,
        p_amount: 10,
        p_description: 'Test consumption',
        p_tool_id: null,
        p_idempotency_key: `test-${Date.now()}-6`,
      });

      expect(error).toBeNull();
      expect(data).toBe(true);

      const finalBalance = await getBalance(testUserId);
      expect(finalBalance).toBe(initialBalance - 10);
    });

    it('should fail to consume credits with insufficient balance', async () => {
      const supabase = getTestSupabase();
      const currentBalance = await getBalance(testUserId);

      // Try to consume more than available
      const { data, error } = await supabase.rpc('consume_user_credits', {
        p_user_id: testUserId,
        p_amount: currentBalance + 1000,
        p_description: 'Insufficient balance test',
        p_tool_id: null,
        p_idempotency_key: `test-${Date.now()}-7`,
      });

      // Should fail
      expect(data).toBe(false);
    });

    it('should enforce idempotency for consumption', async () => {
      const supabase = getTestSupabase();
      const idempotencyKey = `test-${Date.now()}-8`;

      // Add credits first
      await supabase.rpc('add_user_credits', {
        p_user_id: testUserId,
        p_amount: 50,
        p_description: 'Setup for idempotency test',
        p_idempotency_key: `test-${Date.now()}-9`,
      });

      const initialBalance = await getBalance(testUserId);

      // First consumption
      await supabase.rpc('consume_user_credits', {
        p_user_id: testUserId,
        p_amount: 5,
        p_description: 'Idempotency consumption test',
        p_tool_id: null,
        p_idempotency_key: idempotencyKey,
      });

      const balanceAfterFirst = await getBalance(testUserId);
      expect(balanceAfterFirst).toBe(initialBalance - 5);

      // Duplicate consumption with same idempotency key
      await supabase.rpc('consume_user_credits', {
        p_user_id: testUserId,
        p_amount: 5,
        p_description: 'Duplicate consumption',
        p_tool_id: null,
        p_idempotency_key: idempotencyKey,
      });

      const balanceAfterDuplicate = await getBalance(testUserId);
      // Balance should NOT decrease again
      expect(balanceAfterDuplicate).toBe(balanceAfterFirst);
    });
  });

  describe('Concurrent Credit Operations', () => {
    it('should handle concurrent additions correctly', async () => {
      const supabase = getTestSupabase();
      const initialBalance = await getBalance(testUserId);

      // Simulate concurrent additions
      const promises = Array.from({ length: 5 }, (_, i) =>
        supabase.rpc('add_user_credits', {
          p_user_id: testUserId,
          p_amount: 10,
          p_description: `Concurrent add ${i}`,
          p_idempotency_key: `test-concurrent-${Date.now()}-${i}`,
        })
      );

      await Promise.all(promises);

      const finalBalance = await getBalance(testUserId);
      expect(finalBalance).toBe(initialBalance + 50);
    });

    it('should handle mixed concurrent operations (add + consume)', async () => {
      const supabase = getTestSupabase();

      // Add initial balance
      await supabase.rpc('add_user_credits', {
        p_user_id: testUserId,
        p_amount: 100,
        p_description: 'Setup for concurrent test',
        p_idempotency_key: `test-${Date.now()}-10`,
      });

      const initialBalance = await getBalance(testUserId);

      // Run concurrent operations
      const timestamp = Date.now();
      const operations = [
        supabase.rpc('add_user_credits', {
          p_user_id: testUserId,
          p_amount: 20,
          p_description: 'Concurrent add',
          p_idempotency_key: `test-concurrent-add-${timestamp}`,
        }),
        supabase.rpc('consume_user_credits', {
          p_user_id: testUserId,
          p_amount: 10,
          p_description: 'Concurrent consume',
          p_tool_id: null,
          p_idempotency_key: `test-concurrent-consume-${timestamp}`,
        }),
      ];

      await Promise.all(operations);

      const finalBalance = await getBalance(testUserId);
      // +20 -10 = +10 net
      expect(finalBalance).toBe(initialBalance + 10);
    });
  });

  describe('Transaction History', () => {
    it('should record all credit transactions', async () => {
      const supabase = getTestSupabase();

      // Perform some transactions
      await supabase.rpc('add_user_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_description: 'Transaction history test',
        p_idempotency_key: `test-${Date.now()}-11`,
      });

      // Query transaction history
      const { data: transactions, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .order('created_at', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      expect(transactions).toBeDefined();
      expect(transactions!.length).toBeGreaterThan(0);

      // Verify transaction structure
      const latestTransaction = transactions![0];
      expect(latestTransaction).toHaveProperty('id');
      expect(latestTransaction).toHaveProperty('user_id');
      expect(latestTransaction).toHaveProperty('amount');
      expect(latestTransaction).toHaveProperty('type');
      expect(latestTransaction).toHaveProperty('description');
      expect(latestTransaction).toHaveProperty('created_at');
    });
  });
});
