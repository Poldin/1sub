/**
 * Rate Limiting
 *
 * CANONICAL SOURCE: All rate limiting MUST use this module.
 *
 * Simple in-memory rate limiting implementation using sliding window algorithm.
 * For production with multiple servers, use Redis-based solution.
 */

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
  requests: number[];
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Check if request is allowed under rate limit
   * Uses sliding window algorithm
   */
  check(identifier: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = this.store.get(identifier);

    if (!entry) {
      entry = {
        count: 1,
        resetAt: now + windowMs,
        requests: [now],
      };
      this.store.set(identifier, entry);

      return {
        success: true,
        remaining: limit - 1,
        resetAt: entry.resetAt,
      };
    }

    // Remove requests outside the sliding window
    entry.requests = entry.requests.filter((timestamp) => timestamp > windowStart);
    entry.count = entry.requests.length;

    if (entry.count >= limit) {
      const oldestRequest = entry.requests[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

      return {
        success: false,
        remaining: 0,
        resetAt: oldestRequest + windowMs,
        retryAfter,
      };
    }

    entry.requests.push(now);
    entry.count++;
    entry.resetAt = now + windowMs;
    this.store.set(identifier, entry);

    return {
      success: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Get current status without incrementing
   */
  getStatus(identifier: string, windowMs: number): { count: number; resetAt: number } | null {
    const entry = this.store.get(identifier);
    if (!entry) return null;

    const now = Date.now();
    const windowStart = now - windowMs;
    const validRequests = entry.requests.filter((timestamp) => timestamp > windowStart);

    return {
      count: validRequests.length,
      resetAt: entry.resetAt,
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const rateLimiter = new RateLimiter();

// ============================================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================================

export const RATE_LIMITS = {
  // API key verification: 60 requests per minute per IP
  VERIFY_USER: {
    limit: 60,
    windowMs: 60 * 1000,
  },

  // Credit consumption: 100 requests per minute per API key
  CREDITS_CONSUME: {
    limit: 100,
    windowMs: 60 * 1000,
  },

  // API key auth failures: 10 attempts per 5 minutes per IP
  AUTH_FAILURES: {
    limit: 10,
    windowMs: 5 * 60 * 1000,
  },

  // General API: 1000 requests per minute per IP
  GENERAL_API: {
    limit: 1000,
    windowMs: 60 * 1000,
  },
} as const;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return rateLimiter.check(identifier, config.limit, config.windowMs);
}

/**
 * Reset rate limit for an identifier
 */
export function resetRateLimit(identifier: string): void {
  rateLimiter.reset(identifier);
}

/**
 * Get rate limit status without incrementing
 */
export function getRateLimitStatus(
  identifier: string,
  windowMs: number
): { count: number; resetAt: number } | null {
  return rateLimiter.getStatus(identifier, windowMs);
}

/**
 * Get client IP from request
 * Handles various proxy headers
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

export default rateLimiter;
