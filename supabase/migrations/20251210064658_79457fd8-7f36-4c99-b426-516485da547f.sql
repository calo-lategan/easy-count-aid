-- Restrict audit_logs to admins only (Activity Log page is admin-protected anyway)
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;

CREATE POLICY "Only admins can view audit logs"
ON audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));