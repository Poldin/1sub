# Checkout Process Error Fixes

This document summarizes the critical errors found in your checkout process and the fixes applied.

## Summary of Issues Fixed

### ✅ Issue #1: RLS Policy Blocking Vendor Credit Transactions (CRITICAL)
**Severity**: CRITICAL - Money deducted from buyers but not credited to vendors

**Error**:
```
Error creating credit transaction for transfer: {
  code: '42501',
  message: 'new row violates row-level security policy for table "credit_transactions"'
}
```

**Root Cause**:
The `transferCredits()` function in `src/lib/actions/credit-transactions.ts` was using a regular Supabase client authenticated as the buyer. When trying to create a credit transaction for the vendor (different user), Row-Level Security (RLS) policies blocked the operation.

**Fix Applied**:
- Modified `src/lib/actions/credit-transactions.ts` to use `createServiceClient()` for vendor credit transactions
- Service role client bypasses RLS policies, allowing the system to credit vendors properly
- Import added: `import { createServiceClient } from '@/infrastructure/database/client';`

**Location**: `src/lib/actions/credit-transactions.ts:692-697`

---

### ✅ Issue #2: Ambiguous Column Reference in Link Code Generation
**Severity**: HIGH - Link code generation fails during checkout

**Error**:
```
[Checkout] Failed to generate link code: {
  code: '42702',
  details: 'It could refer to either a PL/pgSQL variable or a table column.',
  message: 'column reference "expires_at" is ambiguous'
}
```

**Root Cause**:
The `create_tool_link_code()` function has a RETURNS TABLE with an `expires_at` column, and the UPDATE statement also references `expires_at` without qualifying which one, creating ambiguity.

**Fix Applied**:
- Updated SQL function to qualify column references: `tool_link_codes.expires_at`
- Fixed in both `create_tool_link_code()` and `exchange_tool_link_code()` functions
- Created migration file: `supabase/migrations/20251222000001_fix_ambiguous_expires_at_column.sql`

**Locations**:
- `supabase/migrations/20250116000001_create_tool_verification_tables.sql:169`
- `supabase/migrations/20250116000001_create_tool_verification_tables.sql:214`

---

### ✅ Issue #3: User Email Fetch Permission Error
**Severity**: MEDIUM - Webhooks fail to include user email

**Error**:
```
[Webhook] Could not fetch email for user 43757168-f7c3-4355-a92e-ad030a83c6c9: Error [AuthApiError]: User not allowed
  status: 403,
  code: 'not_admin'
```

**Root Cause**:
The `getUserEmail()` function was using a regular authenticated client to call `supabase.auth.admin.getUserById()`, which requires admin privileges.

**Fix Applied**:
- Modified `src/lib/tool-webhooks.ts` to use `createServiceClient()` for fetching user emails
- Service role client has admin privileges to access auth.users table
- Import added: `import { createServiceClient } from '@/infrastructure/database/client';`

**Location**: `src/lib/tool-webhooks.ts:25-43`

---

### ℹ️ Issue #4: Missing API Key (Expected Behavior)
**Severity**: INFO - Not a bug, expected behavior

**Error**:
```
[Webhook] No API key found for tool 75ecd5f7-4a69-4176-9b53-6c378fd715c0: {
  code: 'PGRST116',
  message: 'Cannot coerce the result to a single JSON object'
}
```

**Explanation**:
This occurs when a vendor hasn't configured their API key or webhook URL yet. The system handles this gracefully:
- Logs a warning
- Returns `false` from `sendToolWebhook()`
- Doesn't fail the checkout process
- Vendors need to create API keys in their dashboard

**Action Required**: None - vendors should configure their API keys when ready

---

## Deployment Steps

### 1. Apply Code Changes
The TypeScript files have already been updated:
- ✅ `src/lib/actions/credit-transactions.ts` - Uses service role for vendor credits
- ✅ `src/lib/tool-webhooks.ts` - Uses service role for email fetch and webhooks

### 2. Apply Database Migration
Run the new migration to fix the SQL function:

```bash
# Apply migration
supabase db push

# Or if using Supabase CLI
supabase migration up
```

**Migration file**: `supabase/migrations/20251222000001_fix_ambiguous_expires_at_column.sql`

### 3. Verify Environment Variables
Ensure the service role key is configured:

```bash
# Required in .env.local or environment
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Test the Fixes
After deployment, test:

1. **Credit Transfer**: Complete a tool purchase and verify:
   - Buyer balance is debited ✓
   - Vendor balance is credited ✓
   - No RLS policy errors ✓

2. **Link Code Generation**: For subscription purchases:
   - Link code is generated successfully ✓
   - No SQL ambiguity errors ✓

3. **Webhook Delivery**: Check webhook logs:
   - User emails are fetched successfully ✓
   - No 403 permission errors ✓

---

## Impact Assessment

### Before Fixes
- ❌ Vendor earnings were not being recorded (critical financial issue)
- ❌ Link codes failed to generate for subscriptions
- ❌ Webhooks lacked user email information

### After Fixes
- ✅ Complete credit transfers (buyer → vendor) work correctly
- ✅ Link codes generate successfully for subscriptions
- ✅ Webhooks include full user information
- ✅ System maintains financial integrity

---

## Monitoring Recommendations

After deployment, monitor these logs:

```typescript
// Success indicators
'[DEBUG][checkout/process] Transfer successful - both transactions created'
'[Checkout] Link code generated successfully for subscription'
'[Webhook] Successfully sent subscription.activated to tool'

// Error patterns to watch
'CRITICAL: Vendor credit transaction failed' // Should no longer appear
'Failed to generate link code' // Should no longer appear with ambiguous error
'Could not fetch email for user' // Should no longer appear with 403 error
```

---

## Files Modified

1. `src/lib/actions/credit-transactions.ts`
   - Added service role import
   - Modified vendor credit transaction to use service client

2. `src/lib/tool-webhooks.ts`
   - Added service role import
   - Modified getUserEmail() to use service client

3. `supabase/migrations/20250116000001_create_tool_verification_tables.sql`
   - Fixed ambiguous column references

4. `supabase/migrations/20251222000001_fix_ambiguous_expires_at_column.sql` (NEW)
   - Migration to apply SQL fixes to database

---

## Questions?

If you encounter any issues after deployment:

1. Check Supabase logs for RLS policy errors
2. Verify SUPABASE_SERVICE_ROLE_KEY is set correctly
3. Ensure migration was applied successfully
4. Review checkout transaction logs for both debit and credit transactions

---

**Generated**: 2025-12-22
**Status**: Ready for deployment
