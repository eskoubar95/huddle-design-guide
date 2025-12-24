# Phase 3 Runtime Test Guide

**Date:** 2025-12-23  
**Status:** Ready for Testing

---

## Prerequisites

1. ✅ Next.js dev server kører: `npm run dev` (fra `apps/web`)
2. ✅ Supabase migrations kørt
3. ✅ Test data oprettet (se nedenfor)

---

## Test Data Setup

### Test Sale Listing:
- **Listing ID:** `e203ac85-196d-4aa3-9070-caaea6db4040`
- **Price:** 100.00 EUR
- **Status:** `active`

### Test Buyer:
- **Buyer ID:** `user_367ePcSlUHD6VCZDZ2UzEEDytOd`
- **Medusa Customer ID:** `24fee6ed-8554-44e0-928f-4a1a7e4f09f3`
- **Shipping Address:** Default address exists

### Test Transaction (for webhook simulation):
- **Transaction ID:** `38414099-c5c3-4694-87db-f5fd5146ad58` (already created)
- **Status:** `pending`
- **Medusa Order ID:** `NULL` (will be set after webhook simulation)

---

## Test 1: createOrderFromSale() Service Method

### Endpoint:
```
POST http://localhost:3000/api/test/create-order-sale
```

### Request Body:
```json
{
  "listingId": "e203ac85-196d-4aa3-9070-caaea6db4040",
  "buyerId": "user_367ePcSlUHD6VCZDZ2UzEEDytOd",
  "shippingMethodName": "Eurosender Standard",
  "shippingCost": 1500
}
```

### Expected Response:
```json
{
  "success": true,
  "order": {
    "id": "order_xxx",
    "status": "pending",
    "customer_id": "24fee6ed-8554-44e0-928f-4a1a7e4f09f3",
    "items": [...],
    "shipping_address": {...},
    "shipping_method": "Eurosender Standard",
    "shipping_cost": 1500,
    "totals": {
      "subtotal": 10000,
      "shipping": 1500,
      "total": 11500
    }
  },
  "message": "Order created successfully"
}
```

### Verification:
```sql
-- Check order created in Medusa
SELECT id, customer_id, status, currency_code, email, metadata
FROM medusa.order
WHERE id = 'order_xxx';

-- Check shipping address
SELECT * FROM medusa.order_address
WHERE id = (SELECT shipping_address_id FROM medusa.order WHERE id = 'order_xxx');
```

---

## Test 2: createOrderFromAuction() Service Method

### Endpoint:
```
POST http://localhost:3000/api/test/create-order-auction
```

### Request Body:
```json
{
  "auctionId": "auction-id-here",
  "buyerId": "user_367ePcSlUHD6VCZDZ2UzEEDytOd",
  "shippingMethodName": "Eurosender Standard",
  "shippingCost": 1500
}
```

**Note:** Requires auction with `winner_id` and `current_bid` set.

---

## Test 3: Webhook Simulation

### Endpoint:
```
POST http://localhost:3000/api/test/webhook-simulation
```

### Request Body:
```json
{
  "transactionId": "transaction-id-here"
}
```

### Steps:
1. Opret test transaction (se SQL nedenfor)
2. Send POST request til endpoint
3. Verificer at order oprettes og transaction opdateres

### Expected Response:
```json
{
  "success": true,
  "order": {
    "id": "order_xxx",
    ...
  },
  "transactionUpdated": true,
  "message": "Order created and transaction updated successfully"
}
```

### Verification:
```sql
-- Check transaction updated
SELECT id, status, medusa_order_id
FROM transactions
WHERE id = 'transaction-id-here';

-- Check order created
SELECT id, customer_id, status, metadata
FROM medusa.order
WHERE id = (SELECT medusa_order_id FROM transactions WHERE id = 'transaction-id-here');
```

---

## Test 4: Idempotency Test

### Steps:
1. Send webhook simulation request første gang → Order oprettes
2. Send samme request igen → Should return "Order already exists"

### Expected Response (second call):
```json
{
  "success": true,
  "message": "Order already exists (idempotency check)",
  "orderId": "order_xxx",
  "skipped": true
}
```

---

## Test 5: Missing Shipping Address (Graceful Failure)

### Steps:
1. Opret transaction med buyer UDEN default shipping address
2. Send webhook simulation request

### Expected Response:
```json
{
  "success": false,
  "error": "Shipping address not found",
  "note": "This is non-blocking in real webhook - transaction would still be marked as completed"
}
```

**Note:** I rigtig webhook, ville dette logge warning men stadig returnere 200.

---

## SQL Setup Commands

### Create Test Transaction:
```sql
INSERT INTO transactions (
  id,
  buyer_id,
  seller_id,
  listing_id,
  listing_type,
  status,
  amount,
  shipping_amount,
  item_amount,
  total_amount,
  currency,
  medusa_order_id
) VALUES (
  gen_random_uuid(),
  'user_367ePcSlUHD6VCZDZ2UzEEDytOd',
  (SELECT seller_id FROM sale_listings WHERE id = 'e203ac85-196d-4aa3-9070-caaea6db4040' LIMIT 1),
  'e203ac85-196d-4aa3-9070-caaea6db4040',
  'sale',
  'pending',
  11500,
  1500,
  10000,
  11500,
  'EUR',
  NULL
)
RETURNING id;
```

---

## Quick Test Commands

### Automated Test Script:
```bash
# Run all tests
./scripts/test-phase3-runtime.sh

# With custom test data
LISTING_ID="your-listing-id" BUYER_ID="your-buyer-id" ./scripts/test-phase3-runtime.sh

# With transaction ID for webhook test
TRANSACTION_ID="your-transaction-id" ./scripts/test-phase3-runtime.sh
```

### Manual Test Commands:

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

#### Test 3: Webhook Simulation
```bash
# First, get transaction ID from SQL query above
curl -X POST http://localhost:3000/api/test/webhook-simulation \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "38414099-c5c3-4694-87db-f5fd5146ad58"
  }'
```

---

## Success Criteria

- [ ] Test 1: createOrderFromSale() creates order successfully
- [ ] Test 2: createOrderFromAuction() creates order successfully
- [ ] Test 3: Webhook simulation creates order and updates transaction
- [ ] Test 4: Idempotency works (no duplicate orders)
- [ ] Test 5: Missing shipping address handled gracefully

---

## Troubleshooting

### Server not running?
```bash
cd apps/web
npm run dev
```

### Type errors?
```bash
cd apps/web
npm run typecheck
```

### Database connection errors?
- Check `.env.local` has correct Supabase credentials
- Check Supabase project is running

### Clerk errors?
- Check `.env.local` has `CLERK_SECRET_KEY`
- Check buyer ID exists in Clerk

