# HUD-41 - User Profile Validation & Verification (Marketplace) Implementation Plan

## Overview
Implementér **profile completeness + shipping address** og **Stripe Identity verification status** som gatekeepers før marketplace-handlinger (create listing/auction, checkout). Flowet skal kunne tilgås som **onboarding wizard**, men også **inline** (redirect når brugeren forsøger en handling) og fra **profile settings**.

Planen er skrevet med udgangspunkt i:
- Linear: **HUD-41**
- Docs: `.project/02-PRD.md`, `.project/04-Database_Schema.md`, `.project/05-API_Design.md`, `.project/07-Frontend_Guide.md`, `.project/marketplace-features-linear-document.md`
- Supabase MCP “current state” (for at undgå dubletter)
- Chat-beslutninger (onboarding + inline + settings, rejection-håndtering, notifications)

---

## Linear Issue
**Issue:** HUD-41  
**Title:** [Feature] User Profile Validation & Verification Requirements for Marketplace  
**Status:** Backlog  
**Priority:** High  
**Dependencies (fra ticket):** HUD-38 (Stripe Connect Setup), HUD-39 (Medusa Order Integration)

---

## Current State Analysis (verificeret)

### Supabase schema (via Supabase MCP)
**Eksisterer allerede (relevant for HUD-41):**
- `public.profiles` har kolonner: `id (TEXT)`, `username`, `avatar_url`, `bio`, `country`, `created_at`, `updated_at`, **`medusa_customer_id (UUID, nullable)`**
- `public.notifications` eksisterer (in-app notifications)
- **Der findes ikke** en `shipping_addresses` tabel
- **Der findes ikke** en `profile_verifications` tabel (og vi opretter den ikke i denne plan)

**Vigtigt for at undgå dubletter:**
- `profiles.medusa_customer_id` er **allerede implementeret** ⇒ vi opretter ikke `medusa_customers` mapping-table.

### Codebase patterns (uddrag)
- API routes: `apps/web/app/api/v1/**` bruger `requireAuth` + `handleApiError` + `rateLimitMiddleware`
- Auth: `apps/web/lib/auth.ts` opretter profile ved første API-kald og kører Medusa customer sync (HUD-25)
- Multi-step flow pattern: `apps/web/hooks/use-jersey-upload-steps.ts` + progress/header/footer komponenter

### Identificerede gaps for HUD-41
- Manglende profile fields: `first_name`, `last_name`, `phone`
- Manglende shipping address persistence: `shipping_addresses`
- Manglende Stripe Identity status persistence + flow
- Manglende validation service/middleware + API endpoints
- Manglende onboarding/redirect UX

---

## Desired End State

### Sellers (før listing/auction)
- Profile har `first_name`, `last_name`, `phone`
- Har **default** shipping address
- Har **Stripe Identity status = verified**
- Har `profiles.medusa_customer_id` sat (allerede i flow; skal fortsat være non-blocking)

### Buyers (før checkout)
- Profile har `first_name`, `last_name`, `phone`
- Har **default** shipping address
- Har `profiles.medusa_customer_id` sat

### UX
- Onboarding wizard: `/profile/complete` kan altid tilgås
- Første login (efter email verification): redirect til onboarding hvis ikke “ready”
- Inline gating: prøver man at liste/byde/checkout → redirect til onboarding med `redirect_url`
- Verification status vises **kun** i profile settings (ikke “verified badge” ved username)
- Ved rejection: vis status + “Request review” (skaber ticket/notification + optional email hook)
- Notifications: in-app + email (email implementeres som integration-hook – se scope)

---

## Scope

### In scope
- DB migrations (profiles fields + stripe status + shipping_addresses)
- ProfileValidationService + middleware/helpers
- API endpoints for completeness + verification status + completion
- Frontend onboarding wizard + settings integration
- Seller verification UI (status + start flow) + webhook plumbing (status update)
- Gating på relevante flows (listing/auction/checkout) med tydelige 403 + redirect url
- In-app notifications ved verification status changes

### What We’re NOT Doing (out of scope)
- **Fuld Stripe Connect (HUD-38)**: payouts/fees/checkout orchestration
- **Fuld Medusa order integration (HUD-39)**
- Shipping calculation, service points, shipping labels (andre tickets)
- “Verified badge” i public UI (kun i settings)
- Bygge et fuldt support/ticket-system; vi laver en minimal “request review” record/notification og en email-hook

---

## Key Design/Tech Decisions (fra chat + constraints)

### A) Migration strategy
- Nye felter er **nullable**.
- Brugere kan browse uanset completeness.
- Completeness/verification håndhæves kun ved handlinger (liste/byde/checkout).

### B) `is_profile_complete`
- Vi bruger **computed column** (generated, stored) **kun baseret på fields i `profiles`**.
- Bemærk: Postgres generated columns kan **ikke** referere til andre tabeller (fx `shipping_addresses`).
- Derfor splitter vi begreberne:
  - `profiles.is_profile_complete`: **kun** personfelter i `profiles` (first/last/phone). Bruges til hurtigt “at-a-glance”.
  - “Buyer ready” / “Seller eligible”: beregnes i **service-laget** og inkluderer default address + (for seller) identity verified.

### C) Shipping addresses
- Multiple pr. user, med præcis én `is_default=true`.

### D) Rejected verification
- Status + explanation + “Request review”.
- “Request review” skal persisteres minimalt i DB (så vi kan håndtere det som support-workflow uden at opfinde et fuldt ticket-system).

---

## Implementation Approach
Vi implementerer i denne rækkefølge: **DB → services/middleware → API → frontend onboarding → Stripe Identity plumbing → gating integration → tests**.

---

## Phase 1: Database migrations (Supabase)

### Overview
Tilføj de nødvendige felter til `public.profiles` og opret `public.shipping_addresses` uden dubletter.

### Changes Required

#### 1.0 Pre-flight: Clerk ID type alignment (minimalt for HUD-41)
**Hvorfor:** Supabase MCP viser, at flere eksisterende tabeller stadig bruger `UUID`-kolonner med FK til `auth.users`. Med Clerk (TEXT user IDs) kan det blokere flows, især:
- **In-app notifications:** `public.notifications.user_id` er UUID i DB
- **Marketplace gating/ownership checks:** listing/auction/transaction felter kan være UUID

**Scope for HUD-41 (minimalt):**
- Konverter **`public.notifications.user_id`** til `TEXT` (så vi kan oprette notifications til Clerk users)
- Konverter marketplace-relaterede “user id” kolonner, der indgår i gating/flows:
  - `public.sale_listings.seller_id`, `public.sale_listings.sold_to`
  - `public.auctions.seller_id`, `public.auctions.winner_id`
  - `public.bids.bidder_id`
  - `public.transactions.seller_id`, `public.transactions.buyer_id`

**Bemærkning:** Supabase MCP viste `rows=0` for disse marketplace-tabeller i nuværende projekt, hvilket reducerer migreringsrisiko (ingen data at konvertere). Hvis der findes data i andre envs, skal vi lave en datamigrering/rollback-plan før type-change.

**File:** `supabase/migrations/20251213165000_align_marketplace_user_ids_for_clerk.sql`

**DDL (pattern fra eksisterende “fix_*_for_clerk” migrations):**
- Drop FK constraints til `auth.users`
- Drop relevante indexes/policies hvis de refererer til kolonnerne
- `ALTER TABLE ... ALTER COLUMN ... TYPE TEXT USING ...::text`
- Recreate indexes
- (Valgfrit) re-create policies “for documentation” med `auth.uid()::text = ...` (service role bypasser RLS)

**Success Criteria (DB):**
- [ ] `information_schema.columns` viser TEXT-type for ovenstående kolonner
- [ ] Ingen FK constraints tilbage til `auth.users` for de ændrede kolonner

#### 1.1 Add profile fields + Stripe Identity fields + computed column
**File:** `supabase/migrations/20251213170000_add_profile_completion_and_identity_fields.sql`

**DDL:**
- Add `first_name`, `last_name`, `phone`
- Add `stripe_identity_verification_status`
- Add `stripe_identity_verification_id`
- Add `is_profile_complete` GENERATED (profile-fields only)
- Add indexes

**Notes:**
- Status feltet implementeres som `TEXT` med CHECK constraint (enum-lignende), for at holde migration enkel i Supabase.

#### 1.2 Create `shipping_addresses`
**File:** `supabase/migrations/20251213171000_create_shipping_addresses.sql`

**DDL:**
- `user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE`
- Partial unique index på `(user_id) WHERE is_default = true`
- `updated_at` trigger (genbrug eksisterende pattern hvis `update_updated_at_column()` findes)
- **RLS:** `ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;`
  - **Beslutning:** Ingen policies i HUD-41 (default-deny under RLS). Addresses indeholder PII og skal kun tilgås via server-side API (service role client) + eksplicit ownership checks i service-laget.

#### 1.3 Create minimal support persistence for “Request review”
**File:** `supabase/migrations/20251213172000_create_identity_verification_review_requests.sql`

**Formål:** Minimal tabel til at logge “Request review” fra rejected identity uden at bygge et fuldt ticket-system.

**DDL (forslag):**
- `id uuid primary key default gen_random_uuid()`
- `user_id text not null` (Clerk user id)
- `verification_session_id varchar(255) null`
- `status text not null default 'open'` (CHECK: open|closed)
- `message text null` (valgfri brugerbesked)
- `created_at`, `updated_at`
- RLS enabled (ingen policies nødvendige; access via service role)

#### 1.4 Regenerér Supabase TypeScript types
**Hvorfor:** DB-ændringer (nye kolonner/tabeller + type-changes i 1.0) skal afspejles i `apps/web/lib/supabase/types.ts`, ellers får vi typefejl og “ghost bugs”.

**Approach (vælg én):**
- Via Supabase MCP: `generate_typescript_types` og skriv output til `apps/web/lib/supabase/types.ts`
- Via Supabase CLI (hvis sat op lokalt): `npx supabase gen types typescript --project-id <project> --schema public,metadata,medusa > apps/web/lib/supabase/types.ts`

### Success Criteria

#### Automated Verification
- [ ] Migrations kan anvendes i Supabase uden fejl
- [ ] `profiles` har nye kolonner
- [ ] `shipping_addresses` tabel eksisterer
- [ ] Unik default constraint virker (kun én default per user)
- [ ] `identity_verification_review_requests` tabel eksisterer
- [ ] (Hvis 1.0 køres) notifications + marketplace user-id kolonner er TEXT
- [ ] Supabase TypeScript types er regenereret og committed (så `apps/web/lib/supabase/types.ts` matcher DB)

**SQL spot-checks (kopiér-indsæt i Supabase SQL editor):**
- Verificér nye profile kolonner:
  - `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name IN ('first_name','last_name','phone','stripe_identity_verification_status','stripe_identity_verification_id','is_profile_complete');`
- Verificér `shipping_addresses` findes og RLS er enabled:
  - `SELECT relrowsecurity FROM pg_class WHERE oid='public.shipping_addresses'::regclass;`
- Verificér “kun én default” index:
  - `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='shipping_addresses';`
- Verificér review request tabel:
  - `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='identity_verification_review_requests';`

#### Manual Verification
- [ ] Kan oprette address rows for en user
- [ ] Kan skifte default address (old default set false, new true)

**⚠️ PAUSE HERE** – DB klar før service/API.

---

## Phase 2: Backend validation service + middleware

### Overview
Centraliser completeness/verification checks, så API routes kan genbruge dem konsistent.

### Changes Required

#### 2.1 `ProfileValidationService`
**File:** `apps/web/lib/services/profile-validation-service.ts` (ny)

**Ansvar:**
- `getProfileCompleteness(userId)` → { isProfileComplete, hasDefaultShippingAddress, missingFields[] }
- `getSellerEligibility(userId)` → ovenstående + `isIdentityVerified`
- `getBuyerEligibility(userId)` → ovenstående (ingen identity)

**Data sources:**
- `profiles` (service client)
- `shipping_addresses` (default check)

#### 2.2 Middleware/helpers
**File:** `apps/web/lib/middleware/profile-validation.ts` (ny)

**Funktioner:**
- `requireBuyerProfile(req)` → uses `requireAuth(req)` + validation; throw `ApiError(403)` med `redirectUrl`
- `requireSellerVerification(req)` → samme men også identity verified

**Error shape:**
- Brug eksisterende `ApiError` og `handleApiError`.
- `details` inkluderer: `{ redirectUrl, missingFields, reason }`
  - `reason` bør være en stabil enum-ish string: `profile_incomplete` | `missing_default_address` | `identity_required` | `identity_rejected` | `identity_pending`

### Success Criteria

#### Automated Verification
- [ ] Typecheck/lint passer for nye filer

#### Manual Verification
- [ ] Når profile mangler felter → API svarer 403 med tydelig `code` + `redirectUrl`

**⚠️ PAUSE HERE** – service-lag klar før endpoints.

---

## Phase 3: API endpoints (profile)

### Overview
Eksponér status til frontend og giv et sted at “complete” profilen via API.

### Changes Required

#### 3.1 `GET /api/v1/profile/completeness`
**File:** `apps/web/app/api/v1/profile/completeness/route.ts` (ny)
- Auth required
- Returnerer `missingFields`, `isProfileComplete`, `hasDefaultShippingAddress`

#### 3.2 `GET /api/v1/profile/verification-status`
**File:** `apps/web/app/api/v1/profile/verification-status/route.ts` (ny)
- Auth required
- Returnerer identity status + evt. last updated

#### 3.3 `POST /api/v1/profile/complete`
**File:** `apps/web/app/api/v1/profile/complete/route.ts` (ny)
- Auth required
- Modtager input for manglende felter + default shipping address
- Valider med Zod schemas (ny: `apps/web/lib/validation/profile-completion-schemas.ts`)

#### 3.4 `POST /api/v1/profile/identity/request-review`
**File:** `apps/web/app/api/v1/profile/identity/request-review/route.ts` (ny)
- Auth required
- Opretter række i `identity_verification_review_requests`
- Opretter in-app notification (til brugeren) med “We received your request”
- (Email) kald til en no-op/stub funktion hvis provider ikke er konfigureret (se Phase 5 notes)

### Success Criteria

#### Automated Verification
- [ ] `npm run lint` / `npm run typecheck` / `npm run build` i `apps/web`

#### Manual Verification
- [ ] Endpoint returnerer korrekt status for en user med/uden address

**⚠️ PAUSE HERE** – API klar før UI.

---

## Phase 4: Frontend onboarding wizard + settings integration

### Overview
Byg `/profile/complete` som multi-step wizard (inspireret af jersey upload flow) + gør den tilgængelig fra settings og inline redirects.

### Changes Required

#### 4.1 Onboarding page
**File:** `apps/web/app/(dashboard)/profile/complete/page.tsx` (ny)

**UX krav (fra chat):**
- Kan tilgås når som helst
- Første login kan redirecte hertil hvis incomplete
- Hvis man kommer fra en handling, respekter `redirect_url`

**Pattern:**
- Step hook (ny): `apps/web/hooks/use-profile-completion-steps.ts`
- Progress bar (genbrug pattern fra `UploadJerseyProgress`)
- Header/footer struktur (genbrug pattern)

#### 4.2 Step components
**Files (nye):**
- `apps/web/components/profile/complete/ProfileCompletionHeader.tsx`
- `apps/web/components/profile/complete/ProfileCompletionProgress.tsx`
- `apps/web/components/profile/complete/ProfileCompletionFooter.tsx`
- `apps/web/components/profile/complete/steps/PersonalInfoStep.tsx`
- `apps/web/components/profile/complete/steps/ShippingAddressStep.tsx`
- `apps/web/components/profile/complete/steps/SummaryStep.tsx`

#### 4.3 Profile settings entry-point
**File:** `apps/web/app/(dashboard)/profile/page.tsx` (opdater)
- Tilføj entry: “Complete your profile” + vis status

#### 4.4 First-login redirect
**File:** `apps/web/app/(auth)/auth/page.tsx` (opdater)
- Efter successful email verification/login: kald completeness endpoint og redirect til onboarding hvis incomplete

### Success Criteria

#### Automated Verification
- [ ] Build + typecheck + lint

#### Manual Verification
- [ ] Ny bruger → efter login lander i onboarding hvis incomplete
- [ ] Existing bruger → kan åbne onboarding fra settings
- [ ] `redirect_url` respekteres efter completion

**⚠️ PAUSE HERE** – onboarding UX godkendt før Stripe Identity UI.

---

## Phase 5: Stripe Identity (seller) status + flow

### Overview
Implementér status lagring + basic flow for at starte verification session, opdatere status via webhook, og vise status i settings.

### Changes Required

#### 5.1 Seller verification page
**File:** `apps/web/app/(dashboard)/seller/verify-identity/page.tsx` (ny)
- Viser status: pending/verified/rejected
- CTA: “Start verification” (kalder backend)
- Ved rejected: “Request review”

#### 5.2 Backend: create verification session
**File:** `apps/web/app/api/v1/profile/identity/start/route.ts` (ny)
- Auth required
- Kalder Stripe Identity API (kræver `stripe` SDK + env vars)
- Gemmer `stripe_identity_verification_id` + status `pending`

#### 5.3 Backend: webhook handler
**File:** `apps/web/app/api/v1/stripe/webhook/route.ts` (ny)
- Verificér Stripe webhook signature
- Ved relevant event: opdatér `profiles.stripe_identity_verification_status`
- Opret in-app notification i `public.notifications`
- Email hook (integration point): kald `sendVerificationEmail()` **kun** hvis en email provider er konfigureret (ellers no-op). Email sending er ikke et krav for at HUD-41 er “done”, men hooket gør det nemt at tilføje senere.
- **Observability:** Brug Sentry til at capture exceptions i webhook-route (ingen payload/PII i logs). Log kun `event.type` + `verification_session.id` prefix.

#### 5.4 Stripe events + status mapping (skal være eksplicit)
**Vi lytter efter (minimum):**
- `identity.verification_session.processing` → `pending`
- `identity.verification_session.verified` → `verified`
- `identity.verification_session.requires_input` / `identity.verification_session.canceled` → `rejected` (i HUD-41 blokerer rejected for seller-actions)

**Note:** Vi logger ikke webhook payloads (PII). Kun event type + verification_session id prefix.

#### 5.5 Required env vars (skal være eksplicit)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` (til return URLs)

### Dependencies
- HUD-38 (Stripe Connect) er en overordnet dependency; men Identity kan implementeres isoleret hvis vi har Stripe keys og webhook infra.

### Success Criteria

#### Automated Verification
- [ ] Typecheck/lint

#### Manual Verification
- [ ] Start verification → status bliver pending
- [ ] Webhook event → status opdateres til verified/rejected
- [ ] Notification oprettes ved status change
- [ ] Webhook errors fanges og rapporteres (Sentry), uden PII

**⚠️ PAUSE HERE** – Stripe integration verificeret lokalt/staging før gating rulles bredt ud.

---

## Phase 6: Gating integration (listing/auction/checkout)

### Overview
Indfør konsekvent gating på de flows der kræver readiness.

### Changes Required

#### 6.1 Listing creation gating
**Files:**
- `apps/web/app/api/v1/listings/route.ts` (opdater)
- `apps/web/app/api/v1/auctions/route.ts` (opdater)

**Logic:**
- Seller action → `requireSellerVerification(req)`
- Return 403 med `redirectUrl` til onboarding eller verify-identity afhængig af hvad der mangler

#### 6.2 Checkout gating
**Files:** (afhængigt af eksisterende checkout endpoints)
- Implementér buyer gating hvor checkout initieres: `requireBuyerProfile(req)`

#### 6.3 Frontend handling af 403
- UI skal kunne håndtere “Verification required / Profile incomplete” og sende brugeren videre (via `redirectUrl` fra error details)

### Success Criteria

#### Manual Verification
- [ ] Ufuldstændig profil → create listing/auction blokkeres med klar besked + link
- [ ] Verified seller → kan fortsætte

---

## Testing Strategy

### Automated
- `apps/web`: `npm run lint`, `npm run typecheck`, `npm run build`
- Unit tests (hvis mønster findes i repo): `ProfileValidationService` (missing fields matrix)

### Manual
- New user: login → onboarding → complete → redirect til dashboard
- Seller: prøv “List for sale” uden verification → redirect til verify-identity
- Seller: rejected → request review → notification oprettes
- Buyer: prøv checkout uden address → redirect til onboarding

---

## Risks & Mitigations
- **DB computed column begrænsning:** generated columns kan ikke tjekke address-tabellen ⇒ vi deler completeness i DB (profile fields) + service (address).
- **Stripe webhook drift:** kræver korrekt deployment + secrets.
- **Skema inkonsistens i andre tabeller (UUID vs TEXT):** out-of-scope her, men kan blokere marketplace flows hvis de stadig forventer Supabase Auth UUIDs. Hvis det viser sig at være en blocker i praksis, bør vi lave en separat migration-ticket for ID-typer.
- **PII:** Addresses/phone/name må ikke logges. Stripe webhook payloads må ikke logges. Brug Sentry med scrubbers og kun minimale breadcrumbs.

---

## References
- Linear: HUD-41
- Docs: `.project/marketplace-features-linear-document.md`, `.project/04-Database_Schema.md`, `.project/05-API_Design.md`
- Related: HUD-25 (Clerk→Supabase→Medusa sync), HUD-38, HUD-39
