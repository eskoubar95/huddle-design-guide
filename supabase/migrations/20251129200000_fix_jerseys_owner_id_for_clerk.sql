-- Fix jerseys.owner_id for Clerk authentication
-- Change owner_id from UUID to TEXT to match Clerk user IDs
-- Clerk user IDs are strings (e.g., "user_2abc123..."), not UUIDs

-- Step 1: Drop foreign key constraint (required before changing type)
-- Find constraint name: SELECT conname FROM pg_constraint WHERE conrelid = 'public.jerseys'::regclass AND contype = 'f';
ALTER TABLE public.jerseys DROP CONSTRAINT IF EXISTS jerseys_owner_id_fkey;
-- Also try common constraint names
ALTER TABLE public.jerseys DROP CONSTRAINT IF EXISTS jerseys_owner_id_auth_users_id_fk;

-- Step 2: Drop RLS policies that depend on owner_id column (required before changing type)
DROP POLICY IF EXISTS "Owners can view their own jerseys" ON public.jerseys;
DROP POLICY IF EXISTS "Authenticated users can create jerseys" ON public.jerseys;
DROP POLICY IF EXISTS "Owners can update their own jerseys" ON public.jerseys;
DROP POLICY IF EXISTS "Owners can delete their own jerseys" ON public.jerseys;

-- Step 3: Drop index (will be recreated automatically after type change)
DROP INDEX IF EXISTS idx_jerseys_owner_id;

-- Step 4: Change owner_id column type from UUID to TEXT
ALTER TABLE public.jerseys ALTER COLUMN owner_id TYPE TEXT USING owner_id::text;

-- Step 5: Re-create index
CREATE INDEX idx_jerseys_owner_id ON public.jerseys(owner_id);

-- Step 6: Re-create RLS policies (updated for TEXT owner_id type)
-- Note: These policies won't work with Clerk auth (auth.uid() is Supabase auth)
-- But we keep them for documentation - RLS is bypassed via service role client anyway
CREATE POLICY "Owners can view their own jerseys"
  ON public.jerseys FOR SELECT
  USING (auth.uid()::text = owner_id);

CREATE POLICY "Authenticated users can create jerseys"
  ON public.jerseys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Owners can update their own jerseys"
  ON public.jerseys FOR UPDATE
  USING (auth.uid()::text = owner_id);

CREATE POLICY "Owners can delete their own jerseys"
  ON public.jerseys FOR DELETE
  USING (auth.uid()::text = owner_id);

-- Note: Foreign key reference to auth.users(id) is removed since we use Clerk
-- Service role client bypasses RLS, so policies are for documentation only

