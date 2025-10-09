import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

describe('Row Level Security (RLS) Policies', () => {
  let adminUserId: string;
  let regularUserId: string;
  let otherUserId: string;
  let testToolId: string;
  
  // Create separate Supabase clients for different user contexts
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  beforeEach(async () => {
    // Create admin user
    const { data: adminAuth, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `admin-rls-${Date.now()}@example.com`,
      password: 'adminpassword123',
      email_confirm: true
    });

    expect(adminAuthError).toBeNull();
    adminUserId = adminAuth.user!.id;

    await supabaseAdmin
      .from('users')
      .insert({
        id: adminUserId,
        email: adminAuth.user!.email!,
        full_name: 'Admin RLS User',
        role: 'admin'
      });

    // Create regular user
    const { data: regularAuth, error: regularAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `regular-rls-${Date.now()}@example.com`,
      password: 'regularpassword123',
      email_confirm: true
    });

    expect(regularAuthError).toBeNull();
    regularUserId = regularAuth.user!.id;

    await supabaseAdmin
      .from('users')
      .insert({
        id: regularUserId,
        email: regularAuth.user!.email!,
        full_name: 'Regular RLS User',
        role: 'user'
      });

    // Create another regular user
    const { data: otherAuth, error: otherAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `other-rls-${Date.now()}@example.com`,
      password: 'otherpassword123',
      email_confirm: true
    });

    expect(otherAuthError).toBeNull();
    otherUserId = otherAuth.user!.id;

    await supabaseAdmin
      .from('users')
      .insert({
        id: otherUserId,
        email: otherAuth.user!.email!,
        full_name: 'Other RLS User',
        role: 'user'
      });

    // Create test tool
    const { data: tool, error: toolError } = await supabaseAdmin
      .from('tools')
      .insert({
        name: `RLS Test Tool ${Date.now()}`,
        description: 'Test tool for RLS testing',
        url: 'https://example.com/rls-test',
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
    if (adminUserId) await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    if (regularUserId) await supabaseAdmin.auth.admin.deleteUser(regularUserId);
    if (otherUserId) await supabaseAdmin.auth.admin.deleteUser(otherUserId);
    if (testToolId) await supabaseAdmin.from('tools').delete().eq('id', testToolId);
  });

  describe('Users Table RLS', () => {
    it('should allow users to view their own profile', async () => {
      // Create client for regular user
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      // Sign in as regular user
      const { data: { session }, error: signInError } = await regularClient.auth.signInWithPassword({
        email: `regular-rls-${Date.now()}@example.com`,
        password: 'regularpassword123'
      });

      expect(signInError).toBeNull();
      expect(session).toBeDefined();

      // Should be able to view own profile
      const { data: ownProfile, error: ownProfileError } = await regularClient
        .from('users')
        .select('*')
        .eq('id', regularUserId)
        .single();

      expect(ownProfileError).toBeNull();
      expect(ownProfile).toBeDefined();
      expect(ownProfile.id).toBe(regularUserId);
    });

    it('should prevent users from viewing other users profiles', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-rls-${Date.now()}@example.com`,
        password: 'regularpassword123'
      });

      // Should not be able to view other user's profile
      const { data: otherProfile, error: otherProfileError } = await regularClient
        .from('users')
        .select('*')
        .eq('id', otherUserId)
        .single();

      expect(otherProfileError).toBeDefined();
      expect(otherProfile).toBeNull();
    });

    it('should allow admins to view all user profiles', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-rls-${Date.now()}@example.com`,
        password: 'adminpassword123'
      });

      // Should be able to view all profiles
      const { data: allProfiles, error: allProfilesError } = await adminClient
        .from('users')
        .select('*');

      expect(allProfilesError).toBeNull();
      expect(allProfiles).toBeDefined();
      expect(allProfiles!.length).toBeGreaterThan(0);
    });
  });

  describe('Credit Balances Table RLS', () => {
    it('should allow users to view their own credit balance', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-rls-${Date.now()}@example.com`,
        password: 'regularpassword123'
      });

      // Grant some credits first
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: regularUserId,
        p_amount: 100,
        p_reason: 'RLS test'
      });

      // Should be able to view own balance
      const { data: ownBalance, error: ownBalanceError } = await regularClient
        .from('credit_balances')
        .select('*')
        .eq('user_id', regularUserId)
        .single();

      expect(ownBalanceError).toBeNull();
      expect(ownBalance).toBeDefined();
      expect(ownBalance.user_id).toBe(regularUserId);
    });

    it('should prevent users from viewing other users credit balances', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-rls-${Date.now()}@example.com`,
        password: 'regularpassword123'
      });

      // Grant credits to other user
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: otherUserId,
        p_amount: 50,
        p_reason: 'RLS test'
      });

      // Should not be able to view other user's balance
      const { data: otherBalance, error: otherBalanceError } = await regularClient
        .from('credit_balances')
        .select('*')
        .eq('user_id', otherUserId)
        .single();

      expect(otherBalanceError).toBeDefined();
      expect(otherBalance).toBeNull();
    });

    it('should allow admins to view all credit balances', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-rls-${Date.now()}@example.com`,
        password: 'adminpassword123'
      });

      // Grant credits to both users
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: regularUserId,
        p_amount: 100,
        p_reason: 'RLS test'
      });

      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: otherUserId,
        p_amount: 50,
        p_reason: 'RLS test'
      });

      // Should be able to view all balances
      const { data: allBalances, error: allBalancesError } = await adminClient
        .from('credit_balances')
        .select('*');

      expect(allBalancesError).toBeNull();
      expect(allBalances).toBeDefined();
      expect(allBalances!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Credit Transactions Table RLS', () => {
    it('should allow users to view their own transactions', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-rls-${Date.now()}@example.com`,
        password: 'regularpassword123'
      });

      // Create some transactions
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: regularUserId,
        p_amount: 100,
        p_reason: 'RLS test grant'
      });

      await supabaseAdmin.rpc('consume_credits', {
        p_user_id: regularUserId,
        p_amount: 10,
        p_tool_id: testToolId,
        p_idempotency_key: `rls-test-${Date.now()}`
      });

      // Should be able to view own transactions
      const { data: ownTransactions, error: ownTransactionsError } = await regularClient
        .from('credit_transactions')
        .select('*')
        .eq('user_id', regularUserId);

      expect(ownTransactionsError).toBeNull();
      expect(ownTransactions).toBeDefined();
      expect(ownTransactions!.length).toBeGreaterThan(0);
    });

    it('should prevent users from viewing other users transactions', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-rls-${Date.now()}@example.com`,
        password: 'regularpassword123'
      });

      // Create transactions for other user
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: otherUserId,
        p_amount: 50,
        p_reason: 'RLS test'
      });

      // Should not be able to view other user's transactions
      const { data: otherTransactions, error: otherTransactionsError } = await regularClient
        .from('credit_transactions')
        .select('*')
        .eq('user_id', otherUserId);

      expect(otherTransactionsError).toBeDefined();
      expect(otherTransactions).toBeNull();
    });
  });

  describe('Tools Table RLS', () => {
    it('should allow authenticated users to view active tools', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-rls-${Date.now()}@example.com`,
        password: 'regularpassword123'
      });

      // Should be able to view active tools
      const { data: activeTools, error: activeToolsError } = await regularClient
        .from('tools')
        .select('*')
        .eq('is_active', true);

      expect(activeToolsError).toBeNull();
      expect(activeTools).toBeDefined();
      expect(activeTools!.length).toBeGreaterThan(0);
    });

    it('should prevent users from modifying tools', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-rls-${Date.now()}@example.com`,
        password: 'regularpassword123'
      });

      // Should not be able to update tools
      const { data: updateResult, error: updateError } = await regularClient
        .from('tools')
        .update({ description: 'Unauthorized update' })
        .eq('id', testToolId)
        .select();

      expect(updateError).toBeDefined();
      expect(updateResult).toBeNull();
    });

    it('should allow admins to manage tools', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-rls-${Date.now()}@example.com`,
        password: 'adminpassword123'
      });

      // Should be able to update tools
      const { data: updateResult, error: updateError } = await adminClient
        .from('tools')
        .update({ description: 'Admin authorized update' })
        .eq('id', testToolId)
        .select();

      expect(updateError).toBeNull();
      expect(updateResult).toBeDefined();
      expect(updateResult![0].description).toBe('Admin authorized update');
    });
  });

  describe('Usage Logs Table RLS', () => {
    it('should allow users to view their own usage logs', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-rls-${Date.now()}@example.com`,
        password: 'regularpassword123'
      });

      // Create usage log
      await supabaseAdmin
        .from('usage_logs')
        .insert({
          user_id: regularUserId,
          tool_id: testToolId,
          status: 'success',
          credits_consumed: 5,
          response_time_ms: 1000
        });

      // Should be able to view own usage logs
      const { data: ownLogs, error: ownLogsError } = await regularClient
        .from('usage_logs')
        .select('*')
        .eq('user_id', regularUserId);

      expect(ownLogsError).toBeNull();
      expect(ownLogs).toBeDefined();
      expect(ownLogs!.length).toBeGreaterThan(0);
    });

    it('should prevent users from viewing other users usage logs', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-rls-${Date.now()}@example.com`,
        password: 'regularpassword123'
      });

      // Create usage log for other user
      await supabaseAdmin
        .from('usage_logs')
        .insert({
          user_id: otherUserId,
          tool_id: testToolId,
          status: 'success',
          credits_consumed: 5,
          response_time_ms: 1000
        });

      // Should not be able to view other user's logs
      const { data: otherLogs, error: otherLogsError } = await regularClient
        .from('usage_logs')
        .select('*')
        .eq('user_id', otherUserId);

      expect(otherLogsError).toBeDefined();
      expect(otherLogs).toBeNull();
    });

    it('should allow admins to view all usage logs', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-rls-${Date.now()}@example.com`,
        password: 'adminpassword123'
      });

      // Create usage logs for both users
      await supabaseAdmin
        .from('usage_logs')
        .insert([
          {
            user_id: regularUserId,
            tool_id: testToolId,
            status: 'success',
            credits_consumed: 5,
            response_time_ms: 1000
          },
          {
            user_id: otherUserId,
            tool_id: testToolId,
            status: 'success',
            credits_consumed: 5,
            response_time_ms: 1000
          }
        ]);

      // Should be able to view all logs
      const { data: allLogs, error: allLogsError } = await adminClient
        .from('usage_logs')
        .select('*');

      expect(allLogsError).toBeNull();
      expect(allLogs).toBeDefined();
      expect(allLogs!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Admin Audit Logs Table RLS', () => {
    it('should only allow admins to view audit logs', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-rls-${Date.now()}@example.com`,
        password: 'regularpassword123'
      });

      // Create audit log
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'CREATE',
        p_resource_type: 'tool',
        p_resource_id: testToolId,
        p_details: { test: true }
      });

      // Regular user should not be able to view audit logs
      const { data: auditLogs, error: auditLogsError } = await regularClient
        .from('admin_audit_logs')
        .select('*');

      expect(auditLogsError).toBeDefined();
      expect(auditLogs).toBeNull();
    });

    it('should allow admins to view audit logs', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-rls-${Date.now()}@example.com`,
        password: 'adminpassword123'
      });

      // Create audit log
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'CREATE',
        p_resource_type: 'tool',
        p_resource_id: testToolId,
        p_details: { test: true }
      });

      // Admin should be able to view audit logs
      const { data: auditLogs, error: auditLogsError } = await adminClient
        .from('admin_audit_logs')
        .select('*');

      expect(auditLogsError).toBeNull();
      expect(auditLogs).toBeDefined();
      expect(auditLogs!.length).toBeGreaterThan(0);
    });
  });

  describe('Unauthenticated Access', () => {
    it('should prevent unauthenticated access to protected tables', async () => {
      const unauthenticatedClient = createClient(supabaseUrl, supabaseAnonKey);

      // Should not be able to access users table
      const { data: users, error: usersError } = await unauthenticatedClient
        .from('users')
        .select('*');

      expect(usersError).toBeDefined();
      expect(users).toBeNull();

      // Should not be able to access credit_balances table
      const { data: balances, error: balancesError } = await unauthenticatedClient
        .from('credit_balances')
        .select('*');

      expect(balancesError).toBeDefined();
      expect(balances).toBeNull();

      // Should not be able to access credit_transactions table
      const { data: transactions, error: transactionsError } = await unauthenticatedClient
        .from('credit_transactions')
        .select('*');

      expect(transactionsError).toBeDefined();
      expect(transactions).toBeNull();

      // Should not be able to access usage_logs table
      const { data: logs, error: logsError } = await unauthenticatedClient
        .from('usage_logs')
        .select('*');

      expect(logsError).toBeDefined();
      expect(logs).toBeNull();

      // Should not be able to access admin_audit_logs table
      const { data: auditLogs, error: auditLogsError } = await unauthenticatedClient
        .from('admin_audit_logs')
        .select('*');

      expect(auditLogsError).toBeDefined();
      expect(auditLogs).toBeNull();
    });

    it('should allow unauthenticated access to active tools only', async () => {
      const unauthenticatedClient = createClient(supabaseUrl, supabaseAnonKey);

      // Should be able to view active tools
      const { data: activeTools, error: activeToolsError } = await unauthenticatedClient
        .from('tools')
        .select('*')
        .eq('is_active', true);

      expect(activeToolsError).toBeNull();
      expect(activeTools).toBeDefined();
      expect(activeTools!.length).toBeGreaterThan(0);

      // Should not be able to view inactive tools
      const { data: inactiveTools, error: inactiveToolsError } = await unauthenticatedClient
        .from('tools')
        .select('*')
        .eq('is_active', false);

      expect(inactiveToolsError).toBeDefined();
      expect(inactiveTools).toBeNull();
    });
  });
});
