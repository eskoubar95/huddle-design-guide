-- Migration: Add price fields to shipping_labels table
-- HUD-42: Store shipping label price for reporting and cost tracking
-- Date: 2025-12-20
--
-- Adds price fields to track the actual cost of shipping labels.
-- Prices are stored in EUR (major units, not cents) to match Eurosender API format.
-- This allows us to:
-- - Track shipping costs over time
-- - Generate cost reports
-- - Match with transactions.shipping_amount (if needed)
-- - Audit label pricing

-- Add price fields
ALTER TABLE public.shipping_labels 
  ADD COLUMN IF NOT EXISTS price_gross NUMERIC(10,2) NULL,
  ADD COLUMN IF NOT EXISTS price_net NUMERIC(10,2) NULL,
  ADD COLUMN IF NOT EXISTS price_vat NUMERIC(10,2) NULL,
  ADD COLUMN IF NOT EXISTS price_currency VARCHAR(3) DEFAULT 'EUR';

-- Add comments
COMMENT ON COLUMN public.shipping_labels.price_gross IS 'Total shipping price in EUR (major units, includes VAT). Example: 25.58 = €25.58';
COMMENT ON COLUMN public.shipping_labels.price_net IS 'Shipping price excluding VAT in EUR (major units). Example: 20.46 = €20.46';
COMMENT ON COLUMN public.shipping_labels.price_vat IS 'VAT amount in EUR (major units). Example: 5.12 = €5.12';
COMMENT ON COLUMN public.shipping_labels.price_currency IS 'Currency code (currently always EUR for Eurosender)';

-- Create index for price queries (useful for reporting)
CREATE INDEX IF NOT EXISTS idx_shipping_labels_price_gross 
  ON public.shipping_labels(price_gross) 
  WHERE price_gross IS NOT NULL;

