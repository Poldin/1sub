-- 1sub MVP Phase 1 Row Level Security (RLS) Policies - UPDATE VERSION
-- This script drops existing policies and recreates them to avoid conflicts

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can update users" ON public.users;
DROP POLICY IF EXISTS "Users cannot access other users' data" ON public.users;

DROP POLICY IF EXISTS "Users can view own balance" ON public.credit_balances;
DROP POLICY IF EXISTS "Service role full access to balances" ON public.credit_balances;
DROP POLICY IF EXISTS "Only service role can modify credit balances" ON public.credit_balances;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Only service role can modify credit transactions" ON public.credit_transactions;

DROP POLICY IF EXISTS "Anyone can view active tools" ON public.tools;
DROP POLICY IF EXISTS "Service role full access to tools" ON public.tools;
DROP POLICY IF EXISTS "Only service role can modify tools" ON public.tools;
DROP POLICY IF EXISTS "Only service role can delete tools" ON public.tools;

DROP POLICY IF EXISTS "Users can view own usage logs" ON public.usage_logs;
DROP POLICY IF EXISTS "Service role can insert logs" ON public.usage_logs;
DROP POLICY IF EXISTS "Only service role can modify usage logs" ON public.usage_logs;
DROP POLICY IF EXISTS "Only service role can delete usage logs" ON public.usage_logs;

DROP POLICY IF EXISTS "Anyone can insert into waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Service role can view all waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Service role can update waitlist entries" ON public.waitlist;

DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
DROP POLICY IF EXISTS "Admin can view all credit balances" ON public.credit_balances;
DROP POLICY IF EXISTS "Admin can view all credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admin can view all usage logs" ON public.usage_logs;

-- Enable RLS on all tables (in case it's not enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Users Table Policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Service role can insert users"
  ON public.users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can update users"
  ON public.users FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

-- Credit Balances Table Policies
CREATE POLICY "Users can view own balance"
  ON public.credit_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to balances"
  ON public.credit_balances FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Credit Transactions Table Policies
CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Tools Table Policies
CREATE POLICY "Anyone can view active tools"
  ON public.tools FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role full access to tools"
  ON public.tools FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Usage Logs Table Policies
CREATE POLICY "Users can view own usage logs"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert logs"
  ON public.usage_logs FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Waitlist Table Policies
CREATE POLICY "Anyone can insert into waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can view all waitlist entries"
  ON public.waitlist FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can update waitlist entries"
  ON public.waitlist FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

-- Admin Policies (for future admin panel)
CREATE POLICY "Admin can view all users"
  ON public.users FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admin can view all credit balances"
  ON public.credit_balances FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admin can view all credit transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admin can view all usage logs"
  ON public.usage_logs FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Additional Security Policies
-- Prevent users from accessing other users' data
CREATE POLICY "Users cannot access other users' data"
  ON public.users FOR ALL
  USING (auth.uid() = id OR auth.jwt()->>'role' = 'service_role');

-- Ensure credit operations are only done by service role
CREATE POLICY "Only service role can modify credit balances"
  ON public.credit_balances FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Only service role can modify credit transactions"
  ON public.credit_transactions FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

-- Tool management policies
CREATE POLICY "Only service role can modify tools"
  ON public.tools FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Only service role can delete tools"
  ON public.tools FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');

-- Usage log management
CREATE POLICY "Only service role can modify usage logs"
  ON public.usage_logs FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Only service role can delete usage logs"
  ON public.usage_logs FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');

