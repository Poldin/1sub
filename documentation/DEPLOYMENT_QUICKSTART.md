# 🚀 Quick Deployment Guide - Supabase Security Fixes

**⏱️ Total Time**: ~40 minutes  
**⚠️ Impact**: Low (functions updated, logic unchanged)  
**✅ Rollback**: Available (see instructions)

---

## 📋 Pre-Deployment Checklist

- [ ] Read `SUPABASE_SECURITY_FIX_SUMMARY.md` (5 min)
- [ ] Schedule deployment during low-traffic period
- [ ] Notify team of upcoming database changes
- [ ] Have database credentials ready
- [ ] Test environment available (optional but recommended)

---

## 🔧 Deployment Steps

### 1️⃣ Backup (Required - 5 min)

```bash
# Create timestamped backup
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Or using psql directly
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

**✅ Verify**: Backup file exists and has content (not 0 bytes)

---

### 2️⃣ Apply Migration 1 (10 min)

**File**: `supabase/migrations/20250208000001_fix_function_search_path.sql`

**Option A - Supabase CLI**:
```bash
supabase db push supabase/migrations/20250208000001_fix_function_search_path.sql
```

**Option B - Supabase Dashboard**:
1. Go to SQL Editor in Supabase Dashboard
2. Open `20250208000001_fix_function_search_path.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **Run**

**✅ Verify**: No errors in output

---

### 3️⃣ Apply Migration 2 (10 min)

**File**: `supabase/migrations/20250208000002_fix_manual_functions_search_path.sql`

**Option A - Supabase CLI**:
```bash
supabase db push supabase/migrations/20250208000002_fix_manual_functions_search_path.sql
```

**Option B - Supabase Dashboard**:
1. Open `20250208000002_fix_manual_functions_search_path.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click **Run**

**✅ Verify**: No errors in output, see "Migration Complete" message

---

### 4️⃣ Verify Linter (2 min)

```bash
supabase db lint
```

**✅ Expected Result**: 
- 0 `function_search_path_mutable` warnings
- Only 1 warning remaining: `auth_leaked_password_protection`

---

### 5️⃣ Test Critical Flows (15 min)

Run these tests in your app or using Supabase SQL Editor:

#### Test 1: Credit Consumption
```javascript
// Try consuming credits
const { data, error } = await supabase.rpc('consume_credits', {
  p_user_id: 'test-user-id',
  p_amount: 10,
  p_reason: 'deployment_test',
  p_idempotency_key: `test-${Date.now()}`
});

console.log('Test 1:', data?.success ? '✅ PASS' : '❌ FAIL', data);
```

#### Test 2: Balance Query
```javascript
const { data, error } = await supabase
  .from('user_balances')
  .select('balance')
  .eq('user_id', 'test-user-id')
  .single();

console.log('Test 2:', data ? '✅ PASS' : '❌ FAIL', data);
```

#### Test 3: Tool Link Code
```javascript
const { data, error } = await supabase.rpc('create_tool_link_code', {
  p_tool_id: 'test-tool-id',
  p_onesub_user_id: 'test-user-id',
  p_ttl_minutes: 10
});

console.log('Test 3:', data?.code ? '✅ PASS' : '❌ FAIL', data);
```

#### Test 4: Analytics
```javascript
const { data, error } = await supabase.rpc('get_tool_analytics', {
  p_tool_id: 'test-tool-id'
});

console.log('Test 4:', data ? '✅ PASS' : '❌ FAIL', data);
```

#### Test 5: Helper Functions
```javascript
const { data, error } = await supabase.rpc('is_vendor', {
  p_user_id: 'test-user-id'
});

console.log('Test 5:', data !== null ? '✅ PASS' : '❌ FAIL', data);
```

**✅ All Tests Pass**: Proceed to next step  
**❌ Any Test Fails**: See Troubleshooting section below

---

### 6️⃣ Enable Leaked Password Protection (5 min)

1. Go to Supabase Dashboard
2. **Authentication** → **Policies** → **Password Settings**
3. Enable: ☑️ **Leaked Password Protection**
4. Set minimum password length: **10 characters** (recommended)
5. Click **Save**

**✅ Verify**: Try signing up with weak password (should fail)

**Note**: Update your frontend to handle password validation errors. See `docs/LEAKED_PASSWORD_PROTECTION.md` for implementation guide.

---

## 🎉 Post-Deployment

### Monitoring (First 24 Hours)

Watch for:
- [ ] No error spikes in application logs
- [ ] Credit transactions completing normally
- [ ] Balance updates working correctly
- [ ] No user complaints about authentication
- [ ] API key validation working

### Verification Queries

```sql
-- 1. Check all functions have search_path
SELECT p.proname as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM unnest(p.proconfig) AS config 
    WHERE config LIKE 'search_path=%'
  ) THEN '✅ SET' ELSE '❌ NOT SET' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prokind = 'f'
ORDER BY status, p.proname;

-- 2. Check new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('admin_audit_logs', 'low_balance_alerts');

-- 3. Check RLS is enabled on sensitive tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_balances', 'credit_transactions', 'api_keys', 
                    'admin_audit_logs', 'low_balance_alerts')
ORDER BY tablename;
```

---

## 🚨 Troubleshooting

### Issue: Migration Fails

**Error**: "function already exists"

**Solution**: This is normal if function exists. Migration uses `CREATE OR REPLACE` which updates existing functions.

**Error**: "relation does not exist"

**Solution**: Check that previous migrations were applied. Some functions depend on tables from earlier migrations.

---

### Issue: Tests Fail

**Test 1 Fails** (consume_credits):
- Check user has balance in `user_balances` table
- Verify user_id is valid UUID
- Check `credit_transactions` table has RLS enabled

**Test 2 Fails** (balance query):
- User may not have a balance record yet
- Insert test balance: 
  ```sql
  INSERT INTO user_balances (user_id, balance, updated_at)
  VALUES ('test-user-id', 100, NOW());
  ```

**Test 3 Fails** (link code):
- Verify tool_id exists in `tools` table
- Check user_id exists in auth.users or user_profiles
- Verify function permissions granted to authenticated users

**Test 4 Fails** (analytics):
- Tool may have no usage logs yet (returns 0, not error)
- Verify tool_id exists

**Test 5 Fails** (is_vendor):
- Function should return boolean (true/false), not error
- If error, check function was created successfully

---

### Issue: Linter Still Shows Warnings

**If function_search_path_mutable warnings remain**:

1. Check which functions:
   ```bash
   supabase db lint | grep function_search_path_mutable
   ```

2. Verify migrations were applied:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations
   WHERE version LIKE '20250208%';
   ```

3. Manually check function:
   ```sql
   SELECT p.proname, p.proconfig
   FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public' 
     AND p.proname = 'function_name_here';
   ```

---

## ↩️ Rollback Instructions

### When to Rollback

Only rollback if:
- Critical features completely broken
- Balance calculations are wrong
- Users cannot perform transactions
- Multiple critical errors in logs

### How to Rollback

```bash
# Restore from backup
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql

# Or using Supabase CLI
supabase db reset --db-url "postgresql://..."
```

**⚠️ Warning**: Rollback will lose any data changes made after backup (new signups, transactions, etc.)

### Better Alternative: Fix Forward

Instead of rollback, consider:
1. Identify specific failing function
2. Revert just that function manually
3. Keep other fixes in place
4. Debug and re-apply later

---

## 📞 Getting Help

### Documentation Files

- **Overview**: `SUPABASE_SECURITY_FIX_SUMMARY.md`
- **Detailed Migration Guide**: `supabase/migrations/SECURITY_FIX_README.md`
- **Security Audit**: `docs/DATABASE_SECURITY_AUDIT.md`
- **Password Protection**: `docs/LEAKED_PASSWORD_PROTECTION.md`

### Common Questions

**Q: Will this cause downtime?**  
A: No. Functions are updated atomically. There may be milliseconds where a function uses old definition, but no downtime.

**Q: Do existing users need to do anything?**  
A: No. This is a backend security fix. User experience is unchanged.

**Q: What if I don't enable leaked password protection?**  
A: The warning will remain, but functions are still secure. Enable it when ready to update frontend.

**Q: Are there any breaking changes?**  
A: No. Function signatures and behavior are unchanged. Only internal search_path is fixed.

**Q: Can I test in staging first?**  
A: Yes, highly recommended! Apply migrations to staging database first.

---

## ✅ Success Checklist

After deployment, confirm:

- [✓] Both migrations applied successfully
- [✓] `supabase db lint` shows 0 function_search_path warnings
- [✓] All 5 test cases pass
- [✓] No error spikes in application logs
- [✓] Users can perform normal actions (signup, login, use credits)
- [✓] Leaked password protection enabled (optional)
- [✓] Team notified of successful deployment

---

## 📊 Expected Results

### Before
```
$ supabase db lint
⚠️ function_search_path_mutable (24 warnings)
⚠️ auth_leaked_password_protection (1 warning)
Total: 25 warnings
```

### After (Migrations Only)
```
$ supabase db lint
⚠️ auth_leaked_password_protection (1 warning)
Total: 1 warning
```

### After (Migrations + Password Protection)
```
$ supabase db lint
✅ No warnings found!
```

---

## 🎯 Next Steps

After successful deployment:

1. **Monitor** for 24-48 hours
2. **Update frontend** to handle leaked password errors
3. **Review** additional recommendations in security audit doc
4. **Schedule** follow-up security review in 1 month
5. **Document** any issues encountered for future reference

---

**🎉 You're Done!**

Your database is now significantly more secure. Great job! 🔒

If you have any questions, refer to the detailed documentation files or review the inline comments in the migration files.

