# Payments Domain

Handles Stripe integration for payments and payouts.

## Canonical Entry Points

| File | Functions | Purpose |
|------|-----------|---------|
| `stripe.service.ts` | Stripe payment operations | Payment processing |
| `stripe-connect.service.ts` | Stripe Connect operations | Vendor payouts |

## Integration Points

- Credit purchases via Stripe Checkout
- Vendor payouts via Stripe Connect
- Webhook handling

## Rules

1. All Stripe operations go through this domain
2. Webhook handlers validate signatures before processing
3. Idempotency keys used for all operations
