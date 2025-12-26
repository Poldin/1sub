/**
 * Redis Cache Layer
 *
 * CANONICAL SOURCE: All Redis caching operations MUST go through this file.
 *
 * Provides server-side caching to eliminate DB reads on the hot verification path.
 *
 * Cache Strategy:
 * - Key: entitlement:{tool_id}:{user_id}
 * - TTL: 15 minutes (configurable)
 * - Invalidation: On revocation, subscription change, or explicit clear
 *
 * Fallback: If Redis is unavailable, falls back to direct DB queries.
 * This ensures the system remains functional even without caching.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Entitlements {
  hasActiveSubscription: boolean;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  expiresAt?: string;
  credits?: number;
  features?: string[];
}

export interface CachedEntitlement {
  entitlements: Entitlements;
  cachedAt: number;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_TTL_SECONDS = 15 * 60; // 15 minutes
const CACHE_PREFIX = 'entitlement';

// Redis connection string from environment
const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL;

// ============================================================================
// IN-MEMORY FALLBACK CACHE
// When Redis is not configured, use a simple in-memory LRU-style cache
// This is suitable for single-instance deployments
// ============================================================================

interface MemoryCacheEntry {
  data: CachedEntitlement;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const MAX_MEMORY_CACHE_SIZE = 10000;

function cleanupMemoryCache(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
  // Evict oldest entries if over limit
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toDelete = entries.slice(0, memoryCache.size - MAX_MEMORY_CACHE_SIZE + 1000);
    toDelete.forEach(([key]) => memoryCache.delete(key));
  }
}

// ============================================================================
// CACHE KEY GENERATION
// ============================================================================

function getCacheKey(toolId: string, userId: string): string {
  return `${CACHE_PREFIX}:${toolId}:${userId}`;
}

// ============================================================================
// REDIS CLIENT (LAZY INITIALIZATION)
// Uses Upstash Redis REST API for serverless compatibility
// ============================================================================

interface RedisClient {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { ex?: number }) => Promise<void>;
  del: (key: string | string[]) => Promise<number>;
  ping: () => Promise<string>;
  scan: (cursor: string, pattern: string, count?: number) => Promise<{ cursor: string; keys: string[] }>;
}

let redisClient: RedisClient | null = null;
let redisInitialized = false;
let redisAvailable = false;

async function getRedisClient(): Promise<RedisClient | null> {
  if (redisInitialized) {
    return redisAvailable ? redisClient : null;
  }

  redisInitialized = true;

  if (!REDIS_URL) {
    console.log('[RedisCache] No REDIS_URL configured, using in-memory cache');
    return null;
  }

  try {
    // Support both Upstash REST API and standard Redis
    if (REDIS_URL.includes('upstash')) {
      // Upstash REST API
      const baseUrl = REDIS_URL.replace(/^redis:\/\//, 'https://');
      const token = process.env.REDIS_TOKEN || process.env.KV_REST_API_TOKEN;

      if (!token) {
        console.warn('[RedisCache] Upstash URL found but no token, using in-memory cache');
        return null;
      }

      redisClient = {
        get: async (key: string) => {
          const response = await fetch(`${baseUrl}/get/${encodeURIComponent(key)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          return data.result;
        },
        set: async (key: string, value: string, options?: { ex?: number }) => {
          const url = options?.ex
            ? `${baseUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/ex/${options.ex}`
            : `${baseUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`;
          await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        },
        del: async (keys: string | string[]) => {
          const keyArray = Array.isArray(keys) ? keys : [keys];
          let deleted = 0;
          for (const key of keyArray) {
            const response = await fetch(`${baseUrl}/del/${encodeURIComponent(key)}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            deleted += data.result || 0;
          }
          return deleted;
        },
        ping: async () => {
          const response = await fetch(`${baseUrl}/ping`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          return data.result;
        },
        scan: async (cursor: string, pattern: string, count: number = 100) => {
          const url = `${baseUrl}/scan/${cursor}/MATCH/${encodeURIComponent(pattern)}/COUNT/${count}`;
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          // Upstash returns [nextCursor, [keys...]]
          return {
            cursor: data.result[0].toString(),
            keys: data.result[1] || [],
          };
        },
      };
    } else {
      // Standard Redis - would use ioredis or similar
      console.warn('[RedisCache] Standard Redis not implemented, using in-memory cache');
      return null;
    }

    // Test connection
    const pong = await redisClient.ping();
    if (pong === 'PONG') {
      redisAvailable = true;
      console.log('[RedisCache] Connected to Redis');
      return redisClient;
    }
  } catch (error) {
    console.warn('[RedisCache] Failed to connect to Redis:', error);
  }

  return null;
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

// Statistics tracking
const stats: CacheStats = { hits: 0, misses: 0, errors: 0 };

/**
 * Get cached entitlements for a user+tool pair.
 * Returns null if not cached or expired.
 */
export async function getCachedEntitlements(
  toolId: string,
  userId: string
): Promise<Entitlements | null> {
  const key = getCacheKey(toolId, userId);
  const now = Date.now();

  try {
    const redis = await getRedisClient();

    if (redis) {
      const cached = await redis.get(key);
      if (cached) {
        const entry: CachedEntitlement = JSON.parse(cached);
        if (entry.expiresAt > now) {
          stats.hits++;
          return entry.entitlements;
        }
      }
    } else {
      // Fall back to memory cache
      cleanupMemoryCache();
      const entry = memoryCache.get(key);
      if (entry && entry.expiresAt > now) {
        stats.hits++;
        return entry.data.entitlements;
      }
    }

    stats.misses++;
    return null;
  } catch (error) {
    console.error('[RedisCache] Error getting cached entitlements:', error);
    stats.errors++;
    return null;
  }
}

/**
 * Cache entitlements for a user+tool pair.
 */
export async function setCachedEntitlements(
  toolId: string,
  userId: string,
  entitlements: Entitlements,
  ttlSeconds: number = CACHE_TTL_SECONDS
): Promise<void> {
  const key = getCacheKey(toolId, userId);
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;

  const entry: CachedEntitlement = {
    entitlements,
    cachedAt: now,
    expiresAt,
  };

  try {
    const redis = await getRedisClient();

    if (redis) {
      await redis.set(key, JSON.stringify(entry), { ex: ttlSeconds });
    } else {
      // Fall back to memory cache
      cleanupMemoryCache();
      memoryCache.set(key, { data: entry, expiresAt });
    }
  } catch (error) {
    console.error('[RedisCache] Error setting cached entitlements:', error);
    stats.errors++;
  }
}

/**
 * Invalidate cached entitlements for a user+tool pair.
 * Called on revocation, subscription change, etc.
 */
export async function invalidateCachedEntitlements(
  toolId: string,
  userId: string
): Promise<void> {
  const key = getCacheKey(toolId, userId);

  try {
    const redis = await getRedisClient();

    if (redis) {
      await redis.del(key);
    } else {
      memoryCache.delete(key);
    }

    console.log(`[RedisCache] Invalidated cache for ${key}`);
  } catch (error) {
    console.error('[RedisCache] Error invalidating cache:', error);
    stats.errors++;
  }
}

/**
 * Invalidate all cached entitlements for a user (all tools).
 * Called when user account changes (e.g., credit purchase).
 */
export async function invalidateAllUserEntitlements(userId: string): Promise<void> {
  const pattern = `${CACHE_PREFIX}:*:${userId}`;

  try {
    const redis = await getRedisClient();

    if (redis) {
      // SCAN-based deletion for Redis
      let cursor = '0';
      let deletedCount = 0;

      do {
        const result = await redis.scan(cursor, pattern);
        cursor = result.cursor;

        if (result.keys.length > 0) {
          const deleted = await redis.del(result.keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');

      console.log(`[RedisCache] Invalidated ${deletedCount} keys for pattern ${pattern}`);
    } else {
      // Memory cache - iterate and delete matching
      let deletedCount = 0;
      for (const key of memoryCache.keys()) {
        if (key.endsWith(`:${userId}`)) {
          memoryCache.delete(key);
          deletedCount++;
        }
      }
      console.log(`[RedisCache] Invalidated ${deletedCount} keys from memory cache for pattern ${pattern}`);
    }
  } catch (error) {
    console.error('[RedisCache] Error invalidating user entitlements:', error);
    stats.errors++;
  }
}

/**
 * Invalidate all cached entitlements for a tool (all users).
 * Called when tool configuration changes.
 */
export async function invalidateAllToolEntitlements(toolId: string): Promise<void> {
  const pattern = `${CACHE_PREFIX}:${toolId}:*`;

  try {
    const redis = await getRedisClient();

    if (redis) {
      // SCAN-based deletion for Redis
      let cursor = '0';
      let deletedCount = 0;

      do {
        const result = await redis.scan(cursor, pattern);
        cursor = result.cursor;

        if (result.keys.length > 0) {
          const deleted = await redis.del(result.keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');

      console.log(`[RedisCache] Invalidated ${deletedCount} keys for pattern ${pattern}`);
    } else {
      // Memory cache - iterate and delete matching
      let deletedCount = 0;
      for (const key of memoryCache.keys()) {
        if (key.startsWith(`${CACHE_PREFIX}:${toolId}:`)) {
          memoryCache.delete(key);
          deletedCount++;
        }
      }
      console.log(`[RedisCache] Invalidated ${deletedCount} keys from memory cache for pattern ${pattern}`);
    }
  } catch (error) {
    console.error('[RedisCache] Error invalidating tool entitlements:', error);
    stats.errors++;
  }
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats(): CacheStats & { hitRate: number } {
  const total = stats.hits + stats.misses;
  return {
    ...stats,
    hitRate: total > 0 ? stats.hits / total : 0,
  };
}

/**
 * Reset cache statistics.
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.errors = 0;
}

// ============================================================================
// TOKEN VALIDATION CACHE
// Short-lived cache for token validation results (no rotation data)
// ============================================================================

interface TokenValidationCache {
  valid: boolean;
  userId: string;
  grantId: string;
  expiresAt: number;
  tokenExpiresAt: number;
}

const tokenValidationCache = new Map<string, TokenValidationCache>();
const TOKEN_VALIDATION_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Get cached token validation result.
 * Very short TTL to allow rapid re-verification when needed.
 */
export function getCachedTokenValidation(
  token: string,
  toolId: string
): TokenValidationCache | null {
  const key = `${token}:${toolId}`;
  const cached = tokenValidationCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  tokenValidationCache.delete(key);
  return null;
}

/**
 * Cache token validation result.
 */
export function setCachedTokenValidation(
  token: string,
  toolId: string,
  result: Omit<TokenValidationCache, 'expiresAt'>
): void {
  const key = `${token}:${toolId}`;
  tokenValidationCache.set(key, {
    ...result,
    expiresAt: Date.now() + TOKEN_VALIDATION_TTL_MS,
  });

  // Cleanup old entries
  if (tokenValidationCache.size > 10000) {
    const now = Date.now();
    for (const [k, v] of tokenValidationCache.entries()) {
      if (v.expiresAt < now) {
        tokenValidationCache.delete(k);
      }
    }
  }
}

/**
 * Invalidate cached token validation.
 * Called when token is rotated or revoked.
 */
export function invalidateCachedTokenValidation(
  token: string,
  toolId: string
): void {
  const key = `${token}:${toolId}`;
  tokenValidationCache.delete(key);
}

// ============================================================================
// GENERIC CACHE OPERATIONS
// ============================================================================

/**
 * Generic get from cache.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const now = Date.now();

  try {
    const redis = await getRedisClient();

    if (redis) {
      const cached = await redis.get(key);
      if (cached) {
        const entry = JSON.parse(cached);
        if (!entry.expiresAt || entry.expiresAt > now) {
          return entry.data as T;
        }
      }
    } else {
      const entry = memoryCache.get(key);
      if (entry && entry.expiresAt > now) {
        // Check if data is a CachedEntitlement with .entitlements property
        const cachedData = entry.data as unknown as CachedEntitlement;
        if (cachedData && typeof cachedData === 'object' && 'entitlements' in cachedData) {
          return cachedData.entitlements as unknown as T;
        }
        // Otherwise return data directly
        return entry.data as unknown as T;
      }
    }

    return null;
  } catch (error) {
    console.error('[Cache] Error getting from cache:', error);
    return null;
  }
}

/**
 * Generic set to cache.
 */
export async function setCache<T>(key: string, data: T, ttlSeconds: number = CACHE_TTL_SECONDS): Promise<void> {
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;

  const entry = { data, expiresAt };

  try {
    const redis = await getRedisClient();

    if (redis) {
      await redis.set(key, JSON.stringify(entry), { ex: ttlSeconds });
    } else {
      // Store generic data directly without assuming entitlements structure
      memoryCache.set(key, { data: data as unknown as CachedEntitlement, expiresAt });
    }
  } catch (error) {
    console.error('[Cache] Error setting cache:', error);
  }
}

/**
 * Generic delete from cache.
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const redis = await getRedisClient();

    if (redis) {
      await redis.del(key);
    } else {
      memoryCache.delete(key);
    }
  } catch (error) {
    console.error('[Cache] Error deleting from cache:', error);
  }
}
