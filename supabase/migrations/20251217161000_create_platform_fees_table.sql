-- Create platform_fees table for fee configuration
-- This table stores the configurable fees for the marketplace
-- HUD-37: Transaction Fees Calculation & Platform Fee System

CREATE TABLE IF NOT EXISTS public.platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type TEXT NOT NULL CHECK (fee_type IN ('platform', 'seller')),
  fee_percentage NUMERIC(5,2) NOT NULL CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  min_fee NUMERIC(10,2) NULL, -- No caps currently used (NULL)
  max_fee NUMERIC(10,2) NULL, -- No caps currently used (NULL)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_fee_type UNIQUE NULLS NOT DISTINCT (fee_type, is_active)
);

-- Create index for faster lookups of active fees
CREATE INDEX IF NOT EXISTS idx_platform_fees_active ON public.platform_fees(fee_type) WHERE is_active = true;

-- Add comment to document the table purpose
COMMENT ON TABLE public.platform_fees IS 'Stores configurable marketplace fees. Platform fee is charged to buyer, seller fee is deducted from seller payout.';
COMMENT ON COLUMN public.platform_fees.fee_type IS 'Type of fee: platform (charged to buyer) or seller (deducted from seller)';
COMMENT ON COLUMN public.platform_fees.fee_percentage IS 'Fee as percentage (e.g., 5.00 for 5%)';
COMMENT ON COLUMN public.platform_fees.min_fee IS 'Minimum fee amount in major units (currently unused, NULL)';
COMMENT ON COLUMN public.platform_fees.max_fee IS 'Maximum fee amount in major units (currently unused, NULL)';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_platform_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_platform_fees_updated_at ON public.platform_fees;
CREATE TRIGGER trigger_update_platform_fees_updated_at
  BEFORE UPDATE ON public.platform_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_platform_fees_updated_at();

-- Enable RLS
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow SELECT for authenticated users (fees should be transparent)
CREATE POLICY "Authenticated users can view fees"
  ON public.platform_fees FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow SELECT for anonymous users (fees should be public)
CREATE POLICY "Anonymous users can view fees"
  ON public.platform_fees FOR SELECT
  TO anon
  USING (true);

-- No INSERT/UPDATE/DELETE policies - only service role can modify via migrations
