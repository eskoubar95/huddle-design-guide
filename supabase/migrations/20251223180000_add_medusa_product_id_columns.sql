-- Add medusa_product_id columns to jerseys and sale_listings tables
-- Links Huddle jerseys/listings to Medusa products for order management
-- Related to: HUD-39

-- Add medusa_product_id to jerseys table
ALTER TABLE public.jerseys
  ADD COLUMN IF NOT EXISTS medusa_product_id TEXT NULL;

-- Add index for lookups (jerseys → Medusa products)
CREATE INDEX IF NOT EXISTS idx_jerseys_medusa_product_id
  ON public.jerseys(medusa_product_id)
  WHERE medusa_product_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.jerseys.medusa_product_id IS
  'Reference til medusa.product.id (TEXT format for Medusa v2). Oprettes asynkront ved jersey upload eller auction creation.';

-- Add medusa_product_id to sale_listings table
ALTER TABLE public.sale_listings
  ADD COLUMN IF NOT EXISTS medusa_product_id TEXT NULL;

-- Add index for lookups (sale_listings → Medusa products)
CREATE INDEX IF NOT EXISTS idx_sale_listings_medusa_product_id
  ON public.sale_listings(medusa_product_id)
  WHERE medusa_product_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.sale_listings.medusa_product_id IS
  'Reference til medusa.product.id (TEXT format for Medusa v2). Oprettes asynkront ved listing creation.';

