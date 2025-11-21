-- Migration: Add indexes and RLS policies to existing api_keys table
-- The api_keys table already exists, this adds optimizations and security

-- Create indexes for fast lookups (IF NOT EXISTS prevents errors)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_tool_id ON api_keys(tool_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at) WHERE is_active = true;

-- Enable RLS if not already enabled
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Vendors can view their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Service role can manage all API keys" ON api_keys;

-- Policy: Vendors can view their own API keys
CREATE POLICY "Vendors can view their own API keys"
  ON api_keys FOR SELECT
  USING (
    tool_id IN (
      SELECT id FROM tools WHERE user_profile_id = auth.uid()
    )
  );

-- Policy: Service role can do everything (for API operations)
CREATE POLICY "Service role can manage all API keys"
  ON api_keys FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE api_keys IS 'Stores API keys for external tool authentication with optimized prefix-based lookup';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of API key for indexed lookup';
COMMENT ON COLUMN api_keys.key_hash IS 'Bcrypt hash of full API key';

