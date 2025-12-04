-- Verification queries for metadata schema permissions
-- Run these in Supabase SQL Editor to verify permissions are set correctly

-- 1. Check if postgres role has USAGE on metadata schema
SELECT 
  has_schema_privilege('postgres', 'metadata', 'USAGE') as postgres_has_usage,
  has_schema_privilege('authenticated', 'metadata', 'USAGE') as authenticated_has_usage,
  has_schema_privilege('anon', 'metadata', 'USAGE') as anon_has_usage;

-- 2. Check if postgres role has INSERT/UPDATE/DELETE on competitions table
SELECT 
  has_table_privilege('postgres', 'metadata.competitions', 'INSERT') as postgres_can_insert,
  has_table_privilege('postgres', 'metadata.competitions', 'UPDATE') as postgres_can_update,
  has_table_privilege('postgres', 'metadata.competitions', 'DELETE') as postgres_can_delete,
  has_table_privilege('postgres', 'metadata.competitions', 'SELECT') as postgres_can_select;

-- 3. Check if authenticated/anon roles have SELECT on competitions table
SELECT 
  has_table_privilege('authenticated', 'metadata.competitions', 'SELECT') as authenticated_can_select,
  has_table_privilege('anon', 'metadata.competitions', 'SELECT') as anon_can_select;

-- 4. List all grants on metadata schema
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_schema_grants
WHERE schema_name = 'metadata'
ORDER BY grantee, privilege_type;

-- 5. List all grants on metadata.competitions table
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'metadata' 
  AND table_name = 'competitions'
ORDER BY grantee, privilege_type;

-- 6. Check RLS status on metadata tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'metadata'
ORDER BY tablename;

-- 7. List RLS policies on metadata.competitions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'metadata' 
  AND tablename = 'competitions';

