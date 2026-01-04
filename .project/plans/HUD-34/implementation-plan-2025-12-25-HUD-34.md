# HUD-34 – Marketplace Checkout Flow (Sale Listings)

## Overview
Byg komplet checkout-flow for sale listings: shippingvalg (home delivery + pickup point/PUDO), prisopdeling, Stripe Connect-betaling, Medusa-ordreoprettelse og ordrebekræftelse. Målet er et Vinted-lignende flow med forbliven i Huddle (embedded betaling), EUR-only beløb og EU-wide shipping.

## Linear Issue
**Issue:** HUD-34 — [Feature] Marketplace Checkout Flow - Sale Listings  
**Status:** Todo  
**Branch (foreslået):** `nicklaseskou95/hud-34-feature-marketplace-checkout-flow-sale-listings`  
**Link:** https://linear.app/huddle-world/issue/HUD-34/feature-marketplace-checkout-flow-sale-listings

## Current State Analysis
- Listing-visning har “Buy Now” CTA (`JerseyMarketplaceInfo`), men ingen checkout-route. `SaleSlide` linker til `/listing/...` uden checkout.
- Stripe Connect-integration (HUD-38) eksisterer: `stripe-service.ts`, webhook handler, payout-service. Payment Intent + client secret kan skabes (EUR). UI til betaling ikke implementeret i checkout.
- Shipping-service (`shipping-service.ts`) har Eurosender home-delivery aktiv, men returnerer tomt ved `pickup_point` (PUDO var deferred). ServicePointService + Eurosender PUDO API + service-points endpoint findes og virker (kræver courierId fra quote); ingen PUDO UI endnu.
- Medusa order service planlagt i HUD-39; no direct create-order hook i checkout endnu. `transactions` tabel har felter til amounts, fees, medusa_order_id, stripe ids.
- Orders API/visning eksisterer (`app/api/v1/orders/[orderId]`, `app/(dashboard)/orders/[orderId]/page.tsx`) men ikke koblet til sale checkout flow.
- *Payment UI:* Ingen eksisterende Payment Element-komponent; skal bygges fra bunden (Stripe Checkout kan være fallback).

## Desired End State
- Køber klikker “Buy Now” → `/checkout/sale/[listingId]` loader listing + jersey.
- Køber vælger shippingmetode: Home Delivery eller Pickup Point (PUDO) med map/list søgning, carrier-filter, adresse/postnr-søgning, og (hvis tilgængeligt) tidsvindue/ETA visning. EU-wide (ingen blokeringer).
- Prisopdeling i EUR: item, shipping (domestic vs international), platform fee (pct), total. Cross-border viser customs-info hint.
- Backend `POST /api/v1/checkout/sale/[listingId]`: valider listing aktiv + buyer≠seller, beregn shipping (Eurosender), platform fee, opret transaction (pending), opret Medusa order (via HUD-39 service), opret Stripe Payment Intent (Connect) og returner client secret + order id + shipping metadata.
- Frontend gennemfører betaling via Stripe Payment Element (embedded) eller fallback Stripe Checkout session; ved success redirect til `/orders/[orderId]`.
- Bekræftelsesside viser ordre, shippingmetode/service point, betalingstatus, seller contact, tracking placeholder.

## Acceptance Criteria (HUD-34) → mapping
- Checkout page `/checkout/sale/[listingId]` (Phase 1, 2, 4).
- Shipping method: Home Delivery vs Pickup Point; viser costs + ETA (Phase 2, 3).
- Home Delivery: adressevalg/ny adresse, live shipping cost update (Phase 2, 3).
- Pickup Point: service point picker (map+list), søg adresse/postnr, carrier filter, vælg point og gem ID/address (Phase 2, 3).
- Price breakdown: item, shipping (metode), platform fee %, total (Phase 2, 3).
- Order summary + images (Phase 1, 2).
- Payment method selection (Stripe Payment Intent) + embedded Payment Element (Phase 4).
- Error handling (listing no longer available, etc.), loading states (Phase 1–4).
- Redirect til order confirmation (Phase 4).
- Cross-border shipping: international vs domestic priser, customs info hint (Phase 2–3).

## What We’re NOT Doing
- Ingen auktion-checkout (HUD-35) i dette scope.
- Ingen shipping label generation (HUD-42) eller seller-fulfillment UI.
- Ingen valuta-multipel support (EUR only i flows/PI).
- Ingen refunds/returns (håndteres separat).

## Implementation Approach (key decisions)
- **Payment UI:** Foretrækker embedded Stripe Payment Element for “bliv i Huddle”. Fallback: Stripe Checkout session toggle bag feature flag hvis Payment Element viser sig blockerende.
- **PUDO/pickup:** Aktivér Eurosender PUDO end-to-end: shipping-service skal beregne pickup-pris i stedet for at returnere tomt; UI: map/list søgning via service-points API (carrier filter, lat/lng eller postal code) med courierId fra shipping quote. Hvis ETA/tidsvinduer findes, vis valg; ellers ETA tekst + frivilligt “preferred pickup time” felt (metadata).
- **Time windows for delivery:** Brug ETA/tidsvindue fra shipping quote hvis tilgængelig; ellers vis standard leveringstid og tillad “preferred delivery window” input (metadata, ikke garanteret).
- **EUR-only:** Alle beløb i cents (EUR). Pris i UI formatteret til EUR; hvis listing er anden currency, vis konverteret preview + original label.
- **Medusa:** Brug HUD-39 `medusa-order-service` kontrakter; gem shipping method + service point metadata på order. Fail fast hvis medusa ikke tilgængelig.
- **Open EU:** Ingen begrænsning på destination; shipping-service skal differentiere domestic vs international priser/ETA.
- **Postal code geocoding (PUDO):** service-points API kræver lat/lng for courierId-flow; tilføj simpel geocoding eller kræv lat/lng når courierId bruges (postal code uden courierId kan falde tilbage til cached points).
- **Rollback/kill switch:** Tilføj feature flag `CHECKOUT_SALE_ENABLED` (env). Hvis false → checkout-route returnerer 503 + venlig besked (ingen Stripe/Medusa/Supabase calls). Bruges som midlertidig kill switch ved driftsproblemer.

## Phase 0 — Forudsætninger & risiko
- Bekræft HUD-38 envs: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`.
- Bekræft Eurosender envs: `EUROSENDER_API_KEY`, `EUROSENDER_API_URL`.
- Valider ServicePointService fungerer med test courierId (fra quote) → PUDO search svarer.
- Synk med HUD-39: sørg for `medusa-order-service` createOrderFromSale (eller tilsvarende) er tilgængelig eller stub med TODO + feature flag.
- Verificér transactions schema felter (total_amount, platform_fee_amount, shipping_amount, medusa_order_id, stripe_payment_intent_id).
- Gate: Buyer skal være Clerk-auth og verified (HUD-41) før checkout; assert seller har aktiveret Stripe account.

## Phase 1 — Checkout-UI skelet & data-load
### Changes
- Opret page: `apps/web/app/(dashboard)/checkout/sale/[listingId]/page.tsx`
  - Loader listing + jersey (GET `/api/v1/listings/[id]`), seller profile, buyer profile verification state.
  - Guards: redirect hvis owner==buyer; redirect til onboarding hvis ikke verified/Stripe connected.
  - Layout med sections: Shipping method, address/pickup selector, price breakdown, payment box, summary.
- Opdater CTA: `JerseyMarketplaceInfo` (and `SaleSlide`) onBuy → push til `/checkout/sale/{listingId}`.
- Skeleton components with loading/error states: venlig fejl for missing listing, inline error for fetch-fejl, loading skeletons for shipping/payment sektioner.

### Success Criteria
#### Automated
- Typecheck og lint passerer: `npm run lint` (apps/web), `npm run type-check`.
#### Manual
- Navigering fra listing til checkout virker og håndterer missing listing med venlig fejl.
- Owner kan ikke gå i eget checkout.
- Error state vises ved fetch-fejl og kan retryes uden refresh.

⚠️ PAUSE HERE – gennemgå data-load, guards og UI skelet før shipping/PUDO bygges.

## Phase 2 — Shipping valg, PUDO & prisopdeling
### Changes
- Komponenter:
  - **Genbrug/udvid** `apps/web/components/checkout/ShippingMethodSelector.tsx` (eksisterer): tilføj tabs/radio for Home Delivery vs Pickup Point, bevar debounce og error-states; eksponer courierId i option metadata til PUDO search.
  - `apps/web/components/checkout/ShippingAddressForm.tsx` (kan være inline i page): RHF + Zod; trigger live shipping-quote on change.
  - `apps/web/components/checkout/ServicePointPicker.tsx`: map+list, søg adresse/postnr, carrier filter, radius, call `/api/v1/shipping/service-points` med courierId fra quote; geocode postal code→lat/lng hvis courierId er påkrævet. Vis ETA og selectable pickup time windows hvis tilgængeligt; fallback “preferred pickup time” note.
  - **Genbrug/udvid** `apps/web/components/checkout/PriceBreakdown.tsx`: brug eksisterende komponent; tilføj intl/domestic badge + customs disclaimer når buyer country ≠ seller country; vis shipping linje også ved 0.
  - `apps/web/components/checkout/CheckoutSummary.tsx`: jersey info, seller info, thumbnails.
- API usage:
  - Udbyg shipping calculate endpoint + ShippingService til at supportere `pickup_point` (ikke tomt): beregn pickup-pris via Eurosender quote; returner courierId til PUDO; håndter domestic vs international.
  - Preserve courierId fra quote for PUDO search; postal code uden lat/lng → fallback cached points eller kræv geocoding.
  - Error-states: ved shipping calc fejl → vis inline fejl + fallback til home_delivery “Shipping unavailable” (ingen crash).

### Success Criteria
#### Automated
- Unit-test shipping calc adapter (mock API) inkl. pickup_point flow + price breakdown math (platform fee).
- Component tests: ShippingMethodSelector (tabs + selection), PriceBreakdown (customs hint), ServicePointPicker (empty/error/success state).
#### Manual
- Home delivery: ændring af adresse opdaterer fragtpris og ETA.
- Pickup: søgning returnerer points; valg gemmer service point data; preferred pickup time kan angives; ETA vises hvis tilgængelig.
- UI viser EUR amounts og customs-hint for cross-border.
- Error state vises ved shipping calc failure og tilbyder retry/fallback til home delivery.

⚠️ PAUSE HERE – verificer PUDO UI, shipping pris/ETA, prisopdeling før backend endpoint implementeres.

## Phase 3 — Backend checkout endpoint + service
### Changes
- Opret `apps/web/app/api/v1/checkout/sale/[listingId]/route.ts`
  - Validate auth; ensure buyer != seller; listing active.
  - Parse body: shippingMethod (home_delivery|pickup_point), address eller servicePoint, preferred_time_window, selected_quote_id, courier_id.
  - Call ShippingService to recompute quote (source-of-truth) inkl. pickup_point; extract courierId for PUDO validation hvis pickup. Ved postal code + courierId: kræv lat/lng (frontend geocoding) ellers fejl/fallback til cached points uden courierId.
  - Calculate platform fee (HUD-37) and total (EUR cents). Store domestic vs international flag.
  - Create transaction (pending) in Supabase: item_amount, shipping_amount, platform_fee_amount, total_amount, currency=EUR, seller_id, buyer_id, listing_id, listing_type="sale".
  - Concurrency guards:
    - Returner 409 hvis listing allerede har completed/pending transaction (double purchase prevention).
    - Brug row-level lock / SELECT ... FOR UPDATE på listing + status check før transaction insert (Supabase RPC eller serialized transaction).
    - Verificer at shipping quote ikke er stale (fx >5 min) → kræv re-quote.
  - Create Medusa order via `medusa-order-service` (HUD-39): pass shipping method, cost, address/service point, metadata (preferred time windows).
  - Create Stripe Payment Intent via `stripe-service`: application fee if configured; attach transactionId + orderId metadata; return client_secret + publishable key.
  - Return payload: { transactionId, orderId, clientSecret, amount, currency, breakdown, shippingMethod, servicePoint }.
- Add service: `apps/web/lib/services/checkout-service.ts` for shared logic (validation + calls).

### Success Criteria
#### Automated
- Endpoint unit/integration test (mock Stripe + Medusa + Supabase) covers: happy path, invalid listing, seller==buyer, missing shipping, inactive Stripe seller, double-purchase returns 409, stale quote triggers re-quote.
#### Manual
- API returns clientSecret and totals match UI; errors return typed ApiError with safe messages.
- Double checkout attempt på samme listing fejler venligt og stopper betaling.

⚠️ PAUSE HERE – endpoint og service valideres (happy/failure) før payment UI bygges.

## Phase 4 — Payment flow & confirmation
### Changes
- Frontend payment section i checkout page:
  - Byg ny Payment Element-komponent (`apps/web/components/checkout/PaymentElementForm.tsx`): prop clientSecret; inkluderer submit handler, error state, disabled while processing.
  - Minimal struktur (example):
    ```typescript
    "use client";
    import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
    export function PaymentElementForm({ clientSecret }: { clientSecret: string }) {
      const stripe = useStripe();
      const elements = useElements();
      const [error, setError] = useState<string | null>(null);
      const [loading, setLoading] = useState(false);
      const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setLoading(true);
        const { error } = await stripe.confirmPayment({ elements, redirect: "if_required" });
        if (error) setError(error.message || "Payment failed");
        setLoading(false);
      };
      return (...render PaymentElement + button + error...);
    }
    ```
  - Feature flag til Stripe Checkout session (fallback) hvis Payment Element fejler.
- On success, call backend to fetch order id (from response) and redirect to `/orders/[orderId]`.
- Order confirmation page update (`app/(dashboard)/orders/[orderId]/page.tsx`):
  - Show shipping method, address or service point, preferred time window, ETA/customs hint.
  - Show payment status from order/transaction; seller contact; tracking placeholder.
- Webhook alignment: ensure `stripe_payment_intent_id` stored; webhook already updates transaction to `completed` and creates Medusa order (HUD-39) — keep idempotency.

### Success Criteria
#### Automated
- Payment component renders with provided clientSecret (component test).
 - Lint/typecheck commands: `npm run lint`, `npm run type-check`.
 - Component tests: PaymentElementForm renders PaymentElement, håndterer error state, disable while processing.
#### Manual
- Full happy path: Buy Now → select shipping → pay → redirected to confirmation with correct amounts and shipping info.
- Payment failure shows inline error, allows retry.
- Performance: checkout page TTFB+render < 2s (baseline mock data); payment submit til redirect < 4s.

⚠️ PAUSE HERE – end-to-end betaling + redirect bekræftes før QA/polish.

## Phase 5 — QA, observability, hardening
### Changes
- Add Sentry breadcrumbs for checkout steps; mask PII.
- Loading and empty states on pickup search and shipping quotes.
- Keyboard accessibility for tabs, forms, list selection, map focusable markers.
- Add analytics hooks (event names TBD) for method selection and payment success.
- Docs: update marketplace doc with PUDO enabled and EUR-only assumption.
- Edge cases & errors:
  - Shipping calc/PUDO failure → vis fejl, fallback til home delivery default; log Sentry uden adresse/PII.
  - Stripe PI fejl → vis inline error, allow retry; log Sentry uden PII.
  - Listing inactive / buyer==seller → venlig fejl + redirect.
 - Rollback: respekter `CHECKOUT_SALE_ENABLED`; hvis false → vis maintenance-besked og stop API calls.

### Success Criteria
#### Automated
- Lint, typecheck, unit tests for checkout-service, price breakdown, API handler.
 - Commands: `npm run lint`, `npm run type-check`, `npm run test` (apps/web).
 - Component tests: ServicePointPicker (empty/error/success), ShippingMethodSelector tabs toggle, PriceBreakdown customs hint, PaymentElementForm error handling.
#### Manual
- Accessibility: tab navigation works; screen reader labels on method tabs and service point list.
- Cross-border: set buyer country ≠ seller country → customs hint appears; shipping price updates.
- EU-wide: no country block in shipping call (unless provider errors).
- Rollback: sæt `CHECKOUT_SALE_ENABLED=false` og verificér at checkout-route returnerer 503 + venlig besked.

## Testing Strategy
- Unit: price breakdown math, checkout-service validation, PUDO search mapper.
- Integration: API route with mocked Stripe/Medusa/Supabase; shipping calc integration stub.
- E2E/manual: Full flow home delivery + pickup; failure cases (inactive seller Stripe, listing inactive, payment fail).
- Webhook: simulate `payment_intent.succeeded` updates transaction/order.
- Component: PaymentElementForm, ServicePointPicker, ShippingMethodSelector tabs, PriceBreakdown customs flag.

## References
- Linear HUD-34
- Shipping: `apps/web/lib/services/shipping-service.ts`, `service-point-service.ts`, `eurosender-service.ts`
- Stripe: `apps/web/lib/services/stripe-service.ts`, `app/api/v1/stripe/webhook/route.ts`
- Medusa: `medusa-order-service` (HUD-39 plan)
- Listing: `app/api/v1/listings/[id]/route.ts`
- Orders UI/API: `app/api/v1/orders/[orderId]/route.ts`, `app/(dashboard)/orders/[orderId]/page.tsx`

