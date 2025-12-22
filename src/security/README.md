# Security

Cross-cutting security concerns.

## Structure

| Folder/File | Purpose |
|-------------|---------|
| `api-keys/` | API key generation, verification, rotation |
| `tokens/` | Token verification and rotation |
| `signatures/` | HMAC signature generation/verification |
| `rate-limiting.ts` | Rate limiting (token bucket) |
| `validation.ts` | Input validation (Zod schemas) |
| `sanitization.ts` | Input sanitization (XSS, SQL injection) |
| `audit-logger.ts` | Security audit logging |

## Rules

1. All API key operations go through `api-keys/`
2. All token operations go through `tokens/`
3. Rate limiting is applied at API route level
4. Validation happens before domain logic

## API Key Format

```
sk-tool-{random_string}
```

Stored as bcrypt hash with prefix index for fast lookup.
