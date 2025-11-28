-- Change profiles.id from UUID to TEXT to match Clerk user IDs
-- Clerk user IDs are strings (e.g., "user_2abc123..."), not UUIDs
-- This is required for Clerk authentication integration

-- Step 1: Drop RLS policies that depend on id column (required before changing type)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
-- Note: "Profiles are viewable by everyone" policy doesn't use id column, so it's safe

-- Step 2: Drop primary key constraint (required before changing type)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;

-- Step 3: Change id column type from UUID to TEXT
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;

-- Step 4: Re-add primary key constraint
ALTER TABLE public.profiles ADD PRIMARY KEY (id);

-- Step 5: Re-create RLS policies (updated for TEXT id type)
-- Note: These policies won't work with Clerk auth (auth.uid() is Supabase auth)
-- But we keep them for documentation - RLS is bypassed via service role client anyway
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid()::text = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid()::text = id);

-- Note: If there are foreign key references to profiles.id in other tables,
-- those will need to be updated separately (they should also be TEXT, not UUID)
-- For now, we only fix profiles table as it's the direct Clerk integration point

