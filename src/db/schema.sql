-- 1sub MVP Phase 1 Database Schema
-- Production-ready schema for user authentication, credit management, and tool tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON public.users(email);

-- 2. Credit Balances Table
CREATE TABLE public.credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for credit_balances
CREATE UNIQUE INDEX idx_credit_balances_user_id ON public.credit_balances(user_id);

-- 3. Credit Transactions Table
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delta NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('grant', 'consume', 'refund', 'adjustment')),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for credit_transactions
CREATE INDEX idx_credit_transactions_user_id_created_at ON public.credit_transactions(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_credit_transactions_idempotency_key ON public.credit_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 4. Tools Table
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  api_endpoint TEXT,
  credit_cost_per_use NUMERIC(8,2) DEFAULT 1.00,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tools
CREATE INDEX idx_tools_is_active ON public.tools(is_active);

-- 5. Usage Logs Table
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES public.tools(id) ON DELETE SET NULL,
  credits_consumed NUMERIC(8,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'insufficient_credits')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for usage_logs
CREATE INDEX idx_usage_logs_user_id_created_at ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX idx_usage_logs_tool_id_created_at ON public.usage_logs(tool_id, created_at DESC);

-- 6. Atomic Credit Consumption Function
CREATE OR REPLACE FUNCTION consume_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Check idempotency
  IF EXISTS (SELECT 1 FROM credit_transactions WHERE idempotency_key = p_idempotency_key) THEN
    RETURN jsonb_build_object('status', 'duplicate', 'message', 'Transaction already processed');
  END IF;

  -- Lock and get current balance
  SELECT balance INTO v_current_balance
  FROM credit_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('status', 'insufficient', 'balance', v_current_balance);
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - p_amount;

  -- Update balance
  UPDATE credit_balances
  SET balance = v_new_balance, updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert transaction
  INSERT INTO credit_transactions (user_id, delta, balance_after, transaction_type, reason, idempotency_key)
  VALUES (p_user_id, -p_amount, v_new_balance, 'consume', p_reason, p_idempotency_key)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object('status', 'success', 'transaction_id', v_transaction_id, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql;


