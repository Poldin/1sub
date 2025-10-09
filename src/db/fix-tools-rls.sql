-- Fix RLS policy for tools table to allow public read access
-- This allows the backoffice to fetch active tools without admin privileges

-- Add policy for public read access to active tools
CREATE POLICY "Public can view active tools" ON public.tools
  FOR SELECT USING (is_active = true);

-- This policy allows anyone (including unauthenticated users) to read active tools
-- which is needed for the backoffice to display available tools
