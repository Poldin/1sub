import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

describe('Tool Lifecycle Integration Tests', () => {
  let testUserId: string;
  let adminUserId: string;
  let testToolId: string;

  beforeEach(async () => {
    // Create test user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `lifecycle-user-${Date.now()}@example.com`,
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
        full_name: 'Lifecycle Test User',
        role: 'user',
      });

    // Create admin user
    const { data: adminAuth, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `lifecycle-admin-${Date.now()}@example.com`,
      password: 'adminpassword123',
      email_confirm: true,
    });

    expect(adminAuthError).toBeNull();
    adminUserId = adminAuth.user!.id;

    await supabaseAdmin
      .from('users')
      .insert({
        id: adminUserId,
        email: adminAuth.user!.email!,
        full_name: 'Lifecycle Admin User',
        role: 'admin',
      });

    // Create test tool
    const { data: tool, error: toolError } = await supabaseAdmin
      .from('tools')
      .insert({
        name: `Lifecycle Test Tool ${Date.now()}`,
        description: 'Test tool for lifecycle testing',
        url: 'https://example.com/lifecycle-test',
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
    if (adminUserId) await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    if (testToolId) await supabaseAdmin.from('tools').delete().eq('id', testToolId);
  });

  describe('Complete Tool Lifecycle', () => {
    it('should handle complete tool lifecycle: create → launch → log usage → consume credits', async () => {
      // Step 1: Grant credits to user
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Lifecycle test grant',
      });

      // Step 2: Launch tool (consume credits)
      const launchResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: `lifecycle-${Date.now()}`,
      });

      expect(launchResult.error).toBeNull();
      expect(launchResult.data.status).toBe('success');

      // Step 3: Log usage
      const { data: usageLog, error: usageError } = await supabaseAdmin
        .from('usage_logs')
        .insert({
          user_id: testUserId,
          tool_id: testToolId,
          status: 'success',
          credits_consumed: 15,
          response_time_ms: 1200,
          request_payload: { test: true },
          response_payload: { result: 'success' },
        })
        .select()
        .single();

      expect(usageError).toBeNull();
      expect(usageLog).toBeDefined();

      // Step 4: Verify credit balance updated
      const { data: balance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(balance.balance).toBe(85); // 100 - 15

      // Step 5: Verify transaction recorded
      const { data: transactions } = await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('tool_id', testToolId);

      expect(transactions).toHaveLength(2); // Grant + consume
      const consumeTransaction = transactions.find(t => t.transaction_type === 'consumption');
      expect(consumeTransaction).toBeDefined();
      expect(consumeTransaction.amount).toBe(-15);
    });

    it('should handle tool deactivation and prevent launches', async () => {
      // Grant credits to user
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Deactivation test',
      });

      // Deactivate tool
      const { error: deactivateError } = await supabaseAdmin
        .from('tools')
        .update({ is_active: false })
        .eq('id', testToolId);

      expect(deactivateError).toBeNull();

      // Try to launch deactivated tool
      const launchResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: `deactivated-${Date.now()}`,
      });

      // Should fail due to inactive tool
      expect(launchResult.error).toBeDefined();
      expect(launchResult.data.status).toBe('insufficient_credits'); // Or specific tool inactive error

      // Verify balance unchanged
      const { data: balance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(balance.balance).toBe(100); // Unchanged
    });

    it('should handle credit adjustment and allow usage', async () => {
      // Grant initial credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 10,
        p_reason: 'Initial grant',
      });

      // Try to launch tool (should fail - insufficient credits)
      const firstLaunch = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: `insufficient-${Date.now()}`,
      });

      expect(firstLaunch.data.status).toBe('insufficient_credits');

      // Admin adjusts credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 20,
        p_reason: 'Admin credit adjustment',
      });

      // Now should be able to launch tool
      const secondLaunch = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: `sufficient-${Date.now()}`,
      });

      expect(secondLaunch.error).toBeNull();
      expect(secondLaunch.data.status).toBe('success');

      // Verify final balance
      const { data: finalBalance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(finalBalance.balance).toBe(15); // 10 + 20 - 15
    });
  });

  describe('Tool Management Lifecycle', () => {
    it('should handle tool creation and immediate usage', async () => {
      // Create new tool
      const { data: newTool, error: createError } = await supabaseAdmin
        .from('tools')
        .insert({
          name: `New Lifecycle Tool ${Date.now()}`,
          description: 'Tool for immediate usage test',
          url: 'https://example.com/new-tool',
          credit_cost_per_use: 25,
          is_active: true,
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(newTool).toBeDefined();

      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'New tool test',
      });

      // Immediately use the new tool
      const launchResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 25,
        p_tool_id: newTool.id,
        p_idempotency_key: `new-tool-${Date.now()}`,
      });

      expect(launchResult.error).toBeNull();
      expect(launchResult.data.status).toBe('success');

      // Cleanup
      await supabaseAdmin.from('tools').delete().eq('id', newTool.id);
    });

    it('should handle tool updates and maintain usage logs', async () => {
      // Grant credits and use tool
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Update test',
      });

      const launchResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: `update-test-${Date.now()}`,
      });

      expect(launchResult.error).toBeNull();

      // Log usage
      await supabaseAdmin
        .from('usage_logs')
        .insert({
          user_id: testUserId,
          tool_id: testToolId,
          status: 'success',
          credits_consumed: 15,
          response_time_ms: 1000,
        });

      // Update tool
      const { error: updateError } = await supabaseAdmin
        .from('tools')
        .update({
          name: 'Updated Lifecycle Tool',
          credit_cost_per_use: 20,
        })
        .eq('id', testToolId);

      expect(updateError).toBeNull();

      // Verify usage log still exists and is correct
      const { data: usageLogs } = await supabaseAdmin
        .from('usage_logs')
        .select('*')
        .eq('tool_id', testToolId)
        .eq('user_id', testUserId);

      expect(usageLogs).toHaveLength(1);
      expect(usageLogs[0].credits_consumed).toBe(15); // Original cost
    });

    it('should handle tool deletion and preserve historical data', async () => {
      // Grant credits and use tool
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Deletion test',
      });

      const launchResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: `deletion-test-${Date.now()}`,
      });

      expect(launchResult.error).toBeNull();

      // Log usage
      const { data: usageLog } = await supabaseAdmin
        .from('usage_logs')
        .insert({
          user_id: testUserId,
          tool_id: testToolId,
          status: 'success',
          credits_consumed: 15,
          response_time_ms: 1000,
        })
        .select()
        .single();

      expect(usageLog).toBeDefined();

      // Delete tool
      const { error: deleteError } = await supabaseAdmin
        .from('tools')
        .delete()
        .eq('id', testToolId);

      expect(deleteError).toBeNull();

      // Verify historical data is preserved
      const { data: transactions } = await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('tool_id', testToolId);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].tool_id).toBe(testToolId);

      const { data: usageLogs } = await supabaseAdmin
        .from('usage_logs')
        .select('*')
        .eq('tool_id', testToolId);

      expect(usageLogs).toHaveLength(1);
      expect(usageLogs[0].tool_id).toBe(testToolId);
    });
  });

  describe('Error Handling in Tool Lifecycle', () => {
    it('should handle tool launch failures gracefully', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Error handling test',
      });

      // Simulate tool launch failure by using invalid tool ID
      const invalidToolId = '00000000-0000-0000-0000-000000000000';
      
      const launchResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: invalidToolId,
        p_idempotency_key: `invalid-tool-${Date.now()}`,
      });

      // Should fail gracefully
      expect(launchResult.error).toBeDefined();

      // Log failed usage
      const { data: failedLog, error: logError } = await supabaseAdmin
        .from('usage_logs')
        .insert({
          user_id: testUserId,
          tool_id: invalidToolId,
          status: 'error',
          credits_consumed: 0,
          response_time_ms: 100,
          error_message: 'Tool not found',
        })
        .select()
        .single();

      expect(logError).toBeNull();
      expect(failedLog.status).toBe('error');

      // Verify balance unchanged
      const { data: balance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(balance.balance).toBe(100); // Unchanged
    });

    it('should handle partial tool lifecycle failures', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Partial failure test',
      });

      // Launch tool successfully
      const launchResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: `partial-failure-${Date.now()}`,
      });

      expect(launchResult.error).toBeNull();

      // Log usage with error status
      const { data: errorLog, error: logError } = await supabaseAdmin
        .from('usage_logs')
        .insert({
          user_id: testUserId,
          tool_id: testToolId,
          status: 'error',
          credits_consumed: 15,
          response_time_ms: 5000,
          error_message: 'Tool execution timeout',
        })
        .select()
        .single();

      expect(logError).toBeNull();
      expect(errorLog.status).toBe('error');

      // Credits should still be consumed even if tool execution failed
      const { data: balance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(balance.balance).toBe(85); // 100 - 15
    });
  });

  describe('Audit Trail in Tool Lifecycle', () => {
    it('should log admin actions during tool lifecycle', async () => {
      // Admin creates tool
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'CREATE',
        p_resource_type: 'tool',
        p_resource_id: testToolId,
        p_details: { name: 'Lifecycle Test Tool', cost: 15 },
      });

      // Admin grants credits to user
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Admin grant for lifecycle test',
      });

      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'GRANT_CREDITS',
        p_resource_type: 'user',
        p_resource_id: testUserId,
        p_details: { amount: 100, reason: 'Admin grant for lifecycle test' },
      });

      // User launches tool
      const launchResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 15,
        p_tool_id: testToolId,
        p_idempotency_key: `audit-test-${Date.now()}`,
      });

      expect(launchResult.error).toBeNull();

      // Admin deactivates tool
      await supabaseAdmin
        .from('tools')
        .update({ is_active: false })
        .eq('id', testToolId);

      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'UPDATE',
        p_resource_type: 'tool',
        p_resource_id: testToolId,
        p_details: { is_active: false },
      });

      // Verify audit trail
      const { data: auditLogs } = await supabaseAdmin
        .from('admin_audit_logs')
        .select('*')
        .eq('admin_id', adminUserId)
        .order('created_at', { ascending: true });

      expect(auditLogs).toHaveLength(3);
      expect(auditLogs[0].action).toBe('CREATE');
      expect(auditLogs[1].action).toBe('GRANT_CREDITS');
      expect(auditLogs[2].action).toBe('UPDATE');
    });
  });

  describe('Performance in Tool Lifecycle', () => {
    it('should handle rapid tool launches efficiently', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 1000,
        p_reason: 'Performance test',
      });

      const startTime = Date.now();

      // Launch tool multiple times rapidly
      const launchPromises = Array.from({ length: 20 }, (_, i) =>
        supabaseAdmin.rpc('consume_credits', {
          p_user_id: testUserId,
          p_amount: 15,
          p_tool_id: testToolId,
          p_idempotency_key: `perf-${i}-${Date.now()}`,
        })
      );

      const results = await Promise.all(launchPromises);
      const endTime = Date.now();

      // All should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
        expect(result.data.status).toBe('success');
      });

      // Should complete within reasonable time
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10000); // 10 seconds

      // Verify final balance
      const { data: finalBalance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(finalBalance.balance).toBe(700); // 1000 - (20 * 15)
    });
  });
});
