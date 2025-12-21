import type { CacheEntry } from '../types.js';

/**
 * Simple in-memory cache with TTL support
 */
export class Cache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly defaultTTL: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTTL: number = 60000) {
    this.defaultTTL = defaultTTL;
    this.startCleanupInterval();
  }

  /**
   * Get a value from the cache
   * Returns undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.store.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);

    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get the number of entries in the cache
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Start automatic cleanup interval (every minute)
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);

    // Don't prevent Node.js from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop automatic cleanup and clear the cache
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Get or set a value with automatic caching
   * Useful for caching async operations
   */
  async getOrSet(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }
}

/**
 * Create a cache key from multiple parts
 */
export function createCacheKey(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(':');
}
