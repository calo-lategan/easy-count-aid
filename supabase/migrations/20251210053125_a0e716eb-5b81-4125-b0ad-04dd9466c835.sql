-- Fix device_users table - restrict management to admins only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on device_users" ON device_users;

-- Allow all authenticated users to view device users (needed for dropdown selector)
CREATE POLICY "Anyone can view device users" ON device_users 
FOR SELECT USING (true);

-- Only admins can create device users
CREATE POLICY "Only admins can insert device users" ON device_users 
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update device users
CREATE POLICY "Only admins can update device users" ON device_users 
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete device users
CREATE POLICY "Only admins can delete device users" ON device_users 
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));