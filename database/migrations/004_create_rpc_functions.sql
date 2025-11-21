-- Migration: Create RPC Functions for API Keys and Vendor Management
-- These functions provide optimized operations for the system

-- Function: Validate API Key Hash
-- Used by external tools to verify API keys with optimized prefix lookup
CREATE OR REPLACE FUNCTION validate_api_key_hash(p_key_prefix TEXT)
RETURNS TABLE(
  tool_id UUID,
  key_hash TEXT,
  tool_name TEXT,
  is_active BOOLEAN,
  metadata JSONB
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ak.tool_id,
    ak.key_hash,
    t.name as tool_name,
    ak.is_active,
    ak.metadata
  FROM api_keys ak
  JOIN tools t ON t.id = ak.tool_id
  WHERE ak.key_prefix = p_key_prefix 
    AND ak.is_active = true
    AND t.is_active = true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_api_key_hash IS 'Validates API key by prefix and returns tool information for authentication';

-- Function: Update API Key Usage
-- Updates last_used_at timestamp when API key is used
CREATE OR REPLACE FUNCTION update_api_key_usage(p_tool_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
  UPDATE api_keys
  SET last_used_at = NOW()
  WHERE tool_id = p_tool_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_api_key_usage IS 'Updates the last_used_at timestamp for an API key';

-- Function: Process Vendor Application
-- Handles vendor application approval/rejection with status updates
CREATE OR REPLACE FUNCTION process_vendor_application(
  p_application_id UUID,
  p_new_status TEXT,
  p_reviewer_id UUID,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  user_id UUID
)
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
BEGIN
  -- Validate status
  IF p_new_status NOT IN ('approved', 'rejected', 'under_review') THEN
    RETURN QUERY SELECT false, 'Invalid status'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Get application details
  SELECT user_id, status INTO v_user_id, v_current_status
  FROM vendor_applications
  WHERE id = p_application_id;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Application not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Update application
  UPDATE vendor_applications
  SET 
    status = p_new_status,
    reviewed_at = NOW(),
    reviewed_by = p_reviewer_id,
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_application_id;

  -- If approved, update user profile to vendor
  IF p_new_status = 'approved' THEN
    UPDATE user_profiles
    SET 
      is_vendor = true,
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN QUERY SELECT true, 'Application processed successfully'::TEXT, v_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_vendor_application IS 'Processes vendor application approval/rejection and updates user status';

-- Function: Get Tool Analytics
-- Aggregates usage statistics for a specific tool
CREATE OR REPLACE FUNCTION get_tool_analytics(
  p_tool_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
  total_uses BIGINT,
  total_credits_consumed BIGINT,
  unique_users BIGINT,
  success_rate NUMERIC,
  avg_credits_per_use NUMERIC
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_uses,
    COALESCE(SUM(credits_consumed), 0)::BIGINT as total_credits_consumed,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 
      2
    ) as success_rate,
    ROUND(
      COALESCE(AVG(credits_consumed) FILTER (WHERE status = 'completed'), 0),
      2
    ) as avg_credits_per_use
  FROM usage_logs
  WHERE tool_id = p_tool_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tool_analytics IS 'Returns aggregated analytics for a specific tool within a date range';

-- Function: Get User Credit History
-- Returns credit transaction history with pagination
CREATE OR REPLACE FUNCTION get_user_credit_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  transaction_id UUID,
  credits_amount DOUBLE PRECISION,
  balance_after DOUBLE PRECISION,
  type TEXT,
  reason TEXT,
  tool_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id as transaction_id,
    ct.credits_amount,
    ct.balance_after,
    ct.type,
    ct.reason,
    t.name as tool_name,
    ct.created_at
  FROM credit_transactions ct
  LEFT JOIN tools t ON t.id = ct.tool_id
  WHERE ct.user_id = p_user_id
  ORDER BY ct.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_credit_history IS 'Returns paginated credit transaction history for a user';

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION validate_api_key_hash TO service_role;
GRANT EXECUTE ON FUNCTION update_api_key_usage TO service_role;
GRANT EXECUTE ON FUNCTION process_vendor_application TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_tool_analytics TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_credit_history TO authenticated, service_role;

