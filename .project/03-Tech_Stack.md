## 1. Formål

Dette dokument opsummerer den anbefalede tech stack til Huddle v1.0 baseret på PRD’et. Fokus er på høj udviklingshastighed, lav kompleksitet for et lille team og mulighed for at skalere uden at skulle skifte fundament senere.

---

## 2. Frontend

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript  
  - **Hvorfor:** Moderne standardstack, stærk DX, god SEO for landing/marketing-sider og app-lignende oplevelse til dashboard. Ét sprog (TypeScript) på tværs af front/back.  
  - **Status:** ✅ Migreret fra Vite til Next.js (HUD-13)

- **Styling & UI:** Tailwind CSS + shadcn/ui (Radix UI primitives)  
  - **Hvorfor:** Hurtig udvikling af dark, sportslig UI med konsistente design tokens og tilgængelige primitives.  
  - **Status:** ✅ 49 UI komponenter implementeret

- **State & data:** TanStack Query (React Query)  
  - **Hvorfor:** Stabil, battle-tested datahåndtering mod Medusa/Supabase-API'er med caching, refetch, mutations.

- **Forms & validering:** React Hook Form + Zod  
  - **Hvorfor:** Effektiv formhåndtering (upload jersey, listings, auktioner) med stærke typer og validering.  
  - **Status:** ✅ Implementeret i upload flows

- **Internationalisering:** next-intl (eller tilsvarende)  
  - **Hvorfor:** UI er engelsk fra dag ét, men bør kunne udvides til flere sprog uden større omskrivning.

---

## 3. Backend & Data

- **Sprog:** Node.js + TypeScript  
  - **Hvorfor:** Samme sprog som frontend, godt community, stærkt økosystem af biblioteker.

- **Commerce backend:** MedusaJS  
  - **Anvendelse:**  
    - Marketplace engine (P2P commerce).  
    - Listings (fastpris) som produkter/varianter.  
    - Auktioner via custom module (Auction, Bid, jobs til closing).  
    - Orders/transactions, regions, shipping rules.  
    - Medusa Admin til interne ops flows (moderation, refunds, disputes).
  - **Hvorfor:** Open source commerce-motor som kan tilpasses P2P; sparer meget grundarbejde på marketplace-logik og admin.
   - **Bemærkning:** Vi bruger **ikke** Medusas standard Next.js storefront – Huddles egen Next.js-app fungerer som custom storefront/produktoplevelse oven på Medusas headless API.

- **Database:** PostgreSQL  
  - **Provider:** Supabase (managed Postgres) – **MedusaJS peger også på Supabase-Postgres** som sin backend-database (separat schema/brugere, men samme instans i MVP).  
  - **Anvendelse:**  
    - Social graph (follows, likes, saves).  
    - Feed events og notifikationer.  
    - Evt. supplerende jersey-/brugerdata, der ikke passer i Medusa.  
  - **Hvorfor:** Stabil, relationsbaseret DB med god støtte til komplekse queries og data-integritet.

- **Autentifikation:** Clerk  
  - **Anvendelse:**  
    - Sign-up/sign-in, sessioner, evt. social logins og MFA senere.  
    - Huddle-profiler mappes 1:1 til Clerk users (ekstra domænefelter i egen DB).  
  - **Hvorfor:** Hurtig at integrere, god UX out-of-the-box, stærk dev-oplevelse.

- **Fil- og billedstorage:** Supabase Storage  
  - **Anvendelse:** Billeder af jerseys (original + WebP variants) i `jersey_images` bucket.  
  - **Hvorfor:** Billigt, simpelt, tæt integreret med Postgres; let at skifte til dedikeret S3/R2 senere hvis nødvendigt.  
  - **Features:**  
    - Normaliseret `jersey_images` tabel (erstatter `images[]` array)
    - WebP generation via Edge Function
    - Image embeddings (OpenAI) for template matching
    - Cleanup Edge Function for abandoned files

---

## 4. Infrastruktur & Deployment

- **Frontend-hosting:** Vercel  
  - **Hvorfor:** Native til Next.js, automatisk previews, enkel miljøvariabel-håndtering, stærk performance.  
  - **Status:** ✅ Next.js 15 app deployeret

- **Backend-hosting (Medusa):** Railway (primært) / evt. senere Fly.io/andre som supplement  
  - **Hvorfor:** Railway giver enkel Node-hosting, god DX til små teams og nem skalering; passer til MedusaJS og supplerer Vercel godt.  
  - **Status:** ✅ Medusa kører lokalt i `apps/medusa/`

- **Database & storage:** Supabase  
  - **Hvorfor:** Managed Postgres + Storage + Edge Functions, god balance mellem pris og power.  
  - **Features:**  
    - Postgres med multiple schemas (`public`, `metadata`, `medusa`)
    - Supabase Storage for jersey images
    - Edge Functions for backend services (9 functions implementeret)
    - pg_cron for scheduled jobs (cleanup)

- **CI/CD:** GitHub Actions + Vercel/host-integrations  
  - **Flow:**  
    - PR: lint → test → build.  
    - Merge til `main`: automatisk deploy til Vercel (frontend) og Render/Railway (backend).

- **Monitoring & logging:** Sentry (frontend + backend) + platform-logs  
  - **Hvorfor:** Hurtig indsigt i fejl og performance uden tung opsætning.  
  - **Status:** ✅ Konfigureret (client, server, edge)

---

## 5. Third-Party Services

- **Betaling:** Stripe (Connect)  
  - **Anvendelse:** P2P-betalinger med Huddles transaction fee ovenpå, håndtering af payouts, refunds, disputes.  
  - **Hvorfor:** Velafprøvet til marketplaces, god dokumentation, reducerer compliance-/KYC-arbejde.

- **ID-verifikation:** Stripe Identity (førstevalg)  
  - **Anvendelse:** Obligatorisk ID-verifikation for sælgere/biddere.  
  - **Hvorfor:** Samme leverandør som betaling, færre integrationer og samlet økonomi/compliance.

- **Vision AI:** OpenAI Vision API  
  - **Anvendelse:** Automatisk metadata extraction fra jersey billeder (club, season, player, number, badges).  
  - **Hvorfor:** Reducerer manuel input, forbedrer data kvalitet.  
  - **Status:** ✅ Implementeret via `analyze-jersey-vision` Edge Function

- **Metadata Source:** Transfermarkt API  
  - **Anvendelse:** Fodboldreferencedata (clubs, players, seasons, competitions).  
  - **Hvorfor:** Omfattende historiske data (10-15+ år), gratis API.  
  - **Status:** ✅ Integreret via Edge Functions og seed scripts

- **E-mail:** Resend eller Postmark  
  - **Anvendelse:** Verifikationsmails, kritiske notifikationer (auktion vundet/tabt, ordrestatus).  
  - **Hvorfor:** Billige, pålidelige, nem integration til Node/Next.

- **Produktanalyse (senere):** PostHog eller Plausible  
  - **Anvendelse:** Tracke activation, engagement, funnels fra PRD'ets KPI'er.  
  - **Hvorfor:** Privacy-venlige, gode til startups.

---

## 6. Development Tools & Workflow

- **Editor/IDE:** Cursor (ovenpå VS Code)  
  - Plugins/indbygget funktionalitet: ESLint, Prettier, Tailwind IntelliSense, GitLens-lignende git-indsigt, TypeScript tooling – plus AI-assistance direkte i editoren.

- **Versionsstyring:** Git + GitHub  
  - Branch-struktur:  
    - `main` = stabil.  
    - Feature branches: `feature/huddle-<id>-<kort-navn>`.  
  - Pull requests med kort WHAT/WHY og link til PRD/issue.

- **Projektstyring:** Linear (issues/roadmap) + Notion (docs)  
  - **Hvorfor:** Linear (allerede valgt) er hurtigt og let for små teams; Notion egner sig til PRD, projektbriefs og beslutningslog.

- **Kodekvalitet:**  
  - TypeScript strict mode.  
  - ESLint + Prettier hooks (pre-commit eller CI).  
  - Enkle enhedstests dér hvor der er høj kompleksitet (auktioner, fee-beregning).

---

## 7. Opsummering

Stacken er designet til, at **én til få udviklere** kan komme hurtigt i gang, stå på skuldrene af stærke open source-værktøjer (Next.js, Medusa, Supabase) og samtidig have en klar vej til skalering. De fleste tunge domæner (commerce, auth, payments, ID) håndteres af specialiserede services, så teamet kan fokusere på Huddles kerneværdi: oplevelsen for fodboldtrøje-samleren.


