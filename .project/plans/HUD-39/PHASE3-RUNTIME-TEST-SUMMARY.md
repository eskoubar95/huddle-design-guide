# Phase 3 Runtime Test Summary

**Date:** 2025-12-23  
**Status:** Ready for Testing

---

## ✅ Setup Complete

### Test Endpoints Created:
1. **POST `/api/test/create-order-sale`**
   - Tests `MedusaOrderService.createOrderFromSale()`
   - Requires: `listingId`, `buyerId`, optional `shippingMethodName`, `shippingCost`

2. **POST `/api/test/create-order-auction`**
   - Tests `MedusaOrderService.createOrderFromAuction()`
   - Requires: `auctionId`, `buyerId`, optional `shippingMethodName`, `shippingCost`

3. **POST `/api/test/webhook-simulation`**
   - Simulates Stripe webhook `payment_intent.succeeded` event
   - Requires: `transactionId`
   - Tests full webhook flow: order creation + transaction update

### Test Script:
- **Location:** `scripts/test-phase3-runtime.sh`
- **Usage:** `./scripts/test-phase3-runtime.sh`
- **Environment Variables:**
  - `BASE_URL` (default: `http://localhost:3000`)
  - `LISTING_ID` (default: `e203ac85-196d-4aa3-9070-caaea6db4040`)
  - `BUYER_ID` (default: `user_367ePcSlUHD6VCZDZ2UzEEDytOd`)
  - `TRANSACTION_ID` (optional, for webhook test)

### Test Data:
- **Sale Listing:** `e203ac85-196d-4aa3-9070-caaea6db4040`
- **Buyer:** `user_367ePcSlUHD6VCZDZ2UzEEDytOd`
- **Transaction:** `38414099-c5c3-4694-87db-f5fd5146ad58` (status: `pending`)

---

## 🧪 How to Run Tests

### Prerequisites:
1. Next.js dev server running: `cd apps/web && npm run dev`
2. Supabase migrations applied
3. Test data exists (already created)

### Run All Tests:
```bash
./scripts/test-phase3-runtime.sh
```

### Run Individual Tests:

#### Test 1: createOrderFromSale
```bash
curl -X POST http://localhost:3000/api/test/create-order-sale \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "e203ac85-196d-4aa3-9070-caaea6db4040",
    "buyerId": "user_367ePcSlUHD6VCZDZ2UzEEDytOd",
    "shippingMethodName": "Eurosender Standard",
    "shippingCost": 1500
  }'
```

#### Test 2: Webhook Simulation
```bash
curl -X POST http://localhost:3000/api/test/webhook-simulation \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "38414099-c5c3-4694-87db-f5fd5146ad58"
  }'
```

---

## 📋 Expected Results

### Test 1: createOrderFromSale
- ✅ Returns `200 OK`
- ✅ Response contains `order` object with:
  - `id` (TEXT format: `order_xxx`)
  - `status`: `"pending"`
  - `customer_id`: Buyer's Medusa customer ID
  - `shipping_address`: Full address object
  - `shipping_method`: `"Eurosender Standard"`
  - `shipping_cost`: `1500`
  - `totals`: `{subtotal, shipping, total}`

### Test 2: Webhook Simulation
- ✅ Returns `200 OK`
- ✅ Response contains `order` object
- ✅ `transactionUpdated`: `true`
- ✅ Transaction `medusa_order_id` updated in database

### Test 3: Idempotency
- ✅ First call: Creates order
- ✅ Second call: Returns `skipped: true` with existing order ID

---

## 🔍 Verification Queries

### After Test 1 or 2:
```sql
-- Check order created
SELECT id, customer_id, status, currency_code, email, metadata
FROM medusa.order
WHERE id = 'order_xxx'; -- Replace with returned order ID

-- Check shipping address
SELECT * FROM medusa.order_address
WHERE id = (SELECT shipping_address_id FROM medusa.order WHERE id = 'order_xxx');

-- Check order items
SELECT * FROM medusa.order_item
WHERE order_id = 'order_xxx';

-- Check order line items
SELECT * FROM medusa.order_line_item
WHERE totals_id IN (SELECT id FROM medusa.order_item WHERE order_id = 'order_xxx');
```

### After Test 2 (Webhook Simulation):
```sql
-- Check transaction updated
SELECT id, status, medusa_order_id, completed_at
FROM transactions
WHERE id = '38414099-c5c3-4694-87db-f5fd5146ad58';
```

---

## 🐛 Troubleshooting

### Server Not Running
```bash
cd apps/web
npm run dev
```

### Type Errors
```bash
cd apps/web
npm run typecheck
```

### Database Connection Errors
- Check `.env.local` has correct Supabase credentials
- Check Supabase project is running

### Clerk Errors
- Check `.env.local` has `CLERK_SECRET_KEY`
- Check buyer ID exists in Clerk

### Missing Shipping Address
- Ensure buyer has default shipping address in `shipping_addresses` table
- Check `is_default = true`

---

## 📝 Notes

- Test endpoints are only for development/testing
- Real webhook integration happens in `/api/v1/stripe/webhook`
- Test endpoints bypass webhook signature verification
- All errors are logged to Sentry (non-blocking)

---

## ✅ Success Criteria

- [ ] Test 1: createOrderFromSale() creates order successfully
- [ ] Test 2: Webhook simulation creates order and updates transaction
- [ ] Test 3: Idempotency works (no duplicate orders)
- [ ] All orders visible in Medusa admin
- [ ] Transaction `medusa_order_id` updated correctly

