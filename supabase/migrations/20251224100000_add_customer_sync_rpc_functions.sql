-- Add RPC functions for syncing customer phone and address to Medusa
-- Related to: HUD-39 Phase 7 (customer sync improvements)

-- Function: Update Medusa customer phone
CREATE OR REPLACE FUNCTION public.update_medusa_customer_phone(
  p_customer_id TEXT,
  p_phone TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, medusa
AS $$
BEGIN
  UPDATE medusa.customer
  SET 
    phone = p_phone,
    updated_at = NOW()
  WHERE id = p_customer_id;
END;
$$;

COMMENT ON FUNCTION public.update_medusa_customer_phone IS 
  'Updates phone number on Medusa customer. Called during customer sync.';

-- Function: Sync shipping address to Medusa customer_address
-- Upserts the default shipping address for a customer
CREATE OR REPLACE FUNCTION public.sync_medusa_customer_address(
  p_customer_id TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_address_1 TEXT DEFAULT NULL,
  p_address_2 TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_province TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, medusa
AS $$
DECLARE
  v_address_id TEXT;
BEGIN
  -- Check if default shipping address already exists
  SELECT id INTO v_address_id
  FROM medusa.customer_address
  WHERE customer_id = p_customer_id
    AND is_default_shipping = true
  LIMIT 1;

  IF v_address_id IS NOT NULL THEN
    -- Update existing address
    UPDATE medusa.customer_address
    SET 
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name),
      address_1 = COALESCE(p_address_1, address_1),
      address_2 = COALESCE(p_address_2, address_2),
      city = COALESCE(p_city, city),
      province = COALESCE(p_province, province),
      postal_code = COALESCE(p_postal_code, postal_code),
      country_code = COALESCE(p_country_code, country_code),
      phone = COALESCE(p_phone, phone),
      updated_at = NOW()
    WHERE id = v_address_id;
    
    RETURN v_address_id;
  ELSE
    -- Create new address
    v_address_id := 'addr_' || REPLACE(gen_random_uuid()::TEXT, '-', '');
    
    INSERT INTO medusa.customer_address (
      id,
      customer_id,
      address_name,
      is_default_shipping,
      is_default_billing,
      first_name,
      last_name,
      address_1,
      address_2,
      city,
      province,
      postal_code,
      country_code,
      phone,
      created_at,
      updated_at
    ) VALUES (
      v_address_id,
      p_customer_id,
      'Default',
      true,
      true,
      p_first_name,
      p_last_name,
      p_address_1,
      p_address_2,
      p_city,
      p_province,
      p_postal_code,
      p_country_code,
      p_phone,
      NOW(),
      NOW()
    );
    
    RETURN v_address_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.sync_medusa_customer_address IS 
  'Syncs shipping address to Medusa customer_address table. Upserts default shipping address.';

-- Update existing update_medusa_customer to include phone
CREATE OR REPLACE FUNCTION public.update_medusa_customer(
  p_customer_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, medusa
AS $$
BEGIN
  UPDATE medusa.customer
  SET 
    email = COALESCE(p_email, email),
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    phone = COALESCE(p_phone, phone),
    updated_at = NOW()
  WHERE id = p_customer_id;
END;
$$;

COMMENT ON FUNCTION public.update_medusa_customer IS 
  'Updates Medusa customer data including phone. Called during customer sync.';

