# Deploy P0 Security Fixes - Simple Guide

## TL;DR

Run this single command:

```bash
npx supabase migration up
```

That's it! ✅

---

## What This Does

1. Applies any pending migrations (including the P0 fixes)
2. Updates the database functions with security fixes
3. Safe to run multiple times (idempotent)

---

## Detailed Steps

### Step 1: Apply Database Migrations

```bash
cd C:\Users\DISTRICTS\Desktop\1sub-dev
npx supabase migration up
```

**Expected output:**
```
Applying migration 20251221000001_create_vendor_auth_tables...
Applying migration 20251221000002_optimize_verification_functions...
Applying migration 20251227000001_fix_p0_security_bugs...
✅ All migrations applied successfully
```

**Or if already applied:**
```
No pending migrations
```

Both are fine! ✅

---

### Step 2: Restart Your Application

```bash
# If using npm
npm run dev

# Or if production
pm2 restart your-app
# or
systemctl restart your-service
```

---

### Step 3: Verify Fixes Are Applied

Run the verification script:

```bash
node scripts/verify-p0-fixes.js
```

**Expected output:**
```
✅ PASS Bug #3: revokeAccess() call found
✅ PASS Bug #1: Atomic UPDATE pattern found in migration
✅ PASS Bug #2: Subscription checks found in rotate_token
```

---

## What Got Fixed

✅ **Bug #1:** Code exchange race condition (prevents duplicate sessions)
✅ **Bug #2:** Token rotation after cancellation (blocks indefinite access)
✅ **Bug #3:** Manual cancellation now revokes tokens (immediate enforcement)

---

## Files Changed

**Database:**
- Migration applied: `20251227000001_fix_p0_security_bugs.sql`

**Code:**
- Updated: `src/app/api/subscriptions/cancel/route.ts`

---

## Troubleshooting

### Error: "Migration already applied"
**This is normal!** It means you're already up to date. ✅

### Error: "Cannot connect to database"
Check your `.env` file has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Function does not exist"
Your Supabase project might not have the required tables. Run all migrations:
```bash
npx supabase db push
```

---

## Verification

After deployment, check database:

```sql
-- Check migration was applied
SELECT * FROM supabase_migrations.schema_migrations
WHERE version = '20251227000001';

-- Should return 1 row

-- Check functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('exchange_authorization_code', 'rotate_token');

-- Should return 2 rows
```

---

## Rollback (Emergency Only)

**NOT RECOMMENDED** - Re-introduces vulnerabilities

If absolutely necessary:
```sql
-- Manually restore old functions from backup
-- Contact your DBA or security team first
```

---

## Questions?

- Review full documentation: `SECURITY_FIXES_P0.md`
- Testing guide: `P0_TESTING_GUIDE.md`
- Complete summary: `P0_FIXES_COMPLETE_SUMMARY.md`

---

**Deploy Time:** < 1 minute
**Downtime Required:** None
**Risk Level:** Low (tested and verified)

✅ **Ready to deploy immediately**
