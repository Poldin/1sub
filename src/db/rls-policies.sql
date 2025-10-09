-- Phase 4: Row Level Security (RLS) Policies and Audit Logging
-- Enhanced security for admin operations

-- Enable RLS on all admin-sensitive tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Create audit log table for admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource_type ON public.admin_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at);

-- RLS Policies for users table
-- Users can only see their own data, admins can see all
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for tools table
-- Only admins can manage tools
CREATE POLICY "Admins can manage tools" ON public.tools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for credit_balances table
-- Users can only see their own balance, admins can see all
CREATE POLICY "Users can view own balance" ON public.credit_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all balances" ON public.credit_balances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can update balances" ON public.credit_balances
  FOR UPDATE USING (true); -- Allow system updates via RPC functions

-- RLS Policies for credit_transactions table
-- Users can only see their own transactions, admins can see all
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.credit_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert transactions" ON public.credit_transactions
  FOR INSERT WITH CHECK (true); -- Allow system inserts via RPC functions

-- RLS Policies for usage_logs table
-- Users can only see their own logs, admins can see all
CREATE POLICY "Users can view own usage logs" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage logs" ON public.usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert usage logs" ON public.usage_logs
  FOR INSERT WITH CHECK (true); -- Allow system inserts

-- RLS Policies for admin_audit_logs table
-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (true); -- Allow system inserts

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  admin_id UUID;
  log_id UUID;
BEGIN
  -- Get current admin user ID
  admin_id := auth.uid();
  
  -- Only allow admins to log actions
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can log actions';
  END IF;
  
  -- Insert audit log
  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    admin_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin audit logs with pagination
CREATE OR REPLACE FUNCTION get_admin_audit_logs(
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 50,
  p_action_filter TEXT DEFAULT NULL,
  p_resource_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  admin_user_id UUID,
  admin_email TEXT,
  admin_name TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
DECLARE
  offset_val INTEGER;
BEGIN
  offset_val := (p_page - 1) * p_limit;
  
  RETURN QUERY
  SELECT 
    aal.id,
    aal.admin_user_id,
    u.email as admin_email,
    u.full_name as admin_name,
    aal.action,
    aal.resource_type,
    aal.resource_id,
    aal.old_values,
    aal.new_values,
    aal.ip_address,
    aal.user_agent,
    aal.created_at,
    COUNT(*) OVER() as total_count
  FROM public.admin_audit_logs aal
  JOIN public.users u ON aal.admin_user_id = u.id
  WHERE 
    (p_action_filter IS NULL OR aal.action ILIKE '%' || p_action_filter || '%')
    AND (p_resource_type_filter IS NULL OR aal.resource_type = p_resource_type_filter)
  ORDER BY aal.created_at DESC
  LIMIT p_limit
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_audit_logs(INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

-- Create trigger function for automatic audit logging on tools
CREATE OR REPLACE FUNCTION audit_tools_changes()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  admin_id := auth.uid();
  
  -- Only log if user is admin
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = admin_id AND role = 'admin'
  ) THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM log_admin_action(
        'CREATE',
        'tool',
        NEW.id,
        NULL,
        to_jsonb(NEW),
        NULL,
        NULL
      );
    ELSIF TG_OP = 'UPDATE' THEN
      PERFORM log_admin_action(
        'UPDATE',
        'tool',
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW),
        NULL,
        NULL
      );
    ELSIF TG_OP = 'DELETE' THEN
      PERFORM log_admin_action(
        'DELETE',
        'tool',
        OLD.id,
        to_jsonb(OLD),
        NULL,
        NULL,
        NULL
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for tools audit logging
DROP TRIGGER IF EXISTS tools_audit_trigger ON public.tools;
CREATE TRIGGER tools_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION audit_tools_changes();

-- Create trigger function for automatic audit logging on users
CREATE OR REPLACE FUNCTION audit_users_changes()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  admin_id := auth.uid();
  
  -- Only log if user is admin and not updating their own record
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = admin_id AND role = 'admin'
  ) AND admin_id != NEW.id THEN
    IF TG_OP = 'UPDATE' THEN
      PERFORM log_admin_action(
        'UPDATE',
        'user',
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW),
        NULL,
        NULL
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for users audit logging
DROP TRIGGER IF EXISTS users_audit_trigger ON public.users;
CREATE TRIGGER users_audit_trigger
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION audit_users_changes();