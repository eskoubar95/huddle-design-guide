-- Create RPC functions for Medusa order and product creation
-- Uses direct SQL INSERTs to medusa schema (pattern from create_medusa_customer)
-- Related to: HUD-39
-- Note: Medusa shipping profiles are NOT configured - shipping method stored as text/metadata

-- Function: Create Medusa product
-- Creates a product in medusa.product table
CREATE OR REPLACE FUNCTION public.create_medusa_product(
  p_price_cents INTEGER,
  p_title TEXT,
  p_jersey_id UUID DEFAULT NULL,
  p_sale_listing_id UUID DEFAULT NULL,
  p_currency TEXT DEFAULT 'eur',
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, medusa
AS $$
DECLARE
  v_product_id UUID;
  v_variant_id UUID;
BEGIN
  -- Validate: Either jersey_id or sale_listing_id must be provided
  IF p_jersey_id IS NULL AND p_sale_listing_id IS NULL THEN
    RAISE EXCEPTION 'Either jersey_id or sale_listing_id must be provided';
  END IF;

  -- Generate UUIDs
  v_product_id := gen_random_uuid();
  v_variant_id := gen_random_uuid();

  -- Insert product into medusa.product table
  -- Note: Medusa v2 uses different structure - adjust columns as needed
  INSERT INTO medusa.product (
    id,
    title,
    description,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_product_id,
    p_title,
    p_description,
    'published', -- Product status: draft, published, etc.
    NOW(),
    NOW()
  );

  -- Insert variant (required for Medusa products)
  INSERT INTO medusa.product_variant (
    id,
    product_id,
    title,
    sku,
    created_at,
    updated_at
  ) VALUES (
    v_variant_id,
    v_product_id,
    p_title || ' - Variant', -- Default variant title
    'HUDDLE-' || v_product_id::TEXT, -- Generate SKU
    NOW(),
    NOW()
  );

  -- Insert price for variant (in medusa.price table or similar)
  -- Note: Medusa v2 price structure may vary - adjust as needed
  INSERT INTO medusa.price (
    id,
    currency_code,
    amount,
    variant_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    UPPER(p_currency),
    p_price_cents,
    v_variant_id,
    NOW(),
    NOW()
  );

  RETURN v_product_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create Medusa product: %', SQLERRM;
END;
$$;

-- Function: Create Medusa order
-- Creates an order in medusa.order table with shipping info in metadata
CREATE OR REPLACE FUNCTION public.create_medusa_order(
  p_product_id UUID,
  p_customer_id UUID,
  p_shipping_address JSONB,
  p_shipping_method_name TEXT,
  p_shipping_cost INTEGER,
  p_subtotal INTEGER,
  p_total INTEGER,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, medusa
AS $$
DECLARE
  v_order_id UUID;
  v_line_item_id UUID;
  v_shipping_metadata JSONB;
BEGIN
  -- Generate UUIDs
  v_order_id := gen_random_uuid();
  v_line_item_id := gen_random_uuid();

  -- Build shipping metadata (includes shipping method name and cost)
  v_shipping_metadata := COALESCE(p_metadata, '{}'::JSONB) || jsonb_build_object(
    'shipping_method', p_shipping_method_name,
    'shipping_cost', p_shipping_cost
  );

  -- Insert order into medusa.order table
  INSERT INTO medusa.order (
    id,
    customer_id,
    status,
    shipping_address,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    p_customer_id,
    'pending', -- Initial status: pending → paid → shipped → completed
    p_shipping_address,
    v_shipping_metadata,
    NOW(),
    NOW()
  );

  -- Insert order line item (links product to order)
  INSERT INTO medusa.line_item (
    id,
    order_id,
    product_id,
    quantity,
    unit_price,
    created_at,
    updated_at
  ) VALUES (
    v_line_item_id,
    v_order_id,
    p_product_id,
    1, -- Quantity: always 1 for marketplace items
    p_subtotal, -- Unit price (subtotal before shipping)
    NOW(),
    NOW()
  );

  -- Insert shipping method as line item (if Medusa supports it)
  -- Note: This may need adjustment based on Medusa v2 structure
  INSERT INTO medusa.line_item (
    id,
    order_id,
    product_id, -- NULL for shipping line items
    quantity,
    unit_price,
    title, -- Shipping method name
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_order_id,
    NULL, -- Shipping line items don't have product_id
    1,
    p_shipping_cost,
    p_shipping_method_name,
    NOW(),
    NOW()
  );

  RETURN v_order_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create Medusa order: %', SQLERRM;
END;
$$;

-- Function: Update Medusa order status
CREATE OR REPLACE FUNCTION public.update_medusa_order_status(
  p_order_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, medusa
AS $$
BEGIN
  -- Validate status
  IF p_status NOT IN ('pending', 'paid', 'shipped', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status: %', p_status;
  END IF;

  -- Update order status
  UPDATE medusa.order
  SET 
    status = p_status,
    updated_at = NOW()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update order status: %', SQLERRM;
END;
$$;

-- Function: Update Medusa order tracking information
CREATE OR REPLACE FUNCTION public.update_medusa_order_tracking(
  p_order_id UUID,
  p_tracking_number TEXT,
  p_shipping_provider TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, medusa
AS $$
DECLARE
  v_current_metadata JSONB;
  v_updated_metadata JSONB;
BEGIN
  -- Get current metadata
  SELECT COALESCE(metadata, '{}'::JSONB) INTO v_current_metadata
  FROM medusa.order
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Update metadata with tracking info
  v_updated_metadata := v_current_metadata || jsonb_build_object(
    'tracking_number', p_tracking_number,
    'shipping_provider', p_shipping_provider
  );

  -- Update order with new metadata
  UPDATE medusa.order
  SET 
    metadata = v_updated_metadata,
    updated_at = NOW()
  WHERE id = p_order_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update order tracking: %', SQLERRM;
END;
$$;

-- Comments
COMMENT ON FUNCTION public.create_medusa_product IS 
  'Creates a product in medusa.product table. Returns product_id UUID. Used for linking Huddle jerseys/listings to Medusa products.';

COMMENT ON FUNCTION public.create_medusa_order IS 
  'Creates an order in medusa.order table. Shipping method stored as text in metadata (not shipping option ID, as Medusa shipping is not configured).';

COMMENT ON FUNCTION public.update_medusa_order_status IS 
  'Updates order status. Valid statuses: pending, paid, shipped, completed, cancelled.';

COMMENT ON FUNCTION public.update_medusa_order_tracking IS 
  'Updates tracking information in order metadata. Tracking stored in metadata.tracking_number and metadata.shipping_provider.';

