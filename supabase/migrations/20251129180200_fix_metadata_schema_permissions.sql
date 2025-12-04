-- Fix metadata schema permissions for PostgREST
-- PostgREST needs explicit USAGE permission on schema for service role

-- Ensure postgres role has USAGE on metadata schema (for service role key)
-- This is required for PostgREST to access the schema
GRANT USAGE ON SCHEMA metadata TO postgres;

-- Also ensure authenticated role has USAGE (for RLS policies to work)
GRANT USAGE ON SCHEMA metadata TO authenticated;

-- Grant all privileges on all tables to postgres (service role)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA metadata TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA metadata TO postgres;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA metadata GRANT ALL PRIVILEGES ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA metadata GRANT ALL PRIVILEGES ON SEQUENCES TO postgres;

