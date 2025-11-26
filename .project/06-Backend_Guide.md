## 1. Formål med denne guide

Denne guide beskriver, **trin for trin**, hvordan backend til Huddle kan bygges fra bunden, baseret på:

- `01-Project-Brief.md` (produktidé og koncept)  
- `02-PRD.md` (krav, flows, features)  
- `03-Tech_Stack.md` (Next.js, MedusaJS, Supabase, Clerk, Stripe)  
- `04-Database_Schema.md` (Supabase + plan for Medusa)  
- `05-API_Design.md` (API-endpoints og kontrakter)

Målet er, at en **mid-level udvikler** kan følge guiden og:

- Sætte miljø og tools korrekt op.  
- Bygge en robust, udvidbar backend i faser.  
- Undgå typiske faldgruber med auth, RLS, Medusa-integration og API-design.

---

## 2. Project Setup & Environment

### 2.1 Forudsætninger

- Node.js LTS (fx 20.x)  
- pnpm eller npm (vælg én, brug konsekvent)  
- PostgreSQL (via Supabase)  
- Git + GitHub repo  
- Editor: **Cursor** (VS Code-baseret)

### 2.2 Repositories & struktur (monorepo med Next.js API routes)

Vi kører **én monorepo** hvor både frontend og backend lever i samme Next.js‑app:

```text
root/
  apps/
    web/          # Next.js app (UI + API routes)
  supabase/
    migrations/   # Allerede oprettet
  .project/       # Projekt-dokumentation (brief, PRD, guides)
```

Alt Huddle‑API’et implementeres som **Next.js route handlers** under `apps/web/app/api/v1/...`.  
Medusa kan senere ligge i egen mappe (`apps/medusa/`), men er en separat service der kaldes fra Next‑API’et.

### 2.3 Dependencies (backend/API)

I `apps/web` (Next.js app med app router og API routes):

- **Core:**
  - `typescript`, `ts-node`, `@types/node`
  - `zod` (validering)
- **Supabase:**
  - `@supabase/supabase-js`
- **Clerk:**
  - `@clerk/backend` (til JWT-verifikation i API)
- **Logging & errors (valgfrit men anbefalet):**
  - `@sentry/node` eller tilsvarende

Hvis du bruger **Next.js route handlers** som backend (`apps/web`), genbruger du mange af de samme deps der.

### 2.4 Environment configuration

Opret `.env.local` (lokalt) og tilsvarende secrets i Vercel/Railway:

- **Supabase:**
  - `SUPABASE_URL=...`
  - `SUPABASE_SERVICE_ROLE_KEY=...` (bruges KUN server-side)  
- **Clerk:**
  - `CLERK_JWT_KEY=...` / konfiguration til at verificere tokens
- **Stripe (senere):**
  - `STRIPE_SECRET_KEY=...`
  - `STRIPE_WEBHOOK_SECRET=...`

Hold service role og Stripe-nøgler strengt server-side (aldrig i client bundles).

### 2.5 Database setup (Supabase)

1. Opret Supabase-projekt.  
2. Peg lokalt `supabase`-CLI mod projektet.  
3. Kør eksisterende migrations i `supabase/migrations` (de matcher `04-Database_Schema.md`).  
4. Verificér i Supabase UI:
   - Tabeller: `jerseys`, `sale_listings`, `auctions`, `bids`, `transactions`, `profiles`, `follows`, `likes`, `saved_jerseys`, `posts`, `comments`, `conversations`, `messages`, `notifications`, `search_analytics` m.fl.

### 2.6 MedusaJS (senere)

Denne guide fokuserer primært på Huddle API + Supabase. Medusa sættes op i **Fase 4** (Advanced features).

### 2.7 MedusaJS Setup (Fase 4 - Implementeret)

Medusa backend er installeret i `apps/medusa/` og konfigureret til at bruge Supabase Postgres med `medusa` schema.

**Lokal Setup:**

1. **Environment Variables:**
   ```bash
   cd apps/medusa
   cp .env.example .env
   # Rediger .env med Supabase connection string + search_path=medusa
   # Format: DATABASE_URL=postgres://user:pass@host:port/dbname?search_path=medusa
   # KRITISK: DATABASE_SCHEMA=medusa skal også være i .env
   ```

2. **Start Medusa:**
   ```bash
   # Fra root
   npm run dev:medusa
   
   # Eller fra apps/medusa
   cd apps/medusa && npm run dev
   ```

3. **Access Admin:**
   - Medusa Admin: http://localhost:9000/app
   - Standard Medusa login (ikke Clerk)
   - Opret admin user: `npx medusa user -e admin@huddle.dk -p supersecret`

4. **Run Migrations:**
   ```bash
   cd apps/medusa
   npx medusa db:migrate
   ```

**Database Connection:**
- Connection string format: `postgres://user:pass@host:port/dbname?search_path=medusa`
- **KRITISK:** Medusa v2 kræver BÅDE `search_path` i connection string OG `databaseSchema: "medusa"` i `medusa-config.ts`
- Schema isolation sikrer ingen konflikter med `public.*` tabeller
- Medusa migrations opretter tabeller i `medusa.*` namespace (118 tabeller verificeret)

**Troubleshooting:**
- Hvis tabeller placeres i `public` schema: Verificer at `databaseSchema: "medusa"` er sat i `medusa-config.ts`
- Hvis admin dashboard hænger: Installer dependencies: `use-sidecar`, `react-remove-scroll-bar`, `use-callback-ref`, `react-style-singleton`
- Hvis port 9000 er i brug: `lsof -ti:9000 | xargs kill -9`
- Clear cache hvis bundling fejler: `rm -rf node_modules/.vite .medusa/admin .cache`

**Integration med Huddle API:**
- Huddle Next.js API routes kalder Medusa API (`http://localhost:9000`)
- Cross-schema references via UUID felter (fx `jerseys.medusa_product_id`)
- Se `.project/04-Database_Schema.md` for integration patterns

**Se også:**
- `apps/medusa/README.md` - Lokal setup guide
- `.project/04-Database_Schema.md` - Schema isolation og integration patterns
- Implementation plan: `.project/plans/HUD-15/implementation-plan-2025-11-26-HUD-15.md`

---

## 3. Udviklingsfaser (high level)

1. **Fase 1 – Foundation & core models**
   - Sæt projekt, Supabase-klient og basis API-struktur op.
   - Implementér simple read‑endpoints (fx `GET /jerseys/:id`, `GET /feed`).
2. **Fase 2 – Authentication integration**
   - Integrér Clerk med API’et.  
   - Mappning mellem Clerk user og Supabase `profiles`.
3. **Fase 3 – Core business logic APIs**
   - Wardrobe: CRUD på jerseys.  
   - Marketplace: sale listings, auktioner, bud, transactions.
4. **Fase 4 – Advanced features**
   - Messaging, notifications, search analytics.  
   - Integration med Medusa (products/orders/shipping) og Stripe.
5. **Fase 5 – Testing & optimization**
   - Enhedstests, integrationstests.  
   - Performance, logging, sikkerhed, pre‑launch check.

Nedenfor brydes hver fase ned i konkrete trin.

---

## 4. Fase 1 – Foundation & Core Models

### 4.1 Mål

- Have et kørende API-projekt, der kan:
  - Læse fra Supabase (public data).  
  - Eksponere simple endpoints i henhold til `05-API_Design.md`.

### 4.2 Trin

1. **Opret første API-route i Next.js**
   - Opret mappe `apps/web/app/api/v1/health/route.ts` med en simpel handler:

   ```ts
   export function GET() {
     return new Response(JSON.stringify({ status: "ok" }), {
       status: 200,
       headers: { "Content-Type": "application/json" }
     });
   }
   ```

2. **Tilføj Supabase client (server-side)**

   ```ts
   // apps/web/lib/supabase-server.ts (eksempel)
   import { createClient } from "@supabase/supabase-js";

   export const supabaseServer = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   );
   ```

   - Brug **service role** KUN i serverkode til administrative queries (RLS kan slås fra for service role, men bevar for users).

3. **Implementér simpelt endpoint: GET /api/v1/jerseys/:id**

   - Fetch fra `public.jerseys` og returnér data i det format, `05-API_Design.md` beskriver.
   - Mapping fra DB-felter (`jersey_type`) til API-felter (`jerseyType`) gøres i et “mapper‑lag”.

4. **Implementér GET /api/v1/users/:id**

   - Hent profil fra `profiles`.  
   - Udregn `followers`/`following` via `follows` (COUNT queries).

### 4.3 Testing & checkpoints

- `GET /api/v1/jerseys/:id` returnerer korrekt jersey (public) og 404 ved ukendt id.  
- `GET /api/v1/users/:id` returnerer korrekt data og 404 ved ukendt id.

### 4.4 Typiske issues

- **CORS:**  
  - Husk at tillade frontend‑origin i API.  
- **Supabase roles:**  
  - Hvis du får 401/403 fra Supabase, check om du bruger service role eller user‑session korrekt.

---

## 5. Fase 2 – Authentication System (Clerk + Supabase)

### 5.1 Mål

- API’et skal kunne:
  - Verificere Clerk JWT på alle beskyttede endpoints.  
  - Mappe `userId` til `profiles` og oprette profil ved første login.

### 5.2 Trin

1. **Clerk server-side SDK**

   ```ts
   import { Clerk } from "@clerk/backend";

   const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY! });

   export async function getCurrentUser(authHeader?: string) {
     if (!authHeader) return null;
     const token = authHeader.replace("Bearer ", "");
     const session = await clerk.verifyToken(token);
     return session ? { userId: session.sub } : null;
   }
   ```

2. **Auth middleware**

   - I Next.js: lav en helper til route handlers, fx:

   ```ts
   export async function requireAuth(req: Request) {
     const authHeader = req.headers.get("authorization") ?? undefined;
     const user = await getCurrentUser(authHeader);
     if (!user) {
       return new Response(
         JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Login required" } }),
         { status: 401 }
       );
     }
     return user;
   }
   ```

3. **Profile sync**

   - Ved første kald til et auth‑krævet endpoint:
     - Tjek om `profiles` har en række for `user.userId`.  
     - Hvis ikke → opret `profiles` med basis info (username placeholder, evt. fra Clerk).

4. **RLS alignment**

   - Sørg for, at Supabase‑RLS bruger `auth.uid()` konsistent (Supabase side) når du kalder med user‑token, og service role, når API’et laver administrative kald.

### 5.3 Testing

- Kald et beskyttet endpoint uden token → 401.  
- Kald med gyldig token → 200 og profil oprettes automatisk i `profiles`.

---

## 6. Fase 3 – Core Business Logic APIs

Nu bygger du de vigtigste flows fra `05-API_Design.md`.

### 6.1 Wardrobe (jerseys)

**Mål:** Implementere:

- `POST /api/v1/jerseys`  
- `GET /api/v1/jerseys/:id`  
- `GET /api/v1/users/:id/wardrobe`  
- `PATCH/DELETE /api/v1/jerseys/:id`

**Trin:**

1. Lav Zod‑schemas for `JerseyCreate` og `JerseyUpdate`.  
2. Implementér `POST`:
   - `requireAuth` → valider body → insert i `public.jerseys` (owner_id = current user).  
3. Implementér `GET /:id`:
   - Join/aggregér likes, saves, sale_listings/auctions.  
4. Implementér `PATCH/DELETE`:
   - Check `owner_id` før ændring/sletning.

### 6.2 Marketplace – Sale listings

**Mål:** Implementere:

- `POST /api/v1/sale-listings`  
- `GET /api/v1/sale-listings`  
- Evt. `PATCH /api/v1/sale-listings/:id` til at ændre pris/status.

**Trin:**

1. Zod‑schema for sale listing body.  
2. `POST`:
   - `requireAuth + requireVerified` (ID‑status kan ligge i `profiles`/Clerk claims).  
   - Check at jersey tilhører sælger og ikke allerede er aktiv i anden listing/auction.  
3. `GET`:
   - Byg SQL eller Supabase query med filtre (status, club, season, pris).  
   - Join jersey + seller profil til respons.

### 6.3 Auktioner & bud

**Mål:** Implementere:

- `POST /api/v1/auctions`  
- `GET /api/v1/auctions`  
- `POST /api/v1/auctions/:id/bids`

**Trin:**

1. Zod‑schemas for `AuctionCreate` og `BidCreate`.  
2. `POST /auctions`:
   - Samme ejerskabs‑ og verified‑checks som ved sale listings.  
3. `POST /:id/bids`:
   - Tjek status = active.  
   - Tjek at bud > currentBid (eller startingBid) + min‑step.  
   - Insert i `bids` og lad trigger opdatere `current_bid`.

### 6.4 Transactions

**Mål:** Simpelt endpoint:

- `GET /api/v1/transactions` (egen historik).

**Trin:**

1. `requireAuth`.  
2. SELECT på `transactions` med `buyer_id = userId` eller `seller_id = userId`.  
3. Join jersey/listing info, så UI kan vise det pænt.

### 6.5 Testing & checkpoints

- Kan oprette jersey → liste til salg → se den i marketplace.  
- Kan oprette auktion → byde → se bud i auktionsdetaljer.  
- RLS-politikker brydes ikke (ingen kan se/ændre andres private data).

---

## 7. Fase 4 – Advanced Features & Medusa-integration

### 7.1 Messaging

Implementér:

- `GET /api/v1/conversations`  
- `GET /api/v1/conversations/:id/messages`  
- `POST /api/v1/conversations/:id/messages`  
- `POST /api/v1/sale-listings/:id/interest` (opretter conversation)

Trin:

1. Brug `conversations` og `messages` tabellerne fra Supabase.  
2. Sørg for, at kun deltagere i en conversation kan læse/skrive (Supabase RLS + API‑checks).  
3. Returnér `updatedAt` sorterede conversations til inbox‑view.

### 7.2 Notifications

Implementér:

- `GET /api/v1/notifications`  
- `POST /api/v1/notifications/:id/read`

Sørg for at oprette notifikationer i de vigtigste flows (nyt bud, outbid, auktion vundet, item sold, new follower).

### 7.3 Search & analytics

- `GET /api/v1/search`:
  - Start simpelt: `ILIKE` queries på `club`, `season`, `player_name` og pris‑filtre.  
- Log queries i `search_analytics` til senere insights.

### 7.4 Medusa & Stripe (første iteration)

1. **Sæt Medusa op i `apps/medusa`** med standard-konfiguration, der peger på samme Postgres‑instans (eget schema).  
2. **Definér mapping** (jf. `04-Database_Schema.md`):
   - Tilføj felt `medusa_product_id` på `jerseys` eller `sale_listings`.  
3. **Checkout flow (høj-niveau):**
   - Huddle API endpoint: `POST /api/v1/checkout`:
     - Modtager listing/auction id.  
     - Kalder Medusa/Stripe for at oprette payment intent.  
     - Sender klienten URL eller client secret.  
   - Webhooks håndterer opdatering af `transactions` + `sale_listings`/`auctions` status.

Dette kan gradvist udbygges; vigtigst er at holde Huddle API som **enkelt entrypoint** mod frontend.

---

## 8. Fase 5 – Testing & Optimization

### 8.1 Testtyper

- **Enhedstests:**  
  - Valideringslogik (Zod), hjælpefunktioner (pris‑beregninger, auktionsregler).  
- **Integrationstests:**  
  - API‑endpoints mod en test‑database (Supabase test‑projekt eller lokal Postgres).  
- **End-to-end (senere):**  
  - Cypress/Playwright mod staging.

### 8.2 Checkpoints

- Alle core endpoints i `05-API_Design.md` testet (happy + error cases).  
- Essentielle RLS‑scenarier dækket (kan ikke læse andres private data, kan ikke ændre andres ressourcer).

### 8.3 Performance & optimering

- Brug indekser defineret i migrations (`idx_*` på `status`, `seller_id`, `ends_at`, osv.).  
- Undgå N+1‑queries ved at hente relaterede data i få JOINs eller batche Supabase‑kald.  
- Profilér tunge queries via Supabase SQL console og EXPLAIN ANALYZE.

---

## 9. Code Structure Guidelines

### 9.1 Mappe- & filstruktur (API-lag)

Eksempel (Next.js app routes):

```text
apps/web/
  app/
    api/
      v1/
        jerseys/
          route.ts          # GET/POST /api/v1/jerseys
        jerseys/[id]/
          route.ts          # GET/PATCH/DELETE /api/v1/jerseys/:id
        sale-listings/
          route.ts
        auctions/
          route.ts
        auctions/[id]/bids/
          route.ts
        me/
          route.ts
        users/[id]/wardrobe/
          route.ts
  lib/
    supabase-server.ts
    auth.ts                # Clerk helpers
    mappers/
      jerseyMapper.ts
      listingMapper.ts
    validation/
      jerseySchemas.ts
      listingSchemas.ts
```

### 9.2 Navngivning & patterns

- Filer: `kebab-case` (`jersey-schemas.ts`, `sale-listing-service.ts`).  
- Funktionsnavne: klare verber (`createJersey`, `getUserWardrobe`, `placeBid`).  
- Del kode i lag:
  - **Route handler**: auth, validering, mapping til service-kald, HTTP-respons.  
  - **Service**: domænelogik (tjek, regler, kald til repositories).  
  - **Repository**: direkte Supabase/DB‑kald.

### 9.3 Best practices for stacken

- Brug **Supabase types** (`Tables<"jerseys">`) for typed DB-kald.  
- Lad kun service‑lag kende til DB‑struktur; frontend skal kende til API-modellerne, ikke DB‑feltnavne.  
- Log alle kritiske fejl med Sentry (eller lignende) med kontekst (endpoint, userId, payload-size).

---

## 10. Deployment Preparation

### 10.1 Production configuration

- Sæt environment‑variabler op i Vercel (frontend/API) og Railway/Medusa.  
- Sørg for separate Supabase‑projekter for **staging** og **production**.  
- Aktivér back‑ups og point-in-time recovery i Supabase (når det giver mening ift. pris).

### 10.2 Security checklist

- Ingen hemmeligheder i kode / Git.  
- CORS kun modkendte origins.  
- RLS aktiveret på alle tabeller med brugerdata.  
- Clerk‑keys, Supabase service role og Stripe‑keys KUN i servermiljøer.  
- Rate limiting aktiv på API’et.

### 10.3 Performance

- Cache læse‑tunge endpoints hvor muligt (fx offentlige feeds) via ISR/caching‑strategier i Next.js.  
- Brug pagination (cursor‑baseret) på feeds og lister.  
- Overvåg DB‑load og query‑tider i Supabase.

### 10.4 Monitoring & observability

- **Sentry**:
  - Opsæt for både API og frontend.  
  - Konfigurer release‑tags (git SHA) for hurtig fejlfinding.
- **Supabase logs & metrics**:
  - Hold øje med langsomme queries og RLS‑fejl.  
- Evt. letvægts analytics (PostHog/Plausible) til at tracke funnels (upload → listing → bid → transaction).

---

## 11. Afslutning

Denne backend-guide binder **PRD**, **Tech Stack**, **Database Schema** og **API Design** sammen til en konkret implementeringsplan.  
Når du udvikler, bør du løbende:

- Holde `02-PRD.md`, `04-Database_Schema.md` og `05-API_Design.md` opdateret, når du tager nye beslutninger.  
- Notere ændringer og kompromiser direkte i `.project`‑filerne, så fremtidige udviklere og dig selv kan forstå historikken.  
- Bygge i små, vertikale slices (f.eks. “upload jersey end-to-end” før du går videre til hele marketplace).

Hvis du følger faserne i denne guide, vil du have en backend, der både understøtter en hurtig MVP og kan udvikles videre til den fulde Huddle‑vision uden at skulle smides ud og bygges om fra bunden.


