-- Generate image variants trigger
-- Automatically calls Edge Function when jersey_image is created to generate variants (vision, gallery, card)

-- Ensure pg_net extension is enabled (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to call generate-image-variants Edge Function
CREATE OR REPLACE FUNCTION public.generate_variants_for_jersey_image()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  request_id BIGINT;
BEGIN
  -- Only trigger if storage_path exists and image is not already WebP
  -- Skip if image is already WebP (variants not needed)
  IF NEW.storage_path IS NOT NULL 
     AND NEW.image_url IS NOT NULL 
     AND NOT (NEW.image_url ILIKE '%.webp' OR NEW.storage_path ILIKE '%.webp') THEN
    
    -- Get Supabase URL - use hardcoded project URL (from config.toml project_id: trbyclravrmmhxplocsr)
    supabase_url := 'https://trbyclravrmmhxplocsr.supabase.co';
    
    -- Call Edge Function via pg_net (non-blocking)
    -- Note: Edge Function has verify_jwt = false, so no Authorization header needed
    -- Edge Function uses its own SUPABASE_SERVICE_ROLE_KEY from environment variables (Edge Function secrets)
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/generate-image-variants',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
        -- No Authorization header needed - Edge Function has verify_jwt = false
      ),
      body := jsonb_build_object(
        'jerseyImageId', NEW.id,
        'imageUrl', NEW.image_url,
        'storagePath', NEW.storage_path
      )
    ) INTO request_id;
    
    -- Log the request (optional, for debugging)
    RAISE NOTICE 'Variant generation triggered for jersey_image % (request_id: %)', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS trigger_generate_variants_jersey_image ON public.jersey_images;

-- Create trigger that fires AFTER INSERT
-- Only triggers when storage_path exists and image is not already WebP
CREATE TRIGGER trigger_generate_variants_jersey_image
  AFTER INSERT ON public.jersey_images
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_variants_for_jersey_image();

