-- Generate WebP image trigger
-- Automatically calls Edge Function when jersey_image is created without WebP version

-- Ensure pg_net extension is enabled (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to call generate-webp-image Edge Function
CREATE OR REPLACE FUNCTION public.generate_webp_for_jersey_image()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  request_id BIGINT;
BEGIN
  -- Only trigger if image_url_webp is null and image_url exists
  -- Skip if image is already WebP
  IF NEW.image_url_webp IS NULL 
     AND NEW.image_url IS NOT NULL 
     AND NOT (NEW.image_url ILIKE '%.webp' OR NEW.storage_path ILIKE '%.webp') THEN
    
    -- Get Supabase URL - use hardcoded project URL (from config.toml project_id: trbyclravrmmhxplocsr)
    supabase_url := 'https://trbyclravrmmhxplocsr.supabase.co';
    
    -- Call Edge Function via pg_net (non-blocking)
    -- Note: Edge Function has verify_jwt = false, so no Authorization header needed
    -- Edge Function uses its own SUPABASE_SERVICE_ROLE_KEY from environment variables (Edge Function secrets)
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/generate-webp-image',
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
    RAISE NOTICE 'WebP generation triggered for jersey_image % (request_id: %)', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS trigger_generate_webp_jersey_image ON public.jersey_images;

-- Create trigger that fires AFTER INSERT
-- Only triggers when image_url_webp is null and image is not already WebP
CREATE TRIGGER trigger_generate_webp_jersey_image
  AFTER INSERT ON public.jersey_images
  FOR EACH ROW
  WHEN (
    NEW.image_url_webp IS NULL 
    AND NEW.image_url IS NOT NULL 
    AND NOT (NEW.image_url ILIKE '%.webp' OR NEW.storage_path ILIKE '%.webp')
  )
  EXECUTE FUNCTION public.generate_webp_for_jersey_image();

-- Add comment explaining the trigger
COMMENT ON FUNCTION public.generate_webp_for_jersey_image() IS 
  'Automatically calls generate-webp-image Edge Function when jersey_image is created without WebP version. 
   Edge Function has verify_jwt = false, so no authentication needed. Edge Function uses its own SUPABASE_SERVICE_ROLE_KEY from Edge Function secrets.';

COMMENT ON TRIGGER trigger_generate_webp_jersey_image ON public.jersey_images IS 
  'Triggers generate-webp-image Edge Function when jersey_image is inserted without image_url_webp 
   and image is not already WebP format. Runs asynchronously via pg_net. 
   Edge Function will use its own SUPABASE_SERVICE_ROLE_KEY from Edge Function secrets (automatically set by Supabase).';

