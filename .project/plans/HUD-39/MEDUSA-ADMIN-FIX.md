# Medusa Admin Orders Fix

**Date:** 2025-12-23  
**Issue:** Medusa Admin UI shows 500 error when viewing orders  
**Error:** `Invalid BigNumber value: [object Object]`

---

## Problem

Medusa Admin UI (`localhost:9000/app/orders`) showed 500 Internal Server Error when trying to list orders. The error was:

```
Invalid BigNumber value: [object Object]. Should be one of: string, number, BigNumber (bignumber.js), BigNumberRawValue
```

**Root Cause:**
The `raw_unit_price` field in `medusa.order_line_item` was stored as:
```json
{"amount": 5000, "currency_code": "EUR"}
```

But Medusa's BigNumber transformer expects the same format as `raw_quantity`:
```json
{"value": "5000", "precision": 20}
```

---

## Solution

### 1. Updated RPC Function
Updated `create_medusa_order` function to use correct format:
```sql
raw_unit_price: jsonb_build_object('value', p_subtotal::TEXT, 'precision', 20)
```

### 2. Fixed Existing Orders
Updated all existing orders' `raw_unit_price` to correct format:
```sql
UPDATE medusa.order_line_item
SET raw_unit_price = jsonb_build_object(
  'value', (raw_unit_price->>'amount')::TEXT,
  'precision', 20
)
WHERE raw_unit_price IS NOT NULL 
  AND raw_unit_price ? 'amount'
  AND NOT (raw_unit_price ? 'value');
```

---

## Verification

After fix, orders can be queried successfully:
```sql
SELECT 
  o.id,
  o.status,
  oi.id as order_item_id,
  oli.raw_unit_price
FROM medusa.order o
LEFT JOIN medusa.order_item oi ON oi.order_id = o.id
LEFT JOIN medusa.order_line_item oli ON oli.totals_id = oi.id
LIMIT 5;
```

Result: `raw_unit_price` now shows `{"value": "5000", "precision": 20}` format.

---

## Additional Fix: Order Summary

**Problem:** Order detail view still failed because `order_summary` table entries were missing.

**Solution:**
1. Updated `create_medusa_order` RPC function to create `order_summary` entries with totals
2. Created `order_summary` entries for all existing orders
3. Totals structure uses BigNumber format: `{"value": "5000", "precision": 20}`

**Totals Structure:**
```json
{
  "subtotal": {"value": "10000", "precision": 20},
  "shipping_total": {"value": "1500", "precision": 20},
  "total": {"value": "11500", "precision": 20},
  "item_total": {"value": "10000", "precision": 20},
  "item_subtotal": {"value": "10000", "precision": 20},
  "tax_total": {"value": "0", "precision": 20},
  // ... all other totals fields
}
```

---

## Status

✅ **Fixed:** Migration applied, existing orders updated  
✅ **Fixed:** `order_summary` entries created for all orders  
✅ **Verified:** Orders can be queried with correct format  
✅ **Verified:** Order detail view works (200 OK in logs)

---

## Next Steps

1. Refresh Medusa Admin UI (`localhost:9000/app/orders`)
2. Verify orders list displays correctly
3. Click on an order to verify detail view works
4. Test creating a new order to ensure `order_summary` is created automatically

