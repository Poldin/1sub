# Waitlist Feature Deployment Guide

## Database Changes Required

To deploy the waitlist feature, you need to run the following SQL in your Supabase SQL Editor:

```sql
-- 6. Waitlist Table
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  use_case TEXT,
  type TEXT NOT NULL CHECK (type IN ('user', 'vendor')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for waitlist
CREATE INDEX idx_waitlist_email ON public.waitlist(email);
CREATE INDEX idx_waitlist_type ON public.waitlist(type);
```

## Environment Variables

Add these to your `.env.local` file:

```bash
# Email Configuration (for waitlist notifications)
ADMIN_EMAIL=your-admin@email.com
RESEND_API_KEY=your_resend_api_key
```

## Features Implemented

### 1. Waitlist Page (`/waitlist`)
- **Tab Switcher**: Toggle between "I want to use tools" and "I want to publish a tool"
- **User Form**: Email only
- **Vendor Form**: Email, Name, Company, Use Case
- **Three.js Background**: Interactive GridDistortion effect
- **Responsive Design**: Works on mobile and desktop

### 2. API Endpoint (`/api/v1/waitlist/submit`)
- **Validation**: Zod schemas for both user and vendor forms
- **Database Storage**: Stores submissions in Supabase `waitlist` table
- **Email Notifications**: Sends admin notifications via Resend
- **Duplicate Prevention**: Prevents duplicate email registrations
- **Error Handling**: Comprehensive error responses

### 3. Homepage Updates
- **CTA Buttons**: Updated to point to `/waitlist` instead of `/login`
- **Existing Pages**: All auth pages (login, register, backoffice) remain unchanged

## Testing

1. **Visit `/waitlist`** - Should show the tab switcher and forms
2. **Test User Form** - Submit with email only
3. **Test Vendor Form** - Submit with all required fields
4. **Test Validation** - Try submitting empty forms
5. **Test Duplicates** - Try submitting same email twice
6. **Check Database** - Verify entries appear in `waitlist` table
7. **Check Email** - Verify admin receives notification emails

## Dependencies Added

- `three` - Three.js for 3D graphics
- `@types/three` - TypeScript types for Three.js
- `resend` - Email service for notifications

## Files Created/Modified

**New Files:**
- `src/components/ui/GridDistortion.tsx` - Three.js background component
- `src/app/waitlist/page.tsx` - Waitlist landing page
- `src/app/api/v1/waitlist/submit/route.ts` - Submission API
- `public/grid-bg.svg` - Background texture
- `WAITLIST_DEPLOYMENT.md` - This guide

**Modified Files:**
- `src/app/page.tsx` - Updated CTA links
- `src/db/schema.sql` - Added waitlist table
- `package.json` - Added dependencies
- `README.md` - Added environment variables section

## Next Steps

1. Deploy the database changes to Supabase
2. Set up Resend account and get API key
3. Add admin email to environment variables
4. Test the complete flow
5. Deploy to production

