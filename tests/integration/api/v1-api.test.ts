/**
 * V1 API Integration Tests
 *
 * Tests the vendor tool integration endpoints including:
 * - Credit consumption
 * - User verification
 * - Token refresh
 * - Tool linking
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  createTestUser,
  createTestVendor,
  cleanupTestUser,
  getBalance,
  getTestSupabase,
  addTestCredits,
} from '../../helpers/db-helpers';

describe('V1 API - Vendor Tool Integration', () => {
  let testUserId: string;
  let testUserEmail: string;
  let testVendorId: string;
  let testToolId: string;
  let testApiKey: string;

  beforeAll(async () => {
    const testUser = await createTestUser();
    testUserId = testUser.userId;
    testUserEmail = testUser.email;

    // Add initial credits
    await addTestCredits(testUserId, 100);

    // Create test vendor and tool
    const vendor = await createTestVendor();
    testVendorId = vendor.vendorId;

    const supabase = getTestSupabase();

    // Create a test tool
    const { data: tool, error: toolError } = await supabase
      .from('vendor_tools')
      .insert({
        name: 'Test Tool',
        description: 'Test tool for integration tests',
        credits_per_use: 5,
        vendor_id: testVendorId,
        is_active: true,
      })
      .select()
      .single();

    expect(toolError).toBeNull();
    expect(tool).toBeDefined();
    testToolId = tool!.id;

    // Create API key for the tool
    const bcrypt = await import('bcryptjs');
    const rawApiKey = `sk-tool-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const hashedApiKey = await bcrypt.hash(rawApiKey, 10);

    const { data: apiKey, error: apiKeyError } = await supabase
      .from('vendor_api_keys')
      .insert({
        tool_id: testToolId,
        api_key_hash: hashedApiKey,
        name: 'Test API Key',
      })
      .select()
      .single();

    expect(apiKeyError).toBeNull();
    testApiKey = rawApiKey;
  });

  afterAll(async () => {
    const supabase = getTestSupabase();

    // Cleanup tool and API keys
    await supabase.from('vendor_api_keys').delete().eq('tool_id', testToolId);
    await supabase.from('vendor_tools').delete().eq('id', testToolId);

    await cleanupTestUser(testUserId);
    await cleanupTestUser(testVendorId);
  });

  describe('POST /api/v1/credits/consume', () => {
    it('should consume credits with valid API key and user', async () => {
      const initialBalance = await getBalance(testUserId);

      const response = await fetch(`${process.env.TEST_API_URL}/api/v1/credits/consume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': testApiKey,
        },
        body: JSON.stringify({
          user_id: testUserId,
          amount: 5,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify balance decreased
      const finalBalance = await getBalance(testUserId);
      expect(finalBalance).toBe(initialBalance - 5);
    });

    it('should reject request without API key', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/v1/credits/consume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: testUserId,
          amount: 5,
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid API key', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/v1/credits/consume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'invalid-key-12345',
        },
        body: JSON.stringify({
          user_id: testUserId,
          amount: 5,
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject consumption when insufficient balance', async () => {
      const currentBalance = await getBalance(testUserId);

      const response = await fetch(`${process.env.TEST_API_URL}/api/v1/credits/consume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': testApiKey,
        },
        body: JSON.stringify({
          user_id: testUserId,
          amount: currentBalance + 1000,
        }),
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('insufficient');
    });

    it('should enforce rate limiting on API endpoint', async () => {
      // Make multiple rapid requests
      const requests = Array.from({ length: 100 }, () =>
        fetch(`${process.env.TEST_API_URL}/api/v1/credits/consume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': testApiKey,
          },
          body: JSON.stringify({
            user_id: testUserId,
            amount: 1,
          }),
        })
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429)
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000); // Longer timeout for rate limit test
  });

  describe('POST /api/v1/verify-user', () => {
    it('should verify valid user exists', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/v1/verify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': testApiKey,
        },
        body: JSON.stringify({
          user_id: testUserId,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.exists).toBe(true);
      expect(data.user_id).toBe(testUserId);
    });

    it('should return false for non-existent user', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/v1/verify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': testApiKey,
        },
        body: JSON.stringify({
          user_id: '00000000-0000-0000-0000-000000000000',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.exists).toBe(false);
    });

    it('should reject invalid UUID format', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/v1/verify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': testApiKey,
        },
        body: JSON.stringify({
          user_id: 'not-a-uuid',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Tool Linking API', () => {
    describe('POST /api/v1/tools/link/generate-code', () => {
      it('should generate linking code for user', async () => {
        const response = await fetch(
          `${process.env.TEST_API_URL}/api/v1/tools/link/generate-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': testApiKey,
            },
            body: JSON.stringify({
              user_id: testUserId,
              tool_id: testToolId,
            }),
          }
        );

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data.code).toBeDefined();
        expect(data.code).toMatch(/^[A-Z0-9]{6}$/); // 6-character code
        expect(data.expires_at).toBeDefined();
      });

      it('should reject without valid API key', async () => {
        const response = await fetch(
          `${process.env.TEST_API_URL}/api/v1/tools/link/generate-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: testUserId,
              tool_id: testToolId,
            }),
          }
        );

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/v1/tools/link/exchange-code', () => {
      it('should exchange valid code for access', async () => {
        // First generate a code
        const generateResponse = await fetch(
          `${process.env.TEST_API_URL}/api/v1/tools/link/generate-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': testApiKey,
            },
            body: JSON.stringify({
              user_id: testUserId,
              tool_id: testToolId,
            }),
          }
        );

        const generateData = await generateResponse.json();
        const code = generateData.code;

        // Then exchange the code
        const exchangeResponse = await fetch(
          `${process.env.TEST_API_URL}/api/v1/tools/link/exchange-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': testApiKey,
            },
            body: JSON.stringify({
              code,
            }),
          }
        );

        expect(exchangeResponse.ok).toBe(true);
        const exchangeData = await exchangeResponse.json();
        expect(exchangeData.user_id).toBe(testUserId);
        expect(exchangeData.tool_id).toBe(testToolId);
      });

      it('should reject invalid code', async () => {
        const response = await fetch(
          `${process.env.TEST_API_URL}/api/v1/tools/link/exchange-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': testApiKey,
            },
            body: JSON.stringify({
              code: 'INVALID',
            }),
          }
        );

        expect(response.status).toBe(404);
      });

      it('should reject expired code', async () => {
        const supabase = getTestSupabase();

        // Create an expired code manually
        const { data: expiredCode } = await supabase
          .from('tool_link_codes')
          .insert({
            code: 'EXPIRED123',
            user_id: testUserId,
            tool_id: testToolId,
            expires_at: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
          })
          .select()
          .single();

        const response = await fetch(
          `${process.env.TEST_API_URL}/api/v1/tools/link/exchange-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': testApiKey,
            },
            body: JSON.stringify({
              code: 'EXPIRED123',
            }),
          }
        );

        expect(response.status).toBe(410); // Gone
      });
    });
  });

  describe('API Security', () => {
    it('should log API usage', async () => {
      const supabase = getTestSupabase();

      // Make an API call
      await fetch(`${process.env.TEST_API_URL}/api/v1/verify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': testApiKey,
        },
        body: JSON.stringify({
          user_id: testUserId,
        }),
      });

      // Check usage log
      const { data: logs } = await supabase
        .from('api_usage_logs')
        .select('*')
        .eq('tool_id', testToolId)
        .order('created_at', { ascending: false })
        .limit(1);

      expect(logs).toBeDefined();
      expect(logs!.length).toBeGreaterThan(0);
      expect(logs![0].endpoint).toContain('/api/v1');
    });

    it('should handle SQL injection attempts in user_id', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users;--",
        "' OR '1'='1",
        "1; DELETE FROM credit_transactions;--",
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await fetch(`${process.env.TEST_API_URL}/api/v1/verify-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': testApiKey,
          },
          body: JSON.stringify({
            user_id: maliciousInput,
          }),
        });

        // Should reject with 400 Bad Request
        expect(response.status).toBe(400);
      }
    });

    it('should sanitize XSS attempts in input', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
      ];

      for (const payload of xssPayloads) {
        const response = await fetch(`${process.env.TEST_API_URL}/api/v1/verify-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': testApiKey,
          },
          body: JSON.stringify({
            user_id: payload,
          }),
        });

        // Should reject malicious input
        expect(response.status).toBe(400);
      }
    });
  });
});
