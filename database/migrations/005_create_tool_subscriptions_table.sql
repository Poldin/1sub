-- Migration: Add missing tool_subscriptions table if needed
-- This table may already exist, using IF NOT EXISTS for safety

CREATE TABLE IF NOT EXISTS tool_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  checkout_id UUID REFERENCES checkouts(id),
  status TEXT NOT NULL DEFAULT 'active',
  period TEXT NOT NULL CHECK (period IN ('monthly', 'yearly')),
  credits_per_period INTEGER NOT NULL CHECK (credits_per_period > 0),
  next_billing_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT valid_subscription_status CHECK (status IN ('active', 'cancelled', 'paused', 'expired'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tool_subscriptions_user_id ON tool_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_subscriptions_tool_id ON tool_subscriptions(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_subscriptions_status ON tool_subscriptions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tool_subscriptions_next_billing ON tool_subscriptions(next_billing_date) WHERE status = 'active';

-- Enable RLS
ALTER TABLE tool_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON tool_subscriptions;
DROP POLICY IF EXISTS "Vendors can view subscriptions for their tools" ON tool_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON tool_subscriptions;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON tool_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Vendors can view subscriptions for their tools
CREATE POLICY "Vendors can view subscriptions for their tools"
  ON tool_subscriptions FOR SELECT
  USING (
    tool_id IN (
      SELECT id FROM tools WHERE user_profile_id = auth.uid()
    )
  );

-- Policy: Service role can manage all subscriptions
CREATE POLICY "Service role can manage all subscriptions"
  ON tool_subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

COMMENT ON TABLE tool_subscriptions IS 'Stores user subscriptions to specific tools';

