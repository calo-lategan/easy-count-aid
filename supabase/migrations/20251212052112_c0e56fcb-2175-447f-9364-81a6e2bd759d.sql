-- Fix device_users RLS policy to require authentication
DROP POLICY IF EXISTS "Anyone can view device users" ON public.device_users;

CREATE POLICY "Authenticated users can view device users" 
ON public.device_users 
FOR SELECT 
TO authenticated 
USING (true);