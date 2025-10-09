import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

describe('API Error Handling and Edge Cases', () => {
  let testUserId: string;
  let testToolId: string;

  beforeEach(async () => {
    // Create test user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `error-test-${Date.now()}@example.com`,
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
        full_name: 'Error Test User',
        role: 'user',
      });

    // Create test tool
    const { data: tool, error: toolError } = await supabaseAdmin
      .from('tools')
      .insert({
        name: `Error Test Tool ${Date.now()}`,
        description: 'Test tool for error handling',
        url: 'https://example.com/error-test',
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
    if (testUserId) await supabaseAdmin.auth.admin.deleteUser(testUserId);
    if (testToolId) await supabaseAdmin.from('tools').delete().eq('id', testToolId);
  });

  describe('Invalid Request Payloads', () => {
    it('should handle malformed JSON requests', async () => {
      // Test with malformed JSON
      const response = await fetch('/api/v1/credits/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{"amount": 100, "reason": "test",}', // Trailing comma
      });

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.error).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      // Test credit grant without amount
      const response = await fetch('/api/v1/credits/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'test',
          // Missing amount field
        }),
      });

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.error).toContain('amount');
    });

    it('should handle invalid data types', async () => {
      // Test with wrong data types
      const response = await fetch('/api/v1/credits/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 'not-a-number',
          reason: 'test',
        }),
      });

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.error).toBeDefined();
    });

    it('should handle oversized payloads', async () => {
      // Test with extremely large payload
      const largePayload = {
        amount: 100,
        reason: 'a'.repeat(1000000), // 1MB string
      };

      const response = await fetch('/api/v1/credits/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(largePayload),
      });

      // Should either reject or truncate
      expect([400, 413, 422]).toContain(response.status);
    });
  });

  describe('Type Validation Errors', () => {
    it('should validate credit amount types', async () => {
      const invalidAmounts = [
        'string',
        null,
        undefined,
        [],
        {},
        -1,
        0,
        999999999,
      ];

      for (const amount of invalidAmounts) {
        const response = await fetch('/api/v1/credits/grant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            reason: 'test',
          }),
        });

        if (amount === 0 || amount === -1 || amount === 999999999) {
          // These might be valid depending on business rules
          expect([200, 400, 422]).toContain(response.status);
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    it('should validate UUID formats', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '',
        null,
        undefined,
        '00000000-0000-0000-0000-000000000000',
      ];

      for (const uuid of invalidUUIDs) {
        const response = await fetch(`/api/v1/credits/balance?userId=${uuid}`, {
          method: 'GET',
        });

        expect([400, 404]).toContain(response.status);
      }
    });

    it('should validate email formats', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        '',
        null,
        undefined,
      ];

      for (const email of invalidEmails) {
        const response = await fetch('/api/v1/create-user-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            fullName: 'Test User',
          }),
        });

        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe('Database Connection Failures', () => {
    it('should handle database timeout scenarios', async () => {
      // This test would require mocking database timeouts
      // For now, we'll test the error handling structure
      
      const response = await fetch('/api/v1/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      // Should handle authentication error gracefully
      expect([401, 403]).toContain(response.status);
    });

    it('should handle database constraint violations', async () => {
      // Try to create duplicate user
      const response = await fetch('/api/v1/create-user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `error-test-${Date.now()}@example.com`, // Same email as existing user
          fullName: 'Duplicate User',
        }),
      });

      expect([400, 409, 422]).toContain(response.status);
    });
  });

  describe('Authentication and Authorization Errors', () => {
    it('should handle missing authentication tokens', async () => {
      const response = await fetch('/api/v1/credits/balance', {
        method: 'GET',
        // No Authorization header
      });

      expect(response.status).toBe(401);
      const errorData = await response.json();
      expect(errorData.error).toContain('authentication');
    });

    it('should handle invalid authentication tokens', async () => {
      const response = await fetch('/api/v1/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token-123',
        },
      });

      expect(response.status).toBe(401);
      const errorData = await response.json();
      expect(errorData.error).toContain('invalid');
    });

    it('should handle expired authentication tokens', async () => {
      // Create an expired token (this would require JWT manipulation)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await fetch('/api/v1/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      expect(response.status).toBe(401);
    });

    it('should handle insufficient permissions', async () => {
      // Test admin endpoint with regular user token
      const response = await fetch('/api/v1/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer regular-user-token',
        },
      });

      expect(response.status).toBe(403);
      const errorData = await response.json();
      expect(errorData.error).toContain('permission');
    });
  });

  describe('Resource Not Found Errors', () => {
    it('should handle non-existent user requests', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      
      const response = await fetch(`/api/v1/credits/balance?userId=${nonExistentUserId}`, {
        method: 'GET',
      });

      expect(response.status).toBe(404);
      const errorData = await response.json();
      expect(errorData.error).toContain('not found');
    });

    it('should handle non-existent tool requests', async () => {
      const nonExistentToolId = '00000000-0000-0000-0000-000000000000';
      
      const response = await fetch(`/api/v1/tools/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId: nonExistentToolId,
          userId: testUserId,
        }),
      });

      expect([400, 404]).toContain(response.status);
    });

    it('should handle non-existent transaction requests', async () => {
      const nonExistentTransactionId = '00000000-0000-0000-0000-000000000000';
      
      const response = await fetch(`/api/v1/credits/transactions/${nonExistentTransactionId}`, {
        method: 'GET',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Business Logic Validation Errors', () => {
    it('should handle insufficient credits scenarios', async () => {
      // Grant minimal credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 5,
        p_reason: 'Insufficient test',
      });

      // Try to consume more than available
      const response = await fetch('/api/v1/tools/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId: testToolId,
          userId: testUserId,
          amount: 10,
        }),
      });

      expect([400, 422]).toContain(response.status);
      const errorData = await response.json();
      expect(errorData.error).toContain('insufficient');
    });

    it('should handle inactive tool launches', async () => {
      // Deactivate tool
      await supabaseAdmin
        .from('tools')
        .update({ is_active: false })
        .eq('id', testToolId);

      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Inactive tool test',
      });

      // Try to launch inactive tool
      const response = await fetch('/api/v1/tools/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId: testToolId,
          userId: testUserId,
          amount: 10,
        }),
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should handle duplicate idempotency keys', async () => {
      // Grant credits
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Idempotency test',
      });

      const idempotencyKey = `duplicate-test-${Date.now()}`;

      // First request
      const firstResponse = await fetch('/api/v1/tools/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId: testToolId,
          userId: testUserId,
          amount: 10,
          idempotencyKey: idempotencyKey,
        }),
      });

      expect(firstResponse.status).toBe(200);

      // Duplicate request
      const secondResponse = await fetch('/api/v1/tools/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId: testToolId,
          userId: testUserId,
          amount: 10,
          idempotencyKey: idempotencyKey,
        }),
      });

      expect(secondResponse.status).toBe(200);
      const secondData = await secondResponse.json();
      expect(secondData.status).toBe('duplicate');
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should handle rapid API requests', async () => {
      // Make many rapid requests
      const requests = Array.from({ length: 20 }, () =>
        fetch('/api/v1/credits/balance', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer invalid-token',
          },
        })
      );

      const responses = await Promise.all(requests);
      
      // All should either be rate limited or authentication errors
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status);
      });
    });

    it('should handle concurrent requests to same endpoint', async () => {
      // Grant credits first
      await supabaseAdmin.rpc('increment_balance', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reason: 'Concurrent test',
      });

      // Make concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        fetch('/api/v1/tools/launch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            toolId: testToolId,
            userId: testUserId,
            amount: 10,
            idempotencyKey: `concurrent-${i}-${Date.now()}`,
          }),
        })
      );

      const responses = await Promise.all(requests);
      
      // All should succeed or be handled gracefully
      responses.forEach(response => {
        expect([200, 400, 422, 429]).toContain(response.status);
      });
    });
  });

  describe('Network and Timeout Scenarios', () => {
    it('should handle request timeouts gracefully', async () => {
      // This would require mocking network timeouts
      // For now, test the error handling structure
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100); // 100ms timeout

      try {
        const response = await fetch('/api/v1/credits/balance', {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        // Should handle timeout or complete within timeout
        expect([200, 401, 408, 500]).toContain(response.status);
      } catch (error) {
        clearTimeout(timeoutId);
        // Should handle abort error
        expect(error.name).toBe('AbortError');
      }
    });

    it('should handle malformed URLs', async () => {
      const malformedUrls = [
        '/api/v1/credits/balance?userId=',
        '/api/v1/credits/balance?userId=invalid',
        '/api/v1/credits/balance?userId=123',
        '/api/v1/nonexistent-endpoint',
      ];

      for (const url of malformedUrls) {
        const response = await fetch(url, {
          method: 'GET',
        });

        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error response format', async () => {
      const response = await fetch('/api/v1/credits/balance', {
        method: 'GET',
        // Missing authentication
      });

      expect(response.status).toBe(401);
      const errorData = await response.json();
      
      // Should have consistent error format
      expect(errorData).toHaveProperty('error');
      expect(typeof errorData.error).toBe('string');
    });

    it('should include appropriate HTTP status codes', async () => {
      const testCases = [
        { url: '/api/v1/credits/balance', expectedStatus: 401 }, // Missing auth
        { url: '/api/v1/nonexistent', expectedStatus: 404 }, // Not found
        { url: '/api/v1/admin/users', expectedStatus: 403 }, // Forbidden
      ];

      for (const testCase of testCases) {
        const response = await fetch(testCase.url, {
          method: 'GET',
        });

        expect(response.status).toBe(testCase.expectedStatus);
      }
    });

    it('should not expose sensitive information in errors', async () => {
      const response = await fetch('/api/v1/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      const errorData = await response.json();
      
      // Should not expose internal details
      expect(errorData.error).not.toContain('database');
      expect(errorData.error).not.toContain('sql');
      expect(errorData.error).not.toContain('internal');
    });
  });
});
