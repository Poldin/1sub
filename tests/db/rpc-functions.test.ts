import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

describe('Database RPC Functions', () => {
  let testUserId: string;
  let testToolId: string;

  beforeEach(async () => {
    // Create test user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true
    });

    if (authError || !authUser.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    testUserId = authUser.user.id;

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: testUserId,
        email: authUser.user.email!,
        full_name: 'Test User',
        role: 'user'
      });

    if (profileError) {
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    // Create test tool
    const { data: tool, error: toolError } = await supabaseAdmin
      .from('tools')
      .insert({
        name: `Test Tool ${Date.now()}`,
        description: 'Test tool for RPC testing',
        url: 'https://example.com/test',
        credit_cost_per_use: 5,
        is_active: true
      })
      .select()
      .single();

    if (toolError || !tool) {
      throw new Error(`Failed to create test tool: ${toolError?.message}`);
    }

    testToolId = tool.id;
  });

  afterEach(async () => {
    // Cleanup test data
    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    }
    if (testToolId) {
      await supabaseAdmin.from('tools').delete().eq('id', testToolId);
    }
  });

  describe('consume_credits', () => {
    it('should consume credits atomically', async () => {
      // Grant initial credits
      const { error: grantError } = await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Test grant'
      });

      expect(grantError).toBeNull();

      // Consume credits
      const idempotencyKey = `test-${Date.now()}`;
      const { data, error } = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 10,
        p_tool_id: testToolId,
        p_idempotency_key: idempotencyKey
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('success');
      expect(data.new_balance).toBe(90);

      // Verify transaction was created
      const { data: transactions } = await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('idempotency_key', idempotencyKey);

      expect(transactions).toHaveLength(1);
      expect(transactions![0].amount).toBe(-10);
      expect(transactions![0].transaction_type).toBe('consumption');
    });

    it('should handle idempotency correctly', async () => {
      // Grant initial credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Test grant'
      });

      const idempotencyKey = `idempotent-${Date.now()}`;

      // First consumption
      const { data: firstResult, error: firstError } = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 10,
        p_tool_id: testToolId,
        p_idempotency_key: idempotencyKey
      });

      expect(firstError).toBeNull();
      expect(firstResult.status).toBe('success');

      // Second consumption with same key
      const { data: secondResult, error: secondError } = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 10,
        p_tool_id: testToolId,
        p_idempotency_key: idempotencyKey
      });

      expect(secondError).toBeNull();
      expect(secondResult.status).toBe('duplicate');
      expect(secondResult.message).toBe('Transaction already processed');

      // Verify only one transaction was created
      const { data: transactions } = await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('idempotency_key', idempotencyKey);

      expect(transactions).toHaveLength(1);
    });

    it('should handle insufficient credits', async () => {
      // Grant minimal credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 5,
        p_reason: 'Test grant'
      });

      // Try to consume more than available
      const { data, error } = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 10,
        p_tool_id: testToolId,
        p_idempotency_key: `insufficient-${Date.now()}`
      });

      expect(error).toBeNull();
      expect(data.status).toBe('insufficient_credits');
      expect(data.message).toBe('Insufficient credits');
    });

    it('should handle race conditions', async () => {
      // Grant initial credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Test grant'
      });

      // Simulate concurrent consumption
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          supabaseAdmin.rpc('consume_credits', {
            p_user_id: testUserId,
            p_amount: 10,
            p_tool_id: testToolId,
            p_idempotency_key: `race-${Date.now()}-${i}`
          })
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
        expect(result.data.status).toBe('success');
      });

      // Verify final balance
      const { data: balance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(balance?.balance).toBe(50); // 100 - (5 * 10)
    });
  });

  describe('increment_balance', () => {
    it('should increment balance correctly', async () => {
      const { data, error } = await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 50,
        p_reason: 'Test increment'
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Verify balance was updated
      const { data: balance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(balance?.balance).toBe(50);
    });

    it('should handle negative amounts', async () => {
      // First grant some credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Initial grant'
      });

      // Then subtract credits
      const { data, error } = await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: -30,
        p_reason: 'Credit adjustment'
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Verify balance
      const { data: balance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(balance?.balance).toBe(70);
    });

    it('should create transaction record', async () => {
      const reason = 'Test transaction creation';
      const { data, error } = await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 25,
        p_reason: reason
      });

      expect(error).toBeNull();

      // Verify transaction was created
      const { data: transactions } = await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('reason', reason);

      expect(transactions).toHaveLength(1);
      expect(transactions![0].amount).toBe(25);
      expect(transactions![0].transaction_type).toBe('grant');
    });
  });

  describe('log_admin_action', () => {
    it('should log admin actions correctly', async () => {
      const { data, error } = await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: testUserId,
        p_action: 'CREATE',
        p_resource_type: 'tool',
        p_resource_id: testToolId,
        p_details: { name: 'Test Tool', cost: 5 }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Verify audit log was created
      const { data: auditLogs } = await supabaseAdmin
        .from('admin_audit_logs')
        .select('*')
        .eq('admin_id', testUserId)
        .eq('action', 'CREATE')
        .eq('resource_type', 'tool');

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs![0].resource_id).toBe(testToolId);
      expect(auditLogs![0].details).toEqual({ name: 'Test Tool', cost: 5 });
    });

    it('should handle different action types', async () => {
      const actions = ['CREATE', 'UPDATE', 'DELETE', 'GRANT_CREDITS'];
      
      for (const action of actions) {
        const { error } = await supabaseAdmin.rpc('log_admin_action', {
          p_admin_id: testUserId,
          p_action: action,
          p_resource_type: 'user',
          p_resource_id: testUserId,
          p_details: { test: true }
        });

        expect(error).toBeNull();
      }

      // Verify all actions were logged
      const { data: auditLogs } = await supabaseAdmin
        .from('admin_audit_logs')
        .select('action')
        .eq('admin_id', testUserId);

      const loggedActions = auditLogs?.map(log => log.action) || [];
      actions.forEach(action => {
        expect(loggedActions).toContain(action);
      });
    });
  });

  describe('check_all_low_balances', () => {
    it('should identify users with low balances', async () => {
      // Create users with different balance levels
      const lowBalanceUser = await createTestUser('low@example.com');
      const normalBalanceUser = await createTestUser('normal@example.com');

      // Set balances
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: lowBalanceUser,
        p_amount: 5, // Low balance
        p_reason: 'Low balance test'
      });

      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: normalBalanceUser,
        p_amount: 100, // Normal balance
        p_reason: 'Normal balance test'
      });

      // Check low balances
      const { data, error } = await supabaseAdmin.rpc('check_all_low_balances', {
        p_threshold: 10
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);

      // Verify low balance user is included
      const lowBalanceUsers = data.filter((user: any) => user.user_id === lowBalanceUser);
      expect(lowBalanceUsers).toHaveLength(1);
      expect(lowBalanceUsers[0].balance).toBe(5);

      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(lowBalanceUser);
      await supabaseAdmin.auth.admin.deleteUser(normalBalanceUser);
    });
  });
});

// Helper function to create test users
async function createTestUser(email: string): Promise<string> {
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'testpassword123',
    email_confirm: true
  });

  if (authError || !authUser.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  const { error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authUser.user.id,
      email: authUser.user.email!,
      full_name: 'Test User',
      role: 'user'
    });

  if (profileError) {
    throw new Error(`Failed to create user profile: ${profileError.message}`);
  }

  return authUser.user.id;
}
