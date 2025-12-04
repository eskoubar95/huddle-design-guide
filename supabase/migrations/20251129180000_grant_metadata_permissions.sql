-- Grant INSERT/UPDATE/DELETE permissions to postgres role for metadata schema
-- Service role key uses postgres role and needs write access for seed scripts

-- Grant all permissions to postgres role (used by service role key)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA metadata TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA metadata TO postgres;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA metadata GRANT ALL PRIVILEGES ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA metadata GRANT ALL PRIVILEGES ON SEQUENCES TO postgres;

