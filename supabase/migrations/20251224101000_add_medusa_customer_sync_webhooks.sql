-- Create database webhooks to trigger sync-medusa-customer Edge Function
-- Triggered on profiles and shipping_addresses updates
-- Related to: HUD-39 Phase 7

-- Note: Database webhooks need to be configured via Supabase Dashboard
-- Path: Database → Webhooks → Create new webhook
-- 
-- Configuration for "sync-medusa-customer-profile":
--   Table: public.profiles
--   Events: INSERT, UPDATE
--   URL: https://trbyclravrmmhxplocsr.supabase.co/functions/v1/sync-medusa-customer
--   HTTP Headers: 
--     Authorization: Bearer <SUPABASE_ANON_KEY>
--     Content-Type: application/json
--
-- Configuration for "sync-medusa-customer-address":
--   Table: public.shipping_addresses
--   Events: INSERT, UPDATE
--   URL: https://trbyclravrmmhxplocsr.supabase.co/functions/v1/sync-medusa-customer
--   HTTP Headers:
--     Authorization: Bearer <SUPABASE_ANON_KEY>
--     Content-Type: application/json
--
-- Alternative: Use pg_net extension for async HTTP calls

-- Enable pg_net extension for async HTTP calls (if not already enabled)
-- This allows us to call edge functions directly from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to call sync-medusa-customer edge function
CREATE OR REPLACE FUNCTION public.trigger_sync_medusa_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT;
  v_payload JSONB;
  v_anon_key TEXT;
BEGIN
  -- Get edge function URL
  v_url := 'https://trbyclravrmmhxplocsr.supabase.co/functions/v1/sync-medusa-customer';
  
  -- Get anon key from vault (or hardcode for now)
  -- Note: In production, use vault for secrets
  v_anon_key := current_setting('app.supabase_anon_key', true);
  
  -- Build webhook payload
  v_payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );
  
  -- Make async HTTP call using pg_net
  -- Skip if anon key not configured (fallback to database webhook)
  IF v_anon_key IS NOT NULL AND v_anon_key != '' THEN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := v_payload
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the main transaction if sync fails
  RAISE WARNING 'Failed to trigger Medusa customer sync: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Note: Triggers are commented out by default
-- Enable them in production after configuring the anon key
-- Or use Supabase Dashboard webhooks instead

-- Trigger on profiles table
-- CREATE TRIGGER trigger_profiles_medusa_sync
--   AFTER INSERT OR UPDATE OF first_name, last_name, phone
--   ON public.profiles
--   FOR EACH ROW
--   EXECUTE FUNCTION public.trigger_sync_medusa_customer();

-- Trigger on shipping_addresses table
-- CREATE TRIGGER trigger_shipping_addresses_medusa_sync
--   AFTER INSERT OR UPDATE
--   ON public.shipping_addresses
--   FOR EACH ROW
--   WHEN (NEW.is_default = true)
--   EXECUTE FUNCTION public.trigger_sync_medusa_customer();

COMMENT ON FUNCTION public.trigger_sync_medusa_customer IS 
  'Triggers sync-medusa-customer Edge Function on profile/address changes. 
   Configure app.supabase_anon_key or use Supabase Dashboard webhooks.';

