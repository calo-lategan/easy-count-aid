-- Add 'new' to the item_condition enum
ALTER TYPE item_condition ADD VALUE IF NOT EXISTS 'new';

-- Create storage bucket for item images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('item-images', 'item-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for item-images bucket
CREATE POLICY "Anyone can view item images"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated users can upload item images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'item-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update item images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'item-images' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete item images"
ON storage.objects FOR DELETE
USING (bucket_id = 'item-images' AND public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for inventory_items (more granular)
DROP POLICY IF EXISTS "Allow all operations on inventory_items" ON public.inventory_items;

CREATE POLICY "Anyone authenticated can view inventory items"
ON public.inventory_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone authenticated can insert inventory items"
ON public.inventory_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update inventory items"
ON public.inventory_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Only admins can delete inventory items"
ON public.inventory_items FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for stock_movements
DROP POLICY IF EXISTS "Allow all operations on stock_movements" ON public.stock_movements;

CREATE POLICY "Anyone authenticated can view stock movements"
ON public.stock_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone authenticated can insert stock movements"
ON public.stock_movements FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can delete stock movements"
ON public.stock_movements FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for categories
DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;

CREATE POLICY "Anyone authenticated can view categories"
ON public.categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can insert categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete categories"
ON public.categories FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Allow all operations on profiles" ON public.profiles;

CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'display_name', new.email));
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add policy for admins to manage user_roles
CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));