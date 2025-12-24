# HUD-39 – Medusa Order Integration for Marketplace

## Overview
Integrer Medusa som ordre-motor i checkout-flowet for både sale listings og auktioner, så betalinger fra Stripe kobles til Medusa-ordrer, shipping og dashboards for køber/sælger.

## Linear Issue
**Issue:** HUD-39 — [Feature] Medusa Order Integration for Marketplace  
**Status:** In Progress  
**Branch (foreslået):** `feature/huddle-39-medusa-order-integration`

## Current State Analysis
- Medusa kører i `apps/medusa/` med eget schema (`medusa`) og regions/shipping data tilgængeligt via direkte SQL (`MedusaShippingService`).
- **⚠️ KRITISK: Medusa shipping profiles/metoder er IKKE konfigureret** - Medusa har regions og shipping moduler, men ingen aktive shipping options/profiles sat op.
- Customer sync findes via Supabase RPC (`MedusaCustomerService`), trigges i `lib/auth.ts`; `profiles.medusa_customer_id` eksisterer.
- Shipping: `ShippingService` med **Eurosender API direkte** (HUD-36) - IKKE via Medusa shipping system; shipping labels via `ShippingLabelService` (HUD-42).
- **Tracking**: Gemmes i `shipping_labels` tabel (`tracking_number` field) - kan komme fra Eurosender API (automatisk) ELLER manuel input fra seller.
- Payments: Stripe integration + webhooks (`app/api/v1/stripe/webhook/route.ts`) opdaterer `transactions` til `completed`; Payouts styres i `PayoutService` når ordre er leveret (HUD-38).
- Data: `jerseys.medusa_product_id` og `sale_listings.medusa_product_id` findes (nullable); `transactions` har fee-felter men mangler `medusa_order_id`.
- Ingen `MedusaOrderService`, ingen Medusa produkt-/ordre-oprettelse i checkout, ingen ordre-API eller UI.

### Key Discoveries (references)
- Stripe webhook flow og transaction updates: `apps/web/app/api/v1/stripe/webhook/route.ts`
- Shipping regions/options (Medusa via SQL): `apps/web/lib/services/medusa-shipping-service.ts`
- Shipping calc API og Eurosender integration: `apps/web/lib/services/shipping-service.ts`, `apps/web/app/api/v1/shipping/calculate/route.ts`
- Payout scheduling hook (afventer delivered): `apps/web/lib/services/payout-service.ts`
- Customer sync via Supabase RPC: `apps/web/lib/services/medusa-customer-service.ts`

## Desired End State
- Medusa ordre skabes for både sale og auction checkout (produkt oprettet/lazily ensured).
- `transactions.medusa_order_id` linker ordre og betaling; status-synkronisering mellem Stripe webhook → transaction → Medusa order.
- API endpoints til at hente ordre og udføre status-ændringer (ship/complete/cancel) med korrekte auth/rolle-checks.
- UI-sider for ordre-detalje, sælger-ordreoversigt og køber-køb med status-timeline og handlinger.
- Shipping-metode og tracking kobles til Medusa order; payouts trigges når ordre markeres delivered.

## What We're NOT Doing
- Ingen PUDO pickup flow (fortsat deferred pga. PUDO API-issue).
- Ingen ændringer til Medusa backend selv (kun read/insert via SQL eller API), ingen nye Medusa migrations.
- Ingen nye betalingsmetoder eller valutaer (EUR forbliver hardcoded i Stripe-flow).
- Ingen redesign af checkout UI ud over nødvendige hooks for ordreoprettelse.
- **Ingen Medusa shipping configuration** - Vi bruger Eurosender direkte, ikke Medusa shipping options/profiles.
- **Ingen automatisk shipping label generation** - Det håndteres i HUD-42 (ShippingLabelService). Vi linker bare tracking info til Medusa orders.

## Implementation Approach

### Core Decisions (Afklaret via Codebase Research)

**1. Medusa API vs SQL/RPC Pattern:**
- ✅ **Anbefaling: Start med SQL/RPC pattern** (konsistent med eksisterende codebase)
- Rationale: `MedusaCustomerService` bruger Supabase RPC (`create_medusa_customer`), `MedusaShippingService` bruger direkte SQL queries. Medusa API auth er ustabil (dokumenteret i `medusa-customer-service.ts`).
- Implementation: Opret Supabase RPC functions for order creation (ligesom `create_medusa_customer`), eller brug direkte SQL INSERTs mod `medusa.order` tabel.
- Future: Evaluer Admin API når auth er stabiliseret, men SQL/RPC er primary pattern.

**2. Product Creation Timing:**
- ✅ **Anbefaling: Async ved listing create** (ikke lazy ved checkout)
- Rationale: 
  - Tidligere validation (product oprettes før checkout)
  - Bedre UX (fejl opdages tidligt)
  - Konsistent med dokumentation (`.project/04-Database_Schema.md` linje 307: "Create Medusa product via Medusa API" ved listing creation)
- Implementation: Integrer `ensureMedusaProduct()` i `ListingService.createListing()` og `AuctionService.createAuction()` (async, non-blocking).
- Fallback: Hvis product mangler ved checkout (edge case), lazy-create som fallback.

**3. Status Navn for Payout:**
- ✅ **Afklaret: `delivered`** (ikke `completed`)
- Rationale: `PayoutService.schedulePayout()` kræver eksplicit `orderStatus === "delivered"` (linje 26 i `payout-service.ts`). Dette er kontrakt.
- Implementation: Når Medusa order status ændres til `delivered`, kald `PayoutService.schedulePayout(transactionId, "delivered")`.

**4. Stripe Connect Integration:**
- ✅ **Allerede integreret korrekt**
- Rationale: `StripeService.createPaymentIntent()` bruger allerede `sellerAccount.stripe_account_id` fra `stripe_accounts` tabel (linje 141). Payment Intent har `transfer_data.destination` sat korrekt.
- Ingen ændringer nødvendige - Stripe Connect spiller allerede sammen med Payment Intents.

**5. Validation Strategy:**
- ✅ **Backend validation er primary** (Zod schemas i API routes)
- Rationale: Codebase bruger Zod validation i alle API routes (`saleListingCreateSchema`, `bidCreateSchema`, etc.). Frontend validation er UX enhancement, ikke security.
- Implementation: Valider alle inputs i API routes med Zod; frontend validering er optional men anbefalet.

**6. Products Ikke Registreret i Medusa:**
- ✅ **Håndteres via `ensureMedusaProduct()` helper**
- Rationale: `jerseys.medusa_product_id` og `sale_listings.medusa_product_id` er nullable. Vi skal sikre product eksisterer før order creation.
- Implementation: `ensureMedusaProduct()` checker om product eksisterer, opretter hvis mangler, returnerer `medusa_product_id`. Idempotent operation.

**7. Shipping Integration (KRITISK):**
- ✅ **Medusa shipping er IKKE konfigureret** - Vi bruger Eurosender API direkte
- Rationale: Medusa har regions og shipping moduler, men ingen aktive shipping profiles/options sat op. Vi kan IKKE bruge Medusa shipping options.
- Implementation:
  - Shipping method kommer fra **Eurosender** (via `ShippingService.calculateShipping()`) ELLER **manuel input** fra seller
  - Shipping cost kommer fra Eurosender quote ELLER manuel input
  - Tracking number gemmes i `shipping_labels` tabel (`tracking_number` field)
  - **Tracking skal også gemmes i Medusa order** (via metadata eller custom field) så det er synligt i Medusa Admin
- Order creation: Gem shipping method name (fx "Eurosender Standard") og cost i Medusa order, IKKE shipping option ID (da de ikke eksisterer).

### Technical Patterns

- Brug direkte SQL/Supabase RPC mod `medusa` schema (samme mønster som `MedusaShippingService` / `MedusaCustomerService`) for stabil auth.
- **Async product creation ved listing create** (ikke lazy ved checkout) - integrer i `ListingService` og `AuctionService`.
- Webhook-drevet ordreoprettelse efter Stripe payment success for konsistens og idempotency.
- Transaction er kilden for payout-berettigelse; ordrestatus `delivered` driver `PayoutService.schedulePayout()`.
- API-ruter i Next.js App Router med `requireAuth` + rolle-checks (seller/buyer/admin) og rate limiting.
- Backend validation (Zod) er primary; frontend validation er UX enhancement.
- **Shipping: Bruger Eurosender direkte, IKKE Medusa shipping** - shipping method/cost gemmes som tekst/metadata i Medusa order.
- **Tracking: Gemmes både i `shipping_labels` tabel OG i Medusa order metadata** - så det er synligt i både Huddle og Medusa Admin.

## Plan / Phases

### Phase 1 — Foundations & Data Link

#### 1.1 Database Migration
**File:** `supabase/migrations/XXXXX_add_medusa_order_id_to_transactions.sql`

**Changes:**
```sql
-- Add Medusa order ID to transactions table
-- Links Huddle transactions to Medusa orders for order management
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS medusa_order_id UUID NULL;

-- Index for lookups (orders → transactions)
CREATE INDEX IF NOT EXISTS idx_transactions_medusa_order_id 
  ON public.transactions(medusa_order_id) 
  WHERE medusa_order_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN public.transactions.medusa_order_id IS 
  'Reference til medusa.order.id. Oprettes når Medusa order skabes efter Stripe payment success.';
```

**Rationale:** Links transactions til Medusa orders for order management og status tracking.

#### 1.2 Supabase RPC Functions for Medusa Order Creation
**File:** `supabase/migrations/XXXXX_create_medusa_order_rpc_functions.sql`

**Pattern:** Følg samme mønster som `create_medusa_customer` RPC function.

**Functions to create:**
- `create_medusa_product(jersey_id, sale_listing_id, price_cents, currency, title, description)` → returns `medusa_product_id`
- `create_medusa_order(product_id, customer_id, shipping_address, shipping_method_name, shipping_cost, totals, metadata)` → returns `medusa_order_id`
  - `shipping_method_name`: TEXT (fx "Eurosender Standard") - IKKE shipping option ID
  - `shipping_cost`: INTEGER (i minor units/cents)
  - `metadata`: JSONB (for tracking number, shipping provider, etc.)
- `update_medusa_order_status(order_id, status)` → void
- `update_medusa_order_tracking(order_id, tracking_number, shipping_provider)` → void

**Rationale:** SQL/RPC pattern er stabil og konsistent med eksisterende codebase. Undgår Medusa API auth issues. Shipping gemmes som tekst/metadata da Medusa shipping ikke er konfigureret.

#### 1.3 Service Skeleton
**File:** `apps/web/lib/services/medusa-order-service.ts`

**Methods:**
- `ensureMedusaProduct(jerseyId | saleListingId): Promise<string>` - Opretter/getter Medusa product, returnerer `medusa_product_id`
- `createOrderFromSale(listingId, buyerId, shippingAddress, shippingMethodName, shippingCost): Promise<MedusaOrder>`
- `createOrderFromAuction(auctionId, buyerId, shippingAddress, shippingMethodName, shippingCost): Promise<MedusaOrder>`
- `getOrder(orderId): Promise<MedusaOrder>`
- `updateOrderStatus(orderId, status): Promise<void>`
- `cancelOrder(orderId): Promise<void>`
- `updateTrackingNumber(orderId, trackingNumber, shippingProvider): Promise<void>` - Opdater tracking i Medusa order metadata

**Note:** Shipping method er tekst (fx "Eurosender Standard") og cost er number - IKKE Medusa shipping option ID (da shipping ikke er konfigureret i Medusa).

**Implementation Pattern:**
- Brug Supabase RPC functions (fra Phase 1.2) eller direkte SQL INSERTs mod `medusa.order` tabel
- Følg samme error handling pattern som `MedusaCustomerService` og `MedusaShippingService`
- Idempotency checks (check om order allerede eksisterer før oprettelse)

**Types:**
```typescript
export interface MedusaOrder {
  id: string;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  customer_id: string;
  items: Array<{ product_id: string; quantity: number; price: number }>;
  shipping_address: ShippingAddress;
  totals: { subtotal: number; shipping: number; total: number };
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
```

**Config:**
- Base URL: `MEDUSA_API_URL` (default `http://localhost:9000`) - kun hvis Admin API bruges senere
- Admin token: `MEDUSA_ADMIN_TOKEN` (optional, fallback til SQL/RPC)

**Success criteria:**
- [ ] Migration runs locally (adds column + index).
- [ ] RPC functions created and testable via Supabase SQL editor.
- [ ] Service compiles, exported methods stubbed with proper types.
- [ ] `ensureMedusaProduct()` implemented (checks existing, creates if missing, returns ID).
- [ ] No lint/type errors.
- **Pause for review** før Phase 2.

### Phase 2 — Product Creation Integration (Async ved Listing Create) ✅

#### 2.1 Integrer Product Creation i ListingService ✅
**File:** `apps/web/lib/services/listing-service.ts`

**Changes:**
- ✅ Efter `repository.create()` i `createListing()`:
  - ✅ Kald `MedusaOrderService.ensureMedusaProduct(undefined, saleListingId)` (async, non-blocking)
  - ✅ `ensureMedusaProduct` opdaterer `sale_listings.medusa_product_id` automatisk
  - ✅ Log errors til Sentry men throw ikke (listing creation skal ikke fejle pga. Medusa)

**Rationale:** Product oprettes tidligt, ikke ved checkout. Bedre UX og validation.

**Implementation Status:** ✅ Complete
- Async product creation implementeret i `createListing()` (linje 53-80)
- Fejl håndteres korrekt med Sentry logging
- Listing creation fejler ikke hvis Medusa product creation fejler

#### 2.2 Integrer Product Creation i AuctionService ✅
**File:** `apps/web/lib/services/auction-service.ts`

**Changes:**
- ✅ Efter auction creation:
  - ✅ Kald `MedusaOrderService.ensureMedusaProduct(jerseyId)` (async, non-blocking)
  - ✅ `ensureMedusaProduct` opdaterer `jerseys.medusa_product_id` automatisk
  - ✅ Log errors til Sentry men throw ikke

**Rationale:** Konsistent pattern for både sale listings og auctions.

**Implementation Status:** ✅ Complete
- Async product creation implementeret i `createAuction()` (linje 58-85)
- Fejl håndteres korrekt med Sentry logging
- Auction creation fejler ikke hvis Medusa product creation fejler

### Phase 3 — Order Creation Flow (Stripe Webhook Integration)

#### 3.1 Implement Order Creation Methods
**File:** `apps/web/lib/services/medusa-order-service.ts`

**Methods to implement:**
- `createOrderFromSale(listingId, buyerId, shippingAddress, shippingMethodName, shippingCost): Promise<MedusaOrder>`
  - Hent sale listing + jersey data
  - Ensure Medusa product (fallback hvis ikke oprettet ved listing create)
  - Hent buyer's `medusa_customer_id` fra `profiles` tabel
  - **Shipping**: Brug `shippingMethodName` (tekst, fx "Eurosender Standard") og `shippingCost` (number i cents)
  - Kald RPC function `create_medusa_order()` eller direkte SQL INSERT
  - Gem shipping method name og cost i Medusa order (som tekst/metadata, IKKE shipping option ID)
  - Returner order med ID
  
- `createOrderFromAuction(auctionId, buyerId, shippingAddress, shippingMethodName, shippingCost): Promise<MedusaOrder>`
  - Samme pattern som sale, men hent fra auction + jersey

**Shipping Address Mapping:**
- Map `shipping_addresses` format til Medusa order shipping address format
- Hent fra `shipping_addresses` tabel (default address) eller fra checkout form
- Format: `{ street, city, postal_code, country, state?, address_line2? }`

**Shipping Method & Cost:**
- **IKKE Medusa shipping options** (de er ikke konfigureret)
- Shipping method kommer fra:
  - Eurosender quote (via `ShippingService.calculateShipping()`) → `shippingOption.name` (fx "Eurosender Standard")
  - Manuel input fra seller → tekst string
- Shipping cost kommer fra:
  - Eurosender quote → `shippingOption.price` (i cents)
  - Manuel input → number i cents
- Gem begge i Medusa order metadata: `{ shipping_method: "Eurosender Standard", shipping_cost: 1500 }`

#### 3.2 Integrer i Stripe Webhook
**File:** `apps/web/app/api/v1/stripe/webhook/route.ts`

**Changes:**
- Efter transaction status → `completed` (linje 270-280):
  - Check om `transaction.medusa_order_id` allerede eksisterer (idempotency)
  - Hvis ikke: Hent shipping address fra `shipping_addresses` tabel (buyer's default) eller fra payment intent metadata
  - Kald `MedusaOrderService.createOrderFromSale()` eller `createOrderFromAuction()` baseret på `listing_type`
  - Opdater `transactions.medusa_order_id` med order ID
  - Log warnings hvis shipping address mangler (non-blocking)

**Idempotency:**
```typescript
// Check if order already exists
if (transaction.medusa_order_id) {
  // Order already created - skip
  return;
}

// Create order
const order = await medusaOrderService.createOrderFromSale(...);
await supabase
  .from('transactions')
  .update({ medusa_order_id: order.id })
  .eq('id', transactionId);
```

**Error Handling:**
- Non-blocking: Log errors til Sentry, webhook returnerer 200 (transaction er allerede completed)
- Allow manual retry via repair endpoint (future)

**Success criteria:**
- [x] RPC function opdateret til Medusa v2 struktur (TEXT IDs, order_address, order_line_item).
- [x] `createOrderFromSale()` og `createOrderFromAuction()` implementeret.
- [x] Webhook creates Medusa order once per transaction (idempotent).
- [x] `transactions.medusa_order_id` udfyldes korrekt.
- [x] Shipping address håndteres korrekt (hent fra `shipping_addresses` tabel).
- [x] Graceful errors → Sentry, no PII; webhook still 200 unless hard failure.
- [x] Type/lint pass.
- **Pause for review** før Phase 4.

### Phase 4 — Order Status Management & Actions

#### 4.1 Service Methods
**File:** `apps/web/lib/services/medusa-order-service.ts`

**Methods:**
- `getOrder(orderId): Promise<MedusaOrder>` - Hent order fra Medusa (via SQL query eller RPC)
- `updateOrderStatus(orderId, status): Promise<void>` - Opdater order status (via RPC eller SQL UPDATE)
- `cancelOrder(orderId): Promise<void>` - Cancel order (set status til `cancelled`)
- `updateTrackingNumber(orderId, trackingNumber, shippingProvider): Promise<void>` - Opdater tracking i Medusa order metadata

**Status Transition Validation:**
```typescript
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'pending': ['paid', 'cancelled'],
  'paid': ['shipped', 'cancelled'],
  'shipped': ['completed', 'cancelled'],
  'completed': [], // Terminal state
  'cancelled': [], // Terminal state
};
```

**Rationale:** Valider status transitions for at undgå invalid state changes.

#### 4.2 API Routes
**Files:**
- `apps/web/app/api/v1/orders/[orderId]/route.ts` (GET, PATCH)
- `apps/web/app/api/v1/orders/[orderId]/ship/route.ts` (POST)
- `apps/web/app/api/v1/orders/[orderId]/complete/route.ts` (POST)
- `apps/web/app/api/v1/orders/[orderId]/cancel/route.ts` (POST)

**GET /api/v1/orders/[orderId]:**
- Hent order fra Medusa via `MedusaOrderService.getOrder()`
- Hent transaction data fra `transactions` tabel (for price breakdown, fees)
- Combine data: Medusa order + Huddle transaction data
- Auth: `requireAuth()` - buyer, seller eller admin kan se

**PATCH /api/v1/orders/[orderId]/status:**
- Body: `{ status: OrderStatus }`
- Validate status transition
- Update via `MedusaOrderService.updateOrderStatus()`
- Auth: Seller (must own listing) eller admin only

**POST /api/v1/orders/[orderId]/ship:**
- Body: `{ trackingNumber: string, shippingProvider: string }`
- Update order status til `shipped`
- **Store tracking info i BÅDE:**
  - `shipping_labels` tabel (hvis label eksisterer, opdater `tracking_number` - hvis ikke, opret ikke ny label)
  - Medusa order metadata (opdater `metadata.tracking_number` og `metadata.shipping_provider`)
- **Rationale:** 
  - Tracking skal være synligt i både Huddle (`shipping_labels`) og Medusa Admin (order metadata)
  - Seller kan indsætte tracking manuelt (alternativ til automatisk via Eurosender)
  - Hvis shipping label allerede eksisterer (fra Eurosender), opdater den; hvis ikke, gem kun i Medusa metadata
- **Validation:**
  - `trackingNumber`: Required, min 1 character
  - `shippingProvider`: Required, min 1 character (fx "Eurosender", "DHL", "PostNord", etc.)
- Auth: Seller (must own listing) only

**POST /api/v1/orders/[orderId]/complete:**
- Update order status til `completed`
- Auth: Buyer (must match `transaction.buyer_id`) only

**POST /api/v1/orders/[orderId]/cancel:**
- Update order status til `cancelled`
- Auth: Buyer (before shipped), Seller (before completed), eller admin

**Authorization Logic:**
```typescript
// Get transaction to check ownership
const transaction = await getTransactionByOrderId(orderId);
if (!transaction) throw new ApiError('NOT_FOUND', 'Order not found', 404);

// Check seller ownership
if (action === 'ship' || action === 'update_status') {
  if (userId !== transaction.seller_id && !isAdmin) {
    throw new ApiError('FORBIDDEN', 'Only seller can perform this action', 403);
  }
}

// Check buyer ownership
if (action === 'complete' || action === 'cancel') {
  if (userId !== transaction.buyer_id && userId !== transaction.seller_id && !isAdmin) {
    throw new ApiError('FORBIDDEN', 'Only buyer or seller can perform this action', 403);
  }
}
```

#### 4.3 Payout Integration
**File:** `apps/web/lib/services/medusa-order-service.ts`

**Changes:**
- I `updateOrderStatus()`: Når status ændres til `delivered`, kald `PayoutService.schedulePayout()`
- Hent `transactionId` fra order (via `transactions.medusa_order_id` lookup)

**Helper Method:**
```typescript
// Add to MedusaOrderService
private async getTransactionByOrderId(orderId: string): Promise<{ id: string } | null> {
  const supabase = await createServiceClient();
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id')
    .eq('medusa_order_id', orderId)
    .single();
  return transaction || null;
}
```

**Payout Integration:**
```typescript
async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  // ... update order status ...
  
  if (status === 'delivered') {
    // Get transaction ID
    const transaction = await this.getTransactionByOrderId(orderId);
    if (transaction) {
      const payoutService = new PayoutService();
      await payoutService.schedulePayout(transaction.id, 'delivered');
    }
  }
}
```

**Rationale:** Payout trigges automatisk når order markeres som delivered (kontrakt fra HUD-38).

**Success criteria:**
- [x] All endpoints return 2xx med korrekt auth checks.
- [x] Status transitions validated; invalid → 400.
- [x] Payout invoked on `delivered` status (ikke `completed`).
- [x] Sentry breadcrumbs for status changes, no PII.
- [x] Authorization logic implemented (buyer/seller/admin rules).
- **Pause for review** før Phase 5.

### Phase 5 — Frontend Order Management

#### 5.1 Order Detail Page
**File:** `apps/web/app/(dashboard)/orders/[orderId]/page.tsx`

**Features:**
- **Order Summary:**
  - Jersey info (images, title, description)
  - Price breakdown:
    - Item price (`transaction.item_amount`)
    - Shipping cost (`transaction.shipping_amount`)
    - Platform fee (`transaction.platform_fee_amount`)
    - Seller fee (`transaction.seller_fee_amount`)
    - **Total** (`transaction.total_amount`)
  - Seller payout amount (`transaction.seller_payout_amount`) - kun for seller view
  
- **Medusa Order Link:**
  - Display `transaction.medusa_order_id` (clickable link til Medusa Admin hvis admin)
  - "View in Medusa" button (hvis `MEDUSA_ADMIN_URL` konfigureret)
  - Order creation timestamp (fra Medusa order `created_at`)
  
- **Shipping Information:**
  - Shipping address (fra Medusa order shipping_address)
  - Shipping method (fra Medusa order metadata - tekst, fx "Eurosender Standard")
  - Shipping cost (fra Medusa order metadata eller transaction.shipping_amount)
  - Tracking number (fra BÅDE Medusa order metadata OG shipping_labels.tracking_number)
  - Shipping provider (fra Medusa order metadata.shipping_provider eller shipping_labels)
  - Tracking URL (hvis available fra Eurosender)
  - Label URL (fra shipping_labels.label_url hvis exists)
  
- **Order Status Timeline:**
  - Visual progression: pending → paid → shipped → completed
  - Timestamps for hver transition (fra Medusa order status history)
  - Current status highlighted
  
- **Transaction Details (Huddle):**
  - Transaction ID (`transaction.id`)
  - Stripe Payment Intent ID (`transaction.stripe_payment_intent_id`)
  - Payment date (`transaction.completed_at`)
  - Stripe Transfer ID (`transaction.stripe_transfer_id`) - kun for seller view
  
- **Actions based on role:**
  - Seller: "Mark as Shipped" (med tracking input)
  - Buyer: "Mark as Completed" (når shipped)
  - Both: "Cancel Order" (hvis allowed)

**Data Fetching:**
- Server component: Hent order data fra `/api/v1/orders/[orderId]`
- API endpoint combines:
  - Medusa order data (fra `medusa.order` tabel)
  - Transaction data (fra `transactions` tabel)
  - Jersey data (fra `jerseys` tabel)
  - Shipping label data (fra `shipping_labels` tabel hvis exists)
- Client actions: Status updates via API calls
- Combine: Medusa order data + transaction data (fees, breakdown) + Huddle metadata

**API Response Structure:**
```typescript
interface OrderDetailResponse {
  // Medusa order data
  order: {
    id: string;
    status: OrderStatus;
    created_at: string;
    updated_at: string;
    shipping_address: ShippingAddress;
    shipping_method: ShippingMethod;
    totals: { subtotal: number; shipping: number; total: number };
  };
  
  // Huddle transaction data
  transaction: {
    id: string;
    medusa_order_id: string;
    item_amount: number;
    shipping_amount: number;
    platform_fee_amount: number;
    seller_fee_amount: number;
    seller_payout_amount: number;
    total_amount: number;
    stripe_payment_intent_id: string;
    stripe_transfer_id: string | null;
    completed_at: string;
  };
  
  // Jersey data
  jersey: {
    id: string;
    images: string[];
    club: string;
    season: string;
    // ... other jersey fields
  };
  
  // Shipping label (if exists)
  shippingLabel: {
    tracking_number: string | null;
    label_url: string;
    shipping_provider: string | null;
  } | null;
  
  // Tracking info (from Medusa order metadata OR shipping_labels)
  tracking: {
    number: string | null; // From Medusa metadata.tracking_number OR shipping_labels.tracking_number
    provider: string | null; // From Medusa metadata.shipping_provider
    url: string | null; // From Eurosender tracking URL if available
  };
}
```

**Rationale:** Frontend skal kunne vise både Medusa order data OG Huddle transaction data, så brugere kan se komplet billede af ordren og linke til Medusa hvis nødvendigt.

**Tracking Info Priority:**
1. Hvis `shipping_labels.tracking_number` eksisterer → brug denne (fra Eurosender)
2. Ellers brug `Medusa order metadata.tracking_number` (manuel input)
3. Display både tracking number og provider (fra metadata eller shipping_labels)

**UI Components:**
- Reuse existing UI tokens (buttons, cards, forms)
- `OrderStatusTimeline` component (vis status progression)
- Loading states, error handling, optimistic updates

#### 5.2 Seller Orders Dashboard
**File:** `apps/web/app/(dashboard)/seller/orders/page.tsx`

**Features:**
- List af solgte items (outgoing orders)
- Filter: status (pending, paid, shipped, completed, cancelled)
- Columns: Jersey, Buyer, Price, Status, Actions
- Actions: "Ship Order" (når paid), "Cancel" (hvis allowed)
- **Pagination:** Cursor-based (ligesom andre lists) - default 20 per page

**Data Fetching:**
- Query: `GET /api/v1/orders?sellerId=XXX&status=XXX&cursor=XXX&limit=20`
- Server component med pagination
- **Performance target:** < 2 sec load time (per PRD)

**API Endpoint:**
- `GET /api/v1/orders` - List orders with filters
  - Query params: `sellerId`, `buyerId`, `status`, `cursor`, `limit`
  - Response: `{ items: Order[], nextCursor: string | null }`
  - Auth: `requireAuth()` - user can only see own orders (sellerId eller buyerId match)

#### 5.3 Buyer Purchases Page
**File:** `apps/web/app/(dashboard)/purchases/page.tsx`

**Features:**
- List af købte items (incoming orders)
- Filter: status
- Columns: Jersey, Seller, Price, Status, Actions
- Actions: "Mark as Completed" (når shipped), "Cancel" (hvis allowed)
- **Pagination:** Cursor-based (ligesom andre lists) - default 20 per page

**Data Fetching:**
- Query: `GET /api/v1/orders?buyerId=XXX&status=XXX&cursor=XXX&limit=20`
- Server component med pagination
- **Performance target:** < 2 sec load time (per PRD)

#### 5.4 Order Status Timeline Component
**File:** `apps/web/components/orders/OrderStatusTimeline.tsx`

**Features:**
- Visual timeline af order status
- Icons for hver status
- Current status highlighted
- Timestamps for hver transition

**Props:**
```typescript
interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  statusHistory: Array<{ status: OrderStatus; timestamp: string }>;
}
```

**Success criteria:**
- [x] Pages render med real data fra API (Medusa order + transaction data).
- [x] Actions update status og reflect immediately (optimistic updates).
- [x] Accessible controls (keyboard/focus), loading/error states shown.
- [x] Status timeline viser korrekt progression.
- [x] Authorization: Buyer kan ikke ship, seller kan ikke complete.
- **Pause for review** før Phase 6.

### Phase 6 — Hardening & Testing ✅

#### 6.1 Unit Tests ✅
**Files:**
- `apps/web/lib/services/__tests__/medusa-order-service.test.ts` ✅

**Test Cases (20 tests):**
- ✅ `ensureMedusaProduct()` - creates product if missing, returns existing if present
- ✅ `getOrder()` - returns order with correct structure, 404 for non-existent
- ✅ `updateOrderStatus()` - validates transitions, throws on invalid
- ✅ Status transition validation (ALLOWED_TRANSITIONS verified)
- ✅ Idempotency (multiple calls = same result)
- ✅ Error handling (Sentry integration)

#### 6.2 Integration Tests ✅
**Files:**
- `apps/web/app/api/v1/orders/__tests__/orders.test.ts` ✅

**Test Cases (20 tests):**
- ✅ GET /api/v1/orders - List with filters, pagination
- ✅ GET /api/v1/orders/[orderId] - Order details, 404 handling
- ✅ POST .../ship - Seller/admin role, tracking validation
- ✅ POST .../complete - Buyer role
- ✅ POST .../cancel - Role-based access
- ✅ Authorization checks (buyer/seller/admin rules)
- ✅ Error handling (invalid body, unauthorized, internal errors)

#### 6.3 Migration Verification & Rollback Strategy
- Verify migration runs successfully
- Test rollback (document rollback SQL)
- Verify index performance (query with `medusa_order_id`)

**Rollback SQL:**
```sql
-- Rollback migration: Remove medusa_order_id from transactions
-- WARNING: This will break order management - only use if Phase 1 fails before Phase 3
DROP INDEX IF EXISTS idx_transactions_medusa_order_id;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS medusa_order_id;
```

**Rollback Process:**
1. If Phase 1 fails: Run rollback SQL above
2. If Phase 2-3 fails: Orders may be created in Medusa but not linked - manual cleanup needed
3. If Phase 4+ fails: Orders exist but API/UI broken - disable endpoints via feature flag (future)

**Data Migration Notes:**
- Existing transactions will have `medusa_order_id = NULL` (acceptable)
- No data loss - column is nullable
- Can backfill later if needed (out-of-scope)

#### 6.4 Observability ✅
- ✅ Sentry tags: `component: "medusa_order_service"`, `operation: "create_order"`, etc.
- ✅ No PII in logs (verified: no email/phone/address in extra fields)
- ✅ Breadcrumbs for order status changes and tracking updates
- ✅ 12 Sentry integration points in MedusaOrderService

#### 6.5 Performance ✅
- ✅ Index on `transactions.medusa_order_id` (partial index verified)
- ✅ Pagination prevents loading all orders at once
- ✅ Order lists use cursor-based pagination
- **Performance targets:**
  - Order creation: < 500ms (webhook → order created)
  - Order detail page: < 500ms (fetch order + transaction + jersey)
  - Order list page: < 2 sec with pagination

#### 6.6 Test Infrastructure ✅
- ✅ Vitest configured (`apps/web/vitest.config.ts`)
- ✅ Test scripts added: `npm run test`, `npm run test:run`
- ✅ 68 tests passing across 3 test suites

### Phase 7 — Medusa Admin UX Enhancements (Widgets) ✅

**Goal:** Gøre sælger/køber- og marketplace-kontekst synlig i Medusa Admin via widgets (ingen core-layout ændringer).

**Hvad vi kan (og ikke kan) ændre:**
- **Widgets:** Inject React-komponenter i predefinerede zones på eksisterende sider (fx `order.details.side.before/after`).
- **UI Routes:** Tilføje egne sider i admin (fx "Marketplace" oversigt) – optional.
- **Kan ikke:** Ændre kolonner/layout i standard-lister; logo/layout kan ikke ændres.

**Implementerede widgets:**

1) **Seller Widget** (`order.details.side.before`) ✅
   - File: `apps/medusa/src/admin/widgets/order-seller.tsx`
   - Viser: Avatar + seller_handle (link til customer), email, phone, shipping address.
   - Placeres i højre sidebar på order detail-siden.

2) **Listing Details Widget** (`order.details.side.after`) ✅
   - File: `apps/medusa/src/admin/widgets/order-listing-details.tsx`
   - Viser: Listing type badge (Sale/Auction), listing_id, jersey_id, transaction_id, shipping method/cost, tracking_number, shipping_provider.
   - Placeres efter Seller widget i højre sidebar.

3) **Product Marketplace Widget** (`product.details.before`)
   - File: `apps/medusa/src/admin/widgets/product-marketplace.tsx`
   - Viser: `seller_handle`, `listing_id`, `listing_type`, `jersey_id`, club/season/type/condition (fra metadata/description).

**Metadata i orders (fra MedusaOrderService):**
- seller_handle, seller_id, seller_customer_id
- seller_email, seller_phone, seller_address (ny)
- buyer_id, buyer_handle
- listing_id/auction_id, listing_type, jersey_id
- shipping_method, shipping_cost, tracking_number, shipping_provider

**Customer Sync Enhancements:** ✅
- Udvidet `syncMedusaCustomer()` til at synkronisere phone + default shipping address.
- Nye RPC funktioner: `update_medusa_customer_phone`, `sync_medusa_customer_address`.
- Edge function: `sync-medusa-customer` deployed.
- Migration: `20251224100000_add_customer_sync_rpc_functions.sql`.

**Success criteria:**
- [x] Widgets renderer uden fejl i Admin (`npm run build` passed).
- [x] Seller Widget oprettet med contact info + address.
- [x] Listing Details Widget oprettet med shipping/tracking.
- [x] Product Marketplace Widget oprettet.
- [x] Order detail viser seller info + listing details via widgets.
- [x] Customer sync inkluderer phone og default shipping address.
- [x] Edge function `sync-medusa-customer` deployed.
- **Note:** Widgets kræver at orders har marketplace metadata (sættes ved order creation).
- **Pause for review** før Phase 6.

**Success criteria:**
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pass.
- [ ] Webhook + API integration tests cover success/error paths.
- [ ] Manual flows verified (see Testing Strategy).
- [ ] No PII i Sentry logs.
- [ ] Performance acceptable (< 500ms for order creation).

## Testing Strategy
- Automated: lint, type-check, unit tests for service, integration tests for API routes/webhook.
- Manual:
  - Sale checkout end-to-end: pay → webhook → Medusa order created → status shipped/completed.
  - Auction winner flow: existing transaction → webhook → order created.
  - Payout: set status to delivered → payout scheduled.
  - AuthZ: buyer cannot ship; seller cannot complete; unauthorized returns 401/403.
  - Error handling: missing shipping address → webhook logs warning, does not crash.

## Risks & Mitigations
- Medusa API auth ustabil: fallback til direkte SQL/RPC, idempotency checks.
- Missing shipping data at webhook time: log warning, allow retry/manual repair endpoint.
- Payout timing: ensure delivered/completed triggers once; use idempotency via transferGroup.
- Backfill existing transactions: consider migration/backfill script (out-of-scope but note in review).

## Resolved Questions ✅

**1. Medusa Admin API vs SQL/RPC Pattern:**
- ✅ **Beslutning: Start med SQL/RPC pattern** (konsistent med codebase)
- Rationale: Eksisterende services bruger SQL/RPC (`MedusaCustomerService`, `MedusaShippingService`). Medusa API auth er ustabil.
- Future: Evaluer Admin API når auth er stabiliseret, men SQL/RPC er primary.

**2. Product Creation Timing:**
- ✅ **Beslutning: Async ved listing create** (ikke lazy ved checkout)
- Rationale: Tidligere validation, bedre UX, konsistent med dokumentation.
- Implementation: Integrer i `ListingService.createListing()` og `AuctionService.createAuction()`.

**3. Status Navn for Payout:**
- ✅ **Beslutning: `delivered`** (ikke `completed`)
- Rationale: `PayoutService.schedulePayout()` kræver eksplicit `orderStatus === "delivered"` (kontrakt fra HUD-38).

**4. Stripe Connect Integration:**
- ✅ **Allerede integreret korrekt** - Ingen ændringer nødvendige.

**5. Validation Strategy:**
- ✅ **Backend validation er primary** (Zod schemas i API routes)
- Frontend validation er UX enhancement, ikke security.

**6. Products Ikke Registreret:**
- ✅ **Håndteres via `ensureMedusaProduct()`** - Opretter product hvis mangler, returnerer eksisterende hvis present.

## References
- Medusa shipping (read-only SQL): `apps/web/lib/services/medusa-shipping-service.ts`
- Customer sync: `apps/web/lib/services/medusa-customer-service.ts`
- Stripe webhook: `apps/web/app/api/v1/stripe/webhook/route.ts`
- Payouts: `apps/web/lib/services/payout-service.ts`
- Shipping calc: `apps/web/lib/services/shipping-service.ts`
- Marketplace doc: `.project/plans/MARKETPLACE-DOC-COMPLETE-UPDATE.md`


