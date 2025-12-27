/**
 * P0 SECURITY TEST: Token Rotation Subscription Check
 *
 * Tests Bug #2 Fix: Prevents token rotation after subscription cancellation
 *
 * VULNERABILITY: Tokens could rotate indefinitely without subscription check
 * FIX: rotate_token() now verifies subscription is active before rotating
 *
 * CRITICAL: This test MUST pass to prevent unlimited free access
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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

describe('P0 BUG #2: Token Rotation Subscription Check', () => {
  let testUserId: string;
  let testVendorId: string;
  let testToolId: string;
  let testApiKey: string;
  let apiUrl: string;
  let verificationToken: string;

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
  });

  afterAll(async () => {
    await cleanupTestVendorTool(testToolId);
    await cleanupTestUser(testUserId);
    await cleanupTestUser(testVendorId);
  });

  beforeEach(async () => {
    // Create fresh subscription and get verification token for each test
    await createTestSubscription(testUserId, testToolId);

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

    if (!exchangeResult.success) {
      throw new Error('Failed to get verification token');
    }

    verificationToken = exchangeResult.verificationToken!;
  });

  it('should allow token rotation when subscription is active', async () => {
    // Token should be valid
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
    expect(verifyData.valid).toBe(true);

    // Force token rotation by manipulating expiry (simulate near-expiry)
    const supabase = getTestSupabase();
    const { error } = await supabase
      .from('verification_tokens')
      .update({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      })
      .eq('token', verificationToken);

    expect(error).toBeNull();

    // Verify again - should rotate because token near expiry
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
    expect(verifyData2.valid).toBe(true);

    // Should get new token if rotated
    if (verifyData2.tokenRotated) {
      expect(verifyData2.verificationToken).not.toBe(verificationToken);
    }
  });

  it('should REJECT token rotation when subscription is cancelled', async () => {
    // First verify token works
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
    const supabase = getTestSupabase();
    const { error: cancelError } = await supabase
      .from('tool_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', testUserId)
      .eq('tool_id', testToolId);

    expect(cancelError).toBeNull();

    // Force token to be near expiry to trigger rotation attempt
    const { error: updateError } = await supabase
      .from('verification_tokens')
      .update({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      })
      .eq('token', verificationToken);

    expect(updateError).toBeNull();

    // Try to verify (and rotate) - should FAIL
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

    // CRITICAL ASSERTION: Must be rejected
    expect(verifyData2.valid).toBe(false);
    expect(verifyData2.error).toMatch(/SUBSCRIPTION_INACTIVE|ACCESS_REVOKED/);
    expect(verifyData2.action).toBe('terminate_session');

    console.log('✅ Token rotation blocked after cancellation');
  });

  it('should REJECT token rotation when subscription is past_due', async () => {
    // Set subscription to past_due
    const supabase = getTestSupabase();
    const { error } = await supabase
      .from('tool_subscriptions')
      .update({
        status: 'past_due',
      })
      .eq('user_id', testUserId)
      .eq('tool_id', testToolId);

    expect(error).toBeNull();

    // Force token near expiry
    await supabase
      .from('verification_tokens')
      .update({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .eq('token', verificationToken);

    // Try to verify - should be rejected
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
    expect(verifyData.valid).toBe(false);
  });

  it('should REJECT token rotation when subscription is paused', async () => {
    // Set subscription to paused
    const supabase = getTestSupabase();
    const { error } = await supabase
      .from('tool_subscriptions')
      .update({
        status: 'paused',
      })
      .eq('user_id', testUserId)
      .eq('tool_id', testToolId);

    expect(error).toBeNull();

    // Force token near expiry
    await supabase
      .from('verification_tokens')
      .update({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .eq('token', verificationToken);

    // Try to verify - should be rejected
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
    expect(verifyData.valid).toBe(false);
  });

  it('should ALLOW token rotation when subscription is trialing', async () => {
    // Set subscription to trialing
    const supabase = getTestSupabase();
    const { error } = await supabase
      .from('tool_subscriptions')
      .update({
        status: 'trialing',
      })
      .eq('user_id', testUserId)
      .eq('tool_id', testToolId);

    expect(error).toBeNull();

    // Verify should still work for trialing users
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
    expect(verifyData.valid).toBe(true);
  });

  it('should prevent indefinite access by daily token rotation after cancellation', async () => {
    // Cancel subscription
    const supabase = getTestSupabase();
    await supabase
      .from('tool_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', testUserId)
      .eq('tool_id', testToolId);

    // Simulate user calling /verify daily for 30 days
    let currentToken = verificationToken;
    let accessGranted = 0;

    for (let day = 1; day <= 30; day++) {
      // Simulate time passing (token near expiry)
      await supabase
        .from('verification_tokens')
        .update({
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .eq('token', currentToken)
        .eq('is_revoked', false);

      const verifyResponse = await fetch(`${apiUrl}/api/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({
          verificationToken: currentToken,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.valid) {
        accessGranted++;
        if (verifyData.tokenRotated) {
          currentToken = verifyData.verificationToken;
        }
      } else {
        // Access denied - good!
        break;
      }
    }

    // CRITICAL: Access should be denied (not granted for 30 days)
    // Should be blocked on first verification after cancellation
    expect(accessGranted).toBe(0);

    console.log(`✅ Prevented indefinite access: Blocked after cancellation`);
  });
});
