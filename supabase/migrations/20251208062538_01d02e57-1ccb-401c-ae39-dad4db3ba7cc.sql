-- Drop existing restrictive policies on categories
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Everyone can view categories" ON public.categories;

-- Create permissive policies for categories (shared device app)
CREATE POLICY "Allow all operations on categories" 
ON public.categories 
FOR ALL 
USING (true) 
WITH CHECK (true);