import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

describe('Authorization Security Tests', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let adminUserId: string;
  let regularUserId: string;
  let otherUserId: string;

  beforeEach(async () => {
    // Create admin user
    const { data: adminAuth, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `admin-auth-${Date.now()}@example.com`,
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
        full_name: 'Admin User',
        role: 'admin',
      });

    // Create regular user
    const { data: regularAuth, error: regularAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `regular-auth-${Date.now()}@example.com`,
      password: 'regularpassword123',
      email_confirm: true,
    });

    expect(regularAuthError).toBeNull();
    regularUserId = regularAuth.user!.id;

    await supabaseAdmin
      .from('users')
      .insert({
        id: regularUserId,
        email: regularAuth.user!.email!,
        full_name: 'Regular User',
        role: 'user',
      });

    // Create another regular user
    const { data: otherAuth, error: otherAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `other-auth-${Date.now()}@example.com`,
      password: 'otherpassword123',
      email_confirm: true,
    });

    expect(otherAuthError).toBeNull();
    otherUserId = otherAuth.user!.id;

    await supabaseAdmin
      .from('users')
      .insert({
        id: otherUserId,
        email: otherAuth.user!.email!,
        full_name: 'Other User',
        role: 'user',
      });
  });

  afterEach(async () => {
    // Cleanup test users
    if (adminUserId) await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    if (regularUserId) await supabaseAdmin.auth.admin.deleteUser(regularUserId);
    if (otherUserId) await supabaseAdmin.auth.admin.deleteUser(otherUserId);
  });

  describe('Admin Access Control', () => {
    it('should allow admin to access admin routes', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-auth-${Date.now()}@example.com`,
        password: 'adminpassword123',
      });

      // Admin should be able to access admin endpoints
      const { data: users, error: usersError } = await adminClient
        .from('users')
        .select('*');

      expect(usersError).toBeNull();
      expect(users).toBeDefined();
      expect(users!.length).toBeGreaterThan(0);
    });

    it('should prevent regular users from accessing admin routes', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Regular user should not be able to access admin endpoints
      const { data: users, error: usersError } = await regularClient
        .from('users')
        .select('*');

      expect(usersError).toBeDefined();
      expect(users).toBeNull();
    });

    it('should prevent unauthenticated users from accessing admin routes', async () => {
      const unauthenticatedClient = createClient(supabaseUrl, supabaseAnonKey);

      // Unauthenticated user should not be able to access admin endpoints
      const { data: users, error: usersError } = await unauthenticatedClient
        .from('users')
        .select('*');

      expect(usersError).toBeDefined();
      expect(users).toBeNull();
    });
  });

  describe('User Data Access Control', () => {
    it('should allow users to access their own data', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // User should be able to access their own profile
      const { data: ownProfile, error: ownProfileError } = await regularClient
        .from('users')
        .select('*')
        .eq('id', regularUserId)
        .single();

      expect(ownProfileError).toBeNull();
      expect(ownProfile).toBeDefined();
      expect(ownProfile.id).toBe(regularUserId);
    });

    it('should prevent users from accessing other users data', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // User should not be able to access other user's profile
      const { data: otherProfile, error: otherProfileError } = await regularClient
        .from('users')
        .select('*')
        .eq('id', otherUserId)
        .single();

      expect(otherProfileError).toBeDefined();
      expect(otherProfile).toBeNull();
    });

    it('should allow admin to access all users data', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-auth-${Date.now()}@example.com`,
        password: 'adminpassword123',
      });

      // Admin should be able to access all user profiles
      const { data: allProfiles, error: allProfilesError } = await adminClient
        .from('users')
        .select('*');

      expect(allProfilesError).toBeNull();
      expect(allProfiles).toBeDefined();
      expect(allProfiles!.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Credit Balance Access Control', () => {
    it('should allow users to view their own credit balance', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Grant some credits first
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: regularUserId,
        p_amount: 100,
        p_reason: 'Test grant',
      });

      // User should be able to view their own balance
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
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Grant credits to other user
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: otherUserId,
        p_amount: 50,
        p_reason: 'Test grant',
      });

      // User should not be able to view other user's balance
      const { data: otherBalance, error: otherBalanceError } = await regularClient
        .from('credit_balances')
        .select('*')
        .eq('user_id', otherUserId)
        .single();

      expect(otherBalanceError).toBeDefined();
      expect(otherBalance).toBeNull();
    });

    it('should allow admin to view all credit balances', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-auth-${Date.now()}@example.com`,
        password: 'adminpassword123',
      });

      // Grant credits to both users
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: regularUserId,
        p_amount: 100,
        p_reason: 'Test grant',
      });

      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: otherUserId,
        p_amount: 50,
        p_reason: 'Test grant',
      });

      // Admin should be able to view all balances
      const { data: allBalances, error: allBalancesError } = await adminClient
        .from('credit_balances')
        .select('*');

      expect(allBalancesError).toBeNull();
      expect(allBalances).toBeDefined();
      expect(allBalances!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Transaction History Access Control', () => {
    it('should allow users to view their own transaction history', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Create some transactions
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: regularUserId,
        p_amount: 100,
        p_reason: 'Test grant',
      });

      // User should be able to view their own transactions
      const { data: ownTransactions, error: ownTransactionsError } = await regularClient
        .from('credit_transactions')
        .select('*')
        .eq('user_id', regularUserId);

      expect(ownTransactionsError).toBeNull();
      expect(ownTransactions).toBeDefined();
      expect(ownTransactions!.length).toBeGreaterThan(0);
    });

    it('should prevent users from viewing other users transaction history', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Create transactions for other user
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: otherUserId,
        p_amount: 50,
        p_reason: 'Test grant',
      });

      // User should not be able to view other user's transactions
      const { data: otherTransactions, error: otherTransactionsError } = await regularClient
        .from('credit_transactions')
        .select('*')
        .eq('user_id', otherUserId);

      expect(otherTransactionsError).toBeDefined();
      expect(otherTransactions).toBeNull();
    });
  });

  describe('Usage Logs Access Control', () => {
    it('should allow users to view their own usage logs', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Create usage log
      await supabaseAdmin
        .from('usage_logs')
        .insert({
          user_id: regularUserId,
          tool_id: 'test-tool-id',
          status: 'success',
          credits_consumed: 5,
          response_time_ms: 1000,
        });

      // User should be able to view their own usage logs
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
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Create usage log for other user
      await supabaseAdmin
        .from('usage_logs')
        .insert({
          user_id: otherUserId,
          tool_id: 'test-tool-id',
          status: 'success',
          credits_consumed: 5,
          response_time_ms: 1000,
        });

      // User should not be able to view other user's logs
      const { data: otherLogs, error: otherLogsError } = await regularClient
        .from('usage_logs')
        .select('*')
        .eq('user_id', otherUserId);

      expect(otherLogsError).toBeDefined();
      expect(otherLogs).toBeNull();
    });
  });

  describe('Admin Audit Logs Access Control', () => {
    it('should only allow admins to view audit logs', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Create audit log
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'CREATE',
        p_resource_type: 'user',
        p_resource_id: regularUserId,
        p_details: { test: true },
      });

      // Regular user should not be able to view audit logs
      const { data: auditLogs, error: auditLogsError } = await regularClient
        .from('admin_audit_logs')
        .select('*');

      expect(auditLogsError).toBeDefined();
      expect(auditLogs).toBeNull();
    });

    it('should allow admin to view audit logs', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-auth-${Date.now()}@example.com`,
        password: 'adminpassword123',
      });

      // Create audit log
      await supabaseAdmin.rpc('log_admin_action', {
        p_admin_id: adminUserId,
        p_action: 'CREATE',
        p_resource_type: 'user',
        p_resource_id: regularUserId,
        p_details: { test: true },
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

  describe('API Endpoint Authorization', () => {
    it('should protect admin API endpoints', async () => {
      // Test admin API endpoints with different user types
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Try to access admin API endpoint
      const response = await fetch('/api/v1/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await regularClient.auth.getSession()).data.session?.access_token}`,
        },
      });

      expect(response.status).toBe(403);
    });

    it('should allow admin to access admin API endpoints', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-auth-${Date.now()}@example.com`,
        password: 'adminpassword123',
      });

      // Try to access admin API endpoint
      const response = await fetch('/api/v1/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await adminClient.auth.getSession()).data.session?.access_token}`,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Role Escalation Prevention', () => {
    it('should prevent users from modifying their own role', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Try to update own role to admin
      const { data, error } = await regularClient
        .from('users')
        .update({ role: 'admin' })
        .eq('id', regularUserId)
        .select();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should prevent users from modifying other users roles', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Try to update other user's role
      const { data, error } = await regularClient
        .from('users')
        .update({ role: 'admin' })
        .eq('id', otherUserId)
        .select();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should allow admin to modify user roles', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-auth-${Date.now()}@example.com`,
        password: 'adminpassword123',
      });

      // Admin should be able to update user roles
      const { data, error } = await adminClient
        .from('users')
        .update({ role: 'admin' })
        .eq('id', regularUserId)
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data![0].role).toBe('admin');
    });
  });

  describe('Cross-User Data Manipulation', () => {
    it('should prevent users from modifying other users credit balances', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Try to modify other user's balance
      const { data, error } = await regularClient
        .from('credit_balances')
        .update({ balance: 999999 })
        .eq('user_id', otherUserId)
        .select();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should prevent users from creating transactions for other users', async () => {
      const regularClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await regularClient.auth.signInWithPassword({
        email: `regular-auth-${Date.now()}@example.com`,
        password: 'regularpassword123',
      });

      // Try to create transaction for other user
      const { data, error } = await regularClient
        .from('credit_transactions')
        .insert({
          user_id: otherUserId,
          amount: 100,
          transaction_type: 'grant',
          reason: 'Unauthorized grant',
        })
        .select();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });
});
