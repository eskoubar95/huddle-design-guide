-- Migration: Create shipping_addresses table
-- HUD-41 Phase 1.2
-- Date: 2025-12-13
--
-- Creates table for storing user shipping addresses with support for multiple
-- addresses per user and exactly one default address per user.

CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NULL, -- State/Province/Region (optional, required for US/CA/AU)
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only ONE default address per user (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS shipping_addresses_user_default_idx
  ON public.shipping_addresses(user_id) WHERE is_default = true;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id
  ON public.shipping_addresses(user_id);

-- Enable RLS (no policies - service-role only access)
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE 'CREATE TRIGGER update_shipping_addresses_updated_at
      BEFORE UPDATE ON public.shipping_addresses
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE public.shipping_addresses IS 'User shipping addresses. RLS enabled, no policies - access via service role only (contains PII).';
COMMENT ON COLUMN public.shipping_addresses.user_id IS 'Clerk user ID (references profiles.id).';
COMMENT ON COLUMN public.shipping_addresses.is_default IS 'Whether this is the default shipping address for the user. Only one default per user enforced by partial unique index.';
COMMENT ON INDEX shipping_addresses_user_default_idx IS 'Ensures only one default address per user (partial unique index on is_default=true).';
