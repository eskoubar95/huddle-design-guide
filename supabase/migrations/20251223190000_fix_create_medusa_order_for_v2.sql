-- Fix create_medusa_order RPC function for Medusa v2 structure
-- Updates to use TEXT IDs, order_address table, order_item/order_line_item structure
-- Related to: HUD-39 Phase 3

-- Drop old function first
DROP FUNCTION IF EXISTS public.create_medusa_order(UUID, UUID, JSONB, TEXT, INTEGER, INTEGER, INTEGER, JSONB);

-- Function: Create Medusa order (v2 structure)
-- Creates an order in medusa.order table with order_address and order_item/order_line_item
CREATE OR REPLACE FUNCTION public.create_medusa_order(
  p_product_id TEXT, -- Changed from UUID to TEXT for Medusa v2
  p_customer_id TEXT, -- Changed from UUID to TEXT for Medusa v2
  p_shipping_address JSONB, -- Will be inserted into order_address table
  p_shipping_method_name TEXT,
  p_shipping_cost INTEGER, -- In cents
  p_subtotal INTEGER, -- In cents
  p_total INTEGER, -- In cents
  p_email TEXT, -- Required for Medusa v2 order
  p_currency_code TEXT DEFAULT 'EUR',
  p_metadata JSONB DEFAULT NULL
)
RETURNS TEXT -- Changed from UUID to TEXT for Medusa v2
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, medusa
AS $$
DECLARE
  v_order_id TEXT;
  v_order_address_id TEXT;
  v_order_item_id TEXT;
  v_order_line_item_id TEXT;
  v_order_summary_id TEXT;
  v_shipping_metadata JSONB;
  -- Convert cents to major units (EUR) for Medusa
  v_subtotal_eur NUMERIC;
  v_shipping_cost_eur NUMERIC;
  v_total_eur NUMERIC;
BEGIN
  -- Convert from cents (minor units) to EUR (major units) for Medusa
  -- Medusa Admin expects major units and doesn't divide by 100 when displaying
  v_subtotal_eur := p_subtotal / 100.0;
  v_shipping_cost_eur := p_shipping_cost / 100.0;
  v_total_eur := p_total / 100.0;
  -- Generate TEXT IDs (Medusa v2 format)
  v_order_id := 'order_' || REPLACE(gen_random_uuid()::TEXT, '-', '');
  v_order_address_id := 'addr_' || REPLACE(gen_random_uuid()::TEXT, '-', '');
  v_order_item_id := 'item_' || REPLACE(gen_random_uuid()::TEXT, '-', '');
  v_order_line_item_id := 'line_' || REPLACE(gen_random_uuid()::TEXT, '-', '');
  v_order_summary_id := 'ordsum_' || REPLACE(gen_random_uuid()::TEXT, '-', '');

  -- Build shipping metadata (includes shipping method name and cost)
  v_shipping_metadata := COALESCE(p_metadata, '{}'::JSONB) || jsonb_build_object(
    'shipping_method', p_shipping_method_name,
    'shipping_cost', p_shipping_cost
  );

  -- Insert shipping address into order_address table
  INSERT INTO medusa.order_address (
    id,
    customer_id,
    first_name,
    last_name,
    address_1,
    address_2,
    city,
    country_code,
    province,
    postal_code,
    phone,
    created_at,
    updated_at
  ) VALUES (
    v_order_address_id,
    p_customer_id,
    COALESCE(p_shipping_address->>'first_name', p_shipping_address->>'full_name', ''),
    COALESCE(p_shipping_address->>'last_name', ''),
    p_shipping_address->>'street',
    p_shipping_address->>'address_line2',
    p_shipping_address->>'city',
    UPPER(p_shipping_address->>'country'),
    p_shipping_address->>'state',
    p_shipping_address->>'postal_code',
    p_shipping_address->>'phone',
    NOW(),
    NOW()
  );

  -- Insert order into medusa.order table (v2 structure)
  INSERT INTO medusa.order (
    id,
    customer_id,
    status,
    currency_code,
    email,
    shipping_address_id,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    p_customer_id,
    'pending', -- Initial status: pending → paid → shipped → completed
    UPPER(p_currency_code),
    p_email,
    v_order_address_id,
    v_shipping_metadata,
    NOW(),
    NOW()
  );

  -- Insert order_item (links to order)
  -- Note: order_item requires version, item_id, quantity, raw_quantity and other fields
  INSERT INTO medusa.order_item (
    id,
    order_id,
    version,
    item_id,
    quantity,
    raw_quantity,
    fulfilled_quantity,
    raw_fulfilled_quantity,
    shipped_quantity,
    raw_shipped_quantity,
    return_requested_quantity,
    raw_return_requested_quantity,
    return_received_quantity,
    raw_return_received_quantity,
    return_dismissed_quantity,
    raw_return_dismissed_quantity,
    written_off_quantity,
    raw_written_off_quantity,
    delivered_quantity,
    raw_delivered_quantity,
    created_at,
    updated_at
  ) VALUES (
    v_order_item_id,
    v_order_id,
    1, -- Version: start at 1
    v_order_line_item_id, -- item_id: reference to order_line_item.id
    1, -- Quantity: always 1 for marketplace items
    '{"value": "1"}'::jsonb, -- Raw quantity (BigNumberRawValue: only value, no precision)
    0, -- Fulfilled quantity
    '{"value": "0"}'::jsonb, -- Raw fulfilled quantity
    0, -- Shipped quantity
    '{"value": "0"}'::jsonb, -- Raw shipped quantity
    0, -- Return requested quantity
    '{"value": "0"}'::jsonb, -- Raw return requested quantity
    0, -- Return received quantity
    '{"value": "0"}'::jsonb, -- Raw return received quantity
    0, -- Return dismissed quantity
    '{"value": "0"}'::jsonb, -- Raw return dismissed quantity
    0, -- Written off quantity
    '{"value": "0"}'::jsonb, -- Raw written off quantity
    0, -- Delivered quantity
    '{"value": "0"}'::jsonb -- Raw delivered quantity
    NOW(),
    NOW()
  );

  -- Get product variant ID (first variant for the product)
  -- Insert order_line_item (links product to order via order_item)
  INSERT INTO medusa.order_line_item (
    id,
    totals_id, -- FK to order_item.id
    title,
    product_id,
    variant_id,
    unit_price,
    raw_unit_price,
    created_at,
    updated_at
  ) VALUES (
    v_order_line_item_id,
    v_order_item_id,
    (SELECT title FROM medusa.product WHERE id = p_product_id LIMIT 1), -- Product title
    p_product_id,
    (SELECT id FROM medusa.product_variant WHERE product_id = p_product_id LIMIT 1), -- First variant
    v_subtotal_eur, -- Unit price in major units (EUR) - Medusa Admin expects this format
    jsonb_build_object('value', v_subtotal_eur::TEXT), -- Raw price: BigNumberRawValue (only value, no precision)
    NOW(),
    NOW()
  );

  -- Insert order_summary with totals (required for Medusa Admin display)
  -- Store all totals in major units (EUR) - Medusa Admin expects this format
  INSERT INTO medusa.order_summary (
    id,
    order_id,
    version,
    totals,
    created_at,
    updated_at
  ) VALUES (
    v_order_summary_id,
    v_order_id,
    1,
    jsonb_build_object(
      'subtotal', jsonb_build_object('value', v_subtotal_eur::TEXT),
      'shipping_total', jsonb_build_object('value', v_shipping_cost_eur::TEXT),
      'total', jsonb_build_object('value', v_total_eur::TEXT),
      'item_total', jsonb_build_object('value', v_subtotal_eur::TEXT),
      'item_subtotal', jsonb_build_object('value', v_subtotal_eur::TEXT),
      'item_tax_total', jsonb_build_object('value', '0'),
      'shipping_subtotal', jsonb_build_object('value', v_shipping_cost_eur::TEXT),
      'shipping_tax_total', jsonb_build_object('value', '0'),
      'tax_total', jsonb_build_object('value', '0'),
      'discount_total', jsonb_build_object('value', '0'),
      'discount_subtotal', jsonb_build_object('value', '0'),
      'item_discount_total', jsonb_build_object('value', '0'),
      'shipping_discount_total', jsonb_build_object('value', '0'),
      'refundable_total', jsonb_build_object('value', v_total_eur::TEXT),
      'original_total', jsonb_build_object('value', v_total_eur::TEXT),
      'original_tax_total', jsonb_build_object('value', '0'),
      'original_shipping_tax_total', jsonb_build_object('value', '0'),
      'original_item_tax_total', jsonb_build_object('value', '0'),
      'credit_line_total', jsonb_build_object('value', '0')
    ),
    NOW(),
    NOW()
  );

  -- Note: Shipping cost is stored in order metadata, not as separate line item
  -- (Medusa shipping is not configured, so we use metadata approach)

  RETURN v_order_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create Medusa order: %', SQLERRM;
END;
$$;

-- Update function comments
COMMENT ON FUNCTION public.create_medusa_order IS 
  'Creates an order in medusa.order table (v2 structure). Shipping method stored as text in metadata (not shipping option ID, as Medusa shipping is not configured). Returns TEXT ID (Medusa v2 format).';

