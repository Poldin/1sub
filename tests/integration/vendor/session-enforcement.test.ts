/**
 * TEST 2: Session Enforcement
 *
 * Verifies vendor session persists without constant 1sub verification calls.
 * Tests that vendors cache entitlements and don't verify on every request.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  createTestVendor,
  cleanupTestUser,
} from '../../helpers/db-helpers';
import {
  createTestVendorTool,
  createTestSubscription,
  cleanupTestVendorTool,
} from '../../helpers/vendor-integration-helpers';
import { MockVendorServer } from '../../mocks/vendor-server';
import { createAuthorizationCode, exchangeAuthorizationCode } from '@/domains/auth';

describe('TEST 2: Session Enforcement', () => {
  let testUserId: string;
  let testVendorId: string;
  let testToolId: string;
  let testApiKey: string;
  let webhookSecret: string;
  let mockServer: MockVendorServer;
  let callbackUrl: string;
  let webhookUrl: string;
  let verificationToken: string;

  beforeAll(async () => {
    // Generate webhook secret for mock server
    const { generateWebhookSecret } = await import('@/security');
    webhookSecret = generateWebhookSecret();

    // Start mock vendor server
    mockServer = new MockVendorServer(webhookSecret);
    const baseUrl = await mockServer.start();
    callbackUrl = `${baseUrl}/callback`;
    webhookUrl = `${baseUrl}/webhook`;

    // Create test user
    const user = await createTestUser();
    testUserId = user.id;

    // Create test vendor and tool
    const vendor = await createTestVendor();
    testVendorId = vendor.id;

    const { tool, apiKey } = await createTestVendorTool(
      testVendorId,
      callbackUrl,
      webhookUrl
    );
    testToolId = tool.id;
    testApiKey = apiKey;

    // Create subscription for user
    await createTestSubscription(testUserId, testToolId);

    // Create authorization code and exchange for verification token
    const { generateState } = await import('@/domains/auth');
    const authCode = await createAuthorizationCode(
      testToolId,
      testUserId,
      callbackUrl,
      generateState()
    );

    const exchangeResult = await exchangeAuthorizationCode(
      testToolId,
      authCode.code,
      callbackUrl
    );

    if (!exchangeResult.valid) {
      throw new Error('Failed to exchange authorization code');
    }

    verificationToken = exchangeResult.verificationToken;
  });

  afterAll(async () => {
    await mockServer.stop();
    await cleanupTestVendorTool(testToolId);
    await cleanupTestUser(testUserId);
    await cleanupTestUser(testVendorId);
  });

  it('should return cacheUntil and nextVerificationBefore timestamps', async () => {
    const apiUrl = process.env.TEST_API_URL || 'http://localhost:3000';

    const verifyResponse = await fetch(`${apiUrl}/api/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        verificationToken,
      }),
    });

    expect(verifyResponse.ok).toBe(true);
    const verifyData = await verifyResponse.json();

    expect(verifyData.valid).toBe(true);
    expect(verifyData.cacheUntil).toBeDefined();
    expect(verifyData.nextVerificationBefore).toBeDefined();
    
    // nextVerificationBefore should be greater than cacheUntil
    expect(verifyData.nextVerificationBefore).toBeGreaterThan(verifyData.cacheUntil);
    
    // Both should be Unix timestamps (seconds since epoch)
    expect(verifyData.cacheUntil).toBeGreaterThan(Date.now() / 1000 - 60); // Within last minute
    expect(verifyData.nextVerificationBefore).toBeGreaterThan(Date.now() / 1000 - 60);
  });

  it('should allow caching entitlements within cache window', async () => {
    const apiUrl = process.env.TEST_API_URL || 'http://localhost:3000';

    // First verification
    const verifyResponse1 = await fetch(`${apiUrl}/api/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        verificationToken,
      }),
    });

    expect(verifyResponse1.ok).toBe(true);
    const verifyData1 = await verifyResponse1.json();
    const cacheUntil = verifyData1.cacheUntil;

    // Second verification immediately after (should work without issue)
    const verifyResponse2 = await fetch(`${apiUrl}/api/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        verificationToken,
      }),
    });

    expect(verifyResponse2.ok).toBe(true);
    const verifyData2 = await verifyResponse2.json();

    // Both should be valid
    expect(verifyData1.valid).toBe(true);
    expect(verifyData2.valid).toBe(true);
    
    // cacheUntil should be the same (cached)
    expect(verifyData2.cacheUntil).toBe(cacheUntil);
  });

  it('should return consistent entitlements within cache window', async () => {
    const apiUrl = process.env.TEST_API_URL || 'http://localhost:3000';

    // Multiple verifications
    const verifyPromises = Array.from({ length: 5 }, () =>
      fetch(`${apiUrl}/api/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({
          verificationToken,
        }),
      }).then((r) => r.json())
    );

    const results = await Promise.all(verifyPromises);

    // All should be valid
    results.forEach((result) => {
      expect(result.valid).toBe(true);
    });

    // Entitlements should be consistent (same user ID)
    const userIds = results.map((r) => r.onesubUserId);
    expect(new Set(userIds).size).toBe(1); // All same user ID
  });
});

