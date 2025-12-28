-- Add user_id column to stock_movements to track the authenticated user who made the change
-- This is separate from device_user_id which was for legacy device-based users
ALTER TABLE stock_movements 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill user_id from audit_logs where possible
-- Match movements to audit_logs by item name/sku and timestamp proximity
UPDATE stock_movements sm
SET user_id = (
  SELECT al.user_id 
  FROM audit_logs al 
  WHERE al.user_id IS NOT NULL
    AND al.action_type IN ('stock_added', 'stock_removed', 'item_created')
    AND al.created_at <= sm.created_at + interval '5 seconds'
    AND al.created_at >= sm.created_at - interval '5 seconds'
  ORDER BY ABS(EXTRACT(EPOCH FROM (al.created_at - sm.created_at)))
  LIMIT 1
)
WHERE sm.user_id IS NULL;