-- Auto-link jersey metadata trigger
-- Automatically calls Edge Function when jersey is created/updated without metadata links

-- Ensure pg_net extension is enabled (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to call auto-link-metadata Edge Function
CREATE OR REPLACE FUNCTION public.auto_link_jersey_metadata()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Only trigger if metadata fields are null and text fields are present
  IF (NEW.club_id IS NULL OR NEW.season_id IS NULL OR NEW.player_id IS NULL)
     AND NEW.club IS NOT NULL 
     AND NEW.season IS NOT NULL THEN
    
    -- Get Supabase URL - use hardcoded project URL (from config.toml project_id: trbyclravrmmhxplocsr)
    supabase_url := 'https://trbyclravrmmhxplocsr.supabase.co';
    
    -- Get service role key from custom database setting
    -- Set via: ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';
    -- Get key from: Supabase Dashboard → Settings → API → service_role key
    service_role_key := current_setting('app.service_role_key', true);
    
    -- If service role key is not set, log warning but don't fail
    IF service_role_key IS NULL OR service_role_key = '' THEN
      RAISE WARNING 'app.service_role_key not set. Auto-link metadata will not work. Set it via: ALTER DATABASE postgres SET app.service_role_key = ''your-key'';';
      RETURN NEW; -- Continue without calling Edge Function
    END IF;
    
    -- Call Edge Function via pg_net (non-blocking)
    -- Note: This requires pg_net extension and proper configuration
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/auto-link-metadata',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'jerseyId', NEW.id,
        'clubText', NEW.club,
        'seasonText', NEW.season,
        'playerNameText', COALESCE(NEW.player_name, ''),
        'playerNumberText', COALESCE(NEW.player_number, '')
      )
    ) INTO request_id;
    
    -- Log the request (optional, for debugging)
    RAISE NOTICE 'Auto-link metadata triggered for jersey % (request_id: %)', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS trigger_auto_link_jersey_metadata ON public.jerseys;

-- Create trigger that fires AFTER INSERT or UPDATE
-- Only triggers when metadata fields are null
CREATE TRIGGER trigger_auto_link_jersey_metadata
  AFTER INSERT OR UPDATE ON public.jerseys
  FOR EACH ROW
  WHEN (
    (NEW.club_id IS NULL OR NEW.season_id IS NULL OR NEW.player_id IS NULL)
    AND NEW.club IS NOT NULL 
    AND NEW.season IS NOT NULL
  )
  EXECUTE FUNCTION public.auto_link_jersey_metadata();

-- Add comment explaining the trigger
COMMENT ON FUNCTION public.auto_link_jersey_metadata() IS 
  'Automatically calls auto-link-metadata Edge Function when jersey is created/updated without metadata links. 
   Edge Function has verify_jwt = false, so no authentication needed. Edge Function uses its own SUPABASE_SERVICE_ROLE_KEY from environment.';

COMMENT ON TRIGGER trigger_auto_link_jersey_metadata ON public.jerseys IS 
  'Triggers auto-link metadata Edge Function when jersey has null metadata fields (club_id, season_id, or player_id) 
   but text fields (club, season) are present. Runs asynchronously via pg_net. 
   Edge Function will use its own SUPABASE_SERVICE_ROLE_KEY from environment variables.';

