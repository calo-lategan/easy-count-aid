-- Create audit_logs table to track item-level and category changes
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_user_id UUID REFERENCES device_users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'item_created', 'item_deleted', 'category_changed', 'condition_changed'
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name TEXT,
  item_sku TEXT,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view audit logs (for activity log page)
CREATE POLICY "Authenticated users can view audit logs"
ON public.audit_logs FOR SELECT
USING (true);

-- Anyone authenticated can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- Only admins can delete audit logs
CREATE POLICY "Only admins can delete audit logs"
ON public.audit_logs FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add condition column to stock_movements if not exists
-- (Already exists based on the indexedDb types, but let's ensure it in Supabase)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_movements' AND column_name = 'condition'
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN condition item_condition;
  END IF;
END $$;