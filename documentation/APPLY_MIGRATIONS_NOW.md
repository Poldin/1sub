# Apply Migrations - Fixed & Ready

## ✅ Error Fixed!

The "function name is not unique" error has been fixed.

**What was wrong:**
- PostgreSQL had two versions of `exchange_authorization_code` with different signatures
- The new P1 migration added a parameter, creating a duplicate

**What was fixed:**
- Added `DROP FUNCTION IF EXISTS` before creating the new version
- File updated: `supabase/migrations/20251227000002_fix_p1_security_issues.sql`

---

## 🚀 Apply Migrations Now

### Single Command

```bash
npx supabase migration up
```

That's it! ✅

---

## Expected Output

```
Applying migration 20251227000001_fix_p0_security_bugs...
✅ Migration 20251227000001 applied

Applying migration 20251227000002_fix_p1_security_issues...
✅ Migration 20251227000002 applied

All migrations applied successfully!
```

---

## Verify Success

```bash
# 1. Check migrations applied
npx supabase migration list

# 2. Verify code
node scripts/verify-p0-fixes.js

# 3. Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM audit_security_events;"
```

---

## If You Still Get Errors

See: `MIGRATION_TROUBLESHOOTING.md`

Quick fix:
```sql
-- If needed, manually drop the old function
DROP FUNCTION IF EXISTS exchange_authorization_code(TEXT, UUID, TEXT);

-- Then retry
npx supabase migration up
```

---

## What Gets Applied

### Migration 1: P0 Security Fixes
- ✅ Atomic code exchange (prevents race condition)
- ✅ Token rotation with subscription check
- ✅ Enhanced revocation

### Migration 2: P1 Fixes + Audit Logging
- ✅ Creates `audit_security_events` table
- ✅ Logs all security events:
  - Code exchanges (success/failure)
  - Code reuse attempts
  - Revocations
  - Access violations
- ✅ Enhanced redirect URI validation
- ✅ IP address tracking (optional)

---

## After Migration Success

1. **Restart your app:**
   ```bash
   npm run dev
   ```

2. **Monitor audit logs:**
   ```sql
   SELECT event_type, severity, COUNT(*)
   FROM audit_security_events
   GROUP BY event_type, severity;
   ```

3. **Done!** All security fixes are now active ✅

---

## Quick Reference

**Apply migrations:**
```bash
npx supabase migration up
```

**Check status:**
```bash
npx supabase migration list
```

**Verify fixes:**
```bash
node scripts/verify-p0-fixes.js
```

**View audit events:**
```sql
SELECT * FROM audit_security_events
ORDER BY created_at DESC
LIMIT 10;
```

---

✅ **Ready to apply!**

Just run: `npx supabase migration up`
