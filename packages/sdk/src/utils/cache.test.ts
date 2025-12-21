import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cache, createCacheKey } from './cache.js';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>(1000); // 1 second TTL
  });

  afterEach(() => {
    cache.destroy();
  });

  it('stores and retrieves values', () => {
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('respects TTL', async () => {
    cache.set('key', 'value', 50); // 50ms TTL
    expect(cache.get('key')).toBe('value');

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(cache.get('key')).toBeUndefined();
  });

  it('checks if key exists', () => {
    cache.set('key', 'value');
    expect(cache.has('key')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('deletes keys', () => {
    cache.set('key', 'value');
    expect(cache.delete('key')).toBe(true);
    expect(cache.get('key')).toBeUndefined();
  });

  it('clears all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('returns correct size', () => {
    expect(cache.size).toBe(0);
    cache.set('key1', 'value1');
    expect(cache.size).toBe(1);
    cache.set('key2', 'value2');
    expect(cache.size).toBe(2);
  });

  it('returns all keys', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    const keys = cache.keys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  it('getOrSet returns cached value', async () => {
    const fetcher = vi.fn().mockResolvedValue('fetched');

    const result1 = await cache.getOrSet('key', fetcher);
    expect(result1).toBe('fetched');
    expect(fetcher).toHaveBeenCalledTimes(1);

    const result2 = await cache.getOrSet('key', fetcher);
    expect(result2).toBe('fetched');
    expect(fetcher).toHaveBeenCalledTimes(1); // Not called again
  });
});

describe('createCacheKey', () => {
  it('joins parts with colon', () => {
    expect(createCacheKey('a', 'b', 'c')).toBe('a:b:c');
  });

  it('filters out undefined values', () => {
    expect(createCacheKey('a', undefined, 'c')).toBe('a:c');
  });

  it('handles empty parts', () => {
    expect(createCacheKey()).toBe('');
  });
});
