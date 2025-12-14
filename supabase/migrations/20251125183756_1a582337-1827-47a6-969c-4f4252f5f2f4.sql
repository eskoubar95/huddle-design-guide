-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the close-auctions function to run every minute
-- Note: The anon key should be set via: ALTER DATABASE postgres SET app.anon_key = 'your-anon-key';
-- Get key from: Supabase Dashboard → Settings → API → anon/public key
SELECT cron.schedule(
  'close-expired-auctions',
  '* * * * *',
  $$
  DECLARE
    anon_key TEXT;
    headers_json JSONB;
  BEGIN
    -- Get anon key from database setting (set via ALTER DATABASE command)
    -- If not set, the function will still work if verify_jwt=false in config.toml
    anon_key := current_setting('app.anon_key', true);
    
    -- Build headers JSON
    IF anon_key IS NOT NULL AND anon_key != '' THEN
      headers_json := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      );
    ELSE
      -- If no key set, still call (function has verify_jwt=false)
      headers_json := jsonb_build_object('Content-Type', 'application/json');
    END IF;
    
    RETURN (
  SELECT net.http_post(
    url:='https://qhwfvtzibpwqouzidooe.supabase.co/functions/v1/close-auctions',
        headers:=headers_json,
    body:='{}'::jsonb
      ) as request_id
    );
  END;
  $$
);