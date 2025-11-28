-- Add Medusa customer ID to profiles table
-- Reference til medusa.customer.id (cross-schema reference via UUID)
ALTER TABLE public.profiles 
ADD COLUMN medusa_customer_id UUID;

-- Create index for lookups
CREATE INDEX idx_profiles_medusa_customer_id ON public.profiles(medusa_customer_id);

-- Add comment
COMMENT ON COLUMN public.profiles.medusa_customer_id IS 
  'Reference til medusa.customer.id. Oprettes automatisk når Clerk user opretter profile via medusa-customer-service.ts';

