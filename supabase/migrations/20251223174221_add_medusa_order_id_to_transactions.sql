-- Add Medusa order ID to transactions table
-- Links Huddle transactions to Medusa orders for order management
-- Related to: HUD-39

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS medusa_order_id UUID NULL;

-- Index for lookups (orders → transactions)
CREATE INDEX IF NOT EXISTS idx_transactions_medusa_order_id 
  ON public.transactions(medusa_order_id) 
  WHERE medusa_order_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN public.transactions.medusa_order_id IS 
  'Reference til medusa.order.id. Oprettes når Medusa order skabes efter Stripe payment success.';

