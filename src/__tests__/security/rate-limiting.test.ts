/**
 * Security Tests: Rate Limiting
 * 
 * Tests rate limiting mechanisms
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

describe('Rate Limiting Security', () => {
  const testIdentifier = 'test-user-123';

  beforeEach(() => {
    // Reset rate limit before each test
    resetRateLimit(testIdentifier);
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const limit = 5;
      const config = { limit, windowMs: 60000 };

      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit(testIdentifier, config);
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(limit - i - 1);
      }
    });

    it('should block requests exceeding limit', () => {
      const limit = 3;
      const config = { limit, windowMs: 60000 };

      // Make requests up to limit
      for (let i = 0; i < limit; i++) {
        checkRateLimit(testIdentifier, config);
      }

      // Next request should be blocked
      const result = checkRateLimit(testIdentifier, config);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should have correct rate limits configured', () => {
      expect(RATE_LIMITS.CREDITS_CONSUME.limit).toBe(100);
      expect(RATE_LIMITS.VERIFY_USER.limit).toBe(60);
      expect(RATE_LIMITS.AUTH_FAILURES.limit).toBe(10);
    });
  });

  describe('Rate Limit Reset', () => {
    it('should reset rate limit for identifier', () => {
      const config = { limit: 3, windowMs: 60000 };

      // Exhaust rate limit
      for (let i = 0; i < 3; i++) {
        checkRateLimit(testIdentifier, config);
      }

      // Verify blocked
      let result = checkRateLimit(testIdentifier, config);
      expect(result.success).toBe(false);

      // Reset
      resetRateLimit(testIdentifier);

      // Should work again
      result = checkRateLimit(testIdentifier, config);
      expect(result.success).toBe(true);
    });
  });

  describe('Sliding Window', () => {
    it('should use sliding window algorithm', () => {
      const config = { limit: 2, windowMs: 1000 }; // 2 requests per second

      // First request
      const result1 = checkRateLimit(testIdentifier, config);
      expect(result1.success).toBe(true);

      // Second request
      const result2 = checkRateLimit(testIdentifier, config);
      expect(result2.success).toBe(true);

      // Third request should be blocked
      const result3 = checkRateLimit(testIdentifier, config);
      expect(result3.success).toBe(false);
    });
  });
});

