-- Migration: Create shipping_label_status_history table
-- HUD-42 Phase 1
-- Date: 2025-12-19
--
-- Creates audit log table for shipping label status changes.
-- Logs all attempts, successes, failures, and status transitions.

CREATE TABLE IF NOT EXISTS public.shipping_label_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_label_id UUID NOT NULL REFERENCES public.shipping_labels(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'purchased', 'cancelled', 'error')),
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipping_label_status_history_label_id 
  ON public.shipping_label_status_history(shipping_label_id);
CREATE INDEX IF NOT EXISTS idx_shipping_label_status_history_created_at 
  ON public.shipping_label_status_history(created_at DESC);

-- Enable RLS (service-role only access)
ALTER TABLE public.shipping_label_status_history ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.shipping_label_status_history IS 'Audit log for shipping label status changes. Tracks all generation attempts, successes, failures, and cancellations.';
COMMENT ON COLUMN public.shipping_label_status_history.error_message IS 'Error message if status is "error", NULL otherwise.';

-- Prevent duplicate purchased labels for same transaction (race condition prevention)
-- Only one purchased label per transaction allowed
CREATE UNIQUE INDEX IF NOT EXISTS shipping_labels_transaction_purchased_unique 
  ON public.shipping_labels(transaction_id) 
  WHERE status = 'purchased';

COMMENT ON INDEX shipping_labels_transaction_purchased_unique IS 'Prevents duplicate label generation for same transaction. Ensures only one purchased label per transaction (race condition prevention).';

