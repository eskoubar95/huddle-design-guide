# Phase 3 Test Plan - Order Creation Flow

## ⚠️ Vigtigt: Checkout Flow Ikke Implementeret Endnu

**Status:** Phase 3 implementerer order creation, men checkout flow (Phase 5) er ikke implementeret endnu.

**Hvad kan testes NU:**
- ✅ RPC function direkte (SQL)
- ✅ Service metoder direkte (test script/API endpoint)
- ✅ Webhook integration med mock data (simuleret payment event)

**Hvad skal testes SENERE (når checkout flow er implementeret):**
- ⏳ End-to-end flow: Checkout → Payment → Webhook → Order creation
- ⏳ Real Stripe payment → Order creation

---

## Test Setup

### Prerequisites
- ✅ Supabase migration kørt (`fix_create_medusa_order_for_v2`, `update_medusa_order_id_to_text`)
- ✅ Test data: Sale listing, Auction, Transaction (mock), Shipping address
- ✅ Stripe test mode konfigureret (for webhook simulation)
- ✅ Clerk test user med complete profile

---

## Test 1: RPC Function - Direct Order Creation

**Mål:** Verificer at `create_medusa_order()` RPC function virker med Medusa v2 struktur

### Steps:
1. Åbn Supabase SQL Editor
2. Kør test query:

```sql
-- Test create_medusa_order RPC function
SELECT public.create_medusa_order(
  p_product_id := 'prod_test123', -- Eksisterende Medusa product ID
  p_customer_id := 'cus_test123', -- Eksisterende Medusa customer ID
  p_shipping_address := '{
    "street": "Testvej 123",
    "city": "København",
    "postal_code": "2100",
    "country": "DK",
    "state": null,
    "address_line2": null,
    "phone": "+4512345678",
    "full_name": "Test User"
  }'::jsonb,
  p_shipping_method_name := 'Eurosender Standard',
  p_shipping_cost := 1500, -- 15.00 EUR i cents
  p_subtotal := 5000, -- 50.00 EUR i cents
  p_total := 6500, -- 65.00 EUR i cents
  p_email := 'test@example.com',
  p_currency_code := 'EUR'
);
```

### Expected Results:
- ✅ Function returnerer TEXT ID (format: `order_xxx`)
- ✅ Order oprettet i `medusa.order` tabel
- ✅ Shipping address oprettet i `medusa.order_address` tabel
- ✅ Order item og line item oprettet korrekt
- ✅ Metadata indeholder shipping_method og shipping_cost

### Verification Queries:
```sql
-- Check order created
SELECT id, customer_id, status, currency_code, email, shipping_address_id, metadata
FROM medusa.order
WHERE id = 'order_xxx'; -- Replace with returned ID

-- Check shipping address
SELECT id, first_name, last_name, address_1, city, country_code, postal_code
FROM medusa.order_address
WHERE id = (SELECT shipping_address_id FROM medusa.order WHERE id = 'order_xxx');

-- Check order line item
SELECT id, title, product_id, variant_id, unit_price
FROM medusa.order_line_item
WHERE totals_id IN (
  SELECT id FROM medusa.order_item WHERE order_id = 'order_xxx'
);
```

---

## Test 2: Service Method - createOrderFromSale()

**Mål:** Verificer at `MedusaOrderService.createOrderFromSale()` virker

### Test Data Setup:
1. Opret test sale listing:
   - Jersey med `medusa_product_id` (eller lad service oprette den)
   - Price: 50.00 EUR
2. Opret test buyer:
   - Clerk user med complete profile
   - `medusa_customer_id` i profiles tabel
   - Default shipping address i `shipping_addresses` tabel

### Steps:
1. Åbn Next.js dev server: `npm run dev`
2. Opret test script eller brug API endpoint:

```typescript
// Test script (kan køres i browser console eller API route)
import { MedusaOrderService } from '@/lib/services/medusa-order-service';

const service = new MedusaOrderService();
const order = await service.createOrderFromSale(
  'listing-id-here',
  'buyer-clerk-id-here',
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
  1500 // 15.00 EUR
);
```

### Expected Results:
- ✅ Order oprettet i Medusa
- ✅ `transactions.medusa_order_id` opdateret (hvis transaction eksisterer)
- ✅ Order returnerer med korrekt struktur
- ✅ No errors i Sentry

### Verification:
- Check Supabase: `medusa.order` tabel
- Check Supabase: `transactions.medusa_order_id` (hvis transaction linked)
- Check Sentry: No errors

---

## Test 3: Service Method - createOrderFromAuction()

**Mål:** Verificer at `MedusaOrderService.createOrderFromAuction()` virker

### Test Data Setup:
1. Opret test auction:
   - Jersey med `medusa_product_id`
   - Auction med `winner_id` og `current_bid` sat
2. Opret test buyer (samme som Test 2)

### Steps:
1. Kald `createOrderFromAuction()` med auction ID

### Expected Results:
- ✅ Order oprettet med `current_bid` som item price
- ✅ Metadata indeholder `auction_id` og `winner_id`
- ✅ No errors

---

## Test 4: Stripe Webhook Integration (Mock Data)

**Mål:** Verificer at webhook automatisk opretter order når payment succeeds

**⚠️ Note:** Dette tester webhook integration med mock data. Real checkout flow testes i Phase 5.

### Test Setup:
1. Opret test transaction manuelt i Supabase:
   ```sql
   INSERT INTO transactions (
     id, buyer_id, seller_id, listing_id, listing_type,
     status, shipping_amount, item_amount, total_amount, currency
   ) VALUES (
     gen_random_uuid(),
     'buyer-clerk-id-here', -- Test buyer Clerk ID
     'seller-clerk-id-here', -- Test seller Clerk ID
     'listing-id-here', -- Test sale listing ID
     'sale',
     'pending',
     1500, -- 15.00 EUR shipping
     5000, -- 50.00 EUR item
     6500, -- 65.00 EUR total
     'EUR'
   );
   ```

2. Opret Stripe PaymentIntent mock (eller brug Stripe CLI):
   ```bash
   # Via Stripe CLI - dette simulerer en payment_intent.succeeded event
   stripe trigger payment_intent.succeeded \
     --override payment_intent:metadata[transaction_id]=YOUR_TRANSACTION_ID \
     --override payment_intent:metadata[listing_id]=YOUR_LISTING_ID \
     --override payment_intent:metadata[listing_type]=sale \
     --override payment_intent:amount=6500 \
     --override payment_intent:currency=eur
   ```

### Steps:
1. Send webhook event til `/api/v1/stripe/webhook`
2. Check transaction status

### Expected Results:
- ✅ Transaction status → `completed`
- ✅ `transactions.medusa_order_id` udfyldes med order ID
- ✅ Order oprettet i Medusa
- ✅ Webhook returnerer 200 (selv hvis order creation fejler)

### Verification:
```sql
-- Check transaction updated
SELECT id, status, medusa_order_id, completed_at
FROM transactions
WHERE id = 'transaction-id-here';

-- Check order created
SELECT id, customer_id, status, metadata
FROM medusa.order
WHERE id = (SELECT medusa_order_id FROM transactions WHERE id = 'transaction-id-here');
```

---

## Test 5: Idempotency

**Mål:** Verificer at webhook ikke opretter duplicate orders

### Steps:
1. Kør Test 4 (webhook creates order)
2. Send samme webhook event igen
3. Check at order ikke oprettes igen

### Expected Results:
- ✅ Webhook returnerer 200
- ✅ Ingen ny order oprettet
- ✅ `medusa_order_id` forbliver samme
- ✅ No errors i Sentry

---

## Test 6: Missing Shipping Address (Graceful Failure)

**Mål:** Verificer at webhook håndterer missing shipping address gracefully

### Test Setup:
1. Opret transaction med buyer der IKKE har default shipping address
2. Send `payment_intent.succeeded` webhook

### Expected Results:
- ✅ Webhook returnerer 200 (non-blocking)
- ✅ Warning logged i Sentry (ikke error)
- ✅ Transaction status → `completed` (payment succeeded)
- ✅ `medusa_order_id` forbliver NULL (order ikke oprettet)
- ✅ No crash/exception

### Verification:
- Check Sentry: Warning message "Shipping address not found for order creation"
- Check transaction: Status = `completed`, `medusa_order_id` = NULL

---

## Test 7: Missing Medusa Customer ID

**Mål:** Verificer error handling når buyer mangler `medusa_customer_id`

### Test Setup:
1. Opret buyer profile UDEN `medusa_customer_id`
2. Send webhook

### Expected Results:
- ✅ Error logged i Sentry (non-blocking)
- ✅ Webhook returnerer 200
- ✅ Transaction → `completed`
- ✅ Order IKKE oprettet

---

## Test 8: Auction Order Creation

**Mål:** Verificer order creation fra auction via webhook

### Test Setup:
1. Opret auction transaction:
   - `listing_type`: `auction`
   - `listing_id`: Auction ID
   - Auction har `winner_id` og `current_bid` sat
2. Send webhook

### Expected Results:
- ✅ Order oprettet med `current_bid` som item price
- ✅ Metadata indeholder `auction_id` og `winner_id`
- ✅ Shipping address håndteres korrekt

---

## Success Criteria Checklist (Phase 3 - Pre-Checkout)

**Kan testes NU:**
- [ ] RPC function virker med Medusa v2 struktur (Test 1)
- [ ] `createOrderFromSale()` opretter order korrekt (Test 2)
- [ ] `createOrderFromAuction()` opretter order korrekt (Test 3)
- [ ] Webhook opretter order automatisk ved mock payment success (Test 4)
- [ ] Idempotency virker (ingen duplicate orders) (Test 5)
- [ ] Missing shipping address håndteres gracefully (Test 6)
- [ ] Missing customer ID håndteres gracefully (Test 7)
- [ ] All errors logged til Sentry (no PII)
- [ ] Webhook returnerer 200 selv ved non-critical errors

**Skal testes SENERE (Phase 5 - Checkout Flow):**
- [ ] End-to-end: Checkout → Payment → Webhook → Order creation
- [ ] Real Stripe payment flow
- [ ] Shipping method selection i checkout
- [ ] Shipping cost calculation i checkout

---

## Troubleshooting

### Order ikke oprettet?
1. Check Sentry for errors
2. Check transaction: Har buyer default shipping address?
3. Check buyer profile: Har `medusa_customer_id`?
4. Check Medusa product: Eksisterer den?

### Type errors?
1. Check at `medusa_order_id` er TEXT (ikke UUID)
2. Check at RPC function bruger TEXT IDs
3. Run `npm run typecheck` i `apps/web`

### Webhook fejler?
1. Check Stripe webhook secret
2. Check webhook signature verification
3. Check Sentry for detailed errors

