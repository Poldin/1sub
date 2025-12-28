# Quick Setup Guide - Supabase Storage Policies

## ⚡ 3-Minute Setup (Dashboard UI Only)

### Step 1: Create Bucket (1 minute)

**Storage** → **New Bucket**

```
Name: allfile
Public: ✅ YES
Size Limit: 10485760
MIME Types: image/jpeg, image/jpg, image/png, image/webp, image/gif
```

---

### Step 2: Create 4 Policies (2 minutes)

**Storage** → **allfile** → **Policies** → **New Policy**

---

#### Policy #1: PUBLIC READ ✅

```
Name: Public can view images
Operation: SELECT
Role: public

USING expression:
bucket_id = 'allfile'
```

---

#### Policy #2: UPLOAD ⬆️

```
Name: Vendors can upload images
Operation: INSERT
Role: authenticated

WITH CHECK expression:
bucket_id = 'allfile'
AND (name LIKE 'tool-images/%' OR name LIKE 'tool-logos/%')
```

---

#### Policy #3: DELETE 🗑️

```
Name: Vendors can delete their own images
Operation: DELETE
Role: authenticated

USING expression:
bucket_id = 'allfile'
AND (
  name LIKE 'tool-images/' || auth.uid()::text || '-%'
  OR name LIKE 'tool-logos/' || auth.uid()::text || '-%'
)
```

---

#### Policy #4: UPDATE ✏️

```
Name: Vendors can update their own images
Operation: UPDATE
Role: authenticated

USING expression:
bucket_id = 'allfile'
AND (
  name LIKE 'tool-images/' || auth.uid()::text || '-%'
  OR name LIKE 'tool-logos/' || auth.uid()::text || '-%'
)

WITH CHECK expression:
bucket_id = 'allfile'
AND (
  name LIKE 'tool-images/' || auth.uid()::text || '-%'
  OR name LIKE 'tool-logos/' || auth.uid()::text || '-%'
)
```

---

### Step 3: Verify (30 seconds)

**SQL Editor** → Run this query:

```sql
-- Quick verification
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
```

**Expected result:** `policy_count: 4` (or more)

---

## ✅ Done!

Your storage is now secured. Test by uploading an image in your app.

---

## 🆘 Common Issues

| Error | Fix |
|-------|-----|
| "Row violates RLS policy" | Check policies are created and user is authenticated |
| "Bucket not found" | Create bucket in Step 1 |
| "File too large" | Set bucket file size limit to 10485760 |
| "Invalid MIME type" | Add image MIME types to bucket config |

---

## 📚 Full Documentation

- Detailed: `SUPABASE_SETUP_INSTRUCTIONS.md`
- Monitoring: `supabase-storage-setup-revised.sql`
- Security: `STORAGE_CONFIGURATION.md`
