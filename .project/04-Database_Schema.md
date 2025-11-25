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

Denne sektion opsummerer de vigtigste tabeller, som de er defineret i `supabase/migrations` og `src/integrations/supabase/types.ts`.

### 3.1 Brugere & profiler

- **`auth.users`** (Supabase/Clerk – ekstern)  
  - Kilde for bruger‑id’er (UID) på tværs af systemet.
- **`profiles`**  
  - 1–1 med `auth.users`.  
  - Felter: `id`, `username`, `avatar_url`, `bio`, `country`, `created_at`, `updated_at`.  
  - Bruges til offentlige Huddle‑profiler (username, avatar, land, bio).

### 3.2 Wardrobe & jerseys

- **`jerseys`**  
  - Digital garderobe.  
  - Centrale felter:  
    - Ejer: `owner_id` (FK → `auth.users.id`)  
    - Metadata: `club`, `season`, `jersey_type`, `player_name`, `player_number`, `competition_badges[]`, `condition_rating`, `notes`, `visibility`.  
    - Assets: `images[]` (URLs til Supabase Storage).  
    - Timestamps: `created_at`, `updated_at`.  
  - Indekser: `owner_id`, `visibility`, evt. på `club/season`.

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

## 4. MedusaJS schema & integration (plan)

MedusaJS har sit eget sæt tabeller (products, variants, orders, regions, shipping m.m.), som oprettes via Medusa’s migrations og typisk lever i et separat schema eller som egne tabeller i samme database.

### 4.1 Rollefordeling

- **Supabase public (nu):**
  - Ejer wardrobe, social graph, messaging, notifications og første version af marketplace/auktioner (som defineret af Lovable).  
  - Bruges til hurtig MVP og eksisterende frontend.

- **Medusa (senere):**
  - Ejer commerce‑motoren:  
    - `products`/`variants` bruges som **listings**, `orders` som transaktioner, `regions`/`shipping_profiles` til shipping‑regler.  
  - Giver admin‑UI (Medusa Admin) til ops‑opgaver.

### 4.2 Mulige mappings (eksempel)

- `jerseys` (Supabase) ↔ `products` (Medusa):
  - Ét jersey‑record kan få en tilknyttet `medusa_product_id`.  
  - Medusa styrer pris, stock/status, shipping‑regler.  
  - Supabase styrer stadig billeder, social stats og wardrobe‑kontekst.

- `sale_listings` / `auctions` (Supabase) ↔ Medusa:
  - På sigt kan vi lade `sale_listings` blive en tynd wrapper rundt om Medusa’s products/variants (kun view/relations).  
  - Auktioner kan forblive i Supabase som “custom module” ovenpå Medusa‑products (Medusa er mere købs‑pipeline end auktionsmotor).

Vi planlægger **ikke** at redesigne alt fra dag ét, men at migrere ansvar gradvist over til Medusa, dér hvor det giver mening (price, orders, shipping).

---

## 5. Migrations- og ændringsstrategi

### 5.1 Supabase‑schema (public)

- Supabase migrations i `supabase/migrations` er **single source of truth** for app‑schemaet.  
- Ændringer laves altid som **nye migrations** (ingen redigering af gamle).
- Principper:
  - Start med **additive** forandringer (nye kolonner/tabeller); breaking ændringer kræver datamigrering og planlægning.  
  - Hold migrations små og veldokumenterede (kort kommentar om HVORFOR, link til issue/PRD‑sektion).  
  - Når frontend‑typer (`src/types`, `supabase/types.ts`) justeres, skal DB‑schema og migrations følge med – og omvendt.

### 5.2 Medusa‑schema

- Medusa håndterer sine egne migrations (TypeORM‑lignende).  
- Vi konfigurerer Medusa til at pege på samme database (Supabase Postgres), men egne tabeller/schema.  
- Ved ændringer:
  - Brug Medusa’s CLI/migrationssystem.  
  - Sørg for, at relationer til Supabase‑tabeller (fx `jersey_id`) etableres via **enkle FK’er eller GUID‑felter**, ikke tætte cross‑schema afhængigheder.

### 5.3 Udvikling foran backend (frontend‑first)

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

## 6. Fremtidige udvidelser

Når vi bevæger os mod Fase 2+ i PRD’et (ratings, collections, trade mode, price history osv.), bør vi:

- **Tilføje nye tabeller** fremfor at overbelaste eksisterende (fx `collections`, `ratings`, `price_history`).  
- Overveje, om en feature hører hjemme i:
  - Supabase (social/produktoplevelse) eller  
  - Medusa (core commerce – ordrer, priser, shipping).
- Dokumentere hver større ændring i dette dokument + i PRD’et (`02-PRD.md`), så tech‑valg og schema hænger sammen.

På den måde kan vi starte med et hurtigt, Lovable‑genereret schema, men stadig have en klar sti til en mere moden, Medusa‑drevet arkitektur, uden at tabe fart i den tidlige produktfase.


