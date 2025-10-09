-- Phase 4: Add admin role to users table
-- Migration to add role-based access control

-- Add role column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Update existing users to have 'user' role (if any exist)
UPDATE public.users SET role = 'user' WHERE role IS NULL;

-- Create admin user (replace with actual admin email)
-- This will be done manually or via script
-- INSERT INTO public.users (id, email, full_name, role) 
-- VALUES ('admin-uuid', 'admin@1sub.com', 'Admin User', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Add RLS policy for admin access
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add RLS policies for admin access to tools
CREATE POLICY "Admins can manage tools" ON public.tools
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add RLS policies for admin access to usage_logs
CREATE POLICY "Admins can view all usage logs" ON public.usage_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add RLS policies for admin access to credit_transactions
CREATE POLICY "Admins can view all credit transactions" ON public.credit_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add RLS policies for admin access to credit_balances
CREATE POLICY "Admins can view all credit balances" ON public.credit_balances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
