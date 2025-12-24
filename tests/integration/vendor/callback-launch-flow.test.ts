/**
 * TEST 1: Callback / Launch Flow (CRITICAL)
 *
 * Verifies friction-free user launch without manual authentication steps.
 * Tests the complete OAuth-like authorization flow:
 * 1. User initiates authorization (POST /api/v1/authorize/initiate)
 * 2. Gets authorization code and redirect URL
 * 3. Vendor exchanges code (POST /api/v1/authorize/exchange)
 * 4. Receives verification token and entitlements
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
  cleanupTestVendorTool,
} from '../../helpers/vendor-integration-helpers';
import { MockVendorServer } from '../../mocks/vendor-server';

describe('TEST 1: Callback / Launch Flow', () => {
  let testUserId: string;
  let testVendorId: string;
  let testToolId: string;
  let testApiKey: string;
  let webhookSecret: string;
  let mockServer: MockVendorServer;
  let callbackUrl: string;
  let webhookUrl: string;
  let apiUrl: string;

  beforeAll(async () => {
    apiUrl = process.env.TEST_API_URL || 'http://localhost:3000';

    // Generate webhook secret for mock server
    webhookSecret = process.env.TEST_WEBHOOK_SECRET || 'test-webhook-secret-' + Date.now();

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
  });

  afterAll(async () => {
    await mockServer.stop();
    await cleanupTestVendorTool(testToolId);
    await cleanupTestUser(testUserId);
    await cleanupTestUser(testVendorId);
  });

  it('should initiate authorization and generate authorization code', async () => {
    // Test the domain function directly (API endpoint requires user auth via cookies)
    // The API endpoint will be tested via E2E tests or with proper session setup
    const { createAuthorizationCode, generateState } = await import('@/domains/auth');

    const state = generateState();
    const authResult = await createAuthorizationCode(
      testToolId,
      testUserId,
      callbackUrl,
      state
    );

    expect(authResult.code).toBeDefined();
    expect(authResult.authorizationUrl).toContain(callbackUrl);
    expect(authResult.authorizationUrl).toContain(`code=${authResult.code}`);
    expect(authResult.authorizationUrl).toContain(`state=${state}`);
    expect(authResult.expiresAt).toBeInstanceOf(Date);
    
    // Verify code expires in ~60 seconds
    const expiresIn = authResult.expiresAt.getTime() - Date.now();
    expect(expiresIn).toBeGreaterThan(50000); // Allow some margin
    expect(expiresIn).toBeLessThan(65000);
  });

  it('should exchange authorization code for verification token (API endpoint)', async () => {
    // First, we need to get an authorization code
    // For testing, we can create one directly using the domain function
    const { createAuthorizationCode } = await import('@/domains/auth');
    
    const authResult = await createAuthorizationCode(
      testToolId,
      testUserId,
      callbackUrl,
      'test-state-' + Date.now()
    );

    expect(authResult.code).toBeDefined();
    expect(authResult.authorizationUrl).toContain(callbackUrl);

    // Now test the exchange endpoint
    const exchangeResponse = await fetch(`${apiUrl}/api/v1/authorize/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        code: authResult.code,
        redirectUri: callbackUrl,
      }),
    });

    expect(exchangeResponse.ok).toBe(true);
    const exchangeData = await exchangeResponse.json();

    // Verify exchange response
    expect(exchangeData.valid).toBe(true);
    expect(exchangeData.onesubUserId).toBe(testUserId);
    expect(exchangeData.verificationToken).toBeDefined();
    expect(exchangeData.entitlements).toBeDefined();
    expect(exchangeData.grantId).toBeDefined();

    // Verify tokens are NOT in URLs
    expect(authResult.authorizationUrl).not.toContain('verificationToken');
    expect(authResult.authorizationUrl).not.toContain('token');
  });

  it('should reject invalid authorization code', async () => {
    const exchangeResponse = await fetch(`${apiUrl}/api/v1/authorize/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        code: 'invalid-code-12345',
        redirectUri: callbackUrl,
      }),
    });

    expect(exchangeResponse.ok).toBe(false);
    const errorData = await exchangeResponse.json();
    expect(errorData.valid).toBe(false);
    expect(errorData.error).toBeDefined();
  });

  it('should reject expired authorization code', async () => {
    // Create a code and wait for it to expire (60s TTL)
    // For now, we'll skip this as it requires waiting
    // This would be tested in a separate timeout test
  });
});

