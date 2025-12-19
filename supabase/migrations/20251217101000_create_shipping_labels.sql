-- Migration: Create shipping_labels table
-- HUD-36 Phase 1 (preparation for HUD-42)
-- Date: 2025-12-17
--
-- Creates table for storing Shippo shipping label information.
-- Links to orders/transactions and service points (for pickup point deliveries).

CREATE TABLE IF NOT EXISTS public.shipping_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NULL, -- Future: reference to medusa.orders.id (when HUD-39 implemented)
  transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  shippo_label_id VARCHAR(255) NOT NULL UNIQUE, -- Shippo label ID (e.g., "label_xxx")
  shippo_transaction_id VARCHAR(255) NOT NULL, -- Shippo transaction ID
  label_url TEXT NOT NULL, -- PDF download URL
  tracking_number VARCHAR(255) NULL, -- Carrier tracking number
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'purchased', 'cancelled', 'error')),
  service_point_id UUID NULL REFERENCES public.service_points(id) ON DELETE SET NULL,
  shipping_method_type VARCHAR(20) NOT NULL CHECK (shipping_method_type IN ('home_delivery', 'pickup_point')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipping_labels_order_id ON public.shipping_labels(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_transaction_id ON public.shipping_labels(transaction_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_status ON public.shipping_labels(status);

-- Enable RLS (service-role only access)
ALTER TABLE public.shipping_labels ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'update_shipping_labels_updated_at'
    ) THEN
      EXECUTE 'CREATE TRIGGER update_shipping_labels_updated_at
        BEFORE UPDATE ON public.shipping_labels
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()';
    END IF;
  END IF;
END $$;

-- Comments
COMMENT ON TABLE public.shipping_labels IS 'Shippo shipping labels. Created when seller generates label (HUD-42).';
COMMENT ON COLUMN public.shipping_labels.shippo_label_id IS 'Shippo label ID (unique identifier from Shippo API)';
COMMENT ON COLUMN public.shipping_labels.service_point_id IS 'Reference to service point if pickup point delivery (nullable)';
COMMENT ON COLUMN public.shipping_labels.shipping_method_type IS 'Delivery type: home_delivery or pickup_point';

