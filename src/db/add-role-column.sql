-- Add role column to users table
-- This migration adds the role column that was missing from the original schema

-- Add role column to users table
ALTER TABLE public.users 
ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create index for role column
CREATE INDEX idx_users_role ON public.users(role);

-- Update existing users to have 'user' role (if any exist)
UPDATE public.users SET role = 'user' WHERE role IS NULL;
