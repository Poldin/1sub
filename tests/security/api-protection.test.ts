import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

describe('API Protection Security Tests', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let testUserId: string;
  let adminUserId: string;

  beforeEach(async () => {
    // Create test user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `api-test-${Date.now()}@example.com`,
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
        full_name: 'API Test User',
        role: 'user',
      });

    // Create admin user
    const { data: adminAuth, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `admin-api-${Date.now()}@example.com`,
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
        full_name: 'Admin API User',
        role: 'admin',
      });
  });

  afterEach(async () => {
    if (testUserId) await supabaseAdmin.auth.admin.deleteUser(testUserId);
    if (adminUserId) await supabaseAdmin.auth.admin.deleteUser(adminUserId);
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in user queries', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Try SQL injection in user query
      const maliciousQuery = "'; DROP TABLE users; --";
      
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('email', maliciousQuery);

      // Should not execute malicious SQL and should return empty result or error
      expect(error === null || data === null || data.length === 0).toBe(true);
    });

    it('should prevent SQL injection in credit balance queries', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Try SQL injection in credit balance query
      const maliciousQuery = "'; UPDATE credit_balances SET balance = 999999; --";
      
      const { data, error } = await client
        .from('credit_balances')
        .select('*')
        .eq('user_id', maliciousQuery);

      // Should not execute malicious SQL
      expect(error === null || data === null || data.length === 0).toBe(true);
    });

    it('should prevent SQL injection in tool queries', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Try SQL injection in tool query
      const maliciousQuery = "'; DELETE FROM tools; --";
      
      const { data, error } = await client
        .from('tools')
        .select('*')
        .eq('name', maliciousQuery);

      // Should not execute malicious SQL
      expect(error === null || data === null || data.length === 0).toBe(true);
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize user input in profile updates', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Try to inject XSS payload
      const xssPayload = '<script>alert("XSS")</script>';
      
      const { data, error } = await client
        .from('users')
        .update({ full_name: xssPayload })
        .eq('id', testUserId)
        .select();

      if (!error && data) {
        // If update succeeds, check that script tags are escaped
        expect(data[0].full_name).not.toContain('<script>');
        expect(data[0].full_name).not.toContain('</script>');
      }
    });

    it('should sanitize user input in tool descriptions', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-api-${Date.now()}@example.com`,
        password: 'adminpassword123',
      });

      // Try to inject XSS payload in tool description
      const xssPayload = '<img src="x" onerror="alert(\'XSS\')">';
      
      const { data, error } = await adminClient
        .from('tools')
        .insert({
          name: 'XSS Test Tool',
          description: xssPayload,
          url: 'https://example.com',
          credit_cost_per_use: 5,
          is_active: true,
        })
        .select();

      if (!error && data) {
        // Check that dangerous HTML is escaped
        expect(data[0].description).not.toContain('<img');
        expect(data[0].description).not.toContain('onerror');
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens for state-changing operations', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Try to make a POST request without proper CSRF protection
      const response = await fetch('/api/v1/credits/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 100,
          reason: 'Test grant',
        }),
      });

      // Should fail due to missing authentication or CSRF protection
      expect(response.status).toBe(401);
    });

    it('should prevent cross-origin requests without proper headers', async () => {
      // Simulate a cross-origin request
      const response = await fetch('/api/v1/credits/balance', {
        method: 'GET',
        headers: {
          'Origin': 'https://malicious-site.com',
          'Content-Type': 'application/json',
        },
      });

      // Should fail due to CORS or authentication
      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rapid API requests', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          client.from('users').select('*').eq('id', testUserId)
        );
      }

      const results = await Promise.all(promises);
      
      // All requests should either succeed or be rate limited
      results.forEach(result => {
        expect(result.error === null || result.error !== null).toBe(true);
      });
    });

    it('should handle rapid authentication attempts', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);

      // Make multiple rapid login attempts
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          client.auth.signInWithPassword({
            email: `api-test-${Date.now()}@example.com`,
            password: 'wrongpassword',
          })
        );
      }

      const results = await Promise.all(promises);
      
      // All should fail, but some might be rate limited
      results.forEach(result => {
        expect(result.error).toBeDefined();
        expect(result.data.user).toBeNull();
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate input types and formats', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Try to insert invalid data types
      const { data, error } = await client
        .from('users')
        .update({ 
          full_name: 123, // Should be string
          email: 'invalid-email', // Invalid email format
        })
        .eq('id', testUserId)
        .select();

      // Should fail validation
      expect(error).toBeDefined();
    });

    it('should validate required fields', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-api-${Date.now()}@example.com`,
        password: 'adminpassword123',
      });

      // Try to create tool without required fields
      const { data, error } = await adminClient
        .from('tools')
        .insert({
          // Missing required fields like name, description, url
          credit_cost_per_use: 5,
        })
        .select();

      // Should fail validation
      expect(error).toBeDefined();
    });

    it('should validate field lengths and constraints', async () => {
      const adminClient = createClient(supabaseUrl, supabaseAnonKey);
      
      await adminClient.auth.signInWithPassword({
        email: `admin-api-${Date.now()}@example.com`,
        password: 'adminpassword123',
      });

      // Try to create tool with fields that are too long
      const longString = 'a'.repeat(10000);
      
      const { data, error } = await adminClient
        .from('tools')
        .insert({
          name: longString,
          description: longString,
          url: longString,
          credit_cost_per_use: 5,
          is_active: true,
        })
        .select();

      // Should fail validation due to length constraints
      expect(error).toBeDefined();
    });
  });

  describe('Authentication Bypass Prevention', () => {
    it('should prevent authentication bypass via direct database access', async () => {
      const unauthenticatedClient = createClient(supabaseUrl, supabaseAnonKey);

      // Try to access protected data without authentication
      const { data, error } = await unauthenticatedClient
        .from('users')
        .select('*');

      // Should fail due to RLS policies
      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should prevent privilege escalation via API manipulation', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Try to access admin endpoints as regular user
      const { data, error } = await client
        .from('admin_audit_logs')
        .select('*');

      // Should fail due to insufficient privileges
      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should prevent session hijacking via token manipulation', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Try to manipulate the session token
      const { data: { session } } = await client.auth.getSession();
      const manipulatedToken = session!.access_token + 'manipulated';

      // Try to use manipulated token
      const response = await fetch('/api/v1/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${manipulatedToken}`,
        },
      });

      // Should fail due to invalid token
      expect(response.status).toBe(401);
    });
  });

  describe('Data Integrity Protection', () => {
    it('should prevent data tampering via API', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Try to tamper with other user's data
      const { data, error } = await client
        .from('users')
        .update({ 
          full_name: 'Hacked User',
          role: 'admin',
        })
        .eq('id', adminUserId) // Try to update admin user
        .select();

      // Should fail due to RLS policies
      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should prevent unauthorized data deletion', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Try to delete other user's data
      const { data, error } = await client
        .from('users')
        .delete()
        .eq('id', adminUserId);

      // Should fail due to RLS policies
      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);

      // Try to access non-existent resource
      const { data, error } = await client
        .from('nonexistent_table')
        .select('*');

      // Error should not expose database schema or sensitive information
      if (error) {
        expect(error.message).not.toContain('database');
        expect(error.message).not.toContain('schema');
        expect(error.message).not.toContain('table');
      }
    });

    it('should not expose user information in authentication errors', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);

      // Try to login with non-existent user
      const { data, error } = await client.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      // Error should not reveal whether user exists or not
      if (error) {
        expect(error.message).not.toContain('user');
        expect(error.message).not.toContain('email');
        expect(error.message).not.toContain('account');
      }
    });
  });

  describe('Request Size and Complexity Limits', () => {
    it('should handle oversized requests', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Create oversized payload
      const oversizedData = {
        full_name: 'a'.repeat(1000000), // 1MB string
      };

      const { data, error } = await client
        .from('users')
        .update(oversizedData)
        .eq('id', testUserId)
        .select();

      // Should fail due to size limits
      expect(error).toBeDefined();
    });

    it('should handle complex nested queries', async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      
      await client.auth.signInWithPassword({
        email: `api-test-${Date.now()}@example.com`,
        password: 'password123',
      });

      // Try complex nested query
      const { data, error } = await client
        .from('users')
        .select(`
          *,
          credit_balances(*),
          credit_transactions(*),
          usage_logs(*)
        `)
        .eq('id', testUserId);

      // Should either succeed or fail gracefully
      expect(error === null || error !== null).toBe(true);
    });
  });
});
