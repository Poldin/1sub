# Verification Domain

Handles entitlement checks and access verification.

## Canonical Entry Points

| File | Functions | Purpose |
|------|-----------|---------|
| `service.ts` | `getEntitlements()`, `hasActiveSubscription()` | Entitlement lookups |

## Rules

1. Use cached entitlements by default (Redis)
2. Cache TTL: 15 minutes
3. Invalidate cache on subscription changes
4. For critical checks, use authority window pattern

## Database Tables

- `tool_subscriptions` - User subscriptions to tools
- `platform_subscriptions` - Platform-level subscriptions

## Caching

Uses Redis via `src/infrastructure/cache/redis.ts`
