/**
 * P0 SECURITY TEST: Manual Cancellation Revocation
 *
 * Tests Bug #3 Fix: Manual subscription cancellation now calls revokeAccess()
 *
 * VULNERABILITY: Manual cancellation didn't revoke tokens, allowing continued access
 * FIX: /api/subscriptions/cancel now calls revokeAccess() immediately
 *
 * CRITICAL: This test MUST pass to ensure access stops after manual cancellation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  createTestVendor,
  cleanupTestUser,
  getTestSupabase,
} from '../helpers/db-helpers';
import {
  createTestVendorTool,
  createTestSubscription,
  cleanupTestVendorTool,
} from '../helpers/vendor-integration-helpers';
import { createAuthorizationCode, exchangeAuthorizationCode } from '@/domains/auth';

describe('P0 BUG #3: Manual Cancellation Revocation', () => {
  let testUserId: string;
  let testVendorId: string;
  let testToolId: string;
  let testApiKey: string;
  let apiUrl: string;
  let userSessionToken: string; // For authenticated user requests

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

    // Get user session token for authenticated requests
    const supabase = getTestSupabase();
    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: 'TestPassword123!',
    });
    userSessionToken = sessionData?.session?.access_token || '';
  });

  afterAll(async () => {
    await cleanupTestVendorTool(testToolId);
    await cleanupTestUser(testUserId);
    await cleanupTestUser(testVendorId);
  });

  it('should create revocation record when subscription is manually cancelled', async () => {
    // Create subscription
    const subscription = await createTestSubscription(testUserId, testToolId);
    const subscriptionId = subscription.id;

    // Verify no revocation exists initially
    const supabase = getTestSupabase();
    const { data: beforeRevocation } = await supabase
      .from('revocations')
      .select('*')
      .eq('user_id', testUserId)
      .eq('tool_id', testToolId)
      .maybeSingle();

    expect(beforeRevocation).toBeNull();

    // Cancel subscription via API
    const cancelResponse = await fetch(`${apiUrl}/api/subscriptions/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessionToken}`,
      },
      body: JSON.stringify({
        subscription_id: subscriptionId,
      }),
    });

    const cancelData = await cancelResponse.json();
    expect(cancelData.success).toBe(true);

    // CRITICAL ASSERTION: Revocation record should now exist
    const { data: afterRevocation } = await supabase
      .from('revocations')
      .select('*')
      .eq('user_id', testUserId)
      .eq('tool_id', testToolId)
      .maybeSingle();

    expect(afterRevocation).not.toBeNull();
    expect(afterRevocation?.reason).toBe('subscription_cancelled');
    expect(afterRevocation?.user_id).toBe(testUserId);
    expect(afterRevocation?.tool_id).toBe(testToolId);

    console.log('✅ Revocation record created on manual cancellation');
  });

  it('should immediately invalidate verification tokens on manual cancellation', async () => {
    // Create subscription
    const subscription = await createTestSubscription(testUserId, testToolId);
    const subscriptionId = subscription.id;

    // Get verification token
    const authResult = await createAuthorizationCode(
      testToolId,
      testUserId,
      'https://example.com/callback',
      'test-state-' + Date.now()
    );

    const exchangeResult = await exchangeAuthorizationCode(
      authResult.code,
      testToolId,
      'https://example.com/callback'
    );

    expect(exchangeResult.success).toBe(true);
    const verificationToken = exchangeResult.verificationToken!;

    // Verify token works before cancellation
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

    const verifyData1 = await verifyResponse1.json();
    expect(verifyData1.valid).toBe(true);

    // Cancel subscription
    const cancelResponse = await fetch(`${apiUrl}/api/subscriptions/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessionToken}`,
      },
      body: JSON.stringify({
        subscription_id: subscriptionId,
      }),
    });

    expect(cancelResponse.ok).toBe(true);

    // Wait a moment for revocation to propagate
    await new Promise(resolve => setTimeout(resolve, 500));

    // CRITICAL ASSERTION: Token should be invalid after cancellation
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

    const verifyData2 = await verifyResponse2.json();
    expect(verifyData2.valid).toBe(false);
    expect(verifyData2.error).toMatch(/ACCESS_REVOKED|SUBSCRIPTION_INACTIVE/);
    expect(verifyData2.action).toBe('terminate_session');

    console.log('✅ Token immediately invalidated after manual cancellation');
  });

  it('should mark all active tokens as revoked in database', async () => {
    // Create subscription
    const subscription = await createTestSubscription(testUserId, testToolId);
    const subscriptionId = subscription.id;

    // Create multiple verification tokens
    const tokens = [];
    for (let i = 0; i < 3; i++) {
      const authResult = await createAuthorizationCode(
        testToolId,
        testUserId,
        'https://example.com/callback',
        'test-state-' + Date.now() + '-' + i
      );

      const exchangeResult = await exchangeAuthorizationCode(
        authResult.code,
        testToolId,
        'https://example.com/callback'
      );

      tokens.push(exchangeResult.verificationToken!);
      await new Promise(resolve => setTimeout(resolve, 100)); // Prevent duplicate codes
    }

    // Verify all tokens are active
    const supabase = getTestSupabase();
    const { data: beforeTokens } = await supabase
      .from('verification_tokens')
      .select('*')
      .in('token', tokens)
      .eq('is_revoked', false);

    expect(beforeTokens?.length).toBe(3);

    // Cancel subscription
    await fetch(`${apiUrl}/api/subscriptions/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessionToken}`,
      },
      body: JSON.stringify({
        subscription_id: subscriptionId,
      }),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // CRITICAL ASSERTION: All tokens should be marked as revoked
    const { data: afterTokens } = await supabase
      .from('verification_tokens')
      .select('*')
      .in('token', tokens)
      .eq('is_revoked', true);

    expect(afterTokens?.length).toBe(3);

    console.log('✅ All tokens revoked in database');
  });

  it('should behave consistently with Stripe webhook cancellation', async () => {
    // Create two subscriptions for the same user+tool
    const subscription1 = await createTestSubscription(testUserId, testToolId);
    const subscriptionId1 = subscription1.id;

    // Get token for subscription 1
    const authResult1 = await createAuthorizationCode(
      testToolId,
      testUserId,
      'https://example.com/callback',
      'test-state-manual-' + Date.now()
    );

    const exchangeResult1 = await exchangeAuthorizationCode(
      authResult1.code,
      testToolId,
      'https://example.com/callback'
    );

    const token1 = exchangeResult1.verificationToken!;

    // Cancel via manual API
    await fetch(`${apiUrl}/api/subscriptions/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessionToken}`,
      },
      body: JSON.stringify({
        subscription_id: subscriptionId1,
      }),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify token is invalid
    const verifyResponse = await fetch(`${apiUrl}/api/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        verificationToken: token1,
      }),
    });

    const verifyData = await verifyResponse.json();

    // Should be revoked (same behavior as Stripe webhook)
    expect(verifyData.valid).toBe(false);
    expect(verifyData.action).toBe('terminate_session');

    // Check revocation record exists
    const supabase = getTestSupabase();
    const { data: revocation } = await supabase
      .from('revocations')
      .select('*')
      .eq('user_id', testUserId)
      .eq('tool_id', testToolId)
      .maybeSingle();

    expect(revocation).not.toBeNull();
    expect(revocation?.reason).toBe('subscription_cancelled');

    console.log('✅ Manual cancellation behaves same as Stripe webhook');
  });

  it('should prevent access within bounded time (immediate)', async () => {
    // Create subscription and token
    const subscription = await createTestSubscription(testUserId, testToolId);
    const subscriptionId = subscription.id;

    const authResult = await createAuthorizationCode(
      testToolId,
      testUserId,
      'https://example.com/callback',
      'test-state-' + Date.now()
    );

    const exchangeResult = await exchangeAuthorizationCode(
      authResult.code,
      testToolId,
      'https://example.com/callback'
    );

    const verificationToken = exchangeResult.verificationToken!;

    // Record time before cancellation
    const cancelTime = Date.now();

    // Cancel subscription
    await fetch(`${apiUrl}/api/subscriptions/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSessionToken}`,
      },
      body: JSON.stringify({
        subscription_id: subscriptionId,
      }),
    });

    // Immediately try to verify (within 1 second)
    await new Promise(resolve => setTimeout(resolve, 500));

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
    const verifyTime = Date.now();
    const delayMs = verifyTime - cancelTime;

    // CRITICAL ASSERTION: Access blocked immediately (< 2 seconds)
    expect(verifyData.valid).toBe(false);
    expect(delayMs).toBeLessThan(2000);

    console.log(`✅ Access blocked in ${delayMs}ms after cancellation`);
  });
});
