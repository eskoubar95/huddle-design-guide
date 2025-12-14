-- Migration: Add profile completion and Stripe Identity verification fields
-- HUD-41 Phase 1.1
-- Date: 2025-12-13
--
-- Adds personal information fields, Stripe Identity verification tracking,
-- and a computed column for profile completeness checking.

-- Add personal information fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS phone TEXT NULL;

-- Add Stripe Identity verification fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_identity_verification_status TEXT NULL
    CHECK (stripe_identity_verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS stripe_identity_verification_id TEXT NULL;

-- Add computed column for profile completeness
-- NOTE: This only checks fields in profiles table, NOT shipping_addresses
-- Full "buyer ready" / "seller eligible" logic is in service layer
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN
    GENERATED ALWAYS AS (
      first_name IS NOT NULL AND
      last_name IS NOT NULL AND
      phone IS NOT NULL
    ) STORED;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_status
  ON public.profiles(stripe_identity_verification_status);

CREATE INDEX IF NOT EXISTS idx_profiles_is_complete
  ON public.profiles(is_profile_complete);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.first_name IS 'User first name. Required for marketplace transactions.';
COMMENT ON COLUMN public.profiles.last_name IS 'User last name. Required for marketplace transactions.';
COMMENT ON COLUMN public.profiles.phone IS 'User phone number. Required for marketplace transactions.';
COMMENT ON COLUMN public.profiles.stripe_identity_verification_status IS 'Stripe Identity verification status. Updated via webhook. Values: pending, verified, rejected. Required for sellers.';
COMMENT ON COLUMN public.profiles.stripe_identity_verification_id IS 'Stripe Identity VerificationSession ID. Used to track verification status.';
COMMENT ON COLUMN public.profiles.is_profile_complete IS 'Computed: true if first_name, last_name, phone are all non-null. Does NOT check shipping_addresses - that is done in service layer.';
