# Webhooks Domain

Handles outgoing webhooks to vendor tools.

## Canonical Entry Points

| File | Functions | Purpose |
|------|-----------|---------|
| `service.ts` | `sendWebhook()`, `verifySignature()` | Webhook operations |

## Webhook Events

- `subscription.created`
- `subscription.cancelled`
- `subscription.renewed`
- `entitlement.granted`
- `entitlement.revoked`
- `credits.consumed`

## Security

- HMAC-SHA256 signatures
- Timestamp validation (5-minute tolerance)
- Uses `src/security/signatures/hmac.ts`

## Rules

1. All outgoing webhooks go through this domain
2. Signature generation is in security layer
3. Retry logic handled here
