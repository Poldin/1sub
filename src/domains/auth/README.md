# Auth Domain

Handles vendor authorization flow and access revocation.

## Canonical Entry Points

| File | Functions | Purpose |
|------|-----------|---------|
| `service.ts` | `initiate()`, `exchange()` | OAuth-like authorization flow |
| `verification.service.ts` | `verifyAccess()` | Verify user access tokens |
| `revocation.service.ts` | `revokeAccess()` | Revoke user access |

## The ONLY Supported Vendor Integration Path

```
POST /api/v1/authorize/initiate  ->  initiate()
POST /api/v1/authorize/exchange  ->  exchange()
POST /api/v1/verify              ->  verifyAccess()
POST /api/v1/credits/consume     ->  (credits domain)
```

## Rules

1. DO NOT add alternative authorization flows
2. DO NOT bypass verification.service.ts for access checks
3. All token operations go through `src/security/tokens/`
4. Revocation must trigger webhooks via `src/domains/webhooks/`

## Database Tables

- `authorization_codes` - Single-use codes (60s TTL)
- `verification_tokens` - Rolling tokens (24h expiry)
- `revocations` - Access revocation tracking
