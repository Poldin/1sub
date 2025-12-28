# Tool Deletion Foreign Key Constraint Fix

## Problem

Tool deletion was failing with the following error:

```
Failed to delete tool: update or delete on table "tools" violates foreign key constraint
"tool_subscriptions_tool_id_fkey" on table "tool_subscriptions"
```

## Root Cause

The `tool_subscriptions` table had a foreign key constraint to the `tools` table that was **missing** `ON DELETE CASCADE`. This meant:

1. When a tool is deleted, the database checks if there are any subscriptions referencing it
2. If subscriptions exist, the deletion is blocked to maintain referential integrity
3. Even though the API endpoint tried to manually delete subscriptions first, RLS policies prevented it from working in some cases

## Solution

Created migration `20251228000001_fix_tool_subscriptions_cascade.sql` to:

1. Drop the existing foreign key constraint
2. Re-add it with `ON DELETE CASCADE`

This ensures that when a tool is deleted, all related subscriptions are **automatically** deleted by the database.

## Migration Details

**File:** `supabase/migrations/20251228000001_fix_tool_subscriptions_cascade.sql`

```sql
-- Drop the existing constraint
ALTER TABLE tool_subscriptions
  DROP CONSTRAINT IF EXISTS tool_subscriptions_tool_id_fkey;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE tool_subscriptions
  ADD CONSTRAINT tool_subscriptions_tool_id_fkey
  FOREIGN KEY (tool_id)
  REFERENCES public.tools(id)
  ON DELETE CASCADE;
```

## How to Apply the Fix

### Option 1: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the migration SQL
4. Click **Run**

### Option 2: Supabase CLI

```bash
# Apply the migration
supabase db push

# Or run the specific migration file
supabase db execute -f supabase/migrations/20251228000001_fix_tool_subscriptions_cascade.sql
```

### Option 3: Manual SQL Execution

Connect to your database and run:

```sql
-- Drop the existing constraint
ALTER TABLE tool_subscriptions
  DROP CONSTRAINT IF EXISTS tool_subscriptions_tool_id_fkey;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE tool_subscriptions
  ADD CONSTRAINT tool_subscriptions_tool_id_fkey
  FOREIGN KEY (tool_id)
  REFERENCES public.tools(id)
  ON DELETE CASCADE;
```

## Verification

After applying the migration, verify the constraint was updated:

```sql
-- Check the constraint
SELECT
    conname AS constraint_name,
    confdeltype AS delete_action
FROM pg_constraint
WHERE conname = 'tool_subscriptions_tool_id_fkey';
```

Expected output:
- `delete_action` should be `c` (CASCADE)

Or check with this more readable query:

```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_name = 'tool_subscriptions_tool_id_fkey';
```

Expected output:
- `delete_rule` should be `CASCADE`

## Testing the Fix

After applying the migration, test tool deletion:

1. Create a test tool
2. Create a subscription for that tool
3. Delete the tool via the API: `DELETE /api/vendor/tools/{id}`
4. Verify:
   - Tool is deleted
   - Subscription is automatically deleted (CASCADE)
   - No error occurs

### Test Script

```javascript
// 1. Create a tool (via UI or API)
const toolId = 'your-tool-id';

// 2. Create a subscription
// (This happens automatically when a user purchases)

// 3. Delete the tool
const response = await fetch(`/api/vendor/tools/${toolId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${yourAuthToken}`,
  },
});

const result = await response.json();
console.log(result); // Should show success: true

// 4. Verify subscription was deleted
// Check in Supabase dashboard:
// SELECT * FROM tool_subscriptions WHERE tool_id = 'your-tool-id';
// Should return 0 rows
```

## Impact

### Before Fix
- ❌ Tool deletion failed if subscriptions existed
- ❌ Manual deletion of subscriptions didn't work due to RLS
- ❌ Vendors couldn't delete their tools

### After Fix
- ✅ Tools can be deleted successfully
- ✅ Subscriptions are automatically cleaned up
- ✅ No manual deletion needed
- ✅ Works even with RLS policies

## Related Tables

The following tables already have correct CASCADE constraints:

- ✅ `api_keys` → ON DELETE CASCADE
- ✅ `tool_products` → ON DELETE CASCADE
- ✅ `tool_user_links` → ON DELETE CASCADE
- ✅ `tool_link_codes` → ON DELETE CASCADE
- ✅ `usage_logs` → ON DELETE CASCADE
- ✅ `credit_transactions` → ON DELETE CASCADE
- ✅ `custom_pricing_requests` → ON DELETE CASCADE
- ✅ `webhook_logs` → ON DELETE CASCADE
- ✅ `authorization_codes` → ON DELETE CASCADE
- ✅ `verification_tokens` → ON DELETE CASCADE
- ✅ `revocations` → ON DELETE CASCADE

Only `tool_subscriptions` was missing the CASCADE constraint.

## Rollback (if needed)

If you need to rollback this change:

```sql
-- Drop the CASCADE constraint
ALTER TABLE tool_subscriptions
  DROP CONSTRAINT IF EXISTS tool_subscriptions_tool_id_fkey;

-- Re-add without CASCADE (original behavior)
ALTER TABLE tool_subscriptions
  ADD CONSTRAINT tool_subscriptions_tool_id_fkey
  FOREIGN KEY (tool_id)
  REFERENCES public.tools(id);
```

**Warning:** Rolling back will prevent tool deletion if subscriptions exist.

## Additional Notes

- This fix is **safe** to apply - it only changes the constraint behavior
- No data is lost or modified
- The change is **backward compatible**
- All existing subscriptions remain intact

## Prevention

To prevent similar issues in the future:

1. **Always use CASCADE** for foreign keys that should be cleaned up when the parent is deleted
2. **Test deletion** of parent resources to ensure cascades work
3. **Review migrations** before applying to production
4. **Document** cascade behavior in schema comments

## See Also

- [API Endpoint Fix](../API_FIXES.md)
- [Database Schema](../../supabase/migrations/)
- [Testing Guide](../../tests/README.md)
