# Supabase Storage Setup Instructions

## Quick Start

Follow these steps to configure secure storage for vendor image uploads.

**IMPORTANT**: Storage policies must be created via the Supabase Dashboard UI, not SQL.

## Step 1: Create Storage Bucket (if not exists)

If the `allfile` bucket doesn't exist yet:

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"Create a new bucket"**
4. Configure the bucket:
   - **Name**: `allfile`
   - **Public bucket**: ✅ Checked (images need to be publicly accessible)
   - **File size limit**: `10485760` (10MB)
   - **Allowed MIME types**:
     ```
     image/jpeg, image/jpg, image/png, image/webp, image/gif
     ```
5. Click **"Create bucket"**

## Step 2: Configure Storage Policies (Dashboard UI)

You must create storage policies through the Supabase Dashboard, not SQL.

### 2.1 Access Policies Configuration

1. Go to **Storage** > Click on `allfile` bucket
2. Click **"Policies"** tab at the top
3. You'll create 4 policies (one for each operation)

### 2.2 Policy 1: Allow Public Read (SELECT)

Click **"New Policy"** > Choose **"For full customization"**

**Policy Name**: `Public can view images`

**Allowed Operation**: `SELECT`

**Target Roles**: `public` (or leave empty for all roles)

**USING expression**:
```sql
bucket_id = 'allfile'
```

**WITH CHECK expression**: Leave empty (not needed for SELECT)

Click **"Review"** > **"Save policy"**

### 2.3 Policy 2: Allow Authenticated Upload (INSERT)

Click **"New Policy"** > Choose **"For full customization"**

**Policy Name**: `Vendors can upload images`

**Allowed Operation**: `INSERT`

**Target Roles**: `authenticated`

**USING expression**: Leave empty (not needed for INSERT)

**WITH CHECK expression**:
```sql
bucket_id = 'allfile'
AND (name LIKE 'tool-images/%' OR name LIKE 'tool-logos/%')
```

Click **"Review"** > **"Save policy"**

### 2.4 Policy 3: Allow Owners to Delete (DELETE)

Click **"New Policy"** > Choose **"For full customization"**

**Policy Name**: `Vendors can delete their own images`

**Allowed Operation**: `DELETE`

**Target Roles**: `authenticated`

**USING expression**:
```sql
bucket_id = 'allfile'
AND (
  name LIKE 'tool-images/' || auth.uid()::text || '-%'
  OR name LIKE 'tool-logos/' || auth.uid()::text || '-%'
)
```

**WITH CHECK expression**: Leave empty (not needed for DELETE)

Click **"Review"** > **"Save policy"**

### 2.5 Policy 4: Allow Owners to Update (UPDATE)

Click **"New Policy"** > Choose **"For full customization"**

**Policy Name**: `Vendors can update their own images`

**Allowed Operation**: `UPDATE`

**Target Roles**: `authenticated`

**USING expression**:
```sql
bucket_id = 'allfile'
AND (
  name LIKE 'tool-images/' || auth.uid()::text || '-%'
  OR name LIKE 'tool-logos/' || auth.uid()::text || '-%'
)
```

**WITH CHECK expression**:
```sql
bucket_id = 'allfile'
AND (
  name LIKE 'tool-images/' || auth.uid()::text || '-%'
  OR name LIKE 'tool-logos/' || auth.uid()::text || '-%'
)
```

Click **"Review"** > **"Save policy"**

## Step 3: Verify Configuration with SQL

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Copy the contents of `supabase-storage-setup-revised.sql`
5. Paste and run the verification checklist query (at the bottom of the file)

### Expected Output

You should see:
```
✓ Bucket "allfile" exists
✓ Bucket is public
ℹ Storage policies configured: 4
✓ Sufficient policies configured
```

### Additional Verification: Check Bucket Settings
```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'allfile';
```

**Expected result:**
- `public`: `true`
- `file_size_limit`: `10485760`
- `allowed_mime_types`: `{image/jpeg, image/jpg, image/png, image/webp, image/gif}`

### Check RLS Policies
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;
```

**Expected result:** 4 policies
1. `Public can view images` - SELECT
2. `Vendors can delete their own images` - DELETE
3. `Vendors can update their own images` - UPDATE
4. `Vendors can upload images` - INSERT

## Step 4: Test Upload

1. Log in to your application as a vendor
2. Navigate to **Vendor Dashboard > Publish Tool**
3. Try uploading a test image
4. Verify the image appears correctly

### Test Checklist

- ✅ Upload valid image (JPEG/PNG) - Should succeed
- ✅ Upload oversized file (>10MB) - Should show error
- ✅ Upload invalid file type (e.g., .pdf) - Should show error
- ✅ View uploaded image publicly - Should display
- ✅ Delete your own image - Should succeed
- ❌ Delete another vendor's image - Should fail (good!)

## Security Policies Explained

### 1. Upload Policy
**Who**: Authenticated users (vendors)
**What**: Can upload images to `tool-images/` and `tool-logos/` directories
**Why**: Allows vendors to upload hero images and logos for their tools

### 2. Read Policy
**Who**: Everyone (public)
**What**: Can view all images in the bucket
**Why**: Tool images need to be publicly visible on tool pages

### 3. Delete Policy
**Who**: Authenticated users (vendors)
**What**: Can delete only their own images (files starting with their user ID)
**Why**: Prevents vendors from deleting other vendors' images

### 4. Update Policy
**Who**: Authenticated users (vendors)
**What**: Can update metadata of their own images
**Why**: Allows vendors to modify image properties without re-uploading

## Monitoring Storage Usage

Use the monitoring queries in the SQL file:

### Total Storage Usage
```sql
SELECT
  COUNT(*) as total_files,
  SUM((metadata->>'size')::bigint) / 1024 / 1024 as total_mb
FROM storage.objects
WHERE bucket_id = 'allfile';
```

### Per-Vendor Usage
```sql
SELECT
  SUBSTRING(name FROM '(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})') as vendor_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) / 1024 / 1024 as total_mb
FROM storage.objects
WHERE bucket_id = 'allfile'
GROUP BY vendor_id
ORDER BY total_mb DESC;
```

## Troubleshooting

### Issue: "Bucket not found" error

**Solution**: Create the bucket manually in Supabase Dashboard (Step 1)

### Issue: "new row violates row-level security policy"

**Solution**:
1. Verify RLS policies are created (Step 2)
2. Check user is authenticated
3. Verify file path format: `tool-images/{userId}-{timestamp}.{ext}`

### Issue: Upload succeeds but image doesn't display

**Solution**:
1. Verify bucket is public: `public = true`
2. Check "Public can view images" policy exists
3. Verify URL is correct in browser console

### Issue: Can't delete or update images

**Solution**:
1. Verify user owns the file (filename starts with their user ID)
2. Check delete/update policies exist
3. Verify user is authenticated

## Maintenance

### Weekly Tasks
- Monitor storage usage
- Check for orphaned files (images not linked to any tool)

### Monthly Tasks
- Review access logs for suspicious activity
- Clean up old/unused images
- Verify RLS policies are still active

### Quarterly Tasks
- Review and update file size limits if needed
- Evaluate storage costs and optimize
- Update allowed MIME types if new formats needed

## Getting Help

If you encounter issues:

1. **Check Supabase Logs**: Dashboard > Logs > select "Storage"
2. **Review Error Messages**: Browser console and server logs
3. **Verify Policies**: Re-run the verification queries
4. **Contact Support**: Open a ticket with error details

## Related Files

- `supabase-storage-setup.sql` - SQL configuration script
- `STORAGE_CONFIGURATION.md` - Detailed configuration guide
- `src/lib/storage-validation.ts` - Validation utility
- `.env.local` - Environment configuration

## Next Steps

After successful setup:

1. ✅ Configure environment variables (already done)
2. ✅ Run SQL setup script (this guide)
3. ✅ Test uploads thoroughly
4. 📊 Set up monitoring alerts
5. 🔄 Schedule regular maintenance
6. 📈 Monitor costs and usage

---

**Setup Complete!** Your vendor image upload system is now secured. 🎉
