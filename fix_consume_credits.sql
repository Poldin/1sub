-- Fix consume_credits function signature mismatch
-- The database has the old 4-parameter version, but code calls it with 6 parameters

-- Drop the old 4-parameter version (with UUID)
DROP FUNCTION IF EXISTS consume_credits(uuid, numeric, text, text) CASCADE;

-- Drop any TEXT version that might exist
DROP FUNCTION IF EXISTS consume_credits(text, numeric, text, text) CASCADE;

-- Create the new 6-parameter version with TEXT (matching what code calls)
CREATE OR REPLACE FUNCTION consume_credits(
  p_user_id TEXT,
  p_amount NUMERIC,
  p_reason TEXT,
  p_idempotency_key TEXT,
  p_tool_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_transaction_id UUID;
  v_existing_transaction RECORD;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_user_id = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User ID is required'
    );
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Amount must be greater than 0'
    );
  END IF;

  -- Check for existing transaction with same idempotency key
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing_transaction
    FROM credit_transactions
    WHERE user_id = p_user_id::uuid
      AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      -- Transaction already processed, return existing result
      RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_existing_transaction.id,
        'balance_before', COALESCE(v_existing_transaction.balance_after, 0) + COALESCE(v_existing_transaction.credits_amount, 0),
        'balance_after', COALESCE(v_existing_transaction.balance_after, 0),
        'is_duplicate', true
      );
    END IF;
  END IF;

  -- Get current balance with row-level locking
  -- FIX: Changed from SKIP LOCKED to wait for lock completion
  -- This ensures we always read the latest balance, preventing false "insufficient credits" errors
  SELECT COALESCE(balance_after, 0) INTO v_balance_before
  FROM credit_transactions
  WHERE user_id = p_user_id::uuid
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  -- If no transactions found, balance is 0
  IF NOT FOUND THEN
    v_balance_before := 0;
  END IF;

  -- Check for sufficient balance
  IF v_balance_before < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'balance_before', v_balance_before,
      'balance_after', v_balance_before,
      'required', p_amount
    );
  END IF;

  -- Calculate new balance
  v_balance_after := v_balance_before - p_amount;

  -- Insert the transaction
  INSERT INTO credit_transactions (
    user_id,
    credits_amount,
    type,
    balance_after,
    reason,
    idempotency_key,
    tool_id,
    metadata
  ) VALUES (
    p_user_id::uuid,
    p_amount,
    'subtract',
    v_balance_after,
    p_reason,
    p_idempotency_key,
    CASE WHEN p_tool_id IS NOT NULL THEN p_tool_id::uuid ELSE NULL END,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  -- Return success with transaction details
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'is_duplicate', false
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'Error in consume_credits: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION consume_credits TO authenticated;
GRANT EXECUTE ON FUNCTION consume_credits TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION consume_credits IS 'Atomically consume credits from a user account with row-level locking. Fixed to wait for locks to ensure accurate balance reading.';


