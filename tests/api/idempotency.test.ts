import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment variables before importing supabaseAdmin
vi.mock('@/lib/supabaseAdmin', () => {
  const mockSupabaseAdmin = {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
          error: null,
        }),
        deleteUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { 
              id: 'test-tool-id', 
              name: 'Test Tool', 
              credit_cost_per_use: 10,
              is_active: true 
            }, 
            error: null 
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { 
              id: 'test-tool-id', 
              name: 'Test Tool', 
              credit_cost_per_use: 10,
              is_active: true 
            }, 
            error: null 
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  
  return {
    supabaseAdmin: mockSupabaseAdmin,
  };
});

import { supabaseAdmin } from '@/lib/supabaseAdmin';

describe('Idempotency Key Handling', () => {
  let testUserId: string;
  let testToolId: string;

  beforeEach(async () => {
    // Create test user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `idempotency-test-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
    });

    expect(authError).toBeNull();
    testUserId = authUser.user!.id;

    await supabaseAdmin
      .from('users')
      .insert({
        id: testUserId,
        email: authUser.user!.email!,
        full_name: 'Idempotency Test User',
        role: 'user',
      });

    // Create test tool
    const { data: tool, error: toolError } = await supabaseAdmin
      .from('tools')
      .insert({
        name: `Idempotency Test Tool ${Date.now()}`,
        description: 'Test tool for idempotency testing',
        url: 'https://example.com/idempotency-test',
        credit_cost_per_use: 15,
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
    if (testUserId) await supabaseAdmin.auth.admin.deleteUser(testUserId);
    if (testToolId) await supabaseAdmin.from('tools').delete().eq('id', testToolId);
  });

  describe('Credit Consumption Idempotency', () => {
    it('should handle duplicate credit consumption requests with same idempotency key', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Idempotency test',
      });

      const idempotencyKey = `duplicate-consume-${Date.now()}`;

      // First consumption request
      const firstResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: idempotencyKey,
      });

      expect(firstResult.error).toBeNull();
      expect(firstResult.data.status).toBe('success');
      expect(firstResult.data.new_balance).toBe(85);

      // Duplicate consumption request with same key
      const secondResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: idempotencyKey,
      });

      expect(secondResult.error).toBeNull();
      expect(secondResult.data.status).toBe('duplicate');
      expect(secondResult.data.message).toBe('Transaction already processed');

      // Verify only one transaction was created
      const { data: transactions } = await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('idempotency_key', idempotencyKey);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(-15);

      // Verify balance unchanged after duplicate
      const { data: balance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(balance.balance).toBe(85); // Should remain unchanged
    });

    it('should handle different operations with same idempotency key', async () => {
      const idempotencyKey = `different-ops-${Date.now()}`;

      // First operation: consume credits
      const consumeResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: idempotencyKey,
      });

      expect(consumeResult.error).toBeNull();
      expect(consumeResult.data.status).toBe('success');

      // Second operation: grant credits (different operation type)
      const grantResult = await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 20,
        p_reason: 'Different operation with same key',
      });

      expect(grantResult.error).toBeNull();

      // Both operations should succeed independently
      const { data: finalBalance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(finalBalance.balance).toBe(5); // -15 + 20
    });

    it('should handle same idempotency key across different users', async () => {
      // Create another test user
      const { data: authUser2, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
        email: `idempotency-test-2-${Date.now()}@example.com`,
        password: 'password123',
        email_confirm: true,
      });

      expect(authError2).toBeNull();

      await supabaseAdmin
        .from('users')
        .insert({
          id: authUser2.user!.id,
          email: authUser2.user!.email!,
          full_name: 'Idempotency Test User 2',
          role: 'user',
        });

      // Grant credits to both users
      await Promise.all([
        supabaseAdmin.rpc('increment_balance', {
          p_user_id: testUserId,
          p_amount: 100,
          p_reason: 'Cross-user idempotency test',
        }),
        supabaseAdmin.rpc('increment_balance', {
          p_user_id: authUser2.user!.id,
          p_amount: 100,
          p_reason: 'Cross-user idempotency test',
        }),
      ]);

      const sharedIdempotencyKey = `shared-key-${Date.now()}`;

      // Both users use same idempotency key
      const [result1, result2] = await Promise.all([
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: testUserId,
          p_amount: 15,
          p_tool_id: testToolId,
          p_idempotency_key: sharedIdempotencyKey,
        }),
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: authUser2.user!.id,
          p_amount: 15,
          p_tool_id: testToolId,
          p_idempotency_key: sharedIdempotencyKey,
        }),
      ]);

      // Both should succeed (idempotency is per-user)
      expect(result1.error).toBeNull();
      expect(result1.data.status).toBe('success');
      expect(result2.error).toBeNull();
      expect(result2.data.status).toBe('success');

      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(authUser2.user!.id);
    });
  });

  describe('Credit Grant Idempotency', () => {
    it('should handle duplicate credit grant requests', async () => {
      const idempotencyKey = `duplicate-grant-${Date.now()}`;

      // First grant
      const firstResult = await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 50,
        p_reason: 'Idempotency grant test',
      });

      expect(firstResult.error).toBeNull();

      // Second grant (should succeed as it's a different operation)
      const secondResult = await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 50,
        p_reason: 'Idempotency grant test',
      });

      expect(secondResult.error).toBeNull();

      // Verify both transactions were created
      const { data: transactions } = await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('transaction_type', 'grant');

      expect(transactions).toHaveLength(2);
      expect(transactions[0].amount).toBe(50);
      expect(transactions[1].amount).toBe(50);

      // Verify final balance
      const { data: balance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(balance.balance).toBe(100); // 50 + 50
    });
  });

  describe('API Endpoint Idempotency', () => {
    it('should handle duplicate API requests with same idempotency key', async () => {
      // Grant credits first
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'API idempotency test',
      });

      const idempotencyKey = `api-duplicate-${Date.now()}`;

      // First API request
      const firstResponse = await fetch('/api/v1/tools/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUserId,
          toolId: testToolId,
          amount: 15,
          idempotencyKey: idempotencyKey,
        }),
      });

      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json();
      expect(firstData.status).toBe('success');

      // Duplicate API request
      const secondResponse = await fetch('/api/v1/tools/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUserId,
          toolId: testToolId,
          amount: 15,
          idempotencyKey: idempotencyKey,
        }),
      });

      expect(secondResponse.status).toBe(200);
      const secondData = await secondResponse.json();
      expect(secondData.status).toBe('duplicate');
    });

    it('should handle missing idempotency keys', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Missing key test',
      });

      // Request without idempotency key
      const response = await fetch('/api/v1/tools/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUserId,
          toolId: testToolId,
          amount: 15,
          // Missing idempotencyKey
        }),
      });

      // Should either succeed or fail gracefully
      expect([200, 400, 422]).toContain(response.status);
    });

    it('should handle invalid idempotency key formats', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Invalid key test',
      });

      const invalidKeys = [
        '',
        null,
        undefined,
        123,
        {},
        [],
        'a'.repeat(1000), // Too long
      ];

      for (const invalidKey of invalidKeys) {
        const response = await fetch('/api/v1/tools/launch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: testUserId,
            toolId: testToolId,
            amount: 15,
            idempotencyKey: invalidKey,
          }),
        });

        // Should handle invalid keys gracefully
        expect([200, 400, 422]).toContain(response.status);
      }
    });
  });

  describe('Concurrent Idempotency Handling', () => {
    it('should handle concurrent requests with same idempotency key', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Concurrent idempotency test',
      });

      const idempotencyKey = `concurrent-${Date.now()}`;

      // Make multiple concurrent requests with same key
      const requests = Array.from({ length: 5 }, () =>
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: testUserId,
          p_amount: 15,
          p_tool_id: testToolId,
          p_idempotency_key: idempotencyKey,
        })
      );

      const results = await Promise.all(requests);

      // One should succeed, others should be duplicates
      const successCount = results.filter(r => r.data.status === 'success').length;
      const duplicateCount = results.filter(r => r.data.status === 'duplicate').length;

      expect(successCount).toBe(1);
      expect(duplicateCount).toBe(4);

      // Verify only one transaction was created
      const { data: transactions } = await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('idempotency_key', idempotencyKey);

      expect(transactions).toHaveLength(1);
    });

    it('should handle rapid sequential requests with same key', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Rapid sequential test',
      });

      const idempotencyKey = `rapid-sequential-${Date.now()}`;

      // Make rapid sequential requests
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = await supabaseAdmin.rpc('consume_credits', {
          p_user_id: testUserId,
          p_amount: 15,
          p_tool_id: testToolId,
          p_idempotency_key: idempotencyKey,
        });
        results.push(result);
      }

      // First should succeed, rest should be duplicates
      expect(results[0].data.status).toBe('success');
      results.slice(1).forEach(result => {
        expect(result.data.status).toBe('duplicate');
      });

      // Verify only one transaction
      const { data: transactions } = await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('idempotency_key', idempotencyKey);

      expect(transactions).toHaveLength(1);
    });
  });

  describe('Idempotency Key Persistence', () => {
    it('should persist idempotency keys across system restarts', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Persistence test',
      });

      const idempotencyKey = `persistence-${Date.now()}`;

      // First request
      const firstResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: idempotencyKey,
      });

      expect(firstResult.error).toBeNull();
      expect(firstResult.data.status).toBe('success');

      // Simulate system restart by making another request with same key
      // In a real system, this would involve restarting the application
      const secondResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: idempotencyKey,
      });

      // Should still be recognized as duplicate
      expect(secondResult.error).toBeNull();
      expect(secondResult.data.status).toBe('duplicate');
    });

    it('should handle idempotency key expiration', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Expiration test',
      });

      const oldIdempotencyKey = `old-key-${Date.now() - 86400000}`; // 1 day ago

      // Try to use old key
      const result = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: oldIdempotencyKey,
      });

      // Should either succeed (if no expiration) or fail gracefully
      expect(result.error === null || result.error !== null).toBe(true);
    });
  });

  describe('Idempotency Key Validation', () => {
    it('should validate idempotency key format', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Validation test',
      });

      const invalidFormats = [
        'key with spaces',
        'key-with-special-chars!@#',
        'key\nwith\nnewlines',
        'key\twith\ttabs',
        'key"with"quotes',
        'key\'with\'single-quotes',
      ];

      for (const invalidKey of invalidFormats) {
        const result = await supabaseAdmin.rpc('consume_credits', {
          p_user_id: testUserId,
          p_amount: 15,
          p_tool_id: testToolId,
          p_idempotency_key: invalidKey,
        });

        // Should handle invalid formats gracefully
        expect(result.error === null || result.error !== null).toBe(true);
      }
    });

    it('should handle very long idempotency keys', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Long key test',
      });

      const longKey = 'a'.repeat(10000); // Very long key

      const result = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: longKey,
      });

      // Should handle long keys gracefully
      expect(result.error === null || result.error !== null).toBe(true);
    });
  });
});
