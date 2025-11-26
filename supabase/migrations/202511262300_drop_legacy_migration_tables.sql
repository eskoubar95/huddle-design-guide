-- Drop legacy migration tracking tables from public schema
-- These were created before databaseSchema config was set up
-- The correct versions exist in medusa schema

-- Note: This may timeout if there are active connections to these tables
-- Run when Medusa is not running or during maintenance window

-- Drop script_migrations (should already be dropped, but safe to run)
DROP TABLE IF EXISTS public.script_migrations CASCADE;

-- Drop mikro_orm_migrations (may require terminating active connections)
-- If this times out, run manually via Supabase Dashboard when no active connections
DROP TABLE IF EXISTS public.mikro_orm_migrations CASCADE;

-- Verify cleanup (run separately)
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('mikro_orm_migrations', 'script_migrations');

