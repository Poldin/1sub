# Database Migrations

This directory contains SQL migration scripts for the 1sub platform database.

## Setup Instructions

### Running Migrations in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Run the migrations in order:

```sql
-- 1. Vendor Applications Table
-- Run: 002_create_vendor_applications_table.sql

-- 2. API Keys Indexes and Policies  
-- Run: 001_add_api_keys_indexes_and_policies.sql

-- 3. RPC Functions
-- Run: 004_create_rpc_functions.sql

-- 4. Tool Subscriptions (if needed)
-- Run: 005_create_tool_subscriptions_table.sql
```

## Migration Files

### 001_add_api_keys_indexes_and_policies.sql
Adds indexes and RLS policies to the existing `api_keys` table for:
- Fast prefix-based API key lookups
- Security policies for vendors and service role
- Performance optimization

### 002_create_vendor_applications_table.sql
Creates the `vendor_applications` table for:
- Storing vendor application requests
- Approval workflow management
- Admin review tracking
- Automatic timestamp updates

### 004_create_rpc_functions.sql
Creates PostgreSQL functions for:
- `validate_api_key_hash()` - API key authentication
- `update_api_key_usage()` - Usage tracking
- `process_vendor_application()` - Application approval workflow
- `get_tool_analytics()` - Tool usage statistics
- `get_user_credit_history()` - User transaction history

### 005_create_tool_subscriptions_table.sql
Creates/updates the `tool_subscriptions` table for:
- User subscriptions to specific tools
- Billing cycle management
- Subscription status tracking

## Existing Tables

The following tables already exist in the database:
- `api_keys` - API key storage
- `checkouts` - Purchase transactions
- `credit_transactions` - Credit movements
- `jwks_keys` - JWT key management
- `platform_subscriptions` - Platform-level subscriptions
- `tool_link_codes` - Tool linking codes
- `tool_products` - Tool product definitions
- `tool_user_links` - User-tool relationships
- `tools` - Tool definitions
- `user_profiles` - User profile information
- `waitlist` - Waitlist entries

## Verification

After running the migrations, verify they were successful:

```sql
-- Check if vendor_applications table exists
SELECT * FROM vendor_applications LIMIT 1;

-- Check if RPC functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'validate_api_key_hash',
  'update_api_key_usage', 
  'process_vendor_application',
  'get_tool_analytics',
  'get_user_credit_history'
);

-- Check API keys indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'api_keys';
```

## Rollback

If you need to rollback a migration:

```sql
-- Rollback vendor applications
DROP TABLE IF EXISTS vendor_applications CASCADE;

-- Rollback RPC functions
DROP FUNCTION IF EXISTS validate_api_key_hash CASCADE;
DROP FUNCTION IF EXISTS update_api_key_usage CASCADE;
DROP FUNCTION IF EXISTS process_vendor_application CASCADE;
DROP FUNCTION IF EXISTS get_tool_analytics CASCADE;
DROP FUNCTION IF EXISTS get_user_credit_history CASCADE;

-- Rollback indexes (rarely needed)
DROP INDEX IF EXISTS idx_api_keys_key_prefix;
DROP INDEX IF EXISTS idx_api_keys_tool_id;
DROP INDEX IF EXISTS idx_api_keys_last_used;
```

## Notes

- All migrations use `IF NOT EXISTS` or `IF EXISTS` clauses to be idempotent
- RLS (Row Level Security) is enabled on all tables
- Functions use `SECURITY DEFINER` for elevated permissions where needed
- Indexes are optimized for common query patterns

