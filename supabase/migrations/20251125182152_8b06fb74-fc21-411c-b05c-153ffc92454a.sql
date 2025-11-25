-- Create jersey_images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('jersey_images', 'jersey_images', true);

-- Allow authenticated users to upload their own jersey images
CREATE POLICY "Users can upload jersey images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'jersey_images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own jersey images
CREATE POLICY "Users can update their jersey images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'jersey_images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own jersey images
CREATE POLICY "Users can delete their jersey images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'jersey_images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow everyone to view jersey images (public bucket)
CREATE POLICY "Jersey images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'jersey_images');