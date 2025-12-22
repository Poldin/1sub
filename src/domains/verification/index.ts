/**
 * Verification Domain (Entitlements) - Public API
 *
 * CANONICAL SOURCE: All entitlement lookups MUST use this module.
 */

export {
  // Main functions
  getEntitlements,
  getEntitlementsWithCache,
  getEntitlementsWithAuthority,
  // Quick checks
  hasActiveSubscription,
  // Batch operations
  getEntitlementsForTools,
  // Cache management
  invalidateEntitlements,
  // Formatting
  formatEntitlementsForResponse,
  // Types
  type SubscriptionStatus,
  type Entitlements,
  type EntitlementLookupResult,
  type CacheOptions,
} from './service';
