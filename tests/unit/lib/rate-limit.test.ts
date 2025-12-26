/**
 * Unit Tests for Rate Limiting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from '@/security';

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within limit', () => {
    const identifier = 'test-key-1';
    const config = { limit: 5, windowMs: 60000 };

    // First 5 requests should succeed
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(identifier, config);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it('should block requests exceeding limit', () => {
    const identifier = 'test-key-2';
    const config = { limit: 3, windowMs: 60000 };

    // First 3 succeed
    for (let i = 0; i < 3; i++) {
      checkRateLimit(identifier, config);
    }

    // 4th request should fail
    const result = checkRateLimit(identifier, config);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
  });

  it('should reset after window expires', () => {
    const identifier = 'test-key-3';
    const config = { limit: 2, windowMs: 60000 };

    // Use up limit
    checkRateLimit(identifier, config);
    checkRateLimit(identifier, config);

    // Should be blocked
    let result = checkRateLimit(identifier, config);
    expect(result.success).toBe(false);

    // Fast forward past window
    vi.advanceTimersByTime(61000);

    // Should succeed again
    result = checkRateLimit(identifier, config);
    expect(result.success).toBe(true);
  });

  it('should track different identifiers separately', () => {
    const config = { limit: 1, windowMs: 60000 };

    const result1 = checkRateLimit('key-1', config);
    const result2 = checkRateLimit('key-2', config);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('should provide correct retry-after value', () => {
    const identifier = 'test-key-4';
    const config = { limit: 1, windowMs: 60000 };

    // Use up limit
    checkRateLimit(identifier, config);

    // Next request should be blocked
    const result = checkRateLimit(identifier, config);
    expect(result.success).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(60);
  });
});
