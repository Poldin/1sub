# Credits Domain

Handles all credit-related operations: balance, consumption, packages.

## Canonical Entry Points

| File | Functions | Purpose |
|------|-----------|---------|
| `service.ts` | `getCurrentBalance()`, `consumeCredits()`, `addCredits()` | All credit operations |
| `packages.ts` | `CREDIT_PACKAGES` | Package definitions |

## Rules

1. ALWAYS use `user_balances` table for balance lookups (NOT transaction sum)
2. ALWAYS use `consume_credits` RPC for consumption (atomic operation)
3. Credit additions go through `addCredits()` with idempotency key
4. DO NOT calculate balance from transactions (deprecated)

## Database Tables

- `user_balances` - Source of truth for current balance
- `credit_transactions` - Full ledger (never delete)

## RPC Functions

- `consume_credits()` - Atomic credit consumption with locking
