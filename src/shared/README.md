# Shared

Utilities and types shared across all layers.

## Structure

| Folder | Purpose |
|--------|---------|
| `errors/` | Error classes and handlers |
| `config/` | Environment variables, constants |
| `utils/` | Generic utility functions |

## Error Classes

Located in `errors/classes.ts`:

- `ApiError` - Base API error
- `ValidationError` - Input validation failures
- `AuthenticationError` - Auth failures
- `AuthorizationError` - Permission denied
- `NotFoundError` - Resource not found
- `RateLimitError` - Rate limit exceeded
- `InsufficientCreditsError` - Not enough credits

## Rules

1. Use error classes from `errors/` - don't create new ones
2. Environment variables validated via `config/env.ts`
3. Keep utilities generic (no business logic)
