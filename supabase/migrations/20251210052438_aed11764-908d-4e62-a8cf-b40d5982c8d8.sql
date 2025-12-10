-- Fix 1: Restrict sync_queue table to prevent public data exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on sync_queue" ON sync_queue;

-- Create restrictive policy - deny all client access (use service role in edge functions)
CREATE POLICY "Service role access only" ON sync_queue FOR ALL USING (false) WITH CHECK (false);