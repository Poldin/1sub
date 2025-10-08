-- 1sub MVP Phase 1 Database Triggers
-- Auto-update timestamps and user creation triggers

-- 1. Auto-update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Auto-create credit balance on user signup
CREATE OR REPLACE FUNCTION create_user_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.credit_balances (user_id, balance)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Apply triggers to tables
CREATE TRIGGER users_updated_at 
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER credit_balances_updated_at 
  BEFORE UPDATE ON public.credit_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tools_updated_at 
  BEFORE UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION create_user_credit_balance();


