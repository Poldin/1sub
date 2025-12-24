/**
 * TEST 5: Enforcement via /verify (BOUND GUARANTEE)
 *
 * Verifies revocation is enforced even if webhook fails.
 * Tests that /verify endpoint returns revoked status when subscription is cancelled.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  createTestVendor,
  cleanupTestUser,
  getTestSupabase,
} from '../../helpers/db-helpers';
import {
  createTestVendorTool,
  createTestSubscription,
  cancelTestSubscription,
  cleanupTestVendorTool,
} from '../../helpers/vendor-integration-helpers';
import { MockVendorServer } from '../../mocks/vendor-server';
import { createAuthorizationCode, exchangeAuthorizationCode } from '@/domains/auth';

describe('TEST 5: Enforcement via /verify', () => {
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

  it('should return valid=true when subscription is active', async () => {
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
    expect(verifyData.onesubUserId).toBe(testUserId);
    expect(verifyData.entitlements).toBeDefined();
  });

  it('should return valid=false when subscription is cancelled', async () => {
    const apiUrl = process.env.TEST_API_URL || 'http://localhost:3000';

    // Cancel subscription
    await cancelTestSubscription(testUserId, testToolId);

    // Wait a bit for revocation to take effect
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify endpoint should return revoked status
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

    expect(verifyResponse.ok).toBe(false);
    const verifyData = await verifyResponse.json();

    expect(verifyData.valid).toBe(false);
    expect(verifyData.error).toBeDefined();
    expect(verifyData.action).toBe('terminate_session');
    expect(verifyData.reason).toBeDefined();
  });

  it('should provide clear error message when access is revoked', async () => {
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

    const verifyData = await verifyResponse.json();

    // Error should be clear and actionable (not cryptic)
    expect(verifyData.error).toBeDefined();
    expect(verifyData.message || verifyData.reason).toBeDefined();
    
    // Error should indicate subscription status
    const errorText = JSON.stringify(verifyData).toLowerCase();
    expect(
      errorText.includes('subscription') ||
      errorText.includes('access') ||
      errorText.includes('revoked') ||
      errorText.includes('inactive')
    ).toBe(true);
  });

  it('should reject invalid verification token', async () => {
    const apiUrl = process.env.TEST_API_URL || 'http://localhost:3000';

    const verifyResponse = await fetch(`${apiUrl}/api/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        verificationToken: 'invalid-token-12345',
      }),
    });

    expect(verifyResponse.ok).toBe(false);
    const verifyData = await verifyResponse.json();

    expect(verifyData.valid).toBe(false);
    expect(verifyData.error).toBeDefined();
  });

  it('should reject request without API key', async () => {
    const apiUrl = process.env.TEST_API_URL || 'http://localhost:3000';

    const verifyResponse = await fetch(`${apiUrl}/api/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header
      },
      body: JSON.stringify({
        verificationToken,
      }),
    });

    expect(verifyResponse.status).toBe(401);
  });
});

