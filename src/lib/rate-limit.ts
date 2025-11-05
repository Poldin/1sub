/**
 * Rate Limiting Utilities
 * 
 * Simple in-memory rate limiting implementation.
 * For production with multiple servers, use Redis-based solution like @upstash/ratelimit
 * 
 * Current implementation:
 * - Sliding window algorithm
 * - In-memory store (not distributed)
 * - Automatic cleanup of old entries
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  requests: number[]; // Timestamps of requests
}

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
   * 
   * @param identifier - Unique identifier (API key, IP, user ID, etc.)
   * @param limit - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with success status and metadata
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number
  ): {
    success: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    let entry = this.store.get(identifier);

    if (!entry) {
      // First request from this identifier
      entry = {
        count: 1,
        resetAt: now + windowMs,
        requests: [now]
      };
      this.store.set(identifier, entry);
      
      return {
        success: true,
        remaining: limit - 1,
        resetAt: entry.resetAt
      };
    }

    // Remove requests outside the sliding window
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
    entry.count = entry.requests.length;

    if (entry.count >= limit) {
      // Rate limit exceeded
      const oldestRequest = entry.requests[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      
      return {
        success: false,
        remaining: 0,
        resetAt: oldestRequest + windowMs,
        retryAfter
      };
    }

    // Allow request
    entry.requests.push(now);
    entry.count++;
    entry.resetAt = now + windowMs;
    this.store.set(identifier, entry);

    return {
      success: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Get current rate limit status without incrementing
   */
  getStatus(identifier: string, windowMs: number): {
    count: number;
    resetAt: number;
  } | null {
    const entry = this.store.get(identifier);
    if (!entry) return null;

    const now = Date.now();
    const windowStart = now - windowMs;
    const validRequests = entry.requests.filter(timestamp => timestamp > windowStart);

    return {
      count: validRequests.length,
      resetAt: entry.resetAt
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // API key verification: 60 requests per minute per IP
  VERIFY_USER: {
    limit: 60,
    windowMs: 60 * 1000
  },
  
  // Credit consumption: 100 requests per minute per API key
  CREDITS_CONSUME: {
    limit: 100,
    windowMs: 60 * 1000
  },
  
  // API key authentication failures: 10 attempts per 5 minutes per IP
  AUTH_FAILURES: {
    limit: 10,
    windowMs: 5 * 60 * 1000
  },
  
  // General API: 1000 requests per minute per IP
  GENERAL_API: {
    limit: 1000,
    windowMs: 60 * 1000
  }
};

/**
 * Check rate limit for a request
 * 
 * @param identifier - Unique identifier (API key, IP, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit check result
 */
export function checkRateLimit(
  identifier: string,
  config: { limit: number; windowMs: number }
) {
  return rateLimiter.check(identifier, config.limit, config.windowMs);
}

/**
 * Reset rate limit for an identifier
 */
export function resetRateLimit(identifier: string) {
  rateLimiter.reset(identifier);
}

/**
 * Get rate limit status without incrementing
 */
export function getRateLimitStatus(
  identifier: string,
  windowMs: number
) {
  return rateLimiter.getStatus(identifier, windowMs);
}

/**
 * Helper to get client IP from request
 * Handles various proxy headers
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  
  // Check various headers in order of preference
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback to connection info (may not be available in all environments)
  return 'unknown';
}

/**
 * Production Note:
 * 
 * For production deployment with multiple servers, replace this implementation with:
 * 
 * ```typescript
 * import { Ratelimit } from "@upstash/ratelimit";
 * import { Redis } from "@upstash/redis";
 * 
 * const ratelimit = new Ratelimit({
 *   redis: Redis.fromEnv(),
 *   limiter: Ratelimit.slidingWindow(100, "1 m"),
 *   analytics: true,
 * });
 * 
 * export async function checkRateLimit(identifier: string) {
 *   const { success, limit, remaining, reset } = await ratelimit.limit(identifier);
 *   return { success, remaining, resetAt: reset };
 * }
 * ```
 */

export default rateLimiter;

