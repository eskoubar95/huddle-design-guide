-- Add image_url_webp column to jersey_images table for storing WebP variant URLs
ALTER TABLE public.jersey_images
ADD COLUMN IF NOT EXISTS image_url_webp TEXT;

-- Add comment
COMMENT ON COLUMN public.jersey_images.image_url_webp IS 'URL to WebP optimized version of the image. Generated automatically during upload.';

