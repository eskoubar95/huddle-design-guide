-- Seed default platform fees
-- HUD-37: Transaction Fees Calculation & Platform Fee System
-- Platform fee: 5% (charged to buyer, all-in including Stripe processing fee)
-- Seller fee: 1% (deducted from seller payout, refundable)

-- Insert platform fee (5%)
INSERT INTO public.platform_fees (fee_type, fee_percentage, min_fee, max_fee, is_active)
VALUES ('platform', 5.00, NULL, NULL, true)
ON CONFLICT (fee_type, is_active) DO NOTHING;

-- Insert seller fee (1%)
INSERT INTO public.platform_fees (fee_type, fee_percentage, min_fee, max_fee, is_active)
VALUES ('seller', 1.00, NULL, NULL, true)
ON CONFLICT (fee_type, is_active) DO NOTHING;

-- Verify insertion
DO $$
DECLARE
  platform_count INT;
  seller_count INT;
BEGIN
  SELECT COUNT(*) INTO platform_count FROM public.platform_fees WHERE fee_type = 'platform' AND is_active = true;
  SELECT COUNT(*) INTO seller_count FROM public.platform_fees WHERE fee_type = 'seller' AND is_active = true;

  IF platform_count = 0 THEN
    RAISE EXCEPTION 'Failed to insert platform fee';
  END IF;

  IF seller_count = 0 THEN
    RAISE EXCEPTION 'Failed to insert seller fee';
  END IF;

  RAISE NOTICE 'Platform fees seeded successfully: platform=5%%, seller=1%%';
END $$;
