# Credits System Documentation

## Overview

The 1sub credits system provides a robust, atomic, and idempotent way to manage user credits for tool usage. It consists of a PostgreSQL-based ledger system with comprehensive APIs and UI components.

## Architecture

### Database Schema

#### `credit_balances` Table
- **Purpose**: Stores current credit balance for each user
- **Key Features**:
  - One record per user (enforced by UNIQUE constraint)
  - Non-negative balance constraint (`CHECK (balance >= 0)`)
  - Auto-created on user signup via database trigger

#### `credit_transactions` Table
- **Purpose**: Immutable ledger of all credit movements
- **Key Features**:
  - Complete audit trail with timestamps
  - Idempotency key support to prevent duplicate transactions
  - Transaction types: `grant`, `consume`, `refund`, `adjustment`
  - Metadata field for additional context

### Database Functions

#### `consume_credits(p_user_id, p_amount, p_reason, p_idempotency_key)`
- **Purpose**: Atomically consume credits with race condition prevention
- **Features**:
  - Row-level locking (`FOR UPDATE`) prevents concurrent modifications
  - Idempotency check prevents duplicate processing
  - Insufficient balance validation
  - Returns structured JSON response

#### `increment_balance(p_user_id, p_amount)`
- **Purpose**: Safely increment user balance
- **Features**:
  - Atomic balance update
  - Used by grant operations

## API Endpoints

### POST `/api/v1/credits/grant`
Grants credits to a user account.

**Request Body:**
```json
{
  "userId": "uuid",
  "amount": 100,
  "reason": "Manual top-up"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "entry": {
      "id": "tx-uuid",
      "userId": "user-uuid",
      "delta": 100,
      "balanceAfter": 200,
      "transactionType": "grant",
      "reason": "Manual top-up",
      "idempotencyKey": "grant_1234567890_abc",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### POST `/api/v1/credits/consume`
Consumes credits from a user account.

**Request Body:**
```json
{
  "userId": "uuid",
  "amount": 50,
  "reason": "Tool usage"
}
```

**Error Responses:**
- `400` - Insufficient credits
- `409` - Duplicate transaction (idempotency violation)

### GET `/api/v1/credits/balance`
Retrieves current credit balance for a user.

**Query Parameters:**
- `userId` (required): User UUID

**Response:**
```json
{
  "balance": 150.50
}
```

### GET `/api/v1/credits/transactions`
Retrieves transaction history for a user.

**Query Parameters:**
- `userId` (required): User UUID
- `limit` (optional): Number of transactions (1-100, default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "transactions": [
    {
      "id": "tx-uuid",
      "delta": -50,
      "balanceAfter": 100,
      "transactionType": "consume",
      "reason": "Tool usage",
      "idempotencyKey": "consume_123",
      "createdAt": "2024-01-01T00:00:00Z",
      "metadata": {}
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

## Library Functions

### `getCreditBalance(userId: string): Promise<CreditBalance>`
Retrieves current balance for a user.

### `grantCredits(userId: string, amount: number, reason?: string, idempotencyKey?: string): Promise<CreditTransaction>`
Grants credits to a user account.

**Idempotency Key Generation:**
- Format: `grant_${timestamp}_${randomString}`
- Auto-generated if not provided
- Ensures unique transactions

### `consumeCredits(userId: string, amount: number, reason?: string, idempotencyKey?: string): Promise<CreditTransaction>`
Consumes credits from a user account.

**Error Handling:**
- `Insufficient credits` - User doesn't have enough balance
- `Transaction already processed` - Duplicate idempotency key
- Database errors are propagated with context

## Security Considerations

### Row Level Security (RLS)
- Users can only view their own credit data
- Service role has full access for API operations
- Policies defined in `rls-policies.sql`

### Idempotency
- All credit operations support idempotency keys
- Prevents duplicate processing of the same request
- Critical for API reliability and user experience

### Race Condition Prevention
- Database-level locking prevents concurrent balance modifications
- `FOR UPDATE` clause in `consume_credits` function
- Atomic operations ensure data consistency

## Error Handling Patterns

### API Level
```typescript
// Consistent error response format
{
  "ok": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Insufficient credits. Current balance: 25"
  }
}
```

### Library Level
```typescript
// Structured error throwing
throw new Error(`Insufficient credits. Current balance: ${currentBalance}`)
```

## Testing Strategy

### Unit Tests (`tests/lib/credits.test.ts`)
- **Coverage**: 80%+ of `src/lib/credits.ts`
- **Focus Areas**:
  - Atomicity: Concurrent operations
  - Idempotency: Duplicate key handling
  - Error scenarios: Insufficient balance, network failures
  - Balance calculations: Transaction integrity

### Integration Tests (`tests/api/credits.test.ts`)
- **Coverage**: All API endpoints
- **Focus Areas**:
  - Request validation
  - Response format consistency
  - Error handling
  - Authentication/authorization

### Manual QA Checklist
1. **User Signup**: Verify 0 balance created automatically
2. **Credit Grant**: Test manual top-up functionality
3. **Credit Consumption**: Verify balance decreases correctly
4. **Insufficient Balance**: Test rejection of overspend attempts
5. **Transaction History**: Verify all operations are logged
6. **Concurrent Operations**: Test race condition prevention

## Performance Considerations

### Database Indexes
- `idx_credit_balances_user_id`: Fast balance lookups
- `idx_credit_transactions_user_id_created_at`: Efficient transaction history queries
- `idx_credit_transactions_idempotency_key`: Quick duplicate detection

### Query Optimization
- Pagination support for transaction history
- Efficient balance updates using database functions
- Minimal data transfer with selective field queries

## Monitoring and Observability

### Transaction Logging
- All credit operations logged to `credit_transactions`
- Includes metadata for debugging and analytics
- Timestamps for audit trail

### Error Tracking
- Structured error messages for monitoring
- Database errors logged with context
- API errors include error codes for categorization

## Future Enhancements

### Planned Features
- Credit expiration system
- Bulk credit operations
- Credit transfer between users
- Advanced analytics and reporting
- Webhook notifications for low balance

### Scalability Considerations
- Database partitioning for large transaction volumes
- Caching layer for frequently accessed balances
- Async processing for non-critical operations

## Development Guidelines

### Adding New Transaction Types
1. Update database schema enum in `schema.sql`
2. Add TypeScript types in `types/db.ts`
3. Update API validation schemas
4. Add tests for new transaction type
5. Update documentation

### Modifying Credit Logic
1. Always test atomicity with concurrent operations
2. Verify idempotency key handling
3. Update both unit and integration tests
4. Test error scenarios thoroughly
5. Update this documentation

## Troubleshooting

### Common Issues

#### "Insufficient credits" Error
- Check user's current balance
- Verify transaction amount is positive
- Ensure balance calculation is correct

#### "Transaction already processed" Error
- Check for duplicate idempotency keys
- Verify request isn't being retried
- Review transaction history for duplicates

#### Database Connection Errors
- Check Supabase service role key
- Verify database permissions
- Review RLS policies

### Debugging Tools
- Transaction history API for audit trail
- Database query logs in Supabase dashboard
- Error logs in application console
- Test suite for reproducing issues
