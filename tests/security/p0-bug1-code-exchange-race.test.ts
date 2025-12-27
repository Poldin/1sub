/**
 * P0 SECURITY TEST: Code Exchange Race Condition Prevention
 *
 * Tests Bug #1 Fix: Prevents duplicate token issuance via race condition
 *
 * VULNERABILITY: Two simultaneous exchange requests could both succeed
 * FIX: Atomic UPDATE...RETURNING ensures only one succeeds
 *
 * CRITICAL: This test MUST pass to prevent duplicate sessions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  createTestVendor,
  cleanupTestUser,
} from '../helpers/db-helpers';
import {
  createTestVendorTool,
  createTestSubscription,
  cleanupTestVendorTool,
} from '../helpers/vendor-integration-helpers';
import { createAuthorizationCode } from '@/domains/auth';

describe('P0 BUG #1: Code Exchange Race Condition Prevention', () => {
  let testUserId: string;
  let testVendorId: string;
  let testToolId: string;
  let testApiKey: string;
  let apiUrl: string;

  beforeAll(async () => {
    apiUrl = process.env.TEST_API_URL || 'http://localhost:3000';

    // Create test user and vendor
    const user = await createTestUser();
    testUserId = user.id;

    const vendor = await createTestVendor();
    testVendorId = vendor.id;

    const { tool, apiKey } = await createTestVendorTool(
      testVendorId,
      'https://example.com/callback',
      'https://example.com/webhook'
    );
    testToolId = tool.id;
    testApiKey = apiKey;

    // Create active subscription
    await createTestSubscription(testUserId, testToolId);
  });

  afterAll(async () => {
    await cleanupTestVendorTool(testToolId);
    await cleanupTestUser(testUserId);
    await cleanupTestUser(testVendorId);
  });

  it('should prevent same code from being exchanged twice (race condition)', async () => {
    // Create authorization code
    const authResult = await createAuthorizationCode(
      testToolId,
      testUserId,
      'https://example.com/callback',
      'test-state-' + Date.now()
    );

    expect(authResult.code).toBeDefined();

    // Simulate race condition: Send two simultaneous exchange requests
    const exchangePromise1 = fetch(`${apiUrl}/api/v1/authorize/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        code: authResult.code,
        redirectUri: 'https://example.com/callback',
      }),
    });

    const exchangePromise2 = fetch(`${apiUrl}/api/v1/authorize/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        code: authResult.code,
        redirectUri: 'https://example.com/callback',
      }),
    });

    // Wait for both to complete
    const [response1, response2] = await Promise.all([
      exchangePromise1,
      exchangePromise2,
    ]);

    const data1 = await response1.json();
    const data2 = await response2.json();

    // CRITICAL ASSERTION: Exactly ONE must succeed, ONE must fail
    const successCount = [data1.valid, data2.valid].filter(Boolean).length;
    const failCount = [data1.valid === false, data2.valid === false].filter(Boolean).length;

    expect(successCount).toBe(1);
    expect(failCount).toBe(1);

    // The failed one should have CODE_ALREADY_USED error
    const failedData = data1.valid === false ? data1 : data2;
    expect(failedData.error).toBe('CODE_ALREADY_USED');
    expect(failedData.message).toContain('already been exchanged');

    // The successful one should have a verification token
    const successData = data1.valid === true ? data1 : data2;
    expect(successData.verificationToken).toBeDefined();
    expect(successData.onesubUserId).toBe(testUserId);
  });

  it('should prevent 100 concurrent exchange attempts (stress test)', async () => {
    // Create authorization code
    const authResult = await createAuthorizationCode(
      testToolId,
      testUserId,
      'https://example.com/callback',
      'test-state-' + Date.now()
    );

    // Launch 100 concurrent exchange requests
    const requests = Array.from({ length: 100 }, () =>
      fetch(`${apiUrl}/api/v1/authorize/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({
          code: authResult.code,
          redirectUri: 'https://example.com/callback',
        }),
      })
    );

    const responses = await Promise.all(requests);
    const results = await Promise.all(responses.map(r => r.json()));

    // Count successes
    const successes = results.filter(r => r.valid === true);
    const failures = results.filter(r => r.valid === false);

    // CRITICAL: Exactly ONE success, 99 failures
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(99);

    // All failures should be CODE_ALREADY_USED
    const codeAlreadyUsedCount = failures.filter(
      r => r.error === 'CODE_ALREADY_USED'
    ).length;
    expect(codeAlreadyUsedCount).toBe(99);

    console.log('✅ Race condition prevented: 1 success, 99 rejected');
  });

  it('should reject code exchange after first successful exchange', async () => {
    // Create authorization code
    const authResult = await createAuthorizationCode(
      testToolId,
      testUserId,
      'https://example.com/callback',
      'test-state-' + Date.now()
    );

    // First exchange - should succeed
    const firstResponse = await fetch(`${apiUrl}/api/v1/authorize/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        code: authResult.code,
        redirectUri: 'https://example.com/callback',
      }),
    });

    const firstData = await firstResponse.json();
    expect(firstData.valid).toBe(true);
    expect(firstData.verificationToken).toBeDefined();

    // Second exchange - should fail with CODE_ALREADY_USED
    const secondResponse = await fetch(`${apiUrl}/api/v1/authorize/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        code: authResult.code,
        redirectUri: 'https://example.com/callback',
      }),
    });

    const secondData = await secondResponse.json();
    expect(secondData.valid).toBe(false);
    expect(secondData.error).toBe('CODE_ALREADY_USED');
  });

  it('should handle rapid sequential exchanges correctly', async () => {
    // Create authorization code
    const authResult = await createAuthorizationCode(
      testToolId,
      testUserId,
      'https://example.com/callback',
      'test-state-' + Date.now()
    );

    // Send 10 requests as fast as possible (sequential)
    const results = [];
    for (let i = 0; i < 10; i++) {
      const response = await fetch(`${apiUrl}/api/v1/authorize/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({
          code: authResult.code,
          redirectUri: 'https://example.com/callback',
        }),
      });
      results.push(await response.json());
    }

    // First should succeed, rest should fail
    expect(results[0].valid).toBe(true);
    for (let i = 1; i < 10; i++) {
      expect(results[i].valid).toBe(false);
      expect(results[i].error).toBe('CODE_ALREADY_USED');
    }
  });
});
