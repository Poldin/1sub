# Domains

This folder contains all business logic organized by domain.

## Structure

| Domain | Purpose | Canonical Entry Point |
|--------|---------|----------------------|
| `auth/` | Authorization codes, token exchange, revocation | `service.ts` |
| `verification/` | Entitlement checks, access verification | `service.ts` |
| `credits/` | Credit balance, consumption, packages | `service.ts` |
| `subscriptions/` | Platform & tool subscriptions, plans | `service.ts` |
| `checkout/` | Tool purchase & credit purchase flows | `tool-purchase.service.ts`, `credit-purchase.service.ts` |
| `webhooks/` | Outgoing webhooks to tools | `service.ts` |
| `vendors/` | Vendor management, analytics | `service.ts` |
| `payments/` | Stripe integration, Connect | `stripe.service.ts` |
| `tools/` | Tool CRUD, phases | `service.ts` |

## Rules

1. **One source of truth**: Each domain owns its logic exclusively
2. **No cross-domain DB access**: Use domain services, not direct queries
3. **HTTP layer calls domains**: API routes should only call domain services
4. **Domains call infrastructure**: For DB, cache, email operations

## Layer Diagram

```
API Routes (HTTP)
    |
    v
Domains (Business Logic)
    |
    v
Infrastructure (DB, Cache, Email)
```
