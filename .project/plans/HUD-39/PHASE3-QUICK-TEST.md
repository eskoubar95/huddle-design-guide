# Phase 3 Quick Test Guide

## ⚠️ Checkout Flow Ikke Implementeret

Vi kan teste order creation **uden** checkout flow ved at:
1. Teste RPC function direkte (SQL)
2. Teste service metoder direkte (test script)
3. Simulere webhook med mock data

---

## Quick Test 1: RPC Function (5 minutter)

**Test at order creation virker direkte:**

```sql
-- 1. Først, opret test product og customer (hvis ikke eksisterer)
-- Product:
INSERT INTO medusa.product (id, title, created_at, updated_at)
VALUES ('prod_test123', 'Test Jersey', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Variant:
INSERT INTO medusa.product_variant (id, product_id, title, created_at, updated_at)
VALUES ('variant_test123', 'prod_test123', 'Default', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Customer:
INSERT INTO medusa.customer (id, email, created_at, updated_at)
VALUES ('cus_test123', 'test@example.com', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 2. Test create_medusa_order RPC function
SELECT public.create_medusa_order(
  p_product_id := 'prod_test123',
  p_customer_id := 'cus_test123',
  p_shipping_address := '{
    "street": "Testvej 123",
    "city": "København",
    "postal_code": "2100",
    "country": "DK",
    "phone": "+4512345678",
    "full_name": "Test User"
  }'::jsonb,
  p_shipping_method_name := 'Eurosender Standard',
  p_shipping_cost := 1500,
  p_subtotal := 5000,
  p_total := 6500,
  p_email := 'test@example.com',
  p_currency_code := 'EUR'
) AS order_id;

-- 3. Verificer order oprettet
SELECT id, customer_id, status, currency_code, email, metadata
FROM medusa.order
WHERE id = 'order_xxx'; -- Replace with returned ID
```

**Expected:** Function returnerer TEXT ID, order oprettet i Medusa.

---

## Quick Test 2: Service Method (10 minutter)

**Test at `createOrderFromSale()` virker:**

### Setup:
1. Opret test sale listing i Supabase:
   ```sql
   INSERT INTO sale_listings (id, jersey_id, seller_id, price, status)
   VALUES (
     gen_random_uuid(),
     'jersey-id-here', -- Eksisterende jersey ID
     'seller-clerk-id-here', -- Test seller Clerk ID
     50.00,
     'active'
   );
   ```

2. Opret test buyer med:
   - Clerk user
   - Profile med `medusa_customer_id`
   - Default shipping address

### Test:
Opret test API endpoint eller kør direkte i Node.js:

```typescript
// apps/web/app/api/test/create-order/route.ts
import { MedusaOrderService } from '@/lib/services/medusa-order-service';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createServiceClient();
  const service = new MedusaOrderService();

  // Test data
  const listingId = 'your-listing-id';
  const buyerId = 'your-buyer-clerk-id';

  try {
    const order = await service.createOrderFromSale(
      listingId,
      buyerId,
      {
        street: 'Testvej 123',
        city: 'København',
        postal_code: '2100',
        country: 'DK',
        phone: '+4512345678',
        first_name: 'Test',
        last_name: 'User',
      },
      'Eurosender Standard',
      1500
    );

    return Response.json({ success: true, order });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
```

**Expected:** Order oprettet, returnerer order object.

---

## Quick Test 3: Webhook Simulation (15 minutter)

**Test at webhook opretter order automatisk:**

### Setup:
1. Opret test transaction:
   ```sql
   INSERT INTO transactions (
     id, buyer_id, seller_id, listing_id, listing_type,
     status, shipping_amount, item_amount, total_amount, currency
   ) VALUES (
     gen_random_uuid(),
     'buyer-clerk-id', -- Test buyer med medusa_customer_id og shipping address
     'seller-clerk-id',
     'listing-id', -- Test sale listing
     'sale',
     'pending',
     1500, -- Shipping cost
     5000, -- Item price
     6500, -- Total
     'EUR'
   );
   ```

2. Send mock webhook event:

**Option A: Via Stripe CLI:**
```bash
stripe trigger payment_intent.succeeded \
  --override payment_intent:metadata[transaction_id]=YOUR_TRANSACTION_ID \
  --override payment_intent:metadata[listing_id]=YOUR_LISTING_ID \
  --override payment_intent:metadata[listing_type]=sale \
  --override payment_intent:amount=6500 \
  --override payment_intent:currency=eur
```

**Option B: Via curl (mock request):**
```bash
curl -X POST http://localhost:3000/api/v1/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "amount": 6500,
        "currency": "eur",
        "metadata": {
          "transaction_id": "YOUR_TRANSACTION_ID",
          "listing_id": "YOUR_LISTING_ID",
          "listing_type": "sale"
        }
      }
    }
  }'
```

**Note:** Webhook signature verification vil fejle med mock data. For rigtig test, brug Stripe CLI.

### Verification:
```sql
-- Check transaction updated
SELECT id, status, medusa_order_id, completed_at
FROM transactions
WHERE id = 'YOUR_TRANSACTION_ID';

-- Check order created
SELECT id, customer_id, status, metadata
FROM medusa.order
WHERE id = (SELECT medusa_order_id FROM transactions WHERE id = 'YOUR_TRANSACTION_ID');
```

**Expected:** 
- Transaction status → `completed`
- `medusa_order_id` udfyldes
- Order oprettet i Medusa

---

## Hvad Sker Der Når Checkout Flow Er Implementeret?

Når checkout flow (Phase 5) er implementeret, vil flowet være:

1. **Buyer går til checkout** → Vælger shipping method
2. **Checkout opretter transaction** → Status: `pending`
3. **Stripe PaymentIntent oprettes** → Med transaction_id i metadata
4. **Buyer betaler** → Stripe håndterer payment
5. **Stripe sender webhook** → `payment_intent.succeeded`
6. **Webhook opretter order** → Automatisk (Phase 3 kode)
7. **Order linked til transaction** → Via `medusa_order_id`

**Phase 3 kode vil automatisk virke** når checkout flow er implementeret - ingen ændringer nødvendige!

---

## Summary

**Kan testes NU:**
- ✅ RPC function (SQL)
- ✅ Service metoder (test script)
- ✅ Webhook integration (mock data)

**Skal testes SENERE:**
- ⏳ End-to-end checkout flow (Phase 5)
- ⏳ Real Stripe payment → Order creation

**Phase 3 er klar** - koden vil automatisk virke når checkout flow er implementeret!

