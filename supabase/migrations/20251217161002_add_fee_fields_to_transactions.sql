-- Add fee breakdown fields to transactions table
-- HUD-37: Transaction Fees Calculation & Platform Fee System
-- IMPORTANT: All *_amount fields store values in CENTS (minor units) even though DB type is NUMERIC
-- Example: 1050 in database = €10.50 (1050 cents)

-- Add item_amount column (item price in cents)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS item_amount NUMERIC(10,2) NULL;

COMMENT ON COLUMN public.transactions.item_amount IS 'Item price in cents (minor units). Example: 1050 = €10.50';

-- Add shipping_amount column (shipping cost in cents)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC(10,2) NULL;

COMMENT ON COLUMN public.transactions.shipping_amount IS 'Shipping cost in cents (minor units). NULL until shipping is determined. Example: 500 = €5.00';

-- Add platform_fee_amount column (platform fee in cents, charged to buyer)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(10,2) NULL;

COMMENT ON COLUMN public.transactions.platform_fee_amount IS 'Platform fee in cents (minor units), charged to buyer. Calculated as % of item_amount. Example: 53 = €0.53';

-- Add seller_fee_amount column (seller fee in cents, deducted from seller)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS seller_fee_amount NUMERIC(10,2) NULL;

COMMENT ON COLUMN public.transactions.seller_fee_amount IS 'Seller fee in cents (minor units), deducted from seller payout. Refundable. Example: 11 = €0.11';

-- Add total_amount column (total buyer pays in cents)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) NULL;

COMMENT ON COLUMN public.transactions.total_amount IS 'Total amount buyer pays in cents (minor units). Equals item_amount + shipping_amount + platform_fee_amount. Example: 1603 = €16.03. NULL for auctions until checkout.';

-- Add seller_payout_amount column (net amount seller receives in cents)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS seller_payout_amount NUMERIC(10,2) NULL;

COMMENT ON COLUMN public.transactions.seller_payout_amount IS 'Net payout to seller in cents (minor units). Equals item_amount - seller_fee_amount. Example: 1039 = €10.39';

-- Update table comment to document money units contract
COMMENT ON TABLE public.transactions IS 'Marketplace transactions with detailed fee breakdown. IMPORTANT: All *_amount fields (except legacy amount) store values in CENTS (minor units), not euros.';

-- Add legacy amount field comment
COMMENT ON COLUMN public.transactions.amount IS 'LEGACY field. For new transactions, set to total_amount (buyer total in cents) when known, otherwise item_amount. All values in cents.';

-- Create index for efficient queries on transaction amounts
CREATE INDEX IF NOT EXISTS idx_transactions_amounts ON public.transactions(item_amount, total_amount) WHERE item_amount IS NOT NULL;

-- Verification query (run after migration)
DO $$
DECLARE
  column_count INT;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'transactions'
    AND column_name IN ('item_amount', 'shipping_amount', 'platform_fee_amount', 'seller_fee_amount', 'total_amount', 'seller_payout_amount');

  IF column_count != 6 THEN
    RAISE EXCEPTION 'Expected 6 new columns in transactions table, found %', column_count;
  END IF;

  RAISE NOTICE 'Successfully added 6 fee breakdown columns to transactions table (all values in cents)';
END $$;
