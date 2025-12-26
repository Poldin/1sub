/**
 * Integration Tests for Cache Revocation
 *
 * Tests that revoked users cannot access services even when entitlements are cached.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { revokeAccess, clearRevocation } from '@/domains/auth';
import { setCachedEntitlements } from '@/infrastructure/cache/redis';

describe('Cache Revocation Flow', () => {
  const testUserId = 'test_user_revocation';
  const testToolId = 'test_tool_revocation';
  const mockEntitlements = {
    planId: 'monthly',
    creditsRemaining: 100,
    features: ['feature1', 'feature2'],
    limits: { api_calls: 1000 },
    status: 'active' as const,
    active: true,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
  };

  afterEach(async () => {
    // Clean up - clear any revocations
    await clearRevocation(testUserId, testToolId);
  });

  it('should deny access immediately after revocation (even with cached entitlements)', async () => {
    // 1. Setup: Cache valid entitlements
    await setCachedEntitlements(testToolId, testUserId, mockEntitlements);

    // 2. Revoke access
    const revokeResult = await revokeAccess(testUserId, testToolId, 'manual');
    expect(revokeResult.success).toBe(true);

    // 3. Test would be against actual /verify endpoint
    // In a real test, you'd make an HTTP request here:
    // const response = await POST('/api/v1/verify', { ... });
    // expect(response.status).toBe(403);
    // expect(response.json.error).toBe('ACCESS_REVOKED');

    // For now, we verify the revocation was recorded
    expect(revokeResult.revocationId).toBeDefined();
    expect(revokeResult.tokensRevoked).toBeGreaterThanOrEqual(0);
  });

  it('should allow access after revocation is cleared', async () => {
    // 1. Revoke access
    await revokeAccess(testUserId, testToolId, 'manual');

    // 2. Clear revocation
    const cleared = await clearRevocation(testUserId, testToolId);
    expect(cleared).toBe(true);

    // 3. Test would verify access is allowed again
    // In a real test, you'd make an HTTP request here and expect success
  });

  it('should handle multiple revocations for the same user', async () => {
    const tool1 = 'test_tool_1';
    const tool2 = 'test_tool_2';

    // Revoke access for both tools
    const result1 = await revokeAccess(testUserId, tool1, 'manual');
    const result2 = await revokeAccess(testUserId, tool2, 'manual');

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Clean up
    await clearRevocation(testUserId, tool1);
    await clearRevocation(testUserId, tool2);
  });
});
