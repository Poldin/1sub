/**
 * Integration Tests for Pattern-Based Cache Invalidation
 *
 * Tests that pattern-based invalidation correctly deletes all matching keys.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  getCachedEntitlements,
  setCachedEntitlements,
  invalidateAllUserEntitlements,
  invalidateAllToolEntitlements,
} from '@/infrastructure/cache/redis';

describe('Pattern-Based Cache Invalidation', () => {
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

  describe('invalidateAllUserEntitlements', () => {
    it('should invalidate all entitlements for a user across multiple tools', async () => {
      const userId = 'test_user_123';
      const tool1 = 'test_tool_1';
      const tool2 = 'test_tool_2';
      const tool3 = 'test_tool_3';

      // Cache entitlements for 3 different tools
      await setCachedEntitlements(tool1, userId, mockEntitlements);
      await setCachedEntitlements(tool2, userId, mockEntitlements);
      await setCachedEntitlements(tool3, userId, mockEntitlements);

      // Verify all are cached
      expect(await getCachedEntitlements(tool1, userId)).toBeTruthy();
      expect(await getCachedEntitlements(tool2, userId)).toBeTruthy();
      expect(await getCachedEntitlements(tool3, userId)).toBeTruthy();

      // Invalidate all for this user
      await invalidateAllUserEntitlements(userId);

      // Verify all are invalidated
      expect(await getCachedEntitlements(tool1, userId)).toBeNull();
      expect(await getCachedEntitlements(tool2, userId)).toBeNull();
      expect(await getCachedEntitlements(tool3, userId)).toBeNull();
    });

    it('should only invalidate entitlements for the specified user', async () => {
      const user1 = 'test_user_A';
      const user2 = 'test_user_B';
      const tool = 'test_tool_shared';

      // Cache entitlements for both users
      await setCachedEntitlements(tool, user1, mockEntitlements);
      await setCachedEntitlements(tool, user2, mockEntitlements);

      // Invalidate only user1
      await invalidateAllUserEntitlements(user1);

      // Verify only user1 is invalidated
      expect(await getCachedEntitlements(tool, user1)).toBeNull();
      expect(await getCachedEntitlements(tool, user2)).toBeTruthy();
    });
  });

  describe('invalidateAllToolEntitlements', () => {
    it('should invalidate all entitlements for a tool across multiple users', async () => {
      const tool = 'test_tool_123';
      const user1 = 'test_user_1';
      const user2 = 'test_user_2';
      const user3 = 'test_user_3';

      // Cache entitlements for 3 different users
      await setCachedEntitlements(tool, user1, mockEntitlements);
      await setCachedEntitlements(tool, user2, mockEntitlements);
      await setCachedEntitlements(tool, user3, mockEntitlements);

      // Verify all are cached
      expect(await getCachedEntitlements(tool, user1)).toBeTruthy();
      expect(await getCachedEntitlements(tool, user2)).toBeTruthy();
      expect(await getCachedEntitlements(tool, user3)).toBeTruthy();

      // Invalidate all for this tool
      await invalidateAllToolEntitlements(tool);

      // Verify all are invalidated
      expect(await getCachedEntitlements(tool, user1)).toBeNull();
      expect(await getCachedEntitlements(tool, user2)).toBeNull();
      expect(await getCachedEntitlements(tool, user3)).toBeNull();
    });

    it('should only invalidate entitlements for the specified tool', async () => {
      const tool1 = 'test_tool_X';
      const tool2 = 'test_tool_Y';
      const user = 'test_user_shared';

      // Cache entitlements for both tools
      await setCachedEntitlements(tool1, user, mockEntitlements);
      await setCachedEntitlements(tool2, user, mockEntitlements);

      // Invalidate only tool1
      await invalidateAllToolEntitlements(tool1);

      // Verify only tool1 is invalidated
      expect(await getCachedEntitlements(tool1, user)).toBeNull();
      expect(await getCachedEntitlements(tool2, user)).toBeTruthy();
    });
  });

  describe('Cache expiration', () => {
    it('should not return expired cache entries', async () => {
      const userId = 'test_user_expiry';
      const toolId = 'test_tool_expiry';

      // Cache with 1-second TTL
      await setCachedEntitlements(toolId, userId, mockEntitlements, 1);

      // Should be available immediately
      expect(await getCachedEntitlements(toolId, userId)).toBeTruthy();

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should be expired
      expect(await getCachedEntitlements(toolId, userId)).toBeNull();
    });
  });
});
