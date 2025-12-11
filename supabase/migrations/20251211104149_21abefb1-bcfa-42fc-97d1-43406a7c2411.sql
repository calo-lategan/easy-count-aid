-- Create storage policies for item-images bucket

-- Allow anyone to view item images (public bucket)
CREATE POLICY "Anyone can view item images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-images');

-- Allow authenticated users to upload item images
CREATE POLICY "Authenticated users can upload item images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'item-images' AND (storage.foldername(name))[1] = 'items');

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Authenticated users can update item images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'item-images' AND (storage.foldername(name))[1] = 'items');

-- Only admins can delete item images
CREATE POLICY "Only admins can delete item images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'item-images' AND public.has_role(auth.uid(), 'admin'));