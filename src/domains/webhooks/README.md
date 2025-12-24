# Webhooks Domain

Unified webhook system for vendor notifications.

## Architecture

This domain consolidates ALL webhook functionality:
- **Outbound webhooks** to vendors (`outbound-webhooks.ts`)
- **Inbound webhooks** from Stripe (`stripe-webhooks.ts`)
- **Retry mechanism** with exponential backoff (`webhook-retry-service.ts`)
- **Alert system** for failed webhooks (`webhook-alerts.ts`)

## Entry Point

Use `index.ts` as the public API - it exports all webhook functions and types.

```typescript
import {
  notifySubscriptionCreated,
  notifySubscriptionUpdated,
  notifySubscriptionCanceled,
  // ... all other events
} from '@/domains/webhooks';
```

## Webhook Events (Outbound to Vendors)

### Subscription Lifecycle
- `subscription.created` - New subscription created
- `subscription.activated` - Subscription activated or reactivated
- `subscription.updated` - Subscription changed (renewal, plan change, etc.)
- `subscription.canceled` - Subscription canceled or expired

### Purchases
- `purchase.completed` - One-time purchase completed

### Access Management
- `entitlement.granted` - User granted access via auth code
- `entitlement.revoked` - User's access revoked
- `entitlement.changed` - User's plan or features changed

### Credits
- `credits.consumed` - Credits used by user
- `user.credit_low` - User's balance running low
- `user.credit_depleted` - User's balance reached zero

### System
- `tool.status_changed` - Tool status changed on platform
- `verify.required` - Immediate verification required (security event)

## Key Features

- **15-second timeout** on all webhook requests
- **Automatic retry** for 5xx errors with exponential backoff (1min, 5min, 15min, 1hr, 6hr)
- **Dead letter queue** for permanently failed webhooks
- **Email alerts** when webhooks exhaust all retries
- **Full logging** of all delivery attempts
- **Event deduplication** via unique event IDs
- **HMAC-SHA256 signatures** for security
- **Non-blocking delivery** (fire-and-forget pattern)

## Security

- HMAC-SHA256 signatures with timestamp
- Header: `X-1Sub-Signature`
- Format: `t={timestamp},v1={signature}`
- Replay protection (5-minute tolerance)
- Signature generation via `src/security/signatures/hmac.ts`

