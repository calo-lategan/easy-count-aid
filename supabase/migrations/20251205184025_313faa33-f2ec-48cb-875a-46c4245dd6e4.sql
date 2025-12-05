-- Add low_stock_threshold column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5;

-- Allow negative quantities by removing any constraints that prevent it
-- (The current design already allows it at DB level, we just need to update the app logic)