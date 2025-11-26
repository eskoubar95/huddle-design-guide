# Integrér Medusa backend/admin i monorepo med Supabase "medusa" schema - Implementation Plan

## Overview

Integrér MedusaJS backend og admin i monorepoet som separat app (`apps/medusa/`) med schema isolation i Supabase Postgres. Medusa skal bruge samme database instans som resten af systemet, men i et separat `medusa` schema for at undgå konflikter med eksisterende `public` schema tabeller.

**Hvorfor:** Huddle skal bruge MedusaJS som commerce-motor (products, orders, shipping, marketplace-logik), men der er endnu ikke sat en Medusa-backend op. Vi har brug for en løsning hvor Medusa backend + admin installeres uden at trække deres standard storefront ind (da vi har vores egen Next.js-app i `apps/web`), og hvor Medusa anvender samme Supabase-Postgres instans men i separat schema.

**Mål:** Medusa backend/admin er installeret og konfigureret, `medusa` schema er oprettet i Supabase, migrations er kørt succesfuldt, og integration patterns mellem Huddle og Medusa domæner er dokumenteret.

---

## Linear Issue

**Issue:** [HUD-15](https://linear.app/huddle-world/issue/HUD-15/integrer-medusa-backendadmin-i-monorepo-med-supabase-medusa-schema)  
**Status:** Backlog  
**Priority:** High  
**Labels:** Migration, Feature  
**Team:** Huddle World  
**Branch:** `nicklaseskou95/hud-15-integrer-medusa-backendadmin-i-monorepo-med-supabase-medusa`  
**Created:** 2025-11-26  
**Updated:** 2025-11-26

---

## Current State Analysis

### Eksisterende Struktur:

```
huddle-design-guide/
├── apps/
│   └── web/              # Next.js app (eksisterende)
│       ├── app/          # Next.js App Router
│       ├── components/   # React komponenter
│       └── lib/          # Utilities, Supabase clients
├── supabase/
│   └── migrations/       # 15 migrations, alle i public schema
├── packages/
│   └── types/           # Shared TypeScript types
└── package.json         # Root med npm workspaces
```

### Database Status:

- **Supabase Postgres:** Eksisterende instans med `public` schema
- **Public Schema Tabeller:** `profiles`, `jerseys`, `sale_listings`, `auctions`, `bids`, `transactions`, `follows`, `likes`, `saved_jerseys`, `posts`, `conversations`, `messages`, `notifications`, `search_analytics`
- **Medusa Schema:** Ikke eksisterer endnu
- **Migrations:** Alle i `supabase/migrations/`, timestamped SQL filer

### Key Discoveries:

1. **Monorepo Struktur:**
   - Root `package.json` bruger npm workspaces (`apps/*`, `packages/*`, `src`)
   - Eksisterende scripts: `dev`, `dev:legacy`, `build:legacy`, `lint`, `typecheck`
   - Ingen Medusa app eksisterer endnu

2. **Database Patterns:**
   - Alle Supabase migrations bruger eksplicit `public.` prefix
   - RLS aktiveret på alle user-facing tabeller
   - Connection strings via env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service role key tilgængelig for server-side operations

3. **MedusaJS Research Findings:**
   - MedusaJS v2 bruger MikroORM (ikke TypeORM)
   - Schema isolation kræver BÅDE `search_path` i connection string OG `databaseSchema` config
   - `databaseSchema` config option er IKKE deprecated - den er nødvendig for Medusa v2
   - Standard approach: 
     - Connection string: `postgres://user:pass@host:port/dbname?search_path=medusa`
     - Config: `databaseSchema: "medusa"` i `medusa-config.ts`
   - Medusa håndterer sine egne migrations (MikroORM)
   - Admin dashboard kræver ekstra dependencies: `use-sidecar`, `react-remove-scroll-bar`, `use-callback-ref`, `react-style-singleton`

4. **Dokumentation:**
   - `.project/04-Database_Schema.md` beskriver plan for Medusa schema isolation
   - `.project/03-Tech_Stack.md` nævner MedusaJS skal bruge samme Supabase Postgres, separat schema
   - `.project/06-Backend_Guide.md` nævner Medusa i Fase 4 (Advanced features)

5. **Authentication:**
   - Huddle Next.js app bruger Clerk (ikke endnu implementeret, men planlagt)
   - Medusa Admin har sit eget login system (standard Medusa auth)

---

## Desired End State

### Målstruktur:

```
huddle-design-guide/
├── apps/
│   ├── web/              # Next.js app (eksisterende)
│   └── medusa/           # Medusa backend + admin (NY)
│       ├── src/
│       ├── medusa-config.ts
│       ├── package.json
│       └── README.md
├── supabase/
│   └── migrations/
│       └── YYYYMMDDHHMM_create_medusa_schema.sql  # NY migration
└── package.json          # Opdateret med medusa scripts
```

### Database Schema:

```
Supabase Postgres (samme instans)
├── public schema (Huddle app)
│   ├── profiles, jerseys, sale_listings, auctions, bids, transactions
│   └── ... (alle eksisterende tabeller)
│
└── medusa schema (MedusaJS commerce)  # NY
    ├── products, variants, orders, regions, shipping_profiles
    └── ... (Medusa's egne tabeller via migrations)
```

### Verification Criteria:

- ✅ `medusa` schema eksisterer i Supabase og er dokumenteret
- ✅ Medusa backend installeret i `apps/medusa/` uden Next.js Starter Storefront
- ✅ Medusa konfigureret med Supabase connection string + `search_path=medusa` + `databaseSchema: "medusa"` config
- ✅ Medusa migrations kørt succesfuldt mod `medusa` schema (118 tabeller i medusa, 17 i public)
- ✅ `public` schema tabeller er uændrede (ingen konflikter, migration tracking tabeller ryddet op)
- ✅ Medusa admin tilgængelig på separat port (`localhost:9000`)
- ✅ Admin user oprettet og login fungerer (`admin@huddle.dk`)
- ✅ Admin dashboard dependencies installeret (use-sidecar, react-remove-scroll-bar, etc.)
- ⏳ Integration patterns dokumenteret (fx `jerseys.medusa_product_id`) - Phase 4
- ⏳ `.project/06-Backend_Guide.md` opdateret med Medusa setup trin - Phase 4
- ⏳ Root `package.json` har `dev:medusa` script - Phase 5

---

## What We're NOT Doing

- ❌ **Ingen Next.js Starter Storefront** - Vi bruger kun Medusa backend + admin
- ❌ **Ingen Clerk integration til Medusa Admin** - Medusa bruger sit eget login system
- ❌ **Ingen migration af eksisterende data** - Kun schema setup og Medusa installation
- ❌ **Ingen API integration endnu** - Det er HUD-12 (API routes) der håndterer integration
- ❌ **Ingen production deployment** - Kun lokal setup og dokumentation
- ❌ **Ingen ændringer til eksisterende Supabase migrations** - Kun ny migration til `medusa` schema
- ❌ **Ingen frontend integration** - Det er fremtidige issues

---

## Implementation Approach

**Strategi:** Gradvist, inkrementelt setup med pause points efter hver phase. Hver phase kan testes isoleret.

**Schema Isolation Approach:** 
- Bruger BÅDE `search_path=medusa` i PostgreSQL connection string OG `databaseSchema: "medusa"` i config
- Medusa v2 bruger MikroORM, som kræver eksplicit `databaseSchema` config for korrekt schema isolation
- `search_path` alene er ikke nok - migrations vil stadig placere tabeller i `public` schema uden `databaseSchema` config
- Kombinationen sikrer korrekt isolation: connection string + config property

**Medusa Installation:**
- Brug `npx create-medusa-app@latest` men vælg kun backend + admin (ikke storefront)
- Eller manuel installation af Medusa packages

**Port Configuration:**
- Medusa backend: `localhost:9000` (standard Medusa port)
- Next.js app: `localhost:3000` (eksisterende)

---

## Phase 1: Database Schema Setup

### Overview

Opret `medusa` schema i Supabase via migration og dokumenter i `.project/04-Database_Schema.md`. Dette sikrer at schema'et eksisterer før Medusa installation.

### Changes Required:

#### 1. Opret Supabase Migration for medusa Schema
**File:** `supabase/migrations/YYYYMMDDHHMM_create_medusa_schema.sql` (ny fil)  
**Changes:** Opret migration der opretter `medusa` schema

```sql
-- Create medusa schema for MedusaJS commerce data
-- This schema will contain Medusa's tables (products, orders, regions, etc.)
-- Separate from public schema to avoid conflicts with Huddle app tables

CREATE SCHEMA IF NOT EXISTS medusa;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA medusa TO postgres;
GRANT CREATE ON SCHEMA medusa TO postgres;

-- Comment explaining purpose
COMMENT ON SCHEMA medusa IS 'MedusaJS commerce schema - products, orders, regions, shipping profiles, etc. Managed by Medusa migrations.';
```

**Rationale:** Opretter `medusa` schema i Supabase Postgres. `IF NOT EXISTS` sikrer idempotency. Permissions sikrer at Medusa kan oprette tabeller i schema'et.

#### 2. Opdater Database Schema Dokumentation
**File:** `.project/04-Database_Schema.md`  
**Changes:** Tilføj sektion om `medusa` schema efter eksisterende "MedusaJS schema & integration (plan)" sektion

```markdown
## 6. Medusa Schema (implementeret)

### 6.1 Schema Oprettelse

`medusa` schema er oprettet i Supabase Postgres via migration `YYYYMMDDHHMM_create_medusa_schema.sql`.

**Schema Isolation:**
- MedusaJS bruger `search_path=medusa` i connection string
- Alle Medusa tabeller oprettes i `medusa.*` namespace
- Ingen konflikter med `public.*` tabeller

**Medusa Tabeller (oprettes via Medusa migrations):**
- `products`, `variants`, `orders`, `regions`, `shipping_profiles`, osv.
- Se Medusa dokumentation for fuld liste

### 6.2 Connection String Format

Medusa konfigureres med:
```
DATABASE_URL=postgres://user:pass@host:port/dbname?search_path=medusa
```

Dette sikrer at alle Medusa queries automatisk bruger `medusa` schema.
```

**Rationale:** Dokumenterer at `medusa` schema er implementeret og hvordan det bruges. Giver klarhed for fremtidig udvikling.

### Success Criteria:

#### Automated Verification:
- [ ] Migration fil eksisterer: `supabase/migrations/YYYYMMDDHHMM_create_medusa_schema.sql`
- [ ] Migration kan køres: `npx supabase migration up` (hvis Supabase CLI er konfigureret)
- [ ] SQL syntax er valid (ingen syntax errors)

#### Manual Verification:
- [ ] `medusa` schema eksisterer i Supabase database (tjek via Supabase Dashboard → Database → Schemas)
- [ ] Schema har korrekt permissions (postgres user kan oprette tabeller)
- [ ] Dokumentation er opdateret i `.project/04-Database_Schema.md`

**⚠️ PAUSE HERE** - Verificer schema oprettelse før Phase 2

---

## Phase 2: Medusa Installation & Basic Configuration

### Overview

Installer MedusaJS i `apps/medusa/` uden Next.js Starter Storefront. Setup grundlæggende konfiguration med Supabase connection string.

### Changes Required:

#### 1. Opret Medusa App Directory
**File:** `apps/medusa/` (ny directory)  
**Changes:** Opret directory struktur for Medusa backend

```bash
mkdir -p apps/medusa
cd apps/medusa
```

**Rationale:** Standard monorepo struktur for apps. Medusa skal være separat app i `apps/` directory.

#### 2. Installer MedusaJS (Backend + Admin)
**File:** `apps/medusa/package.json` (ny fil)  
**Changes:** Opret Medusa projekt med kun backend + admin

**Approach A: Brug create-medusa-app (anbefalet)**
```bash
cd apps/medusa
npx create-medusa-app@latest . --skip-db --skip-env
# Vælg: Backend + Admin (ikke Storefront)
```

**Approach B: Manuel installation**
```json
{
  "name": "medusa",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "medusa develop",
    "build": "medusa build",
    "start": "medusa start",
    "migrate": "medusa migrations run"
  },
  "dependencies": {
    "@medusajs/medusa": "^2.11.3",
    "@medusajs/admin": "^2.11.3",
    "@medusajs/admin-sdk": "^2.11.3",
    "@medusajs/cli": "^2.11.3",
    "@medusajs/framework": "^2.11.3",
    "react-remove-scroll-bar": "^2.3.8",
    "react-style-singleton": "^2.2.3",
    "use-callback-ref": "^1.3.3",
    "use-sidecar": "^1.1.3"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Note:** Admin dashboard dependencies (`use-sidecar`, `react-remove-scroll-bar`, etc.) skal installeres manuelt hvis `create-medusa-app` fejler.

**Rationale:** Installerer MedusaJS med kun backend + admin. `--skip-db` og `--skip-env` lader os konfigurere database manuelt.

#### 3. Konfigurer Medusa med Supabase Connection
**File:** `apps/medusa/medusa-config.ts` (eller `.js`)  
**Changes:** Konfigurer database connection med `search_path=medusa` OG `databaseSchema` config

```typescript
import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseSchema: process.env.DATABASE_SCHEMA || "medusa", // KRITISK: Nødvendig for Medusa v2
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  }
})
```

**Rationale:** Konfigurerer Medusa til at bruge Supabase Postgres med BÅDE `search_path=medusa` i connection string OG `databaseSchema: "medusa"` i config. Dette sikrer korrekt schema isolation i Medusa v2 (MikroORM kræver eksplicit schema config).

#### 4. Opret Environment Variables File
**File:** `apps/medusa/.env` (ny fil, git-ignored)  
**Changes:** Opret `.env` med Supabase connection string

```bash
# Supabase Postgres Connection
# Format: postgres://postgres:[PASSWORD]@[HOST]:5432/postgres?search_path=medusa
DATABASE_URL=postgres://postgres:[YOUR_PASSWORD]@[YOUR_PROJECT_REF].supabase.co:5432/postgres?search_path=medusa

# Medusa Configuration
PORT=9000
DATABASE_SCHEMA=medusa  # KRITISK: Nødvendig for Medusa v2 schema isolation
JWT_SECRET=[GENERATE_RANDOM_SECRET]
COOKIE_SECRET=[GENERATE_RANDOM_SECRET]

# CORS Configuration
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:9000

# Admin Configuration
MEDUSA_ADMIN_ONBOARDING_TYPE=default
MEDUSA_ADMIN_ONBOARDING_NEXTJS_DIRECTORY=
```

**Rationale:** Konfigurerer Medusa environment variables. `search_path=medusa` i connection string sikrer schema isolation. Port 9000 er standard Medusa port.

#### 5. Opret .env.example
**File:** `apps/medusa/.env.example` (ny fil)  
**Changes:** Opret template for environment variables

```bash
# Supabase Postgres Connection
DATABASE_URL=postgres://postgres:[PASSWORD]@[HOST]:5432/postgres?search_path=medusa

# Medusa Configuration
PORT=9000
DATABASE_SCHEMA=medusa  # KRITISK: Nødvendig for Medusa v2 schema isolation
JWT_SECRET=your-jwt-secret-here
COOKIE_SECRET=your-cookie-secret-here

# CORS Configuration
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:9000

# Admin Configuration
MEDUSA_ADMIN_ONBOARDING_TYPE=default
MEDUSA_ADMIN_ONBOARDING_NEXTJS_DIRECTORY=
```

**Rationale:** Template for environment variables. Committes til git, mens `.env` er git-ignored.

### Success Criteria:

#### Automated Verification:
- [ ] `apps/medusa/` directory eksisterer
- [ ] `apps/medusa/package.json` eksisterer med Medusa dependencies
- [ ] `apps/medusa/medusa-config.ts` eksisterer med database konfiguration
- [ ] `.env.example` eksisterer med korrekt format
- [ ] TypeScript compilation: `cd apps/medusa && npm run build` (hvis build script eksisterer)

#### Manual Verification:
- [ ] Medusa dependencies er installeret: `cd apps/medusa && npm install`
- [ ] `.env` fil er oprettet med korrekt Supabase connection string
- [ ] Connection string indeholder `search_path=medusa` parameter
- [ ] Port er sat til 9000 (eller anden valgt port)

**⚠️ PAUSE HERE** - Verificer Medusa installation før Phase 3

---

## Phase 3: Connection & Migration Setup

### Overview

Test database connection, kør Medusa migrations mod `medusa` schema, og verificer at `public` schema ikke påvirkes.

### Changes Required:

#### 1. Test Database Connection
**File:** N/A (manual test)  
**Changes:** Test at Medusa kan connecte til Supabase med `medusa` schema

```bash
cd apps/medusa
npm run dev
# Eller: medusa develop
```

**Forventet Output:**
- Medusa starter på port 9000
- Database connection successful
- Ingen errors om manglende tabeller (endnu)

**Rationale:** Verificerer at connection string fungerer og Medusa kan connecte til Supabase.

#### 2. Kør Medusa Migrations
**File:** N/A (Medusa CLI command)  
**Changes:** Kør Medusa migrations for at oprette tabeller i `medusa` schema

```bash
cd apps/medusa
npx medusa db:migrate
# Eller: npm run migrate (hvis script eksisterer)
```

**Forventet Resultat:**
- Medusa migrations køres succesfuldt
- Tabeller oprettes i `medusa.*` namespace (ikke `public.*`)
- Ingen konflikter med eksisterende `public.*` tabeller

**⚠️ VIGTIGT:** Hvis tabeller bliver placeret i `public` schema i stedet for `medusa`:
1. Verificer at `databaseSchema: "medusa"` er sat i `medusa-config.ts`
2. Verificer at `DATABASE_SCHEMA=medusa` er i `.env`
3. Ryd op i `public` schema: Drop `mikro_orm_migrations` og `script_migrations` fra `public` hvis de eksisterer
4. Kør migrations igen

**Rationale:** Opretter Medusa's tabeller (products, orders, regions, osv.) i `medusa` schema. `databaseSchema` config sikrer korrekt placering.

#### 3. Verificer Schema Isolation
**File:** N/A (manual verification)  
**Changes:** Verificer at `public` schema ikke er påvirket

**Verification Steps:**
1. Tjek Supabase Dashboard → Database → Tables
2. Verificer at `public.*` tabeller eksisterer stadig (profiles, jerseys, osv.)
3. Verificer at `medusa.*` tabeller er oprettet (products, orders, osv.)
4. Verificer at ingen Medusa tabeller er oprettet i `public` schema
5. Verificer at migration tracking tabeller (`mikro_orm_migrations`, `script_migrations`) er i `medusa` schema, ikke `public`

**SQL Query til Verifikation:**
```sql
-- Tjek alle schemas
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('public', 'medusa');

-- Tjek medusa schema tabeller
SELECT COUNT(*) as medusa_tables FROM information_schema.tables 
WHERE table_schema = 'medusa';

-- Tjek public schema tabeller (skal være uændrede)
SELECT COUNT(*) as public_tables FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name NOT LIKE 'pg_%';

-- Verificer at migration tracking tabeller er i medusa schema
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'medusa' 
AND table_name IN ('mikro_orm_migrations', 'script_migrations');

-- Verificer at ingen Medusa tabeller er i public schema
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('mikro_orm_migrations', 'script_migrations', 'product', 'order', 'cart');
-- Skal returnere tom resultat
```

**Cleanup hvis nødvendigt:**
Hvis Medusa tabeller er placeret i `public` schema:
```sql
-- Drop migration tracking tabeller fra public (hvis de eksisterer)
DROP TABLE IF EXISTS public.mikro_orm_migrations CASCADE;
DROP TABLE IF EXISTS public.script_migrations CASCADE;

-- Note: Drop andre Medusa tabeller kun hvis de eksisterer i public
-- Tjek først: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%product%';
```

**Rationale:** Sikrer at schema isolation fungerer korrekt og ingen konflikter opstår. Migration tracking tabeller skal også være i korrekt schema.

#### 4. Installer Admin Dashboard Dependencies
**File:** `apps/medusa/package.json`  
**Changes:** Tilføj manglende dependencies for admin dashboard

```bash
cd apps/medusa
npm install use-sidecar react-remove-scroll-bar use-callback-ref react-style-singleton --save
```

**Rationale:** Medusa admin dashboard kræver disse peer dependencies. Hvis de mangler, vil serveren hænge på "Creating server" med bundling errors.

#### 5. Opret Admin User
**File:** N/A (Medusa CLI command)  
**Changes:** Opret admin user til at logge ind i admin dashboard

```bash
cd apps/medusa
npx medusa user -e admin@huddle.dk -p supersecret
```

**Forventet Resultat:**
- Admin user oprettes succesfuldt
- User kan logge ind i admin dashboard med email/password

**Rationale:** Medusa admin kræver en admin user før login. Standard credentials (`admin@medusajs.com`) eksisterer ikke automatisk.

#### 6. Test Medusa Admin Access
**File:** N/A (manual test)  
**Changes:** Test at Medusa admin er tilgængelig på separat port

```bash
# Start Medusa
cd apps/medusa
npm run dev

# Åbn browser: http://localhost:9000/app
# Login med: admin@huddle.dk / supersecret
```

**Troubleshooting:**
- Hvis port 9000 er i brug: `lsof -ti:9000 | xargs kill -9`
- Hvis serveren hænger: Clear cache: `rm -rf node_modules/.vite .medusa/admin .cache`
- Hvis bundling fejler: Verificer at alle dependencies er installeret

**Forventet Resultat:**
- Medusa admin UI loader på `http://localhost:9000/app`
- Login side vises (standard Medusa admin login)
- Login fungerer med oprettet admin user
- Ingen errors om database connection

**Rationale:** Verificerer at Medusa admin fungerer og er tilgængelig på separat port.

### Success Criteria:

#### Automated Verification:
- [ ] Medusa starter uden errors: `cd apps/medusa && npm run dev`
- [ ] Migrations køres succesfuldt: `cd apps/medusa && npm run migrate`
- [ ] Ingen TypeScript errors: `cd apps/medusa && npm run typecheck` (hvis script eksisterer)

#### Manual Verification:
- [ ] Database connection successful (ingen connection errors i logs)
- [ ] `medusa.*` tabeller eksisterer i Supabase (tjek via Dashboard eller SQL)
- [ ] `public.*` tabeller er uændrede (ingen nye tabeller, ingen manglende tabeller)
- [ ] Medusa admin tilgængelig på `http://localhost:9000/app`
- [ ] Medusa admin login side vises korrekt

**⚠️ PAUSE HERE** - Verificer migrations og admin access før Phase 4

---

## Phase 4: Integration Patterns & Documentation

### Overview

Dokumenter integration patterns mellem Huddle og Medusa domæner, opdater backend guide, og opret README i `apps/medusa/`.

### Changes Required:

#### 1. Dokumenter Integration Patterns
**File:** `.project/04-Database_Schema.md`  
**Changes:** Opdater "4. MedusaJS schema & integration (plan)" sektion med konkrete integration patterns

```markdown
### 4.3 Integration Patterns (implementeret)

**Cross-Schema References:**

Huddle tabeller kan referere til Medusa tabeller via UUID felter (ikke foreign keys, da cross-schema FKs ikke altid understøttes):

**Eksempel: Jersey → Product Mapping:**
```sql
-- I public.jerseys tabel (fremtidig migration)
ALTER TABLE public.jerseys 
ADD COLUMN medusa_product_id UUID;

-- Kommentar
COMMENT ON COLUMN public.jerseys.medusa_product_id IS 
  'Reference til medusa.products.id. Når et jersey listeres til salg, oprettes et Medusa product.';
```

**Eksempel: Sale Listing → Product Mapping:**
```sql
-- I public.sale_listings tabel (fremtidig migration)
ALTER TABLE public.sale_listings 
ADD COLUMN medusa_product_id UUID;

-- Kommentar
COMMENT ON COLUMN public.sale_listings.medusa_product_id IS 
  'Reference til medusa.products.id. Sale listing er en wrapper omkring Medusa product.';
```

**API Integration Pattern:**

Huddle Next.js API routes (`apps/web/app/api/v1/...`) skal:
1. Kalde Medusa API (`http://localhost:9000`) for commerce operations
2. Bruge Supabase direkte for Huddle-specifikke data (jerseys, social graph)
3. Kombinere data fra begge kilder i API responses

**Eksempel API Flow:**
```
User creates sale listing
  ↓
Next.js API route (apps/web/app/api/v1/listings/route.ts)
  ↓
1. Create Medusa product via Medusa API
2. Store medusa_product_id in public.sale_listings
3. Return combined data
```

**Ikke Direkte SQL Joins:**

Undgå direkte SQL joins på tværs af schemas. Brug API calls eller application-level joins i stedet.
```

**Rationale:** Dokumenterer hvordan Huddle og Medusa domæner integreres. Giver klare patterns for fremtidig udvikling.

#### 2. Opdater Backend Guide
**File:** `.project/06-Backend_Guide.md`  
**Changes:** Tilføj sektion om Medusa setup efter "### 2.6 MedusaJS (senere)"

```markdown
### 2.7 MedusaJS Setup (Fase 4)

Medusa backend er installeret i `apps/medusa/` og konfigureret til at bruge Supabase Postgres med `medusa` schema.

**Lokal Setup:**

1. **Environment Variables:**
   ```bash
   cd apps/medusa
   cp .env.example .env
   # Rediger .env med Supabase connection string + search_path=medusa
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

4. **Run Migrations:**
   ```bash
   cd apps/medusa
   npm run migrate
   ```

**Database Connection:**
- Connection string format: `postgres://user:pass@host:port/dbname?search_path=medusa`
- Schema isolation sikrer ingen konflikter med `public.*` tabeller
- Medusa migrations opretter tabeller i `medusa.*` namespace

**Integration med Huddle API:**
- Huddle Next.js API routes kalder Medusa API (`http://localhost:9000`)
- Cross-schema references via UUID felter (fx `jerseys.medusa_product_id`)
- Se `.project/04-Database_Schema.md` for integration patterns
```

**Rationale:** Giver klare trin for at starte Medusa lokalt og forstå arkitekturen. Opdaterer backend guide med praktisk information.

#### 3. Opret Medusa README
**File:** `apps/medusa/README.md` (ny fil)  
**Changes:** Opret README med arkitektur-overblik og setup instruktioner

```markdown
# Medusa Backend

MedusaJS backend og admin for Huddle commerce funktionalitet.

## Architecture

- **Database:** Supabase Postgres (samme instans som Huddle app)
- **Schema:** `medusa` (isolated fra `public` schema)
- **Port:** 9000 (standard Medusa port)
- **Authentication:** Medusa's eget login system (ikke Clerk)

## Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Rediger .env med Supabase connection string
   # Format: postgres://user:pass@host:port/dbname?search_path=medusa
   ```

3. **Run Migrations:**
   ```bash
   npm run migrate
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   # Eller fra root: npm run dev:medusa
   ```

5. **Access Admin:**
   - Open http://localhost:9000/app
   - Login med standard Medusa admin credentials

## Integration with Huddle

- Huddle Next.js app (`apps/web`) kalder Medusa API for commerce operations
- Cross-schema references via UUID felter (se `.project/04-Database_Schema.md`)
- Medusa håndterer: products, orders, regions, shipping profiles
- Huddle håndterer: jerseys, social graph, messaging, notifications

## Documentation

- Medusa Docs: https://docs.medusajs.com
- Huddle Integration Patterns: `.project/04-Database_Schema.md`
- Backend Guide: `.project/06-Backend_Guide.md`
```

**Rationale:** Giver lokal setup guide og arkitektur-overblik for Medusa app. Hjælper udviklere med at forstå integrationen.

### Success Criteria:

#### Automated Verification:
- [ ] `.project/04-Database_Schema.md` indeholder integration patterns sektion
- [ ] `.project/06-Backend_Guide.md` indeholder Medusa setup sektion
- [ ] `apps/medusa/README.md` eksisterer med setup instruktioner
- [ ] Alle dokumentation filer er korrekt formateret (markdown)

#### Manual Verification:
- [ ] Integration patterns er klare og forståelige
- [ ] Setup instruktioner fungerer (testet lokalt)
- [ ] Dokumentation er konsistent på tværs af filer
- [ ] Links til relaterede dokumenter fungerer

**⚠️ PAUSE HERE** - Review dokumentation før Phase 5

---

## Phase 5: Monorepo Scripts & Final Verification

### Overview

Tilføj root-level scripts til `package.json` for at starte Medusa, og udfør final verification af hele setup.

### Changes Required:

#### 1. Tilføj Medusa Scripts til Root package.json
**File:** `package.json` (root)  
**Changes:** Tilføj scripts for Medusa development

```json
{
  "scripts": {
    "dev": "npm run dev --workspace=web",
    "dev:legacy": "npm run dev --workspace=legacy-frontend",
    "dev:medusa": "npm run dev --workspace=medusa",
    "build:legacy": "npm run build --workspace=legacy-frontend",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspaces"
  }
}
```

**Rationale:** Gør det nemt at starte Medusa fra root directory. Følger samme pattern som eksisterende scripts.

#### 2. Verificer Workspace Configuration
**File:** `package.json` (root)  
**Changes:** Verificer at `apps/medusa` er inkluderet i workspaces

```json
{
  "workspaces": [
    "apps/*",
    "packages/*",
    "src"
  ]
}
```

**Rationale:** Sikrer at npm workspaces inkluderer Medusa app. `apps/*` wildcard skulle automatisk inkludere `apps/medusa/`.

#### 3. Final Verification Checklist
**File:** N/A (manual verification)  
**Changes:** Udfør komplet verification af hele setup

**Verification Steps:**

1. **Schema Verification:**
   - [ ] `medusa` schema eksisterer i Supabase
   - [ ] `public` schema er uændret
   - [ ] Ingen konflikter mellem schemas

2. **Medusa Installation:**
   - [ ] `apps/medusa/` directory eksisterer
   - [ ] `apps/medusa/package.json` har Medusa dependencies
   - [ ] `apps/medusa/medusa-config.ts` er konfigureret korrekt

3. **Database Connection:**
   - [ ] Medusa kan connecte til Supabase
   - [ ] Connection string indeholder `search_path=medusa`
   - [ ] Ingen connection errors

4. **Migrations:**
   - [ ] Medusa migrations er kørt succesfuldt
   - [ ] Tabeller eksisterer i `medusa.*` namespace
   - [ ] Ingen tabeller i forkert schema

5. **Medusa Admin:**
   - [ ] Medusa admin tilgængelig på `http://localhost:9000/app`
   - [ ] Login side vises korrekt
   - [ ] Ingen errors i browser console

6. **Monorepo Scripts:**
   - [ ] `npm run dev:medusa` starter Medusa fra root
   - [ ] Workspace configuration fungerer
   - [ ] Ingen npm errors

7. **Documentation:**
   - [ ] `.project/04-Database_Schema.md` opdateret
   - [ ] `.project/06-Backend_Guide.md` opdateret
   - [ ] `apps/medusa/README.md` eksisterer

**Rationale:** Sikrer at hele setup fungerer korrekt og er klar til brug.

### Success Criteria:

#### Automated Verification:
- [ ] Root `package.json` indeholder `dev:medusa` script
- [ ] Workspace configuration inkluderer `apps/*`
- [ ] `npm run dev:medusa` starter Medusa (ingen errors)
- [ ] `npm install` i root installerer Medusa dependencies

#### Manual Verification:
- [ ] Alle verification steps er gennemført
- [ ] Medusa admin fungerer korrekt
- [ ] Dokumentation er komplet og korrekt
- [ ] Ingen kritiske issues eller mangler

**✅ COMPLETE** - Implementation plan fuldført

---

## Testing Strategy

### Unit Tests
- **Ikke påkrævet i denne fase** - Medusa har sine egne tests
- Fremtidige tests: API integration tests (HUD-12)

### Integration Tests
- **Manual testing:** Database connection, migrations, admin access
- **Verification:** Schema isolation, ingen konflikter

### Manual Testing Checklist
- [ ] Medusa starter uden errors
- [ ] Database connection successful
- [ ] Migrations køres succesfuldt
- [ ] Admin tilgængelig på korrekt port
- [ ] `public` schema uændret
- [ ] `medusa` schema indeholder Medusa tabeller

---

## Rollback Strategy

Hvis noget går galt:

1. **Schema Rollback:**
   ```sql
   -- Drop medusa schema (kun hvis nødvendigt)
   DROP SCHEMA IF EXISTS medusa CASCADE;
   ```

2. **Medusa App Rollback:**
   ```bash
   # Fjern apps/medusa directory
   rm -rf apps/medusa
   ```

3. **Scripts Rollback:**
   - Fjern `dev:medusa` script fra root `package.json`

**Note:** Rollback vil ikke påvirke `public` schema, da det er isoleret.

---

## Risks & Mitigation

### Risk 1: Schema Isolation Fejler
**Mitigation:** 
- Test connection string format før migrations
- Verificer BÅDE `search_path` parameter OG `databaseSchema` config fungerer
- Medusa v2 kræver eksplicit `databaseSchema: "medusa"` i config (ikke kun search_path)
- Test migrations på lokal Supabase først
- Verificer at tabeller oprettes i korrekt schema efter migrations

### Risk 2: Medusa Migrations Konflikter
**Mitigation:**
- Brug `search_path=medusa` i connection string
- Verificer at migrations opretter tabeller i korrekt schema
- Test migrations isoleret

### Risk 3: Port Konflikter
**Mitigation:**
- Brug standard Medusa port (9000)
- Dokumenter port i README
- Check for port conflicts før start: `lsof -ti:9000`
- Kill eksisterende process: `lsof -ti:9000 | xargs kill -9`

### Risk 4: Environment Variables Mangler
**Mitigation:**
- Opret `.env.example` med alle nødvendige variabler
- Dokumenter i README
- Valider environment variables ved start
- **KRITISK:** `DATABASE_SCHEMA=medusa` skal være i `.env` (ikke kun connection string)

### Risk 5: Admin Dashboard Dependencies Mangler
**Mitigation:**
- Installer peer dependencies manuelt: `use-sidecar`, `react-remove-scroll-bar`, `use-callback-ref`, `react-style-singleton`
- Clear cache hvis bundling fejler: `rm -rf node_modules/.vite .medusa/admin .cache`
- Verificer at alle dependencies er installeret før start

### Risk 6: Admin User Mangler
**Mitigation:**
- Opret admin user via CLI: `npx medusa user -e admin@huddle.dk -p supersecret`
- Dokumenter login credentials i README (kun for dev)
- Standard credentials (`admin@medusajs.com`) eksisterer ikke automatisk

---

## References

- **Linear Issue:** [HUD-15](https://linear.app/huddle-world/issue/HUD-15/integrer-medusa-backendadmin-i-monorepo-med-supabase-medusa-schema)
- **Database Schema:** `.project/04-Database_Schema.md`
- **Backend Guide:** `.project/06-Backend_Guide.md`
- **Tech Stack:** `.project/03-Tech_Stack.md`
- **MedusaJS Docs:** https://docs.medusajs.com
- **PostgreSQL Schema Docs:** https://www.postgresql.org/docs/current/ddl-schemas.html
- **TypeORM Schema Docs:** https://typeorm.io/entities#entity-schema

---

## Estimated Timeline

- **Phase 1:** 30 min (schema migration + dokumentation)
- **Phase 2:** 1-2 timer (Medusa installation + konfiguration)
- **Phase 3:** 30 min (migrations + verification)
- **Phase 4:** 1 time (dokumentation)
- **Phase 5:** 30 min (scripts + final verification)

**Total:** 3-4 timer (1/2 dag)

**Kompleksitet:** Medium-High (database schema isolation kræver omhyggelig konfiguration)

---

## Next Steps After Completion

1. **Test Medusa Admin:** Opret test products, regions, osv.
2. **API Integration:** HUD-12 - Implementer API routes der kalder Medusa
3. **Frontend Integration:** Fremtidige issues - Integrer Medusa i Next.js app
4. **Production Setup:** Fremtidig issue - Konfigurer Medusa til production deployment

---

**Plan Created:** 2025-11-26  
**Last Updated:** 2025-11-26  
**Status:** ✅ ALL PHASES COMPLETE - Implementation plan fuldført

---

## Implementation Notes & Lessons Learned

### Critical Discoveries:

1. **Schema Isolation kræver BÅDE connection string OG config:**
   - `search_path=medusa` i connection string alene er IKKE nok
   - Medusa v2 (MikroORM) kræver eksplicit `databaseSchema: "medusa"` i `medusa-config.ts`
   - Uden `databaseSchema` config vil migrations placere tabeller i `public` schema

2. **Admin Dashboard Dependencies:**
   - Medusa admin dashboard kræver ekstra dependencies som ikke altid installeres automatisk
   - Manglende dependencies: `use-sidecar`, `react-remove-scroll-bar`, `use-callback-ref`, `react-style-singleton`
   - Uden disse vil serveren hænge på "Creating server" med bundling errors

3. **Admin User Creation:**
   - Medusa admin kræver eksplicit oprettelse af admin user via CLI
   - Standard credentials (`admin@medusajs.com`) eksisterer ikke automatisk
   - Kommando: `npx medusa user -e admin@huddle.dk -p supersecret`

4. **Migration Tracking Tables:**
   - `mikro_orm_migrations` og `script_migrations` skal være i `medusa` schema
   - Hvis de placeres i `public` schema, skal de droppes manuelt før re-migration
   - Kan kræve termination af idle database connections før drop

5. **Port Conflicts:**
   - Port 9000 kan være i brug fra tidligere sessions
   - Check: `lsof -ti:9000`
   - Kill: `lsof -ti:9000 | xargs kill -9`

6. **Cache Issues:**
   - Hvis serveren hænger eller bundling fejler, clear cache:
   - `rm -rf node_modules/.vite .medusa/admin .cache`

### Verified Configuration:

**medusa-config.ts:**
```typescript
module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseSchema: process.env.DATABASE_SCHEMA || "medusa", // KRITISK
    // ...
  }
})
```

**.env:**
```bash
DATABASE_URL=postgres://...?search_path=medusa
DATABASE_SCHEMA=medusa  # KRITISK
```

**package.json dependencies:**
```json
{
  "dependencies": {
    "@medusajs/medusa": "^2.11.3",
    "@medusajs/admin": "^2.11.3",
    "react-remove-scroll-bar": "^2.3.8",
    "react-style-singleton": "^2.2.3",
    "use-callback-ref": "^1.3.3",
    "use-sidecar": "^1.1.3"
  }
}
```

### Final Status:

- ✅ Phase 1: Complete (Schema oprettet)
- ✅ Phase 2: Complete (Medusa installeret)
- ✅ Phase 3: Complete (Migrations kørt, admin fungerer)
- ✅ Phase 4: Complete (Integration patterns & documentation opdateret)
- ✅ Phase 5: Complete (Monorepo scripts tilføjet, final verification gennemført)

**🎉 ALL PHASES COMPLETE - Implementation plan fuldført!**

