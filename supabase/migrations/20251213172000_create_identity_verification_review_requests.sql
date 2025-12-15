-- Migration: Create identity_verification_review_requests table
-- HUD-41 Phase 1.3
-- Date: 2025-12-13
--
-- Minimal support table for tracking "request review" submissions when
-- Stripe Identity verification is rejected. Allows users to request manual
-- review without building a full ticket/support system.

CREATE TABLE IF NOT EXISTS public.identity_verification_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  verification_session_id VARCHAR(255) NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for querying and filtering
CREATE INDEX IF NOT EXISTS idx_identity_review_requests_user_id
  ON public.identity_verification_review_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_identity_review_requests_status
  ON public.identity_verification_review_requests(status);

-- Enable RLS (no policies - service-role only)
ALTER TABLE public.identity_verification_review_requests ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE 'CREATE TRIGGER update_identity_review_requests_updated_at
      BEFORE UPDATE ON public.identity_verification_review_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE public.identity_verification_review_requests IS 'Minimal support table for tracking "request review" submissions when Stripe Identity verification is rejected. Service-role access only.';
COMMENT ON COLUMN public.identity_verification_review_requests.user_id IS 'Clerk user ID.';
COMMENT ON COLUMN public.identity_verification_review_requests.verification_session_id IS 'Stripe Identity VerificationSession ID that was rejected.';
COMMENT ON COLUMN public.identity_verification_review_requests.status IS 'Request status: open (pending review) or closed (resolved).';
COMMENT ON COLUMN public.identity_verification_review_requests.message IS 'Optional message from user explaining why they need manual review.';
