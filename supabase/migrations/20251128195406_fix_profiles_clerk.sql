-- Fix profiles table for Clerk authentication
-- Remove foreign key reference to auth.users (we use Clerk, not Supabase auth)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Remove Supabase auth trigger (we use Clerk, profile created in requireAuth())
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Note: RLS policies using auth.uid() won't work with Clerk
-- We use service role client in API routes which bypasses RLS
-- If client-side RLS is needed, we'll need custom functions
-- See: apps/web/lib/supabase/server.ts (createServiceClient)

-- IMPORTANT: profiles.id type change is handled in separate migration:
-- 20251128201559_change_profiles_id_to_text.sql
-- This is required because Clerk user IDs are TEXT strings, not UUIDs

