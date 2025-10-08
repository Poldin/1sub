-- 1sub MVP Phase 1 Row Level Security (RLS) Policies
-- Comprehensive security policies for all database tables

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

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
