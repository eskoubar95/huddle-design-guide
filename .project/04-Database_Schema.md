## 1. Formål

Dette dokument beskriver Huddles databasestruktur og hvordan vi forventer, at den udvikler sig over tid.  
Målet er at:

- Give et klart overblik over **Supabase (public) schema’et**, som allerede er sat op via migrations.  
- Rammesætte, hvordan **MedusaJS’ eget schema** kobles på senere (commerce‑delen).  
- Sikre at vi **kan justere schema’et undervejs**, uden at blokere frontend‑udvikling eller skabe unødig teknisk gæld.

Lovable har genereret de nuværende Supabase‑migrations med fokus på hurtigt frontend‑design; dette schema er derfor v1, som vi er villige til at raffinere, når Medusa introduceres.

---

## 2. Overordnet arkitektur

- **Database-type:** PostgreSQL (Supabase)  
- **To logiske domæner i samme instans:**
  - **Huddle app‑domæne (Supabase `public`):**  
    - Wardrobe (jerseys)  
    - Marketplace/auktioner (v1)  
    - Social graph, feed, messaging, notifikationer  
    - Analytics (søgeadfærd)
  - **MedusaJS commerce‑domæne (eget schema / egne tabeller):**  
    - Products/variants, orders, regions, shipping, carts osv.  
    - Drives af Medusa’s egne migrations og modeller.

I v1 er Supabase‑schema’et “kongen” for frontend‑funktionalitet; Medusa kommer ovenpå senere som **supplerende commerce‑motor**, der kan overtage dele af marketplace‑logikken (fx listings som products).

---

## 3. Nuværende Supabase (public) schema – overblik

Denne sektion opsummerer de vigtigste tabeller, som de er defineret i `supabase/migrations` og `apps/web/lib/supabase/types.ts`.

**Vigtige ændringer siden oprindelig plan:**
- `jerseys.owner_id` er nu TEXT (Clerk user IDs) i stedet for UUID
- `jerseys.images[]` array er erstattet af `jersey_images` tabel
- Vision AI kolonner tilføjet til `jerseys` (`vision_raw`, `vision_confidence`, `status`)
- Metadata schema (`metadata.*`) tilføjet for fodboldreferencedata

### 3.1 Brugere & profiler

- **`auth.users`** (Clerk – ekstern)  
  - Kilde for bruger‑id'er (Clerk user IDs som TEXT) på tværs af systemet.  
  - **Note:** Clerk bruges til authentication, ikke Supabase Auth.
- **`profiles`**  
  - 1–1 med Clerk users (via `id` som TEXT).  
  - Felter: `id` (TEXT - Clerk user ID), `username`, `avatar_url`, `bio`, `country`, `created_at`, `updated_at`.  
  - Bruges til offentlige Huddle‑profiler (username, avatar, land, bio).

### 3.2 Wardrobe & jerseys

- **`jerseys`**  
  - Digital garderobe.  
  - Centrale felter:  
    - Ejer: `owner_id` (TEXT → Clerk user ID, ikke UUID)  
    - Metadata: `club`, `season`, `jersey_type`, `player_name`, `player_number`, `competition_badges[]`, `condition_rating`, `notes`, `visibility`.  
    - Vision AI: `vision_raw` (JSONB), `vision_confidence` (FLOAT), `status` ('draft', 'published', 'archived').  
    - Metadata links: `club_id`, `player_id`, `season_id` (FK → `metadata.*`, nullable).  
    - Timestamps: `created_at`, `updated_at`.  
  - Indekser: `owner_id`, `visibility`, `status`, `vision_confidence`, evt. på `club/season`.  
  - **Note:** `images[]` array er erstattet af `jersey_images` tabel (se nedenfor).

- **`jersey_images`**  
  - Normaliseret billedstorage (erstatter `jerseys.images[]` array).  
  - Felter:  
    - `jersey_id` (FK → `jerseys.id`, CASCADE delete).  
    - `image_url` (TEXT), `storage_path` (TEXT for cleanup).  
    - `view_type` ('front', 'back', 'detail', 'other' - fra Vision AI).  
    - `sort_order` (INTEGER, default 0 - første = cover/thumbnail).  
    - `image_embedding` (vector(3072) - OpenAI embedding for template matching).  
    - `image_url_webp` (TEXT, nullable - WebP optimeret version).  
    - Timestamps: `created_at`, `updated_at`.  
  - Indekser: `jersey_id`, `(jersey_id, sort_order)`.  
  - **Note:** Embedding index er ikke oprettet (pgvector dimension limit 2000 < 3072), similarity search bruger sequential scan.

### 3.3 Marketplace & auktioner (app‑lag)

- **`sale_listings`**  
  - Fastpris‑annoncer for `jerseys`.  
  - Felter: `jersey_id`, `seller_id`, `price`, `currency`, shipping‑flags (worldwide/local/whopays/free_in_country), `negotiable`, `status`, `sold_to`, `sold_at`, timestamps.  
  - RLS: alle kan se aktive listings; sælger kan læse/ændre egne.

- **`auctions`**  
  - Auktioner knyttet til `jerseys`.  
  - Felter: `jersey_id`, `seller_id`, `starting_bid`, `current_bid`, `buy_now_price`, `currency`, `duration_hours`, shipping‑flags, `status`, `winner_id`, `ends_at`, `ended_at`, timestamps.  
  - Trigger holder `current_bid` opdateret baseret på nye `bids`.

- **`bids`**  
  - Bud på auktioner: `auction_id`, `bidder_id`, `amount`, `created_at`.

- **`transactions`**  
  - Fælles log for handler (både fastpris og auktion).  
  - Felter: `listing_type` (`sale`/`auction`), `listing_id`, `seller_id`, `buyer_id`, `amount`, `currency`, `status`, `completed_at`, timestamps.

> Disse tabeller udgør den “lovable‑genererede” marketplace‑MVP, som frontend allerede er bygget imod.

### 3.4 Social graph & community

- **`follows`** – follower/following relationer.  
- **`likes`** – likes på `jerseys`.  
- **`saved_jerseys`** – watchlist/saves på `jerseys`.  
- **`posts`** – feed‑indlæg (optionelt bundet til en `jersey`).  
- **`post_likes`** – likes på posts.  
- **`comments`** – kommentarer på posts.

Disse tabeller matcher de typer, der bruges i frontenden (`User`, `Post`, `Jersey` osv.) og driver feed, profilstatistik og engagement.

### 3.5 Messaging

- **`conversations`**  
  - DM‑tråde mellem to brugere, ofte knyttet til én `jersey` (show interest / forhandling).  
  - Felter: `participant_1_id`, `participant_2_id`, `jersey_id`, `created_at`, `updated_at`, unikt constraint på (participant_1, participant_2, jersey).

- **`messages`**  
  - Beskeder i en conversation: `conversation_id`, `sender_id`, `content`, `images[]`, `read`, `created_at`.

- **`message_reactions`**  
  - Emoji‑reaktioner på messages: `message_id`, `user_id`, `emoji`, `created_at`.

### 3.6 Notifikationer & analytics

- **`notifications`**  
  - Notifikationer til brugere: `user_id`, `type`, `title`, `message`, `read`, `related_auction_id`, `related_jersey_id`, `created_at`.

- **`search_analytics`**  
  - Log over søgninger: `query`, `user_id`, `created_at` – bruges til at forstå efterspørgsel og forbedre discovery.

---

## 4. Metadata Schema (implementeret)

### 4.1 Oversigt

Et separat `metadata` schema indeholder normaliseret fodboldreferencedata fra Transfermarkt API. Dette gør det muligt at linke `public.jerseys` til officielle klubber, spillere og sæsoner via valgfrie foreign keys.

**Schema:** `metadata.*`  
**Kilde:** Transfermarkt API (via Edge Functions)  
**Formål:** Smart autofill, metadata matching, analytics

### 4.2 Metadata Tabeller

- **`metadata.competitions`**  
  - Turneringer (ligaer, cups). Felter: `id` (TEXT - Transfermarkt ID), `name`, `country`, `continent`, stats.

- **`metadata.seasons`**  
  - Sæsoner. Felter: `id` (UUID), `tm_season_id` (TEXT), `label` (fx "25/26"), `start_year`, `end_year`.  
  - **Note:** `season_type` kolonne tilføjet senere ('league', 'cup', 'international').

- **`metadata.clubs`**  
  - Fodboldklubber. Felter: `id` (TEXT - Transfermarkt ID), `name`, `official_name`, `slug`, `country`, `crest_url`, `colors[]`, stats.  
  - **Note:** `primary_country_code` kolonne tilføjet til `metadata.players` for ISO-2 landekode.

- **`metadata.club_seasons`**  
  - Club X deltager i competition Y i season Z. Junction tabel.

- **`metadata.players`**  
  - Spillere. Felter: `id` (TEXT - Transfermarkt ID), `full_name`, `known_as`, `date_of_birth`, `nationalities[]`, `primary_country_code`, stats.

- **`metadata.player_contracts`**  
  - **Kritisk for matching:** Spiller X havde nummer Y for klub Z i sæson W.  
  - Felter: `player_id`, `club_id`, `season_id`, `jersey_number`, `source`, dates.  
  - Tillader flere rækker per (player, club, season) for nummerskift.

- **`metadata.competition_seasons`**  
  - Competition X kører i season Y. Junction tabel.

- **`metadata.kit_templates`**  
  - Template data for kit designs (fremtidig feature).

### 4.3 Linking til public.jerseys

`public.jerseys` har valgfrie foreign keys:
- `club_id` (TEXT, FK → `metadata.clubs.id`, nullable)
- `player_id` (TEXT, FK → `metadata.players.id`, nullable)
- `season_id` (UUID, FK → `metadata.seasons.id`, nullable)

**Princip:** Jerseys kan gemmes uden metadata FK'er. User text (`club`, `season`, `player_name`) forbliver primær sandhed.

### 4.4 Permissions

- Metadata schema: Read-only for authenticated users (SELECT)
- Write access: Kun service role (for Edge Functions og seed scripts)

---

## 5. MedusaJS schema & integration (implementeret)

MedusaJS har sit eget sæt tabeller (products, variants, orders, regions, shipping m.m.), som oprettes via Medusa's migrations og lever i separat `medusa` schema.

### 5.1 Rollefordeling

- **Supabase public (nu):**
  - Ejer wardrobe, social graph, messaging, notifications og første version af marketplace/auktioner.  
  - `jersey_images` tabel for normaliseret billedstorage.
  - Vision AI metadata i `jerseys` tabel.

- **Metadata schema (implementeret):**
  - Ejer fodboldreferencedata (clubs, players, seasons, competitions).  
  - Bruges til smart autofill, metadata matching og analytics.  
  - Populeres via Edge Functions og seed scripts.

- **Medusa (implementeret):**
  - Ejer commerce‑motoren:  
    - `products`/`variants` bruges som **listings**, `orders` som transaktioner, `regions`/`shipping_profiles` til shipping‑regler.  
  - Giver admin‑UI (Medusa Admin) til ops‑opgaver.  
  - Schema isolation: Alle Medusa tabeller i `medusa.*` namespace.

### 5.2 Integration Patterns (implementeret)

**Cross-Schema References:**

Huddle tabeller kan referere til Medusa tabeller via UUID felter (ikke foreign keys, da cross-schema FKs ikke altid understøttes):

- `jerseys` (Supabase) ↔ `products` (Medusa):
  - Ét jersey‑record kan få en tilknyttet `medusa_product_id` (UUID, nullable).  
  - Medusa styrer pris, stock/status, shipping‑regler.  
  - Supabase styrer billeder (via `jersey_images`), social stats og wardrobe‑kontekst.

- `sale_listings` (Supabase) ↔ Medusa:
  - `sale_listings` kan have `medusa_product_id` (UUID, nullable).  
  - Sale listing er en wrapper omkring Medusa product.

- Auktioner forbliver i Supabase som "custom module" (Medusa er mere købs‑pipeline end auktionsmotor).

**API Integration Pattern:**

Huddle Next.js API routes (`apps/web/app/api/v1/...`) kalder:
1. Medusa API (`http://localhost:9000`) for commerce operations
2. Supabase direkte for Huddle-specifikke data (jerseys, social graph, metadata)
3. Kombinerer data fra begge kilder i API responses

**Ikke Direkte SQL Joins:**

Undgå direkte SQL joins på tværs af schemas. Brug API calls eller application-level joins i stedet.

---

## 6. Medusa Schema (implementeret)

### 6.1 Schema Oprettelse

`medusa` schema er oprettet i Supabase Postgres via migration `202511262142_create_medusa_schema.sql`.

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
DATABASE_SCHEMA=medusa
```

**KRITISK:** Medusa v2 (MikroORM) kræver BÅDE `search_path` i connection string OG `databaseSchema: "medusa"` i `medusa-config.ts` for korrekt schema isolation.

Dette sikrer at alle Medusa queries og migrations automatisk bruger `medusa` schema.

### 6.3 Integration Patterns (implementeret)

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

**Rationale:** Dokumenterer hvordan Huddle og Medusa domæner integreres. Giver klare patterns for fremtidig udvikling.

---

## 7. Migrations- og ændringsstrategi

### 7.1 Supabase‑schema (public)

- Supabase migrations i `supabase/migrations` er **single source of truth** for app‑schemaet.  
- Ændringer laves altid som **nye migrations** (ingen redigering af gamle).
- Principper:
  - Start med **additive** forandringer (nye kolonner/tabeller); breaking ændringer kræver datamigrering og planlægning.  
  - Hold migrations små og veldokumenterede (kort kommentar om HVORFOR, link til issue/PRD‑sektion).  
  - Når frontend‑typer (`src/types`, `supabase/types.ts`) justeres, skal DB‑schema og migrations følge med – og omvendt.

### 7.2 Medusa‑schema

- Medusa håndterer sine egne migrations (TypeORM‑lignende).  
- Vi konfigurerer Medusa til at pege på samme database (Supabase Postgres), men egne tabeller/schema.  
- Ved ændringer:
  - Brug Medusa’s CLI/migrationssystem.  
  - Sørg for, at relationer til Supabase‑tabeller (fx `jersey_id`) etableres via **enkle FK’er eller GUID‑felter**, ikke tætte cross‑schema afhængigheder.

### 7.3 Udvikling foran backend (frontend‑first)

Da et af målene er at kunne bygge frontend hurtigt (Lovable/Cursor) før backend er helt færdig:

- Brug **tydelige API‑kontrakter** og **typed clients** (Supabase types, Medusa SDK).  
- Lad frontend arbejde mod **stabile domænetyper** (`Jersey`, `Post`, `Notification` osv.) og adaptere mod den aktuelle backend‑implementering.  
- Vær bevidst om, at:
  - Felter kan flytte fra Supabase → Medusa (fx pris/forsalg‑status).  
  - Nogle queries senere vil gå via Medusa API i stedet for direkte SQL.

ORM i klassisk forstand (Prisma/Drizzle) er ikke strengt nødvendigt her, fordi:

- Supabase genererer allerede stærke TypeScript‑typer fra schema.  
- Medusa har sit eget model‑lag/ORM internt.  
- Det vigtigste er at holde **domænelaget rent og typed**, så vi kan ændre implementeringen af persistence uden at ændre hele app’en.

---

## 8. Automatisering & Background Jobs

### 8.1 Cleanup Functions

- **`cleanup_abandoned_drafts()`**  
  - Sletter draft jerseys ældre end 24 timer.  
  - CASCADE delete fjerner automatisk `jersey_images` rækker.  
  - Storage cleanup håndteres af `cleanup-jersey-storage` Edge Function.

- **Scheduled via pg_cron:**  
  - Kører dagligt kl. 2 AM UTC.  
  - Job navn: `cleanup-abandoned-drafts`.

### 8.2 Triggers

- **`trigger_generate_webp_jersey_image`**  
  - Fires efter INSERT på `jersey_images`.  
  - Kalder `generate-webp-image` Edge Function for automatisk WebP generering.

- **`auto_link_jersey_metadata_trigger`**  
  - Fires efter INSERT/UPDATE på `jerseys`.  
  - Kalder `auto-link-metadata` Edge Function for automatisk metadata matching.

---

## 9. Fremtidige udvidelser

Når vi bevæger os mod Fase 2+ i PRD’et (ratings, collections, trade mode, price history osv.), bør vi:

- **Tilføje nye tabeller** fremfor at overbelaste eksisterende (fx `collections`, `ratings`, `price_history`).  
- Overveje, om en feature hører hjemme i:
  - Supabase (social/produktoplevelse) eller  
  - Medusa (core commerce – ordrer, priser, shipping).
- Dokumentere hver større ændring i dette dokument + i PRD’et (`02-PRD.md`), så tech‑valg og schema hænger sammen.

På den måde kan vi starte med et hurtigt, Lovable‑genereret schema, men stadig have en klar sti til en mere moden, Medusa‑drevet arkitektur, uden at tabe fart i den tidlige produktfase.


