-- Migration: Rename shipping_labels columns to generic names
-- HUD-36 Phase 0 (Cleanup - Shippo → Eurosender migration)
-- Date: 2025-01-18
--
-- Renames Shippo-specific column names to generic names that support multiple providers.

-- Rename columns
ALTER TABLE public.shipping_labels 
  RENAME COLUMN shippo_label_id TO external_label_id;

ALTER TABLE public.shipping_labels 
  RENAME COLUMN shippo_transaction_id TO external_order_id;

-- Update comments
COMMENT ON TABLE public.shipping_labels IS 'External shipping provider labels (Eurosender, Shippo, or other). Created when seller generates label (HUD-42).';

COMMENT ON COLUMN public.shipping_labels.external_label_id IS 'External shipping provider label ID (Eurosender orderCode, Shippo label ID, or other provider ID)';

COMMENT ON COLUMN public.shipping_labels.external_order_id IS 'External shipping provider order ID (Eurosender orderCode, Shippo transaction ID, or other provider order ID)';

-- Note: Existing data with shippo_* values will remain valid
-- New data will use eurosender_* or other provider formats

