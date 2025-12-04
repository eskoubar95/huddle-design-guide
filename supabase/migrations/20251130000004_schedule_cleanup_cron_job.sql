-- Note: pg_cron extension should already exist from previous migrations
-- If not, create it manually: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule job if it already exists (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-abandoned-drafts') THEN
    PERFORM cron.unschedule('cleanup-abandoned-drafts');
  END IF;
END $$;

-- Schedule cleanup job to run daily at 2 AM UTC
SELECT cron.schedule(
  'cleanup-abandoned-drafts',
  '0 2 * * *', -- Daily at 2 AM UTC (cron expression)
  $$
  SELECT cleanup_abandoned_drafts();
  $$
);

-- Comment
COMMENT ON FUNCTION cleanup_abandoned_drafts() IS 'Scheduled via pg_cron to run daily at 2 AM UTC. Cleans up draft jerseys older than 24 hours. CASCADE delete automatically removes jersey_images rows. Storage cleanup handled by cleanup-jersey-storage Edge Function.';

