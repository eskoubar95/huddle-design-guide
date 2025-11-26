-- Create medusa schema for MedusaJS commerce data
-- This schema will contain Medusa's tables (products, orders, regions, etc.)
-- Separate from public schema to avoid conflicts with Huddle app tables
-- Related to: HUD-15

CREATE SCHEMA IF NOT EXISTS medusa;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA medusa TO postgres;
GRANT CREATE ON SCHEMA medusa TO postgres;

-- Comment explaining purpose
COMMENT ON SCHEMA medusa IS 'MedusaJS commerce schema - products, orders, regions, shipping profiles, etc. Managed by Medusa migrations.';

