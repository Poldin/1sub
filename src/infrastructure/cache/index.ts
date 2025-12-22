/**
 * Cache Infrastructure - Public API
 */

export {
  // Entitlements cache
  getCachedEntitlements,
  setCachedEntitlements,
  invalidateCachedEntitlements,
  invalidateAllUserEntitlements,
  invalidateAllToolEntitlements,
  // Token validation cache
  getCachedTokenValidation,
  setCachedTokenValidation,
  invalidateCachedTokenValidation,
  // Generic cache operations
  getCache,
  setCache,
  deleteCache,
  // Stats
  getCacheStats,
  resetCacheStats,
  // Types
  type Entitlements,
  type CachedEntitlement,
  type CacheStats,
} from './redis';
