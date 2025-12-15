-- Migration: Add address_line_2 to shipping_addresses table
-- Date: 2025-01-30
--
-- Adds optional address_line_2 field for apartment, suite, unit, etc.

ALTER TABLE public.shipping_addresses
  ADD COLUMN IF NOT EXISTS address_line_2 TEXT NULL;

COMMENT ON COLUMN public.shipping_addresses.address_line_2 IS 'Optional second address line (apartment, suite, unit, building, floor, etc.).';
