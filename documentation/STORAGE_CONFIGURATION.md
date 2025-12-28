# Storage Configuration Guide

## Overview
This document outlines the security configurations needed for Supabase Storage to properly handle vendor image uploads.

## Environment Variables

The following environment variables have been added to `.env.local`:

```env
# Storage Configuration
NEXT_PUBLIC_STORAGE_BUCKET=allfile
MAX_FILE_SIZE_MB=10
MAX_LOGO_SIZE_MB=2
```

### Variable Descriptions

- `NEXT_PUBLIC_STORAGE_BUCKET`: The name of the Supabase storage bucket for file uploads
- `MAX_FILE_SIZE_MB`: Maximum file size for hero images (in megabytes)
- `MAX_LOGO_SIZE_MB`: Maximum file size for logos (in megabytes)

## Supabase Storage Bucket Configuration

### Required Settings

Configure your Supabase storage bucket with the following settings:

1. **Bucket Name**: `allfile` (or whatever is set in `NEXT_PUBLIC_STORAGE_BUCKET`)
2. **Public Bucket**: Yes (images need to be publicly accessible)
3. **File Size Limit**: 10MB for hero images, 2MB for logos
4. **Allowed MIME Types**:
   - `image/jpeg`
   - `image/jpg`
   - `image/png`
   - `image/webp`
   - `image/gif`

### Recommended RLS (Row Level Security) Policies

Add these policies to your Supabase storage bucket for security:

#### Policy 1: Allow Authenticated Vendors to Upload
```sql
-- Allow authenticated vendors to upload files
CREATE POLICY "Vendors can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'allfile'
  AND (storage.foldername(name))[1] IN ('tool-images', 'tool-logos')
  AND auth.uid()::text = (storage.foldername(name))[2]
);
```

#### Policy 2: Allow Public Read Access
```sql
-- Allow public read access to all images
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'allfile');
```

#### Policy 3: Allow Vendors to Delete Their Own Files
```sql
-- Allow vendors to delete their own files
CREATE POLICY "Vendors can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'allfile'
  AND auth.uid()::text = (storage.foldername(name))[2]
);
```

## File Upload Validation

### Client-Side Validation
The frontend implements the following validations:

1. **File Type**: Only image files (JPEG, PNG, WebP, GIF)
2. **File Size**:
   - Hero images: Maximum 10MB
   - Logos: Maximum 2MB
3. **Image Optimization**: Images are optimized before upload using the `image-optimization.ts` utility

### Server-Side Validation
The API endpoints implement the following validations:

1. **URL Validation**: Ensures image URLs come from authorized Supabase storage
2. **Origin Checking**: Validates that URLs are from the correct Supabase domain
3. **Ownership Verification**: Ensures users can only modify their own tools

## Security Features Implemented

### ✅ Fixed Issues

1. **Environment-based Configuration**: Bucket name is now configurable via environment variables
2. **URL Validation**: Server validates that image URLs come from authorized storage
3. **Improved Error Handling**: User-friendly error messages with specific guidance
4. **Optimized Caching**: Cache-Control headers set to 1 year for better performance
5. **Storage Validation Utility**: Centralized validation logic in `src/lib/storage-validation.ts`

### File Naming Security

Files are named using the following pattern:
```
{userId}-{timestamp}-{random}.{extension}
```

This provides:
- User isolation
- Timestamp uniqueness
- Random component for additional uniqueness
- Prevents path traversal attacks

## Storage Structure

```
allfile/
├── tool-images/
│   └── {userId}-{timestamp}.{ext}   # Hero images
└── tool-logos/
    └── {userId}-logo-{timestamp}.{ext}   # Logo images
```

## Monitoring and Maintenance

### Recommended Practices

1. **Monitor Storage Usage**: Set up alerts for storage quota thresholds
2. **Regular Audits**: Periodically review uploaded files for compliance
3. **Cleanup Policy**: Implement automated cleanup for unused/orphaned files
4. **Access Logs**: Enable and review Supabase storage access logs
5. **Rate Limiting**: Consider implementing upload rate limits per vendor

### Storage Quota Management

- Monitor per-vendor storage usage
- Set up alerts when approaching quota limits
- Implement automated warnings to vendors nearing their limits

## Additional Recommendations

### For Production Deployment

1. **Image CDN**: Consider using a CDN for image delivery
2. **Virus Scanning**: Implement malware scanning for uploaded files
3. **EXIF Stripping**: Remove metadata from uploaded images
4. **Progressive Images**: Generate multiple resolutions for responsive loading
5. **Backup Strategy**: Implement regular backups of the storage bucket

### Future Enhancements

1. **Image Variants**: Auto-generate thumbnails and different sizes
2. **Format Negotiation**: Serve WebP to supporting browsers
3. **Lazy Loading**: Implement lazy loading hints in the frontend
4. **Upload Resumability**: Add support for resumable uploads for large files
5. **Direct Upload**: Consider implementing direct upload to reduce server load

## Troubleshooting

### Common Issues

**Issue**: "Failed to upload image"
- **Solution**: Check Supabase storage bucket permissions and RLS policies

**Issue**: "Storage quota exceeded"
- **Solution**: Review and increase Supabase plan limits or clean up unused files

**Issue**: "Invalid file type"
- **Solution**: Ensure file is a valid image format (JPEG, PNG, WebP, GIF)

**Issue**: "File size exceeds maximum"
- **Solution**: Compress image before upload or reduce image dimensions

## Support

For additional help:
- Check Supabase Storage documentation: https://supabase.com/docs/guides/storage
- Review application logs in Supabase dashboard
- Contact development team for assistance
