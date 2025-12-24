-- Update medusa_order_id column from UUID to TEXT for Medusa v2 compatibility
-- Related to: HUD-39 Phase 3

ALTER TABLE public.transactions
  ALTER COLUMN medusa_order_id TYPE TEXT USING medusa_order_id::TEXT;

-- Update comment
COMMENT ON COLUMN public.transactions.medusa_order_id IS 
  'Reference til medusa.order.id (TEXT format for Medusa v2). Oprettes når Medusa order skabes efter Stripe payment success.';

