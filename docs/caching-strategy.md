# Caching Strategy

## Overview

The 1Sub platform uses Redis-based caching to optimize the hot verification path and reduce database load. This document describes the caching architecture, key patterns, and invalidation strategies.

## Architecture

### Primary Cache Layer
- **Location**: `src/infrastructure/cache/redis.ts`
- **Storage**: Redis (Upstash REST API) with in-memory fallback
- **Exports**: Available via `src/infrastructure/cache/index.ts`

### Fallback Behavior
When Redis is unavailable, the system automatically falls back to an in-memory LRU cache suitable for single-instance deployments.

## Cache Keys

### Entitlements Cache
- **Pattern**: `entitlement:{tool_id}:{user_id}`
- **TTL**: 15 minutes (900 seconds)
- **Data Structure**:
  ```typescript
  {
    entitlements: Entitlements,
    cachedAt: number,
    expiresAt: number
  }
  ```

### Token Validation Cache (Optional)
- **Pattern**: `token_validation:{token}:{tool_id}`
- **TTL**: 30 seconds
- **Storage**: In-memory Map (not shared across instances)
- **Purpose**: Short-lived validation cache to reduce DB queries

## Invalidation Triggers

### 1. Explicit Revocation
**When**: Admin or system revokes user access
**Trigger**: `revokeAccess(userId, toolId, reason)`
**Action**: Invalidates specific user+tool cache entry
**Impact**: Immediate access denial on next /verify call

### 2. Subscription Changes
**When**: Stripe webhook receives subscription updates
**Triggers**:
- `subscription.updated`
- `subscription.deleted`
- `subscription.canceled`

**Action**: Invalidates specific user+tool cache entry
**Impact**: Updated entitlements reflected within 1-2 seconds

### 3. Credit Balance Changes
**When**: User purchases credits
**Trigger**: `invalidateAllUserEntitlements(userId)`
**Action**: Invalidates ALL cached entitlements for this user across all tools
**Pattern**: Deletes keys matching `entitlement:*:{user_id}`

### 4. Tool Configuration Changes
**When**: Admin updates tool metadata, features, or limits
**Trigger**: `invalidateAllToolEntitlements(toolId)`
**Action**: Invalidates ALL cached entitlements for this tool across all users
**Pattern**: Deletes keys matching `entitlement:{tool_id}:*`

## Pattern-Based Invalidation

The cache layer supports pattern-based deletion using Redis SCAN:

```typescript
// Invalidate all entitlements for a user
await invalidateAllUserEntitlements(userId);
// Deletes: entitlement:tool1:user123, entitlement:tool2:user123, etc.

// Invalidate all entitlements for a tool
await invalidateAllToolEntitlements(toolId);
// Deletes: entitlement:tool123:user1, entitlement:tool123:user2, etc.
```

### Implementation Details
- Uses Redis SCAN with pattern matching
- Processes keys in batches (count=100)
- Continues until cursor returns to '0'
- Safe for large key spaces (doesn't block Redis)

## Security Considerations

### Revocation Check on Every Verify
Even when entitlements are cached, the `/verify` endpoint performs a real-time revocation check:

```typescript
// ALWAYS check revocation (even on cache hit)
const revocationCheck = await checkRevocation(userId, toolId);
if (revocationCheck.revoked) {
  return { valid: false, error: 'ACCESS_REVOKED' };
}
```

This ensures revoked users lose access immediately, regardless of cache state.

## Performance Metrics

### Target Metrics
- **Cache Hit Rate**: >80% on /verify endpoint
- **Cache Errors**: <0.1%
- **P95 Latency on Cache Hit**: <5ms
- **P95 Latency on Cache Miss**: <50ms

### Monitoring
View cache statistics at `/api/admin/cache-stats`:

```json
{
  "hits": 8523,
  "misses": 1477,
  "errors": 0,
  "hitRate": 0.8523,
  "hitRatePercentage": "85.23%",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## API Reference

### Core Functions

#### getCachedEntitlements
```typescript
async function getCachedEntitlements(
  toolId: string,
  userId: string
): Promise<Entitlements | null>
```
Retrieves cached entitlements. Returns `null` on miss or expiration.

#### setCachedEntitlements
```typescript
async function setCachedEntitlements(
  toolId: string,
  userId: string,
  entitlements: Entitlements,
  ttlSeconds?: number
): Promise<void>
```
Caches entitlements with optional custom TTL (default: 900s).

#### invalidateCachedEntitlements
```typescript
async function invalidateCachedEntitlements(
  toolId: string,
  userId: string
): Promise<void>
```
Invalidates a specific user+tool cache entry.

#### invalidateAllUserEntitlements
```typescript
async function invalidateAllUserEntitlements(
  userId: string
): Promise<void>
```
Invalidates all cached entitlements for a user (pattern: `entitlement:*:{userId}`).

#### invalidateAllToolEntitlements
```typescript
async function invalidateAllToolEntitlements(
  toolId: string
): Promise<void>
```
Invalidates all cached entitlements for a tool (pattern: `entitlement:{toolId}:*`).

## Common Patterns

### Cache-First Lookup with Authority Window
Used by the `/verify` endpoint:

```typescript
const result = await getEntitlementsWithAuthority(userId, toolId);
// Returns:
// {
//   success: true,
//   entitlements: {...},
//   authorityExpiresAt: timestamp,  // When to re-verify
//   fromCache: true                 // Whether this was a cache hit
// }
```

### Bypass Cache for Fresh Data
When you need guaranteed fresh data:

```typescript
const result = await getEntitlementsWithCache(userId, toolId, {
  bypassCache: true
});
```

### Fresh Credits with Cached Entitlements
When you only need up-to-date credit balance:

```typescript
const result = await getEntitlementsWithCache(userId, toolId, {
  freshCredits: true  // Refreshes credits, keeps other fields cached
});
```

## Migration Notes

### Deprecated Files
- ❌ `src/lib/redis-cache.ts` - REMOVED (duplicate)
- ❌ Old imports from `@/lib/redis-cache` - MIGRATED

### Current Canonical Source
- ✅ `src/infrastructure/cache/redis.ts` - Use this
- ✅ Import via `@/infrastructure/cache/redis` or `@/infrastructure/cache`

## Troubleshooting

### Cache Not Invalidating
**Symptom**: Updates not reflected immediately
**Check**:
1. Verify Redis connection: logs should show `[RedisCache] Connected to Redis`
2. Check webhook is calling correct invalidation function
3. Verify REDIS_URL and REDIS_TOKEN environment variables
4. Check `/api/admin/cache-stats` for errors

### High Cache Miss Rate
**Symptom**: Hit rate below 70%
**Possible Causes**:
1. TTL too short (default: 15 minutes)
2. Too many invalidations happening
3. Not enough traffic to warm cache
4. Redis connection issues causing fallback to memory

### Stale Data Served
**Symptom**: Old entitlements returned after updates
**Solution**:
1. Check that webhooks are properly invalidating cache
2. Verify invalidation is using correct toolId/userId
3. Ensure pattern-based invalidation is working (check logs for "Invalidated X keys")

## Testing

Run integration tests:
```bash
npm test tests/integration/cache-revocation.test.ts
npm test tests/integration/cache-invalidation.test.ts
```

## Environment Variables

```env
# Redis Configuration (Upstash)
REDIS_URL=redis://your-upstash-url
REDIS_TOKEN=your-upstash-token

# Alternative names (for compatibility)
KV_URL=redis://your-upstash-url
KV_REST_API_TOKEN=your-upstash-token
```

## Best Practices

1. **Always invalidate on state changes**: Subscription updates, revocations, credit changes
2. **Use pattern-based invalidation sparingly**: Only when necessary (user-wide or tool-wide changes)
3. **Monitor cache hit rate**: Target >80% for optimal performance
4. **Don't cache errors**: Only cache successful entitlement lookups
5. **Check revocation on every verify**: Even when serving from cache
6. **Use appropriate TTLs**: 15 minutes for entitlements, 30 seconds for token validation
7. **Log invalidations**: Helps debugging and audit trails

## Future Improvements

- [ ] Add cache warming on cold starts
- [ ] Implement distributed locking for cache updates
- [ ] Add cache versioning for breaking changes
- [ ] Support Redis cluster mode
- [ ] Add cache preloading for high-traffic users
- [ ] Implement probabilistic early expiration (prevent stampedes)
