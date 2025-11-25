-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the close-auctions function to run every minute
SELECT cron.schedule(
  'close-expired-auctions',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://qhwfvtzibpwqouzidooe.supabase.co/functions/v1/close-auctions',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFod2Z2dHppYnB3cW91emlkb29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwOTA2NzcsImV4cCI6MjA3OTY2NjY3N30.0rC3O4VWEGOMGwUl7CdOcAs7cwBRFL4F52UqVr1Cob4"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);