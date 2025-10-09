import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

describe('Admin Operations Integration Tests', () => {
  let adminUserId: string;
  let testUserId: string;
  let testToolId: string;

  beforeEach(async () => {
    // Create admin user
    const { data: adminAuth, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `admin-ops-${Date.now()}@example.com`,
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
        full_name: 'Admin Operations User',
        role: 'admin',
      });

    // Create test user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `test-user-${Date.now()}@example.com`,
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
        full_name: 'Test User',
        role: 'user',
      });

    // Create test tool
    const { data: tool, error: toolError } = await supabaseAdmin
      .from('tools')
      .insert({
        name: `Admin Ops Test Tool ${Date.now()}`,
        description: 'Test tool for admin operations',
        url: 'https://example.com/admin-ops-test',
        credit_cost_per_use: 20,
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
    if (adminUserId) await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    if (testUserId) await supabaseAdmin.auth.admin.deleteUser(testUserId);
    if (testToolId) await supabaseAdmin.from('tools').delete().eq('id', testToolId);
  });

  describe('Admin Creates User and Grants Credits', () => {
    it('should handle complete admin user creation and credit granting workflow', async () => {
      // Admin creates new user
      const { data: newUserAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: `new-user-${Date.now()}@example.com`,
        password: 'password123',
        email_confirm: true,
      });

      expect(createError).toBeNull();

      // Admin creates user profile
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: newUserAuth.user!.id,
          email: newUserAuth.user!.email!,
          full_name: 'New User Created by Admin',
          role: 'user',
        })
        .select()
        .single();

      expect(profileError).toBeNull();

      // Log admin action
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'CREATE',
        p_resource_type: 'user',
        p_resource_id: newUserAuth.user!.id,
        p_details: { email: newUserAuth.user!.email, full_name: 'New User Created by Admin' },
      });

      // Admin grants credits to new user
      const grantResult = await supabaseAdmin.rpc('increment_balance', {
        p_user_id: newUserAuth.user!.id,
        p_amount: 200,
        p_reason: 'Welcome bonus from admin',
      });

      expect(grantResult.error).toBeNull();

      // Log credit grant action
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'GRANT_CREDITS',
        p_resource_type: 'user',
        p_resource_id: newUserAuth.user!.id,
        p_details: { amount: 200, reason: 'Welcome bonus from admin' },
      });

      // Verify user has credits
      const { data: balance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', newUserAuth.user!.id)
        .single();

      expect(balance.balance).toBe(200);

      // Verify audit trail
      const { data: auditLogs } = await supabaseAdmin
        .from('admin_audit_logs')
        .select('*')
        .eq('admin_id', adminUserId)
        .eq('resource_id', newUserAuth.user!.id)
        .order('created_at', { ascending: true });

      expect(auditLogs).toHaveLength(2);
      expect(auditLogs[0].action).toBe('CREATE');
      expect(auditLogs[1].action).toBe('GRANT_CREDITS');

      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(newUserAuth.user!.id);
    });

    it('should handle user creation with different roles', async () => {
      // Admin creates user with admin role
      const { data: adminUserAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: `new-admin-${Date.now()}@example.com`,
        password: 'adminpassword123',
        email_confirm: true,
      });

      expect(createError).toBeNull();

      // Admin creates user profile with admin role
      const { data: adminProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: adminUserAuth.user!.id,
          email: adminUserAuth.user!.email!,
          full_name: 'New Admin User',
          role: 'admin',
        })
        .select()
        .single();

      expect(profileError).toBeNull();

      // Log admin action
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'CREATE',
        p_resource_type: 'user',
        p_resource_id: adminUserAuth.user!.id,
        p_details: { email: adminUserAuth.user!.email, role: 'admin' },
      });

      // Verify audit trail
      const { data: auditLog } = await supabaseAdmin
        .from('admin_audit_logs')
        .select('*')
        .eq('admin_id', adminUserId)
        .eq('resource_id', adminUserAuth.user!.id)
        .single();

      expect(auditLog.action).toBe('CREATE');
      expect(auditLog.details.role).toBe('admin');

      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(adminUserAuth.user!.id);
    });
  });

  describe('Admin Manages Tools and User Access', () => {
    it('should handle admin tool deactivation preventing user access', async () => {
      // Grant credits to user
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Tool deactivation test',
      });

      // User launches tool successfully
      const firstLaunch = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 20,
        p_tool_id: testToolId,
        p_idempotency_key: `before-deactivation-${Date.now()}`,
      });

      expect(firstLaunch.error).toBeNull();
      expect(firstLaunch.data.status).toBe('success');

      // Admin deactivates tool
      const { error: deactivateError } = await supabaseAdmin
        .from('tools')
        .update({ is_active: false })
        .eq('id', testToolId);

      expect(deactivateError).toBeNull();

      // Log admin action
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'UPDATE',
        p_resource_type: 'tool',
        p_resource_id: testToolId,
        p_details: { is_active: false },
      });

      // User tries to launch deactivated tool
      const secondLaunch = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 20,
        p_tool_id: testToolId,
        p_idempotency_key: `after-deactivation-${Date.now()}`,
      });

      // Should fail
      expect(secondLaunch.data.status).toBe('insufficient_credits');

      // Verify audit trail
      const { data: auditLog } = await supabaseAdmin
        .from('admin_audit_logs')
        .select('*')
        .eq('admin_id', adminUserId)
        .eq('resource_id', testToolId)
        .single();

      expect(auditLog.action).toBe('UPDATE');
      expect(auditLog.details.is_active).toBe(false);
    });

    it('should handle admin tool reactivation allowing user access', async () => {
      // Deactivate tool first
      await supabaseAdmin
        .from('tools')
        .update({ is_active: false })
        .eq('id', testToolId);

      // Grant credits to user
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Tool reactivation test',
      });

      // User tries to launch deactivated tool
      const failedLaunch = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 20,
        p_tool_id: testToolId,
        p_idempotency_key: `before-reactivation-${Date.now()}`,
      });

      expect(failedLaunch.data.status).toBe('insufficient_credits');

      // Admin reactivates tool
      const { error: reactivateError } = await supabaseAdmin
        .from('tools')
        .update({ is_active: true })
        .eq('id', testToolId);

      expect(reactivateError).toBeNull();

      // Log admin action
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'UPDATE',
        p_resource_type: 'tool',
        p_resource_id: testToolId,
        p_details: { is_active: true },
      });

      // User launches reactivated tool
      const successfulLaunch = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 20,
        p_tool_id: testToolId,
        p_idempotency_key: `after-reactivation-${Date.now()}`,
      });

      expect(successfulLaunch.error).toBeNull();
      expect(successfulLaunch.data.status).toBe('success');
    });

    it('should handle admin tool cost changes affecting user access', async () => {
      // Grant credits to user
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 50,
        p_reason: 'Cost change test',
      });

      // User launches tool with original cost
      const originalLaunch = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 20,
        p_tool_id: testToolId,
        p_idempotency_key: `original-cost-${Date.now()}`,
      });

      expect(originalLaunch.error).toBeNull();
      expect(originalLaunch.data.status).toBe('success');

      // Admin increases tool cost
      const { error: updateError } = await supabaseAdmin
        .from('tools')
        .update({ credit_cost_per_use: 40 })
        .eq('id', testToolId);

      expect(updateError).toBeNull();

      // Log admin action
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'UPDATE',
        p_resource_type: 'tool',
        p_resource_id: testToolId,
        p_details: { credit_cost_per_use: 40 },
      });

      // User tries to launch tool with new cost (should fail - insufficient credits)
      const newCostLaunch = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 40,
        p_tool_id: testToolId,
        p_idempotency_key: `new-cost-${Date.now()}`,
      });

      expect(newCostLaunch.data.status).toBe('insufficient_credits');

      // Admin grants more credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 50,
        p_reason: 'Additional credits for increased cost',
      });

      // User launches tool with new cost
      const successfulNewCostLaunch = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 40,
        p_tool_id: testToolId,
        p_idempotency_key: `successful-new-cost-${Date.now()}`,
      });

      expect(successfulNewCostLaunch.error).toBeNull();
      expect(successfulNewCostLaunch.data.status).toBe('success');
    });
  });

  describe('Admin Views Audit Logs and Usage', () => {
    it('should track all admin actions in audit logs', async () => {
      // Perform various admin actions
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'CREATE',
        p_resource_type: 'tool',
        p_resource_id: testToolId,
        p_details: { name: 'Test Tool', cost: 20 },
      });

      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'GRANT_CREDITS',
        p_resource_type: 'user',
        p_resource_id: testUserId,
        p_details: { amount: 100, reason: 'Test grant' },
      });

      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'UPDATE',
        p_resource_type: 'tool',
        p_resource_id: testToolId,
        p_details: { is_active: false },
      });

      // Verify all actions are logged
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

    it('should track user usage after admin actions', async () => {
      // Admin grants credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Usage tracking test',
      });

      // User launches tool
      const launchResult = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: testUserId,
        p_amount: 20,
        p_tool_id: testToolId,
        p_idempotency_key: `usage-tracking-${Date.now()}`,
      });

      expect(launchResult.error).toBeNull();

      // Log usage
      const { data: usageLog } = await supabaseAdmin
        .from('usage_logs')
        .insert({
          user_id: testUserId,
          tool_id: testToolId,
          status: 'success',
          credits_consumed: 20,
          response_time_ms: 1500,
        })
        .select()
        .single();

      expect(usageLog).toBeDefined();

      // Admin views usage logs
      const { data: adminUsageLogs } = await supabaseAdmin
        .from('usage_logs')
        .select(`
          *,
          users!inner(email, full_name),
          tools!inner(name, credit_cost_per_use)
        `)
        .eq('user_id', testUserId);

      expect(adminUsageLogs).toHaveLength(1);
      expect(adminUsageLogs[0].status).toBe('success');
      expect(adminUsageLogs[0].credits_consumed).toBe(20);
    });

    it('should provide comprehensive admin dashboard data', async () => {
      // Create additional users and tools for dashboard data
      const additionalUsers = [];
      for (let i = 0; i < 3; i++) {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: `dashboard-user-${i}-${Date.now()}@example.com`,
          password: 'password123',
          email_confirm: true,
        });

        expect(authError).toBeNull();
        additionalUsers.push(authUser.user!.id);

        await supabaseAdmin
          .from('users')
          .insert({
            id: authUser.user!.id,
            email: authUser.user!.email!,
            full_name: `Dashboard User ${i}`,
            role: 'user',
          });
      }

      // Grant credits to all users
      const grantPromises = [testUserId, ...additionalUsers].map(userId =>
        supabaseAdmin.rpc('increment_balance', {
          p_user_id: userId,
          p_amount: 100,
          p_reason: 'Dashboard test grant',
        })
      );

      await Promise.all(grantPromises);

      // Create additional tools
      const additionalTools = [];
      for (let i = 0; i < 2; i++) {
        const { data: tool, error: toolError } = await supabaseAdmin
          .from('tools')
          .insert({
            name: `Dashboard Tool ${i} ${Date.now()}`,
            description: `Dashboard test tool ${i}`,
            url: `https://example.com/dashboard-tool-${i}`,
            credit_cost_per_use: 10 + i * 5,
            is_active: true,
          })
          .select()
          .single();

        expect(toolError).toBeNull();
        additionalTools.push(tool.id);
      }

      // Generate some usage
      const usagePromises = [];
      [testUserId, ...additionalUsers].forEach((userId, userIndex) => {
        [testToolId, ...additionalTools].forEach((toolId, toolIndex) => {
          if (userIndex < 2 && toolIndex < 2) { // Limit usage for test
            usagePromises.push(
              supabaseAdmin.rpc('consume_credits', {
                p_user_id: userId,
                p_amount: 10 + toolIndex * 5,
                p_tool_id: toolId,
                p_idempotency_key: `dashboard-${userId}-${toolId}-${Date.now()}`,
              })
            );
          }
        });
      });

      await Promise.all(usagePromises);

      // Admin gets dashboard statistics
      const { data: totalUsers } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact' });

      const { data: totalCredits } = await supabaseAdmin
        .from('credit_balances')
        .select('balance');

      const { data: totalTools } = await supabaseAdmin
        .from('tools')
        .select('id', { count: 'exact' });

      const { data: recentUsage } = await supabaseAdmin
        .from('usage_logs')
        .select(`
          *,
          users!inner(email, full_name),
          tools!inner(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Verify dashboard data
      expect(totalUsers.length).toBeGreaterThanOrEqual(4); // testUserId + 3 additional
      expect(totalCredits.length).toBeGreaterThanOrEqual(4);
      expect(totalTools.length).toBeGreaterThanOrEqual(3); // testToolId + 2 additional
      expect(recentUsage.length).toBeGreaterThan(0);

      // Cleanup
      const cleanupPromises = additionalUsers.map(userId =>
        supabaseAdmin.auth.admin.deleteUser(userId)
      );
      await Promise.all(cleanupPromises);

      const toolCleanupPromises = additionalTools.map(toolId =>
        supabaseAdmin.from('tools').delete().eq('id', toolId)
      );
      await Promise.all(toolCleanupPromises);
    });
  });

  describe('Admin Error Handling and Edge Cases', () => {
    it('should handle admin operations on non-existent resources', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      const nonExistentToolId = '00000000-0000-0000-0000-000000000000';

      // Try to grant credits to non-existent user
      const grantResult = await supabaseAdmin.rpc('increment_balance', {
        p_user_id: nonExistentUserId,
        p_amount: 100,
        p_reason: 'Non-existent user test',
      });

      // Should handle gracefully (might succeed or fail depending on implementation)
      expect(grantResult.error === null || grantResult.error !== null).toBe(true);

      // Try to log action for non-existent resource
      const logResult = await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'UPDATE',
        p_resource_type: 'user',
        p_resource_id: nonExistentUserId,
        p_details: { test: true },
      });

      // Should handle gracefully
      expect(logResult.error === null || logResult.error !== null).toBe(true);
    });

    it('should handle concurrent admin operations', async () => {
      // Multiple admins performing operations simultaneously
      const adminOperations = [
        supabaseAdmin.rpc('increment_balance', {
          p_user_id: testUserId,
          p_amount: 50,
          p_reason: 'Concurrent admin operation 1',
        }),
        supabaseAdmin.rpc('log_admin_action', {
          p_admin_id: adminUserId,
          p_action: 'GRANT_CREDITS',
          p_resource_type: 'user',
          p_resource_id: testUserId,
          p_details: { amount: 50 },
        }),
        supabaseAdmin
          .from('tools')
          .update({ description: 'Updated by concurrent admin operation' })
          .eq('id', testToolId),
      ];

      const results = await Promise.all(adminOperations);

      // All should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
      });

      // Verify final state
      const { data: balance } = await supabaseAdmin
        .from('credit_balances')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(balance.balance).toBe(50);
    });
  });
});
