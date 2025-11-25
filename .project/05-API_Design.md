## 1. API Architecture Overview

### 1.1 Overordnet arkitektur

- **Base URL:** `https://api.huddle.app/api/v1` (eller Next.js route handlers `/api/v1/...`).  
- **Backends bag API’et:**
  - Huddle API kalder **Supabase** (Postgres) til wardrobe, social, messaging, auktioner og transaktioner.
  - Senere kalder API’et også **MedusaJS** til commerce-specifik funktionalitet (products, orders, regions, shipping).
- **Single API-kontrakt:** Frontend taler kun med Huddle API’et; integrationer til Supabase/Medusa ligger i backend-laget.

### 1.2 Authentication & Authorization

- **Auth-provider:** Clerk.  
- **Authentication:**
  - Frontend logger ind via Clerk (widget eller custom UI).  
  - Ved API-kald sendes `Authorization: Bearer <Clerk JWT>`.  
  - Huddle API verificerer token via Clerk SDK og udleder `userId` (UUID der mappes til `auth.users`/`profiles`).
- **Authorization:**
  - Standardregel: kun læse-endpoints for public data er anonyme; alle write-endpoints kræver auth.  
  - Objekt-ejerskab (fx jersey-ejer, sælger) håndhæves:
    - I API-laget (tjek: `owner_id === currentUserId`).  
    - I Supabase via RLS (fx `seller_id = auth.uid()` på listings/auctions).

### 1.3 Request/response standarder

- **Format:** JSON, `Content-Type: application/json`.  
- **Tidspunkter:** ISO 8601 (`"2025-12-01T20:00:00Z"`).  
- **Sprog:** Feltnavne/enums på engelsk i API, selv om produktet beskrives på dansk.

**Succes-respons (eksempel):**

```json
{
  "id": "j_001",
  "club": "AC Milan",
  "season": "2006/2007",
  "jerseyType": "Home"
}
```

**Fejl-respons (standard):**

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not allowed to modify this resource.",
    "details": null
  }
}
```

- Typiske koder:
  - `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`.  
  - Map til HTTP status: 400, 401, 403, 404, 409, 500.

### 1.4 Rate limiting

- **Baseline:**
  - Anonym: fx **100 requests / 15 min / IP**.  
  - Authenticated: fx **300 requests / 15 min / user**.  
- Implementeres som middleware (Next.js edge / API gateway) med evt. Redis eller simpel in-memory løsning i MVP.

---

## 2. Endpoints pr. featureområde

> Nedenfor beskrives de vigtigste endpoints og mønstre. De kan udvides efter behov, men dækker alle core features i PRD’et (wardrobe, marketplace, auktioner, community, messaging).

### 2.1 User & Profile

#### 2.1.1 GET `/api/v1/me`

- **Purpose:** Hent nuværende brugers profil og aggregater.  
- **Auth:** Påkrævet.  
- **Path/query:** Ingen.  
- **Response 200:**

```json
{
  "id": "u_mads",
  "username": "mads_kits",
  "avatarUrl": "https://cdn.huddle.app/avatars/mads.png",
  "country": "DK",
  "bio": "AC Milan collector",
  "followers": 42,
  "following": 18,
  "isVerified": true
}
```

#### 2.1.2 PATCH `/api/v1/me/profile`

- **Purpose:** Opdatere egen profil.  
- **Auth:** Påkrævet.  
- **Body:**

```json
{
  "username": "mads_kits",
  "avatarUrl": "https://...",
  "bio": "New bio",
  "country": "DK"
}
```

- **Response 200:** Opdateret profil (samme shape som `GET /me`).  
- **Errors:** 400 (validation), 409 (username already taken).

#### 2.1.3 GET `/api/v1/users/:id`

- **Purpose:** Offentlig profilvisning.  
- **Auth:** Valgfri.  
- **Path params:** `id` (UUID).  
- **Response 200:**

```json
{
  "id": "u_mads",
  "username": "mads_kits",
  "avatarUrl": "https://...",
  "country": "DK",
  "bio": "AC Milan collector",
  "followers": 42,
  "following": 18,
  "isFollowing": true
}
```

---

### 2.2 Wardrobe & Jerseys

#### 2.2.1 POST `/api/v1/jerseys`

- **Purpose:** Opret jersey i egen wardrobe.  
- **Auth:** Påkrævet.  
- **Body:**

```json
{
  "club": "AC Milan",
  "season": "2006/2007",
  "jerseyType": "Home",
  "playerName": "Kaká",
  "playerNumber": "22",
  "badges": ["Champions League"],
  "conditionRating": 9,
  "notes": "Match worn, great condition",
  "visibility": "public",
  "images": [
    "https://cdn.huddle.app/jerseys/j_001_front.jpg",
    "https://cdn.huddle.app/jerseys/j_001_back.jpg"
  ]
}
```

- **Response 201:** Jersey med `id`, `ownerId`, timestamps.  
- **Errors:** 400 (validering), 401 (ingen auth).

#### 2.2.2 GET `/api/v1/jerseys/:id`

- **Purpose:** Hent detaljeret jersey inkl. markedsstatus.  
- **Auth:** Valgfri (private jerseys kun til owner).  
- **Response 200 (forkortet):**

```json
{
  "id": "j_001",
  "club": "AC Milan",
  "season": "2006/2007",
  "jerseyType": "Home",
  "badges": ["Champions League"],
  "conditionRating": 9,
  "visibility": "public",
  "owner": {
    "id": "u_mads",
    "username": "mads_kits",
    "avatarUrl": "https://..."
  },
  "stats": {
    "likes": 12,
    "saves": 5
  },
  "market": {
    "forSale": true,
    "saleListingId": "sl_001",
    "price": "120.00",
    "currency": "EUR",
    "isAuction": false
  }
}
```

#### 2.2.3 GET `/api/v1/users/:id/wardrobe`

- **Purpose:** Liste jerseys for en bruger.  
- **Auth:** Valgfri, men `visibility=all` kræver at det er egen wardrobe.  
- **Query:** `visibility=public|all`, `limit`, `cursor`.  
- **Response 200:** Array af jersey‑kort til grid.

#### 2.2.4 PATCH / DELETE `/api/v1/jerseys/:id`

- **Purpose:** Opdatere/slette jersey.  
- **Auth:** Påkrævet; kun owner.  
- **Response:** 200 (PATCH), 204 (DELETE).

---

### 2.3 Marketplace – Sale Listings

#### 2.3.1 POST `/api/v1/sale-listings`

- **Purpose:** Liste en jersey til fast pris.  
- **Auth:** Påkrævet; user skal være ID‑verificeret.  
- **Body:**

```json
{
  "jerseyId": "j_001",
  "price": "120.00",
  "currency": "EUR",
  "negotiable": true,
  "shipping": {
    "worldwide": true,
    "localOnly": false,
    "costBuyer": true,
    "costSeller": false,
    "freeInCountry": false
  }
}
```

- **Response 201:** `SaleListing` objekt.  
- **Errors:** 400 (jersey ikke egnet), 403 (ikke verified), 409 (jersey allerede listet/auktion).

#### 2.3.2 GET `/api/v1/sale-listings`

- **Purpose:** Marketplace feed (filterbar).  
- **Query:**  
  - `status=active|sold`  
  - `club`, `season`, `minPrice`, `maxPrice`, `country`, `sort=createdAt_desc|price_asc`  
- **Response 200:**

```json
{
  "items": [
    {
      "id": "sl_001",
      "price": "120.00",
      "currency": "EUR",
      "negotiable": true,
      "status": "active",
      "jersey": {
        "id": "j_001",
        "club": "AC Milan",
        "season": "2006/2007",
        "images": ["https://..."]
      },
      "seller": {
        "id": "u_mads",
        "username": "mads_kits",
        "country": "DK"
      }
    }
  ],
  "nextCursor": null
}
```

#### 2.3.3 POST `/api/v1/sale-listings/:id/interest`

- **Purpose:** “Show interest” → create/reuse conversation om listing.  
- **Auth:** Påkrævet.  
- **Body (valgfri besked):**

```json
{
  "message": "Is it still available?",
  "offerAmount": "110.00"
}
```

- **Response 201:**

```json
{
  "conversationId": "c_001"
}
```

---

### 2.4 Auctions & Bids

#### 2.4.1 POST `/api/v1/auctions`

- **Purpose:** Opret auktion for jersey.  
- **Auth:** Påkrævet; verified user.  
- **Body:**

```json
{
  "jerseyId": "j_002",
  "startingBid": "80.00",
  "buyNowPrice": "150.00",
  "currency": "EUR",
  "durationHours": 72,
  "shipping": {
    "worldwide": true,
    "localOnly": false,
    "costBuyer": true,
    "freeInCountry": false
  }
}
```

- **Response 201:** `Auction` objekt.  
- **Errors:** 400, 403, 409.

#### 2.4.2 GET `/api/v1/auctions`

- **Purpose:** Liste aktive/lukkede auktioner (til feed + filtre).  
- **Query:** `status=active|ended`, `club`, `minBid`, `maxBid`, `sort=endsAt_asc`.

#### 2.4.3 POST `/api/v1/auctions/:id/bids`

- **Purpose:** Placere bud på auktion.  
- **Auth:** Påkrævet; verified user.  
- **Body:**

```json
{
  "amount": "95.00"
}
```

- **Response 201:**

```json
{
  "id": "b_001",
  "auctionId": "a_001",
  "bidderId": "u_sofia",
  "amount": "95.00",
  "createdAt": "2025-11-25T21:10:00Z"
}
```

- **Errors:**  
  - 400 (beløb for lavt), 403 (ikke verified), 409 (auktion ikke aktiv).

---

### 2.5 Transactions

#### 2.5.1 GET `/api/v1/transactions`

- **Purpose:** Liste egne handler (køber/sælger).  
- **Auth:** Påkrævet.  
- **Query:** `role=buyer|seller|all`, `status=pending|completed|...`.  
- **Response 200:** Liste `Transaction` objekter med base jersey-/modpart-info.

---

### 2.6 Social: Follow, Likes, Saves, Feed

#### 2.6.1 POST `/api/v1/users/:id/follow`  
#### 2.6.2 DELETE `/api/v1/users/:id/follow`

- **Purpose:** Følg/unfollow en bruger.  
- **Auth:** Påkrævet.  
- **Response:** 204 (ingen body).

#### 2.6.3 POST `/api/v1/jerseys/:id/like` / DELETE `/api/v1/jerseys/:id/like`  
#### 2.6.4 POST `/api/v1/jerseys/:id/save` / DELETE `/api/v1/jerseys/:id/save`

- Samme mønster: 204, auth krævet.

#### 2.6.5 GET `/api/v1/feed`

- **Purpose:** Hovedfeed.  
- **Auth:** Påkrævet.  
- **Query:** `type=all|following`, `cursor`, `limit`.  
- **Response 200 (eksempel):**

```json
{
  "items": [
    {
      "type": "jersey_uploaded",
      "id": "feed_001",
      "createdAt": "2025-11-25T21:00:00Z",
      "user": {...},
      "jersey": {...}
    },
    {
      "type": "auction_started",
      "id": "feed_002",
      "createdAt": "2025-11-25T21:05:00Z",
      "auction": {...}
    }
  ],
  "nextCursor": null
}
```

---

### 2.7 Posts & Comments

#### 2.7.1 POST `/api/v1/posts`

- **Purpose:** Opret post til feed (evt. bundet til jersey).  
- **Auth:** Påkrævet.  
- **Body:**

```json
{
  "content": "New banger in my collection",
  "jerseyId": "j_001"
}
```

- **Response 201:** `Post` objekt.

#### 2.7.2 POST `/api/v1/posts/:id/comments`

- **Body:**

```json
{
  "content": "Insane shirt!"
}
```

- **Response 201:** `Comment` objekt.

---

### 2.8 Messaging

#### 2.8.1 GET `/api/v1/conversations`

- **Purpose:** Liste brugerens conversations, sorteret efter `updatedAt DESC`.  
- **Auth:** Påkrævet.  
- **Response 200:** Liste samtaler inkl. seneste besked og jersey‑preview.

#### 2.8.2 GET `/api/v1/conversations/:id/messages`

- **Query:** `cursor`, `limit`.  
- **Response 200:** Liste `Message` objekter.

#### 2.8.3 POST `/api/v1/conversations/:id/messages`

- **Body:**

```json
{
  "content": "Can you do 100 EUR including shipping?",
  "images": []
}
```

- **Response 201:** Ny message.

---

### 2.9 Notifications

#### 2.9.1 GET `/api/v1/notifications`

- **Query:** `unreadOnly=true|false`, `cursor`, `limit`.  
- **Response 200:** Liste `Notification` objekter.

#### 2.9.2 POST `/api/v1/notifications/:id/read`

- **Purpose:** Markere notifikation som læst.  
- **Response:** 204.

---

### 2.10 Search

#### 2.10.1 GET `/api/v1/search`

- **Purpose:** Søge på tværs af jerseys/listings/auktioner.  
- **Query:**
  - `q` (fritekst)  
  - `type=jersey|listing|auction|user`  
  - Forskellige filtre (club, season, price, country).  
- **Response 200 (eksempel):**

```json
{
  "query": "Milan 2007",
  "results": {
    "jerseys": [...],
    "saleListings": [...],
    "auctions": []
  }
}
```

---

## 3. Data Models & Validation (uddrag)

### 3.1 Jersey (response)

```ts
type JerseyVisibility = "public" | "private";

interface Jersey {
  id: string;
  ownerId: string;
  club: string;
  season: string;
  jerseyType: string; // 'Home' | 'Away' | ...
  playerName?: string;
  playerNumber?: string;
  badges: string[];
  conditionRating?: number; // 1–10
  notes?: string;
  visibility: JerseyVisibility;
  images: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Validation:**

- `club`, `season`, `jerseyType`, `images` påkrævet.  
- `conditionRating` ∈ [1,10] hvis sat.  
- `images` maks f.eks. 5 entries, gyldige URLs.

### 3.2 SaleListing

```ts
type ListingStatus = "active" | "sold" | "cancelled";

interface SaleListing {
  id: string;
  jerseyId: string;
  sellerId: string;
  price: string;
  currency: string; // 'EUR' | 'DKK' | ...
  negotiable: boolean;
  shipping: {
    worldwide: boolean;
    localOnly: boolean;
    costBuyer: boolean;
    costSeller: boolean;
    freeInCountry: boolean;
  };
  status: ListingStatus;
  soldTo?: string;
  soldAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Validation:**

- `price > 0`, `currency` i whitelist.  
- Shipping-flags skal give mening (fx ikke både `worldwide` og `localOnly` true).

### 3.3 Auction & Bid

```ts
type AuctionStatus = "active" | "ended" | "cancelled";

interface Auction {
  id: string;
  jerseyId: string;
  sellerId: string;
  startingBid: string;
  currentBid?: string;
  buyNowPrice?: string;
  currency: string;
  durationHours: number; // 24 | 48 | 72 | 168
  shipping: SaleListing["shipping"];
  status: AuctionStatus;
  winnerId?: string;
  endsAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: string;
  createdAt: string;
}
```

**Validation:**

- `durationHours` ∈ {24,48,72,168}.  
- `amount` > `currentBid` (eller `startingBid` hvis ingen bud) + evt. min step.  
- Auktionsstatus skal være `active`.

---

## 4. Security Considerations

- **Auth flow:**
  - Clerk håndterer user login → frontend får token → token sendes til Huddle API.  
  - Huddle API verificerer token ved hvert kald (ingen implicit trust).
- **Authorization regler (eksempler):**
  - Kun jersey‑owner må ændre/slette jersey (`PATCH/DELETE /jerseys/:id`).  
  - Kun sælger må ændre sin saleListing/auction.  
  - Kun deltagere i en conversation må læse/ skrive messages.  
  - Kun verified brugere må oprette listings/auktioner og byde.
- **Data validation:**
  - Brug Zod/valideringslag i API’et før databasekald.  
  - Saniter tekstfelter (`bio`, `content`, `notes`) for at undgå XSS.  
  - Strenge checks på beløb og currencies (ingen negative eller urealistiske værdier).
- **CORS:**
  - Allowlist: `https://app.huddle.app`, `https://staging.huddle.app`.  
  - `Access-Control-Allow-Credentials: false` (hvis rent Bearer token), eller true hvis man bruger cookies på samme domæne.  
  - Metoder: `GET, POST, PATCH, DELETE, OPTIONS`.

---

## 5. Integrationseksempler (frontend)

### 5.1 Hente aktive auktioner (Next.js server action)

```ts
"use server";

export async function fetchActiveAuctions() {
  const token = await getClerkToken();

  const res = await fetch(`${process.env.API_URL}/api/v1/auctions?status=active`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Failed to load auctions");
  return res.json();
}
```

### 5.2 Læg bud fra client component

```ts
async function placeBid(auctionId: string, amount: string) {
  const token = await window.Clerk.session?.getToken();

  const res = await fetch(`/api/v1/auctions/${auctionId}/bids`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Failed to place bid");
  }

  return res.json();
}
```

### 5.3 Typisk flow – list jersey til salg

1. Bruger uploader jersey via `POST /api/v1/jerseys`.  
2. I wardrobe-klienten vælger bruger “List for sale” → `POST /api/v1/sale-listings`.  
3. Listing vises i marketplace via `GET /api/v1/sale-listings`.  
4. Køber viser interesse (`POST /api/v1/sale-listings/:id/interest`) → conversation oprettes.  
5. Når parterne er enige, gennemføres checkout (Stripe/Medusa-flow; egne endpoints i en dedikeret “Payments/Checkout” sektion).  
6. `transactions` oprettes/opdateres, `notifications` sendes til køber/sælger.

Dette dokument fungerer som udgangspunkt for implementering af API’et. Når Medusa‑integration og checkout‑flow designes, bør der tilføjes en særskilt sektion for **Payments & Orders** med detaljerede endpoints og state‑machine for betalinger og udbetalinger.


