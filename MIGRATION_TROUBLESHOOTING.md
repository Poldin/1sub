# Migration Troubleshooting Guide

## Error: "function name is not unique"

**Full error:**
```
ERROR: 42725: function name "exchange_authorization_code" is not unique
HINT: Specify the argument list to select the function unambiguously.
```

### ✅ FIXED

This error has been fixed in the migration file. The issue was that PostgreSQL had two versions of the function with different signatures.

**Fix applied:**
- Added `DROP FUNCTION IF EXISTS exchange_authorization_code(TEXT, UUID, TEXT);` before creating the new version
- File: `supabase/migrations/20251227000002_fix_p1_security_issues.sql`

---

## How to Apply Migrations Now

### Clean Start (Recommended)

```bash
# Apply all migrations in order
npx supabase migration up
```

**Expected output:**
```
Applying migration 20251221000001_create_vendor_auth_tables...
Applying migration 20251221000002_optimize_verification_functions...
Applying migration 20251227000001_fix_p0_security_bugs...
Applying migration 20251227000002_fix_p1_security_issues...
✅ All migrations applied successfully
```

---

### If Migration Already Partially Applied

If you already tried to apply the P1 migration and it failed:

**Option 1: Rollback and Retry**
```sql
-- Connect to your database
psql $DATABASE_URL

-- Check which migrations are applied
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version;

-- If 20251227000002 shows as failed/partial, remove it
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20251227000002';

-- Exit psql
\q

-- Now retry migration
npx supabase migration up
```

**Option 2: Manual Fix**
```sql
-- Connect to database
psql $DATABASE_URL

-- Drop the duplicate function
DROP FUNCTION IF EXISTS exchange_authorization_code(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS exchange_authorization_code(TEXT, UUID, TEXT, INET);

-- Exit and retry migration
\q

npx supabase migration up
```

---

## Verify Migration Success

### Check Migration Status
```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version LIKE '202512%'
ORDER BY version;
```

**Expected result:**
```
   version      |              name
-----------------+--------------------------------
20251227000001  | fix_p0_security_bugs
20251227000002  | fix_p1_security_issues
```

### Check Functions Exist
```sql
SELECT
    proname as function_name,
    pronargs as num_args,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('exchange_authorization_code', 'rotate_token', 'revoke_access')
  AND pronamespace = 'public'::regnamespace
ORDER BY proname, num_args;
```

**Expected result:**
```
function_name              | num_args | arguments
---------------------------+----------+--------------------------------
exchange_authorization_code|    4     | p_code TEXT, p_tool_id UUID, ...
rotate_token               |    2     | p_token TEXT, p_tool_id UUID
revoke_access              |    5     | p_user_id UUID, p_tool_id UUID, ...
```

### Check Audit Table Exists
```sql
SELECT COUNT(*) FROM audit_security_events;
```

Should return `0` (or higher if events already logged) without errors.

---

## Common Migration Errors

### Error: "relation already exists"
**Cause:** Table was already created
**Fix:**
```sql
-- Check if table exists
SELECT tablename FROM pg_tables WHERE tablename = 'audit_security_events';

-- If exists, migration can skip table creation
-- Re-run migration (it should skip existing items)
```

### Error: "permission denied"
**Cause:** Not using service role key
**Fix:** Check `.env` has `SUPABASE_SERVICE_ROLE_KEY` (not anon key)

### Error: "could not connect to server"
**Cause:** Database not running or wrong connection string
**Fix:**
```bash
# Check Supabase status
npx supabase status

# Or check connection
psql $DATABASE_URL -c "SELECT 1;"
```

---

## Migration Order

Migrations MUST be applied in this order:

1. ✅ `20251221000001_create_vendor_auth_tables.sql` (original)
2. ✅ `20251221000002_optimize_verification_functions.sql` (original)
3. ✅ `20251227000001_fix_p0_security_bugs.sql` (P0 fixes)
4. ✅ `20251227000002_fix_p1_security_issues.sql` (P1 fixes + audit logging)

**They will auto-apply in correct order with:**
```bash
npx supabase migration up
```

---

## Rollback a Single Migration

**⚠️ Only if absolutely necessary:**

```sql
-- Connect to database
psql $DATABASE_URL

-- Start transaction
BEGIN;

-- Remove migration record
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20251227000002';

-- Drop audit table (if created)
DROP TABLE IF EXISTS audit_security_events CASCADE;

-- Restore old exchange function (from previous migration)
-- (The old version will be in 20251227000001 migration)

COMMIT;  -- or ROLLBACK if unsure
```

**Better approach:** Fix forward with a new migration

---

## Success Checklist

After successful migration:

- [ ] All 4 migrations show in `supabase_migrations.schema_migrations`
- [ ] `audit_security_events` table exists and is queryable
- [ ] Functions have correct number of arguments (check query above)
- [ ] No errors when calling `/api/v1/authorize/exchange`
- [ ] Audit events start appearing in table

---

## Test After Migration

### Quick Test
```bash
node scripts/verify-p0-fixes.js
```

Should output:
```
✅ PASS Bug #3: revokeAccess() call found
✅ PASS Bug #1: Atomic UPDATE pattern found
✅ PASS Bug #2: Subscription checks found
✅ ALL P0 FIXES VERIFIED IN CODE
```

### Database Test
```sql
-- Check audit table works
INSERT INTO audit_security_events (event_type, severity, metadata)
VALUES ('code_exchange_success', 'info', '{"test": true}'::jsonb);

SELECT * FROM audit_security_events WHERE metadata->>'test' = 'true';

-- Clean up test
DELETE FROM audit_security_events WHERE metadata->>'test' = 'true';
```

---

## Need Help?

1. Check migration files are in `supabase/migrations/` folder
2. Check file names match exactly (case-sensitive)
3. Run `npx supabase migration list` to see pending migrations
4. Check logs: `tail -f /var/log/postgresql/postgresql.log`

---

**Quick Fix Command:**
```bash
# If you hit the "function not unique" error, just re-run:
npx supabase migration up

# The fixed migration file now handles this automatically
```

✅ Migration should now work!
