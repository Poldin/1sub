-- Migration: Create Vendor Applications Table
-- This table stores vendor application requests with approval workflow

-- Create vendor_applications table
CREATE TABLE IF NOT EXISTS vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  website TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES user_profiles(id),
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  CONSTRAINT unique_user_application UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendor_applications_user_id ON vendor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_applications_status ON vendor_applications(status);
CREATE INDEX IF NOT EXISTS idx_vendor_applications_created_at ON vendor_applications(created_at DESC);

-- Add RLS policies
ALTER TABLE vendor_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own application
CREATE POLICY "Users can view their own application"
  ON vendor_applications FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can create their own application
CREATE POLICY "Users can create their own application"
  ON vendor_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON vendor_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update all applications
CREATE POLICY "Admins can update applications"
  ON vendor_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vendor_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER vendor_applications_updated_at
  BEFORE UPDATE ON vendor_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_applications_updated_at();

COMMENT ON TABLE vendor_applications IS 'Stores vendor application requests with approval workflow';
COMMENT ON COLUMN vendor_applications.status IS 'Application status: pending, approved, rejected, under_review';
COMMENT ON COLUMN vendor_applications.rejection_reason IS 'Reason for rejection if status is rejected';

