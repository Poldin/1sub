# Auth Domain

⚠️ **CANONICAL SOURCE - This is the ONLY vendor authorization implementation**

Handles vendor authorization flow and access revocation.

## Critical Rules

### DO NOT:
- ❌ Create duplicate implementations in `src/lib/`
- ❌ Use JWT tokens for vendor authorization (use verification tokens)
- ❌ Bypass this service with direct database access
- ❌ Import from deleted files (ESLint will block)

### DO:
- ✅ Import from `@/domains/auth`
- ✅ Use verification tokens (not JWTs)
- ✅ Follow the OAuth-like flow: initiate → exchange → verify

### Deleted Files (DO NOT RECREATE):
- `src/lib/vendor-auth.ts` - Duplicate implementation (deleted 2025-12-26)

### Protection:
- ESLint rule `no-restricted-imports` prevents importing from deleted files
- Uniqueness test `authorization-flow-uniqueness.test.ts` verifies single path
- All API routes must import from `@/domains/auth`

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
