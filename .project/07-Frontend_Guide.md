## 1. Formål med denne guide

Denne guide beskriver, hvordan frontend til Huddle skal bygges og videreudvikles – både teknisk og UX‑mæssigt – baseret på:

- `01-Project-Brief.md` (koncept & målgruppe)  
- `02-PRD.md` (features, flows, personas)  
- `03-Tech_Stack.md` (Next.js, Tailwind, Clerk, Medusa, Supabase)  
- `04-Database_Schema.md` (Supabase schema)  
- `05-API_Design.md` (API-kontrakter)  
- `06-Backend_Guide.md` (backend‑arkitektur)

Vigtigt: Vi har allerede en **Lovable‑genereret React/Vite frontend** i `src/` + Supabase‑integration. Denne fungerer som:

- v0/MVP UI og **design playground**, hvor flows og komponenter allerede er skitseret.  
- Reference for design, komponenter og interaktioner, når vi senere bevæger os mod monorepo + Next.js.

Guiden tager højde for **aktuelt setup (Vite + React i `src/`)** og peger samtidig frem mod den ønskede arkitektur (Next.js App Router).

---

## 2. Project Setup & Environment

### 2.1 Aktuel frontend stack (Lovable)

I dag ligger frontenden i:

- `src/` – React + TypeScript SPA (Vite)  
  - `src/App.tsx`, `src/main.tsx`  
  - `src/pages/` – skærme (Home, Marketplace, JerseyDetail, Profile osv.)  
  - `src/components/` – UI‑komponenter, inkl. shadcn/Radix‑baserede elementer i `components/ui/`  
  - `src/integrations/supabase/` – Supabase client + typer  
  - `src/types/` – domænetyper (`Jersey`, `Post`, `User`, `Notification` m.fl.)

Dette er udgangspunktet for frontend‑guiden.

### 2.2 Framework setup (Vite/React nu, Next.js senere)

**Nuværende setup (Vite):**

- `npm install` / `pnpm install`  
- `npm run dev` for at køre frontenden på lokal dev‑port (typisk `5173`).  
- Vite config + TS config er allerede på plads (Lovable standard).

**Fremtidig retning (Next.js):**

- Når backend/monorepo er klar (jf. `06-Backend_Guide.md`), vil vi:
  - Oprette en Next.js app (fx i `apps/web/`).  
  - Flytte/portere komponenter og sider fra `src/` til Next’s `app/` struktur.  
  - Genbruge styles, Tailwind config, shadcn‑komponenter og domænetyper.

Guiden fokuserer primært på **hvordan UI’et skal bygges og struktureres**, uafhængigt af om det kører på Vite i dag eller Next i morgen.

### 2.3 Nødvendige packages

De vigtigste dependencies, som bør være til stede (mange er allerede installeret):

- **Core:**
  - `react`, `react-dom`, `typescript`
  - `react-router-dom` (i Vite SPA) eller Next router i fremtiden
- **UI & styling:**
  - `tailwindcss`, `postcss`, `autoprefixer`  
  - shadcn/Radix UI (allerede under `components/ui/`)  
- **Data & API:**
  - `@supabase/supabase-js`  
  - `@tanstack/react-query` (anbefalet til data fetching/cache)  
- **Auth (når klar):**
  - `@clerk/clerk-react` (til Client‑side auth integration)

### 2.4 Environment & API integration

- Frontend skal kende til:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (allerede i brug)  
  - Senere: `NEXT_PUBLIC_API_URL` / API base URL hvis Huddle API kører separat.
- API‑integration:
  - I Vite‑versionen: brug fetch/React Query mod Supabase direkt eller Huddle API.  
  - Når Next backend er på plads: frontenden bør primært kalde **Huddle API** (jf. `05-API_Design.md`) fremfor direkte Supabase‑SQL, så logik centraliseres.

---

## 3. UI/UX Planning

### 3.1 Nøgleområder i UI

Ud fra projektbrief og PRD er de vigtigste UI‑områder:

- **Dashboard/Home:** Overblik over feed, anbefalede trøjer, auktioner, aktivitet i højre sidebar.  
- **Wardrobe:** Brugerens egen garderobe – grid og detaljer for jerseys.  
- **Marketplace:** Liste over sale listings (fastpris) med filtre og sortering.  
- **Auctions:** Liste + detaljevisning af live/kommende auktioner med countdown og budhistorik.  
- **Jersey detail:** Kombinerer wardrobe‑view, salgsstatus, auktioner og social interaktion (likes, saves, comments).  
- **Profile:** Brugerprofil med stats, wardrobe preview, For Sale, Auctions, Posts.  
- **Messaging:** Inbox + conversationview knyttet til konkrete jerseys/listings.  
- **Auth + onboarding:** Klar “Upload your first shirt”‑oplevelse efter signup.

Lovable frontend’en i `src/pages` adresserer mange af disse; guiden beskriver hvordan vi kan **stramme op og systematisere** dem.

### 3.2 Brugerflows (høj-niveau)

- **Flow 1 – Ny bruger:**  
  Discover → Sign up → Upload første trøje → Se wardrobe → Udforske andres samlinger/marketplace.
- **Flow 2 – Sælge trøje (fastpris):**  
  Upload jersey → “List for sale” → Udfyld pris/shipping → Listing i marketplace → Interessent kontakter via messaging → Handel.
- **Flow 3 – Byde i auktion:**  
  Browse auctions → Gå til jersey/auktion detail → Byde → Følge med via notifikationer.
- **Flow 4 – Social engagement:**  
  Browse feed → Like/save jerseys → Følge samlere → Se notifikationer.

UI’et skal være designet omkring disse flows – ikke omkring tilfældige sider.

### 3.3 Komponent-hierarki (forenklet)

- **Layoutniveau:**
  - `AppShell` (topnav, sidebar, right sidebar, bottom nav på mobil)  
  - `PageLayout` (header, content, optional filters/sidebar)
- **Domænekomponenter:**
  - Wardrobe: `JerseyGrid`, `JerseyCard`, `JerseyFilterBar`  
  - Marketplace: `ListingCard`, `ListingFilterBar`  
  - Auctions: `AuctionCard`, `AuctionDetail`, `BidList`, `BidForm`  
  - Profile: `ProfileHeader`, `ProfileTabs`, `ProfileStats`  
  - Feed: `FeedItem`, `PostCard`, `ActivityItem`  
  - Messaging: `ConversationList`, `MessageList`, `MessageInput`
- **Shared/UI:**
  - Buttons, modals, dropdowns, tabs, toasts – allerede i `components/ui/`.

### 3.4 Responsivt design

- **Mobil først:**  
  - Primær brugskontekst er mobil, men dashboard‑layout skal også fungere på desktop.  
- **Layout-tilpasninger:**
  - Mobil: bottom nav + simple card‑lister.  
  - Tablet/desktop: venstre sidebar (navigation), midterkolonne (content), højre sidebar (live aktivitet/auktioner).  
- Brug Tailwind breakpoints (`sm`, `md`, `lg`, `xl`) konsekvent:
  - Skjul/vis sidebar/secondary panels pr. breakpoint.  
  - Grid‑kolonner adaptivt (fx 2 kolonner på mobil, 4 på desktop i wardrobe).

---

## 4. Udviklingsfaser (frontend)

### 4.1 Fase 1 – App-struktur & navigation

**Mål:**

- Have en ren, overskuelig app‑struktur med:
  - Hovedlayout (navigation + layout‑rammer).  
  - Routing mellem vigtigste sider (Home, Wardrobe, Marketplace, Auctions, Profile, Settings).

**Komponenter & opgaver:**

- Ryd op i `src/App.tsx` og `src/pages/`:
  - Sørg for klar route‑struktur (med `react-router-dom`) – eller, når Next er klar, i `app/`‐mappen.  
  - Indfør `AppShell`:

```tsx
// pseudo
function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <TopNav />
        <Outlet /> {/* page content */}
      </main>
      <RightSidebar className="hidden xl:block" />
      <BottomNav className="fixed bottom-0 w-full md:hidden" />
    </div>
  );
}
```

- Definér routes:
  - `/` (Home), `/marketplace`, `/auctions`, `/jerseys/:id`, `/profile/:username`, `/messages`, `/settings` osv.

**Testing:**

- Alle hovedlinks i navigation leder til den rigtige side.  
- Layout ser ok ud på mobil og desktop (ingen overlappende elementer).

---

### 4.2 Fase 2 – Auth UI & brugerhåndtering

**Mål:**

- Grundlæggende auth‑flow:
  - Landing page (public).  
  - Login/signup views (Clerk UI eller custom).  
  - Protected routes (dashboard, wardrobe, marketplace interaktion).

**Komponenter & opgaver:**

- Implementér `AuthGate`/`ProtectedRoute` (findes allerede i `src/components/ProtectedRoute.tsx`, tilpas hvis nødvendigt).  
- Tilføj auth‑UI:
  - En central `/auth` side med login/signup.  
  - Knapper og CTA’er i header (“Sign in”, “Start your wardrobe”).
- Når Clerk integreres fuldt:
  - Vis brugeravatar, username og menu (Profile, Settings, Logout) i topnav.

**API-integration:**

- Kald `GET /api/v1/me` (eller Supabase direkte i nuværende setup) efter login for at hente profil.  
- Gem `currentUser` i global state (React Query cache eller simpel context).

**Testing:**

- Ulogget bruger:
  - Kan se landing/marketing‑views.  
  - Bliver redirectet til `/auth` på beskyttede ruter.  
- Logget bruger:
  - Ser dashboard og wardrobe uden redirect‑problemer.

---

### 4.3 Fase 3 – Core feature interfaces

**Mål:**

Implementere UI til de flows, der skaber værdi:

- Wardrobe upload + visning  
- Marketplace listings  
- Auctions & bidding  
- Jersey detail

#### 4.3.1 Wardrobe UI

**Komponenter:**

- `WardrobePage` (page)  
- `JerseyGrid`, `JerseyCard`  
- `UploadJerseyModal/Form`

**Opgaver:**

- Sørg for at `WardrobePage`:
  - Viser brugerens egne jerseys i grid.  
  - Har tydelig CTA “Upload jersey”.  
- `UploadJerseyForm`:
  - Felter matcher `JerseyCreate` schema (club, season, type, player, badges, condition, notes, visibility, images).  
  - Brug shadcn‑formularer + React Hook Form + Zod til validering (på sigt).

**API-integration:**

- Læs: `GET /api/v1/users/:id/wardrobe` (eller direkte Supabase-equivalent i nuværende setup).  
- Skriv: `POST /api/v1/jerseys` ved submit i upload‑form.

**Testing:**

- Kan uploade jersey → den dukker op i grid uden manuel reload.  
- Valideringsfejl vises pænt (fx missing club/season, ingen billeder).

#### 4.3.2 Marketplace UI

**Komponenter:**

- `MarketplacePage`  
- `ListingFilterBar` (club, season, price‑range, sort)  
- `ListingCard` (viser jersey + pris + seller info)

**API-integration:**

- `GET /api/v1/sale-listings` med filtre fra URL query params.  
- Klik på card → `/jerseys/:id` (jersey detail, med salgsinfo).

#### 4.3.3 Auctions UI

**Komponenter:**

- `AuctionsPage` – liste over live/kommende auktioner.  
- `AuctionDetailPage` – detaljeret view med countdown, budhistorik, bid‑form.

**API-integration:**

- `GET /api/v1/auctions?status=active` på liste.  
- `GET /api/v1/auctions/:id` (når backend har det) + `GET /api/v1/auctions/:id/bids` eller samlede data.  
- `POST /api/v1/auctions/:id/bids` ved bud.

**Testing:**

- Countdown opdateres korrekt (client‑side timer).  
- Bud sendes og vises i historik uden reload.

#### 4.3.4 Jersey detail

**Komponenter:**

- `JerseyDetailPage`  
- `JerseyMetaSection`, `MarketSection`, `SocialSection`

**API-integration:**

- `GET /api/v1/jerseys/:id` med udvidet data (market + stats).  
- Under “For sale”/“Auction”:
  - CTA “Buy / Show interest” → messaging flow.  
  - CTA “Place bid” for auktioner.

---

### 4.4 Fase 4 – Advanced features & polish

**Mål:**

- Tilføje messaging, notifications, feed‑forbedringer og generel UI‑polish (loading states, error handling, empty states).

#### 4.4.1 Messaging

- **Inbox:** liste over conversations (`GET /api/v1/conversations`).  
- **Conversation view:** messages + input (`GET/POST /api/v1/conversations/:id/messages`).
- UX:
  - Vis jersey/listing‑kontekst øverst i samtalen (billede + basisinfo).  
  - Klare status‑indikatorer (read/unread).

#### 4.4.2 Notifications

- Badge i topnav (`bell`‑ikon) med unread‑count.  
- Dropdown eller dedikeret `/notifications` side.  
- API: `GET /api/v1/notifications`, `POST /api/v1/notifications/:id/read`.

#### 4.4.3 Polish

- Empty states:
  - Ingen jerseys endnu → “Upload your first shirt” med illustration.  
  - Ingen listings/auktioner → forklarende tekst.
- Loading states:
  - Skeleton‑komponenter (allerede i `components/ui/skeleton`).
- Error states:
  - Toaster/alerts når API‑kald fejler, med forslag til næste skridt (retry, kontakt support).

---

### 4.5 Fase 5 – Testing & optimisation (frontend)

**Mål:**

- Sikre at de vigtigste flows er stabile, hurtige og uden UI‑bugs.

**Tiltag:**

- Component tests (Jest/Testing Library) for kritiske UI‑komponenter (forms, kort, navigation).  
- E2E‑tests (Playwright/Cypress) for:
  - Signup → upload jersey → list for sale.  
  - Browse → bid on auction.  
  - Follow → like/save → notifications.

---

## 5. Code Organization

### 5.1 Mappe-struktur (current Vite + fremtidig Next)

**Nuværende (`src/`):**

```text
src/
  main.tsx
  App.tsx
  pages/
    Home.tsx
    Marketplace.tsx
    JerseyDetail.tsx
    Profile.tsx
    ...
  components/
    ui/          # shadcn/Radix komponenter
    home/        # dashboard widgets
    ...
  integrations/
    supabase/
      client.ts
      types.ts
  contexts/
    AuthContext.tsx
  hooks/
    use-mobile.tsx
    use-toast.ts
  types/
    index.ts     # Jersey, Post, User, Notification osv.
```

**Når vi flytter til Next.js (apps/web):**

- `src/pages` → `app/(routes)/...` (Next routes)  
- `src/components` → `app/components` eller `components/` i root af app.  
- `integrations/supabase` og `types` kan flyttes næsten uændret.

### 5.2 Komponentorganisation

- Organisér efter **domæne**, ikke kun efter teknisk type:
  - `components/wardrobe/`, `components/marketplace/`, `components/auctions/`, `components/profile/`.  
  - `components/common/` for tværgående komponenter (cards, badges, avatars).
- Hold komponenter små og fokuserede:
  - Sider → orkestrerer datafetching og sammensætter domænekomponenter.  
  - Domænekomponenter → visning + simpel interaktionslogik.  
  - UI‑komponenter → generiske, genbrugelige byggesten.

### 5.3 State management

- Brug **React Query** (TanStack Query) til server‑state:
  - `useQuery` for `GET`‑kald (jerseys, listings, auctions, feed).  
  - `useMutation` for `POST/PATCH/DELETE` (upload, bids, likes).
- Brug React context eller simple `useState`/`useReducer` til lokal UI‑state:
  - Modaler, dropdowns, trin i formularer.
- Undgå global state managers (Redux, Zustand) indtil du har et klart behov.

### 5.4 Styling metodik

- Tailwind utility‑classes + shadcn‑komponenter som primære værktøjer.  
- Fælles farver, spacing, typography i `tailwind.config.ts`.  
- Undgå inline styles; brug Tailwind classes og evt. små `cn()`‑helpers for conditional styling.

---

## 6. User Experience Guidelines

### 6.1 Loading states

- Brug skeletons på:
  - Jerseys grids  
  - Listing/auction kort  
  - Profil header
- Indikér tydeligt ved kritiske handlinger:
  - “Placing bid…”  
  - “Saving listing…”  
  - Disable knapper imens.

### 6.2 Error handling & feedback

- Alle API‑fejl skal:
  - Vises som toast/alert med kort, klar tekst.  
  - Ikke afsløre interne detaljer (ingen stacktraces).  
- Formfejl:
  - Vis inline beskeder under felter (fx “Season is required”).  
  - Scroll til første fejl ved submit på mobil.

### 6.3 Forms & validering

- Brug React Hook Form + Zod (på sigt) for:
  - Upload jersey  
  - Create sale listing  
  - Create auction  
  - Messaging (simple validering – non-empty)
- Guidet UX:
  - Del længere formularer op i sektioner (fx “Basics”, “Player & badges”, “Condition & visibility”).

### 6.4 Mobilresponsivitet

- Design for **one‑hand use**:
  - Primære actions nederst på skærmen (bottom nav, primary buttons).  
  - Undgå små touch‑targets.  
- Test flows på flere devices/bredder (Chrome devtools + virkelige telefoner).

### 6.5 Tilgængelighed (a11y)

- Brug semantiske HTML‑elementer (`<button>`, `<nav>`, `<header>`, `<main>`).  
- Sørg for:
  - Kontrastniveauer i dark theme er tilstrækkeligt.  
  - Fokus‑stater er synlige (ikke fjern default outlines uden erstatning).  
  - Alle interaktive elementer kan bruges med tastatur.

---

## 7. Afslutning

Denne frontend‑guide binder produktbrief, PRD, tech stack, database og API‑design sammen til en praktisk plan for UI‑udvikling:

- På kort sigt: viderebyg på den eksisterende Lovable‑frontend i `src/` med bedre struktur, flows og API‑integration.  
- På længere sigt: portér UI’et til en Next.js‑baseret monorepo‑struktur, genbrugende de samme domænekomponenter, typer og UX‑mønstre.

Hvis du arbejder fasevist (layout → auth → core features → advanced features → tests), vil du relativt hurtigt have en frontend, der matcher Huddles ambition: et moderne, mørkt, sportsligt univers for fodboldtrøje‑samlere, som føles både intuitivt og professionelt.



