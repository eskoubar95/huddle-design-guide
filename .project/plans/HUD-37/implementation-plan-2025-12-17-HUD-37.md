# HUD-37 - Transaction Fees Calculation & Platform Fee System Implementation Plan

## Overview
Implementér et transparent fee-system for marketplace transactions:

- **Buyer betaler**: item price + shipping + **platform fee (5%)**
- **Seller modtager**: item price - **seller fee (1%)**
- **Refund policy**: kun **seller fee** refunderes; **platform fee** beholdes af platformen

**Vigtigt (Stripe kortgebyr):** Platform fee (5%) er **all-in** og skal **inkludere Stripe kortgebyr/processing fee**. Dvs. vi viser/charger ikke en ekstra “card fee” line item til buyer ud over de 5%.

Planen tager højde for nuværende kodebase, hvor Stripe-integration arbejder i **minor units (cents)**, mens listings/auctions typisk håndterer **major units (EUR med 2 decimaler)**.

**Sprint context:** Marketplace Features → **Phase 1: Payment Infrastructure** (jf. `.project/marketplace-features-linear-document.md`)

---

## Linear Issue
**Issue:** HUD-37  
**Title:** [Feature] Transaction Fees Calculation & Platform Fee System  
**Status:** Todo  
**Priority:** High  
**Labels:** Backend, Marketplace, Feature  
**Team:** Huddle World  
**Project:** Marketplace Features  
**Branch (recommended):** `feature/huddle-37-transaction-fees`  
**Linear URL:** `https://linear.app/huddle-world/issue/HUD-37/feature-transaction-fees-calculation-and-platform-fee-system`

---

## Current State Analysis (verificeret)

### Key Discoveries
1. **Stripe forventer cents (minor units)**  
   `StripeService.createPaymentIntent()` dokumenterer `amount` som “in minor units (cents for EUR)” og har et TODO for `application_fee_amount` (platform fee).  
   - Ref: `apps/web/lib/services/stripe-service.ts`

2. **Payouts og seller dashboard formatterer som cents**  
   Seller payouts UI formatterer `amount / 100` i `formatCurrency()`, hvilket implicit gør `transactions.amount` til cents.  
   - Ref: `apps/web/app/(dashboard)/seller/payouts/page.tsx`

3. **Refund route er skrevet som cents**  
   Refund validerer `input.amount > transaction.amount` og formatterer fejlbeskeder med `amount / 100`.  
   - Ref: `apps/web/app/api/v1/transactions/[id]/refund/route.ts`

4. **Auction close-up opretter transactions i major units (potentiel 100x mismatch)**  
   `close-auctions` inserter `amount: winningAmount`, hvor winningAmount kommer fra `bids.amount` (DECIMAL(10,2) og UI viser € med `.toFixed(2)`), altså major units.  
   - Ref: `supabase/functions/close-auctions/index.ts`

5. **Der findes pt. ikke en “checkout/payment intent creation” route i API’et**  
   Webhook opdaterer kun transaction status ved `payment_intent.succeeded`, men der er ikke fundet en route, der opretter transaction + payment intent med `transaction_id` i metadata.  
   - Ref: `apps/web/app/api/v1/stripe/webhook/route.ts` (læser `paymentIntent.metadata.transaction_id`)

### Implication
For HUD-37 er det vigtigste at:
- etablere **FeeService + fee config i DB**
- sikre konsistent **money-unit kontrakt** (cents i transactions + Stripe boundary)
- opdatere steder hvor transactions oprettes (især auctions) til at skrive cents og fee-felter korrekt

### Dependency & Ownership (HUD-34 / HUD-35)
**Checkout initiation (transaction + payment intent creation) ejes af:**
- **HUD-34**: `POST /api/v1/checkout/sale/[listingId]` (sale checkout)
- **HUD-35**: `POST /api/v1/checkout/auction/[auctionId]` (auction winner checkout / buy-now for auctions)

**HUD-37 leverer inputs til HUD-34/HUD-35:**
- DB schema + defaults (`platform_fees`, fee felter på `transactions`)
- `FeeService` (5% platform fee all-in inkl. Stripe processing fee, 1% seller fee)
- Kontrakt for money-units (cents i transactions/Stripe boundary)

**Krav til HUD-34/HUD-35 implementering (for at webhooks virker):**
- Når der oprettes Stripe Payment Intent, skal metadata inkludere mindst:
  - `transaction_id`, `listing_id`, `listing_type`, `seller_id`, `buyer_id`
- Buyer total (Stripe `amount`) må ikke få ekstra “card fee” line item; total = `item + shipping + platformFee(5%)`.

---

## Desired End State

### Fee Configuration
- `platform_fees` tabel eksisterer med aktive fees:
  - Platform fee = **5%**
  - Seller fee = **1%**
- Fees kan læses (for UI transparency), men ikke ændres fra klient (admin UI er out-of-scope).

### Fee Calculation
- En central `FeeService` kan:
  - beregne platform fee (5%) og seller fee (1%)
  - levere buyer total (inkl. shipping) og seller payout
  - håndtere rounding deterministisk (til cents)

### Transactions
- `transactions` gemmer en fuld breakdown:
  - `item_amount`, `shipping_amount`, `platform_fee_amount`, `seller_fee_amount`, `total_amount`, `seller_payout_amount`
- Kontrakt: **alle `*_amount` felter i transactions er i cents** (minor units), selv om DB typen er NUMERIC/DECIMAL.

### UI Transparency
- **Seller** ser 1% fee + forventet payout når de lister jersey (sale + auction).
- **Buyer** ser 5% “Service fee” når de vælger at købe (før betaling initieres).

### Refund Policy
- Refund endpoint refunderer **kun seller fee** (standard), aldrig platform fee.

---

## What We’re NOT Doing
- **Admin interface** til at opdatere fees (deferred til future issue).
- **Min/max caps** (du har eksplicit sagt ingen caps).
- **Fees ved hvert auction bid** (fees beregnes ved settlement/payment, ikke pr. bid).
- **Fuld checkout UX** (hvis checkout flows/PaymentIntent creation endpoints ligger i andre tickets). Vi lægger komponenter + backend hooks klar og integrerer hvor der allerede findes flow.
- **Oprydning af `router.push("/listing/...")`** (fundet i `SaleSlide.tsx`, men der er ingen `/listing` route i `app/`).

---

## Money Units & Rounding (kritisk kontrakt)

### Kontrakt
- **Listings/Auctions**: major units (EUR som decimals) i UI/DB (`sale_listings.price`, `bids.amount`, `auctions.current_bid` osv.)
- **Transactions + Stripe**: minor units (cents) som number

### Legacy field: `transactions.amount`
- `transactions.amount` betragtes som **legacy** og skal fremover være lig:
  - `total_amount` (buyer total i cents) når shipping/total er kendt, ellers
  - `item_amount` (item price i cents) som midlertidig fallback (fx ved auction close før shipping/checkout)
- Dette reducerer risikoen for 100x mismatch og holder eksisterende payout/refund flows stabile indtil de er migreret til de nye felter.

### Conversion helpers (planlagt)
- `toCents(major: number): number = Math.round(major * 100)`
- `fromCents(cents: number): number = cents / 100` (kun til UI)

### Rounding strategy
- Alle fee-beregninger afrundes med **Math.round** til nærmeste cent for determinisme.

### Stripe processing fee note
- Stripe processing fee er **ikke** et ekstra buyer-facing line item. Platformens netto (på platform fee) bliver i praksis: `platform_fee_amount - stripe_processing_fee` (afhænger af Stripe Connect charge type), men buyer ser stadig kun “Service fee (5%)”.

---

## Phase 1: Database Schema & Seeding

### Agent: `database`
### Estimated LOC: ~150-250

### 1.1 Create `platform_fees` table
**File:** `supabase/migrations/YYYYMMDDHHMMSS_create_platform_fees_table.sql`

- Kolonner (som i AC): `id`, `fee_type` ("platform" | "seller"), `fee_percentage`, `min_fee`, `max_fee`, `is_active`, `created_at`, `updated_at`
- `min_fee`/`max_fee` bliver nullable og forbliver **NULL** (ingen caps)

### 1.2 Seed default fees
**File:** `supabase/migrations/YYYYMMDDHHMMSS_seed_platform_fees_defaults.sql`

- Insert:
  - platform = **5.00**
  - seller = **1.00**
- Markér dem `is_active=true`

### 1.3 Add fee fields to `transactions`
**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_fee_fields_to_transactions.sql`

Tilføj:
- `item_amount` NUMERIC
- `shipping_amount` NUMERIC
- `platform_fee_amount` NUMERIC
- `seller_fee_amount` NUMERIC
- `total_amount` NUMERIC
- `seller_payout_amount` NUMERIC

**Note:** For auctions kan `shipping_amount` og `total_amount` være NULL indtil checkout/fulfillment flow sætter shipping.

### 1.4 RLS policies for `platform_fees`
- Enable RLS
- Policy: Allow SELECT for authenticated (evt. anon hvis I vil vise fee offentligt)
- No insert/update/delete policies (kun service role via migrations)

### Success Criteria
**Automated:**
- [ ] Migration apply succeeds (lokalt eller i Supabase pipeline)
- [ ] Type generation for Supabase (`apps/web/lib/supabase/types.ts`) kan opdateres uden fejl

**Manual:**
- [ ] SELECT på `platform_fees` virker som forventet (auth’d)
- [ ] Default rows findes og er `is_active=true`

### ⚠️ PAUSE (Schema review)
Bekræft migrations + RLS før Phase 2 starter.

---

## Phase 2: FeeService (beregning + config)

### Agent: `backend`
### Estimated LOC: ~150-250

### 2.1 Create `FeeService`
**File:** `apps/web/lib/services/fee-service.ts` (new)

Ansvar:
- Læs aktive fees fra `platform_fees` via `createServiceClient()`
- Fallback til defaults (5% / 1%) hvis tabellen er tom (robusthed)
- Beregn breakdown i **cents**

Foreslået API:
- `getActiveFeePercentages(): Promise<{ platformPct: number; sellerPct: number }>`
- `calculatePlatformFeeCents(itemCents: number, platformPct: number): number`
- `calculateSellerFeeCents(itemCents: number, sellerPct: number): number`
- `calculateBuyerTotalCents({ itemCents, shippingCents, platformFeeCents }): number`
- `calculateSellerPayoutCents({ itemCents, sellerFeeCents }): number`
- `buildBreakdownFromMajorUnits({ itemMajor, shippingMajor }): {...centsBreakdown, displayMajor }` (optional helper)

### 2.2 Unit tests for FeeService
**File:** `apps/web/lib/services/__tests__/fee-service.test.ts` (new)

Test cases:
- 5% / 1% beregning + rounding
- 0/edge values (item=0, shipping=0)
- determinisme (samme input → samme output)

### Success Criteria
**Automated:**
- [ ] Unit tests for fee calculation passerer
- [ ] Typecheck passerer

**Manual:**
- [ ] FeeService returnerer defaults hvis DB ikke er seeded (dev robustness)

### ⚠️ PAUSE
Godkend FeeService API (det bliver “single source of truth”) før Phase 3 integration.

---

## Phase 3: Integration (Stripe, Auctions, Payouts, Refund)

### Agent: `backend`
### Estimated LOC: ~250-450

### 3.1 Stripe: application fee (platform fee)
**File:** `apps/web/lib/services/stripe-service.ts` (update)

- Brug `FeeService` til at beregne `platform_fee_amount` i cents og sæt:
  - `application_fee_amount = platformFeeCents`
  - `amount = totalCents` (item + shipping + platformFee)

**Stripe kortgebyr (krav):**
- Vi **lægger ikke** Stripe fee oveni buyer total. Buyer total er fortsat `item + shipping + platformFee(5%)`.
- Platform fee (5%) skal derfor kunne “absorbere” Stripe processing fee på platformen.

**Note:** Dette kræver at call-site til StripeService giver **breakdown** (item/shipping) eller at StripeService selv kan beregne total (afhænger af hvordan checkout implementeres i andre tickets).

### 3.2 Auctions: transaction creation på close
**File:** `supabase/functions/close-auctions/index.ts` (update)

- Når transaction oprettes:
  - Konverter winningAmount (major) → `item_amount` i cents
  - Sæt:
    - `item_amount` (cents)
    - `platform_fee_amount` (cents)
    - `seller_fee_amount` (cents)
    - `seller_payout_amount` (cents)
    - `amount` (legacy) = `item_amount` (cents) indtil `total_amount` er kendt
  - Lad `shipping_amount` + `total_amount` være NULL indtil winner-checkout/shipping vælges
  - Når winner-checkout sætter shipping/total: opdater `total_amount` og sæt `amount = total_amount` (cents)

### 3.3 Payouts: brug seller payout field
**File:** `apps/web/lib/services/payout-service.ts` (update)

- Skift payout beregning til:
  - `payoutAmount = transaction.seller_payout_amount ?? transaction.amount`
- Hvis `seller_payout_amount` mangler: fallback, men log (Sentry breadcrumb) så vi kan opdage drift.

### 3.4 Refund: kun seller fee
**File:** `apps/web/app/api/v1/transactions/[id]/refund/route.ts` (update)

- Default refund amount = `transaction.seller_fee_amount`
- Afvis (400) hvis request forsøger at refundere mere end seller fee
- Behold mulighed for explicit `amount` (partial) men clamp til max seller fee
- Opdater notification message så den bruger korrekt beløb

### 3.5 Webhook: sikre at totals stemmer
**File:** `apps/web/app/api/v1/stripe/webhook/route.ts` (optional update)

- Ved `payment_intent.succeeded`: hvis transaction har `total_amount`, verify `paymentIntent.amount === total_amount` (log warning, ikke throw)

### Success Criteria
**Automated:**
- [ ] Typecheck/lint passerer for ændrede services/routes
- [ ] Unit tests (FeeService) + evt. route tests passerer

**Manual:**
- [ ] Auction close skaber transaction med korrekte fee felter (i DB)
- [ ] Refund endpoint refunderer kun seller fee (platform fee beholdes)
- [ ] Payout-service bruger seller_payout_amount (cents) og transfer amount matcher

### ⚠️ PAUSE
Kør manuel sanity-check i staging/dev før UI changes rulles ud bredt.

---

## Phase 4: UI Transparency (Seller + Buyer)

### Agent: `frontend`
### Estimated LOC: ~200-350

### 4.1 Seller: fee preview ved listing creation
**Files:**
- `apps/web/components/marketplace/CreateSaleListing.tsx` (update)
- `apps/web/components/marketplace/CreateAuction.tsx` (update)

Add:
- “Seller fee (1%)” linje
- “You will receive” linje (price - 1%)
- Tekst: “Payout beregnes ekskl. evt. shipping, afhænger af shipping model”

### 4.2 Buyer: platform fee display ved køb
**Files:**
- `apps/web/components/jersey/JerseyMarketplaceInfo.tsx` (update) eller modal ved onBuy

Add:
- “Service fee (5%)” linje (beregnet af item price)
- “Total (excl. shipping)” linje hvis shipping ikke vælges endnu

### 4.3 Shared breakdown components (for fremtidig checkout)
**Files (new):**
- `apps/web/components/checkout/PriceBreakdown.tsx`
- `apps/web/components/seller/PayoutBreakdown.tsx`

Formål:
- Genbrugelig breakdown UI (labels + totals) som kan monteres i fremtidige checkout flows.

### Success Criteria
**Manual:**
- [ ] Når seller opretter listing/auction, ser de 1% fee + net payout
- [ ] Når buyer ser en listing, ser de 5% service fee tydeligt før “Buy Now”

---

## Testing Strategy

### Automated
- FeeService unit tests (rounding + defaults)
- Basic route-level tests (refund path) hvis der allerede er test harness

### Manual (happy paths)
- Sale listing: se buyer service fee på jersey detail
- Auction end: transaction oprettes med fee breakdown (cents)
- Refund: refund giver kun seller fee tilbage
- Payout: transfer beløb matcher `seller_payout_amount`

---

## Rollback Strategy
- Migrations kan rulles tilbage ved at droppe `platform_fees` og de nye kolonner (hvis nødvendigt).
- Code changes er additive (fallback paths) for at minimere risiko.

---

## References
- Linear: HUD-37
- Project doc: `.project/marketplace-features-linear-document.md` (Phase 1 Payment Infrastructure)
- Stripe integration patterns: `.project/plans/HUD-38/implementation-plan-2025-12-16-HUD-38.md`
- Key files:
  - `apps/web/lib/services/stripe-service.ts`
  - `apps/web/lib/services/payout-service.ts`
  - `apps/web/app/api/v1/transactions/[id]/refund/route.ts`
  - `supabase/functions/close-auctions/index.ts`


