# Infrastructure

Data layer: database, cache, email, storage.

## Structure

| Folder | Purpose |
|--------|---------|
| `database/` | Supabase clients, types |
| `cache/` | Redis operations |
| `email/` | Email sending (Resend) |

## Rules

1. Only domains call infrastructure
2. API routes should NOT call infrastructure directly
3. All Supabase clients come from `database/client.ts`

## Database Client Factory

```typescript
// src/infrastructure/database/client.ts
export function createBrowserClient()  // For client-side
export function createServerClient()   // For server-side (authenticated)
export function createServiceClient()  // For service role operations
```

DO NOT create Supabase clients elsewhere.
