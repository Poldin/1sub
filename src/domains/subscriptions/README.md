# Subscriptions Domain

Handles platform and tool subscriptions.

## Canonical Entry Points

| File | Functions | Purpose |
|------|-----------|---------|
| `service.ts` | `createSubscription()`, `cancelSubscription()`, `renewSubscription()` | Subscription lifecycle |
| `plans.ts` | `SUBSCRIPTION_PLANS` | Plan definitions |

## Subscription Types

1. **Platform Subscriptions** - 1sub platform access (monthly/annual)
2. **Tool Subscriptions** - Access to specific vendor tools

## Database Tables

- `platform_subscriptions` - Platform-level subscriptions
- `tool_subscriptions` - Tool-specific subscriptions

## Rules

1. Subscription creation triggers webhooks via `src/domains/webhooks/`
2. Cancellation triggers entitlement revocation
3. Renewals are processed via cron job
