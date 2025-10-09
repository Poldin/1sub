import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

describe('Concurrent Operations and Race Conditions', () => {
  let testUsers: string[] = [];
  let testToolId: string;

  beforeEach(async () => {
    // Create multiple test users
    for (let i = 0; i < 5; i++) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: `concurrent-user-${i}-${Date.now()}@example.com`,
        password: 'password123',
        email_confirm: true,
      });

      expect(authError).toBeNull();
      testUsers.push(authUser.user!.id);

      await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.user!.id,
          email: authUser.user!.email!,
          full_name: `Concurrent User ${i}`,
          role: 'user',
        });
    }

    // Create test tool
    const { data: tool, error: toolError } = await supabaseAdmin
      .from('tools')
      .insert({
        name: `Concurrent Test Tool ${Date.now()}`,
        description: 'Test tool for concurrent operations',
        url: 'https://example.com/concurrent-test',
        credit_cost_per_use: 10,
        is_active: true,
      })
      .select()
      .single();

    if (toolError || !tool) {
      throw new Error(`Failed to create test tool: ${toolError?.message}`);
    }

    testToolId = tool.id;
  });

  afterEach(async () => {
    // Cleanup test users
    for (const userId of testUsers) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
    testUsers = [];

    // Cleanup test tool
    if (testToolId) {
      await supabaseAdmin.from('tools').delete().eq('id', testToolId);
    }
  });

  describe('Concurrent Credit Consumption', () => {
    it('should handle multiple users consuming credits simultaneously', async () => {
      // Grant credits to all users
      const grantPromises = testUsers.map(userId =>
        supabaseAdmin.rpc('increment_balance', {
          p_user_id: userId,
          p_amount: 100,
          p_reason: 'Concurrent test grant',
        })
      );

      await Promise.all(grantPromises);

      // All users try to consume credits simultaneously
      const consumePromises = testUsers.map((userId, index) =>
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 10,
          p_tool_id: testToolId,
          p_idempotency_key: `concurrent-${userId}-${index}`,
        })
      );

      const results = await Promise.all(consumePromises);

      // All should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
        expect(result.data.status).toBe('success');
      });

      // Verify all balances were updated correctly
      const balancePromises = testUsers.map(userId =>
        supabaseAdmin
          .from('credit_balances')
          .select('balance')
          .eq('user_id', userId)
          .single()
      );

      const balances = await Promise.all(balancePromises);
      balances.forEach(balance => {
        expect(balance.error).toBeNull();
        expect(balance.data.balance).toBe(90); // 100 - 10
      });
    });

    it('should handle race conditions in credit consumption', async () => {
      const userId = testUsers[0];

      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: userId,
        p_amount: 15,
        p_reason: 'Race condition test',
      });

      // Try to consume more credits than available simultaneously
      const consumePromises = [
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 10,
          p_tool_id: testToolId,
          p_idempotency_key: `race-1-${Date.now()}`,
        }),
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 10,
          p_tool_id: testToolId,
          p_idempotency_key: `race-2-${Date.now()}`,
        }),
      ];

      const results = await Promise.all(consumePromises);

      // One should succeed, one should fail due to insufficient credits
      const successCount = results.filter(r => r.data.status === 'success').length;
      const failureCount = results.filter(r => r.data.status === 'insufficient_credits').length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Verify final balance
      const { data: finalBalance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();

      expect(finalBalance.balance).toBe(5); // 15 - 10
    });

    it('should maintain transaction isolation', async () => {
      const userId1 = testUsers[0];
      const userId2 = testUsers[1];

      // Grant credits to both users
      await Promise.all([
        supabaseAdmin.rpc('increment_balance', {
          p_user_id: userId1,
          p_amount: 50,
          p_reason: 'Isolation test',
        }),
        supabaseAdmin.rpc('increment_balance', {
          p_user_id: userId2,
          p_amount: 50,
          p_reason: 'Isolation test',
        }),
      ]);

      // Start transactions simultaneously
      const transactionPromises = [
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId1,
          p_amount: 20,
          p_tool_id: testToolId,
          p_idempotency_key: `isolation-1-${Date.now()}`,
        }),
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId2,
          p_amount: 20,
          p_tool_id: testToolId,
          p_idempotency_key: `isolation-2-${Date.now()}`,
        }),
      ];

      const results = await Promise.all(transactionPromises);

      // Both should succeed independently
      results.forEach(result => {
        expect(result.error).toBeNull();
        expect(result.data.status).toBe('success');
      });

      // Verify both balances are correct
      const balancePromises = [
        supabaseAdmin.from('credit_balances').select('balance').eq('user_id', userId1).single(),
        supabaseAdmin.from('credit_balances').select('balance').eq('user_id', userId2).single(),
      ];

      const balances = await Promise.all(balancePromises);
      balances.forEach(balance => {
        expect(balance.error).toBeNull();
        expect(balance.data.balance).toBe(30); // 50 - 20
      });
    });
  });

  describe('Idempotency Key Effectiveness', () => {
    it('should prevent duplicate operations with same idempotency key', async () => {
      const userId = testUsers[0];
      const idempotencyKey = `idempotent-${Date.now()}`;

      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: userId,
        p_amount: 100,
        p_reason: 'Idempotency test',
      });

      // Make multiple requests with same idempotency key
      const requests = [
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 10,
          p_tool_id: testToolId,
          p_idempotency_key: idempotencyKey,
        }),
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 10,
          p_tool_id: testToolId,
          p_idempotency_key: idempotencyKey,
        }),
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 10,
          p_tool_id: testToolId,
          p_idempotency_key: idempotencyKey,
        }),
      ];

      const results = await Promise.all(requests);

      // First should succeed, others should be duplicates
      const successCount = results.filter(r => r.data.status === 'success').length;
      const duplicateCount = results.filter(r => r.data.status === 'duplicate').length;

      expect(successCount).toBe(1);
      expect(duplicateCount).toBe(2);

      // Verify only one transaction was created
      const { data: transactions } = await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('idempotency_key', idempotencyKey);

      expect(transactions).toHaveLength(1);
    });

    it('should allow different operations with same idempotency key', async () => {
      const userId = testUsers[0];
      const idempotencyKey = `different-ops-${Date.now()}`;

      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: userId,
        p_amount: 100,
        p_reason: 'Different ops test',
      });

      // First operation: consume credits
      const consumeResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: userId,
        p_amount: 10,
        p_tool_id: testToolId,
        p_idempotency_key: idempotencyKey,
      });

      expect(consumeResult.error).toBeNull();
      expect(consumeResult.data.status).toBe('success');

      // Second operation: grant credits (different operation type)
      const grantResult = await supabaseAdmin.rpc('increment_balance', {
        p_user_id: userId,
        p_amount: 20,
        p_reason: 'Different operation',
      });

      expect(grantResult.error).toBeNull();

      // Both operations should succeed
      const { data: finalBalance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();

      expect(finalBalance.balance).toBe(110); // 100 - 10 + 20
    });
  });

  describe('Concurrent Balance Updates', () => {
    it('should handle concurrent balance increments', async () => {
      const userId = testUsers[0];

      // Multiple concurrent balance increments
      const incrementPromises = Array.from({ length: 10 }, (_, i) =>
        supabaseAdmin.rpc('increment_balance', {
          p_user_id: userId,
          p_amount: 5,
          p_reason: `Concurrent increment ${i}`,
        })
      );

      const results = await Promise.all(incrementPromises);

      // All should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
      });

      // Verify final balance
      const { data: finalBalance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();

      expect(finalBalance.balance).toBe(50); // 10 * 5
    });

    it('should handle mixed concurrent operations', async () => {
      const userId = testUsers[0];

      // Grant initial credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: userId,
        p_amount: 100,
        p_reason: 'Initial grant',
      });

      // Mix of increment and consume operations
      const operations = [
        supabaseAdmin.rpc('increment_balance', {
          p_user_id: userId,
          p_amount: 10,
          p_reason: 'Concurrent increment 1',
        }),
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 15,
          p_tool_id: testToolId,
          p_idempotency_key: `mixed-1-${Date.now()}`,
        }),
        supabaseAdmin.rpc('increment_balance', {
          p_user_id: userId,
          p_amount: 5,
          p_reason: 'Concurrent increment 2',
        }),
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 20,
          p_tool_id: testToolId,
          p_idempotency_key: `mixed-2-${Date.now()}`,
        }),
      ];

      const results = await Promise.all(operations);

      // All should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
      });

      // Verify final balance
      const { data: finalBalance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();

      expect(finalBalance.balance).toBe(80); // 100 + 10 - 15 + 5 - 20
    });
  });

  describe('Database Lock Contention', () => {
    it('should handle high-frequency operations without deadlocks', async () => {
      const userId = testUsers[0];

      // Grant initial credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: userId,
        p_amount: 1000,
        p_reason: 'High frequency test',
      });

      // Create many concurrent operations
      const operations = Array.from({ length: 50 }, (_, i) =>
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 1,
          p_tool_id: testToolId,
          p_idempotency_key: `high-freq-${i}-${Date.now()}`,
        })
      );

      const results = await Promise.all(operations);

      // All should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
        expect(result.data.status).toBe('success');
      });

      // Verify final balance
      const { data: finalBalance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();

      expect(finalBalance.balance).toBe(950); // 1000 - 50
    });

    it('should handle concurrent user creation', async () => {
      // Create multiple users simultaneously
      const userCreationPromises = Array.from({ length: 10 }, (_, i) =>
        supabaseAdmin.auth.admin.createUser({
          email: `concurrent-create-${i}-${Date.now()}@example.com`,
          password: 'password123',
          email_confirm: true,
        })
      );

      const results = await Promise.all(userCreationPromises);

      // All should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
        expect(result.data.user).toBeDefined();
      });

      // Cleanup
      const cleanupPromises = results.map(result =>
        supabaseAdmin.auth.admin.deleteUser(result.data.user!.id)
      );
      await Promise.all(cleanupPromises);
    });
  });

  describe('Transaction Rollback Scenarios', () => {
    it('should handle partial failures in concurrent operations', async () => {
      const userId = testUsers[0];

      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: userId,
        p_amount: 50,
        p_reason: 'Rollback test',
      });

      // Create operations where some will fail
      const operations = [
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 10,
          p_tool_id: testToolId,
          p_idempotency_key: `rollback-1-${Date.now()}`,
        }),
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 100, // This should fail - insufficient credits
          p_tool_id: testToolId,
          p_idempotency_key: `rollback-2-${Date.now()}`,
        }),
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 20,
          p_tool_id: testToolId,
          p_idempotency_key: `rollback-3-${Date.now()}`,
        }),
      ];

      const results = await Promise.all(operations);

      // First and third should succeed, second should fail
      expect(results[0].data.status).toBe('success');
      expect(results[1].data.status).toBe('insufficient_credits');
      expect(results[2].data.status).toBe('success');

      // Verify final balance
      const { data: finalBalance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();

      expect(finalBalance.balance).toBe(20); // 50 - 10 - 20
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with many concurrent users', async () => {
      const startTime = Date.now();

      // Grant credits to all users
      const grantPromises = testUsers.map(userId =>
        supabaseAdmin.rpc('increment_balance', {
          p_user_id: userId,
          p_amount: 100,
          p_reason: 'Performance test',
        })
      );

      await Promise.all(grantPromises);

      // All users consume credits simultaneously
      const consumePromises = testUsers.map((userId, index) =>
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: userId,
          p_amount: 10,
          p_tool_id: testToolId,
          p_idempotency_key: `perf-${userId}-${index}`,
        })
      );

      const results = await Promise.all(consumePromises);
      const endTime = Date.now();

      // All should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
        expect(result.data.status).toBe('success');
      });

      // Should complete within reasonable time (adjust threshold as needed)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });
});
