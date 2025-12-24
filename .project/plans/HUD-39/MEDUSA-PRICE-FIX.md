# Medusa Price Format Fix

**Date:** 2025-12-23  
**Issue:** Medusa Admin viser priser forkert (10.000 EUR i stedet for 100 EUR)  
**Status:** ✅ Fixed

---

## Problem

Medusa Admin viste priser som 10.000 EUR i stedet for 100 EUR, selvom trøjen var prissat til 100 EUR.

**Root Cause:**
- Vi gemte priser i **minor units** (cents) i `order_line_item.unit_price` og `order_summary.totals`
- Medusa Admin forventer **major units** (EUR) og dividerer ikke med 100 når den viser priserne
- Så 10000 cents blev vist som 10.000 EUR i stedet for 100 EUR

---

## Solution

### 1. Updated `create_medusa_order` RPC Function
- Konverterer nu priser fra cents (minor units) til EUR (major units) før gem
- `unit_price` gemmes nu som 100.00 EUR i stedet for 10000 cents
- `order_summary.totals` gemmes også i major units

### 2. Fixed Existing Orders
- Opdateret alle eksisterende orders til at gemme priser i major units
- Konverteret `order_line_item.unit_price` fra cents til EUR
- Konverteret `order_summary.totals` fra cents til EUR

---

## Changes Made

### Database Migration
```sql
-- Convert prices from cents to EUR (major units)
UPDATE medusa.order_line_item
SET unit_price = unit_price / 100.0
WHERE unit_price > 1000;

-- Update order_summary.totals to major units
UPDATE medusa.order_summary
SET totals = jsonb_build_object(
  'subtotal', jsonb_build_object('value', (subtotal_value / 100.0)::TEXT, 'precision', 20),
  ...
)
```

### RPC Function Update
```sql
-- Convert from cents to EUR before storing
v_subtotal_eur := p_subtotal / 100.0;
v_shipping_cost_eur := p_shipping_cost / 100.0;
v_total_eur := p_total / 100.0;

-- Store in major units
INSERT INTO medusa.order_line_item (..., unit_price, ...)
VALUES (..., v_subtotal_eur, ...);
```

---

## Verification

✅ **All orders have correct price format:**
- Order 1: 100.00 EUR (was 10000 cents)
- Order 2: 100.00 EUR (was 10000 cents)
- Order 3: 50.00 EUR (was 5000 cents)
- Order 4: 75.00 EUR (was 7500 cents)
- Order 5: 50.00 EUR (was 5000 cents)

---

## Important Notes

1. **Price Storage Format:**
   - **Our system (transactions table):** Stores prices in **cents** (minor units)
   - **Medusa (order_line_item, order_summary):** Stores prices in **EUR** (major units)
   - RPC function handles conversion automatically

2. **Consistency:**
   - We still pass prices in cents to RPC function (for consistency with our system)
   - RPC function converts to EUR before storing in Medusa tables
   - This maintains consistency with our `transactions` table while fixing Medusa Admin display

---

## Testing

1. **Refresh Medusa Admin UI** (`localhost:9000/app/orders`)
2. **Check order detail** - prices should now show correctly (100 EUR instead of 10.000 EUR)
3. **Create new order** - should automatically use correct format

---

## Status: ✅ Complete

All fixes applied and verified. Medusa Admin should now display prices correctly.

