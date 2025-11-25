## 1. Executive Summary

Huddle er en digital platform for fodboldtrøje-samlere, der kombinerer **digital garderobe**, **specialiseret marketplace** (fastpris og auktioner) og **community** i ét samlet univers. Platformen gør det nemt for samlere at uploade, organisere og vise deres trøjer, samtidig med at de kan købe, sælge og følge hinandens samlinger.

MVP (v1.0) fokuserer på en webbaseret oplevelse bygget på Next.js med et Sorare-inspireret dashboard, obligatorisk ID-verifikation for at skabe trust, on‑platform messaging mellem køber og sælger samt en budgetvenlig, men fuld cyklus shipping-model (køber vælger leveringstype, sælger får pakkelabel). Forretningsmodellen i v1 er primært **transaction fees** på handler, suppleret af enkel, lav-friktions annoncering; en Premium-model (Huddle+) gemmes til senere, når brugerbehovene er valideret.

---

## 2. Product Overview & Vision

### 2.1 Produktbeskrivelse

- **Produktnavn:** Huddle  
- **Kategori:** Global football shirt collector platform  
- **Kort pitch:** “Din digitale garderobe og markedsplads for fodboldtrøjer – med fokus på autenticitet, tryghed og community.”

### 2.2 Problemet vi løser

- Fragmenteret oplevelse: Samlere bruger i dag eBay, Vinted, Depop, IG, Facebook-grupper m.m. → ingen samlet platform kun for trøjer.  
- Manglende viz & stolthed: Samlinger lever ofte som tilfældige billeder eller kasser i et skab.  
- Lav tillid: Høj risiko for fakes, scams og dårlig kommunikation på generiske markedspladser.  
- Ingen “home base” for football shirt culture globalt.

### 2.3 Løsningen

- **Digital garderobe:** Visuel, struktureret måde at dokumentere, organisere og fremvise trøjesamlinger.  
- **Specialiseret marketplace & auktioner:** Alt er optimeret til fodboldtrøjer (felter, filtre, sprog og kultur).  
- **Community & social lag:** Følg, like, save, watchlists og feed der føles som et levende collector-univers.  
- **Trust-first design:** Obligatorisk ID-verifikation, gennemsigtighed og guidede handelsflows med shipping og betaling.

### 2.4 Vision

- **Vision:** Huddle skal være det globale hjem for fodboldtrøje-kulturen – stedet hvor samlere mødes, handler og bygger deres digitale identitet gennem trøjer.  
- **Langsigtet position:** Førende global platform for football kits, kendt inden for football culture, merch communities og streetwear.

---

## 3. Target User Personas

### 3.1 Hardcore Collector – “Mads”, 29, København

- **Demografi:**
  - 29 år, kontorjob, bor i storby (DK/SE/NO/UK).  
  - Har 30–100+ trøjer, samler dedikeret siden teenageårene.

- **Mål & motivationer:**
  - Vise samlingen frem visuelt og stolt.  
  - Finde specifikke trøjer (æraer, spillere, special badges).  
  - Handle trygt uden fakes og scams.  
  - Bygge reputation som “seriøs samler”.

- **Pain points i dag:**
  - Fakes og usikkerhed på eBay/Vinted/IG.  
  - Dårligt overblik over egen samling (billeder, noter, priser spredt flere steder).  
  - Tidskrævende forhandling via DM på IG/FB.  
  - Ingen central profil hvor andre kan se hele samlingen.

- **Hvad Huddle skal levere:**
  - Smukt, mørkt dashboard med hans garderobe.  
  - Filtrering og søgning på sæson, klub, spiller, condition m.m.  
  - Tryg handel via ID-verifikation, klare listings og guidet flow.  
  - Social proof gennem følgere, likes og watchlists.

---

### 3.2 Aspirational New Collector – “Sofia”, 23, Oslo

- **Demografi:**
  - 23 år, studerende/ung professionel.  
  - Følger fodbold tæt og er meget aktiv på TikTok/IG.

- **Mål & motivationer:**
  - Finde særlige trøjer, som ikke alle andre har.  
  - Lære markedet at kende uden at blive snydt.  
  - Inspireres af andres samlinger.

- **Pain points i dag:**
  - Manglende overblik over fair priser.  
  - Ved ikke, hvor hun skal starte udover mainstream shops.  
  - Utryghed ved at handle brugt med fremmede.

- **Hvad Huddle skal levere:**
  - Let onboarding og tydelig forklaring af konceptet.  
  - Simpelt upload-flow når hun køber/sælger første brugte trøje.  
  - Tryghed via verificerede profiler, condition-scale og klare billeder.  
  - Mulighed for at følge og gemme inspirerende samlinger.

---

### 3.3 Reseller / Sneakerhead Crossover – “João”, 32, Porto

- **Demografi:**
  - 32 år, erfaren i sneaker-/resell-miljøet.  
  - Ser trøjer som næste “asset class” at handle.

- **Mål & motivationer:**
  - Købe og sælge effektivt med god margin.  
  - Finde likvide, eftertragtede items (limited, retro, special badges).  
  - Bruge data til at forstå trends og prisudvikling (på sigt).

- **Pain points i dag:**
  - Platforme er for generiske og ikke optimeret til trøjer.  
  - Svært hurtigt at vurdere trust på nye købere/sælgere.  
  - Ingen kombineret marketplace + social proof kun for trøjer.

- **Hvad Huddle skal levere:**
  - Overblik over aktive auktioner og “hot” listings.  
  - Effektivt listing-flow for både fast pris og auktion.  
  - Klar struktur for fees og vilkår.  
  - (Senere) analytics og price history.

---

### 3.4 Practical Parent – “Line”, 38, Aalborg

- **Demografi:**
  - 38 år, to børn der går til fodbold og elsker trøjer.  
  - Ikke samler selv, men køber og sælger løbende.

- **Mål & motivationer:**
  - Købe brugte trøjer i god stand til fair pris.  
  - Sælge for små trøjer videre nemt.  
  - Undgå bøvl med fragt, fakes og utryg kommunikation.

- **Pain points i dag:**
  - Ved ikke hvad hun skal stole på (fakes, dårlige beskrivelser).  
  - Synes generiske markedspladser er rodede.  

- **Hvad Huddle skal levere:**
  - Guidet købsflow (vælg størrelse, klub, stand → find relevante listings).  
  - Klar condition-scale og ærlige beskrivelser.  
  - Fuldt guidet shipping (vælg pickup point, få label, drop off).

---

## 4. User Stories & Use Cases

### 4.1 Onboarding & Account

- **US-01:** Som ny bruger vil jeg kunne oprette en konto hurtigt (e-mail/social login), så jeg kan komme i gang med at bruge platformen.  
- **US-02:** Som ny bruger vil jeg guides til at uploade min første trøje, så jeg hurtigt forstår værdien af Huddle.  
- **US-03:** Som bruger vil jeg gennemføre ID-verifikation, så andre kan stole på, at min profil er ægte, og jeg kan sælge/byde.

**Use case – Onboarding:**
1. Bruger lander på landing page (engelsk UI).  
2. Klikker “Get started” / “Create your wardrobe”.  
3. Sign up via Clerk (e-mail + password; social login senere).  
4. Prompt: “Verify your identity to start selling & bidding.”  
5. ID-verifikationsflow (Stripe Identity/Veriff/Onfido – afhængig af valg).  
6. Efter verifikation lander bruger på dashboard med CTA: “Upload your first shirt”.

---

### 4.2 Digital Garderobe

- **US-10:** Som samler vil jeg uploade en trøje med billeder og metadata, så den bliver en del af min digitale samling.  
- **US-11:** Som samler vil jeg markere en trøje som public/private, så jeg styrer, hvad andre kan se.  
- **US-12:** Som samler vil jeg filtrere min garderobe på klub, sæson, type, spiller m.m., så jeg hurtigt finder det jeg leder efter.

**Use case – Upload jersey:**
1. Bruger klikker “Add jersey”.  
2. Upload af 1–5 billeder og valg af thumbnail.  
3. Udfyld felter: klub/land, sæson, type (Home/Away/Third/GK), tryk (spiller/nummer), badges, condition (1–10), noter.  
4. Vælg visibility: Public / Private.  
5. Gem → trøjen vises i wardrobe og (hvis public) i feed.

---

### 4.3 Marketplace – Fastpris

- **US-20:** Som sælger vil jeg kunne liste en trøje til fast pris med tydelig condition, så købere forstår hvad de køber.  
- **US-21:** Som køber vil jeg se detaljeret info, billeder og pris, så jeg kan vurdere om jeg vil købe.  
- **US-22:** Som køber vil jeg kunne sende “Show interest” og starte en beskedtråd med sælger direkte i Huddle.  
- **US-23:** Som sælger vil jeg have et guidet shipping-flow, så jeg nemt kan få en pakkelabel og aflevere pakken.

**Use case – Fastpris listing:**
1. Sælger vælger jersey fra wardrobe → klikker “List for sale”.  
2. Angiver pris, valuta, og om den er negotiable.  
3. Vælger shipping-indstillinger:
   - Leveringsmetoder (pickup point, hjemmelevering).  
   - Hvem betaler fragt (køber/sælger/inkluderet).  
4. Gem listing → vises i marketplace + feed.  
5. Køber klikker “Show interest” → in‑app chat åbnes.  
6. Ved enighed gennemfører køber checkout; Huddle/Medusa opretter ordre og genererer pakkelabel.

---

### 4.4 Auktioner

- **US-30:** Som sælger vil jeg oprette en tidsbegrænset auktion (24–168 timer) med startpris og fragtmodel, så jeg kan maksimere prisen.  
- **US-31:** Som køber vil jeg kunne byde på en trøje og se højeste bud og tid tilbage.  
- **US-32:** Som sælger vil jeg kunne vælge “2nd winner”, hvis vinderen falder fra.  
- **US-33:** Som sælger vil jeg manuelt kunne lukke auktionen ved særlige tilfælde (under klare regler).

**Use case – Auktion:**
1. Sælger vælger jersey → “Start auction”.  
2. Angiver startpris, varighed, fragtmodel.  
3. Auktion kører; brugere kan byde (autorefresh/real-time).  
4. Når tiden udløber, lukker systemet auktionen automatisk.  
5. Vinderen notificeres og får checkout-flow; sælger får label efter betaling.

---

### 4.5 Community & Social

- **US-40:** Som bruger vil jeg se et feed med nye uploads, salg og auktioner fra dem jeg følger og generelt på platformen.  
- **US-41:** Som bruger vil jeg følge andre samlere og se et preview af deres wardrobe.  
- **US-42:** Som bruger vil jeg kunne like og save trøjer til en watchlist.  
- **US-43:** Som bruger vil jeg modtage notifikationer om bud, saves, nye listings fra dem jeg følger, osv.

---

## 5. Feature Requirements

### 5.1 Core Features (MVP)

#### 5.1.1 Digital Garderobe

- **Krav:**
  - Opret/redigér/slet jerseys med felter: klub/land, sæson, type, tryk, badges, condition (1–10), noter.  
  - Understøttelse af 1–5 billeder pr. jersey, inkl. valg af thumbnail.  
  - Visibility-toggle (Public/Private) pr. jersey.  
  - Wardrobe-visning med filtrering og sortering.
- **Acceptkriterier:**
  - En verificeret bruger kan uploade en jersey på < 2 minutter.  
  - Public jerseys kan findes i feed/marked af andre brugere.

#### 5.1.2 Marketplace – Fastpris

- **Krav:**
  - Konverter eksisterende jersey til fastpris-listing via MedusaJS.  
  - Definer pris, valuta og negotiable toggle.  
  - Angiv shipping-parametre (leveringstype, betaler).  
  - Listing skal være knyttet til ejerens profil og jersey-data (ingen duplikering).  
  - On‑platform messaging koblet til listing (“Show interest”).
- **Acceptkriterier:**
  - Køber kan se alle relevante oplysninger (inkl. condition) og sælgers verified status.  
  - Køber kan starte og fortsætte dialog om en given listing uden at forlade Huddle.

#### 5.1.3 Auktioner

- **Krav:**
  - Opret auktion med startpris, varighed (24–168 timer) og fragtmodel.  
  - Live countdown og opdatering af højeste bud.  
  - Enkel budhistorik (seneste X bud; evt. fuld liste i admin).  
  - Automatisk lukning via background job/cron.  
  - Mulighed for at vælge “2nd winner” hvis vinderen falder fra.  
  - Mulighed for manuel lukning efter klare regler (fx ingen bud).
- **Acceptkriterier:**
  - Systemet håndterer samtidige bud uden datakonflikt.  
  - Vinderen notificeres og kan gennemføre checkout inden for defineret tidsrum.

#### 5.1.4 Community & Profil

- **Krav:**
  - Brugerprofil med:
    - Basis-info (navn, handle, land).  
    - Statistik (antal trøjer, antal salg, antal likes/saves).  
    - Sektioner: Wardrobe, For Sale, Auctions, Posts (senere).  
  - Følg/Unfollow, likes og saves.  
  - Feed med indhold fra fulgte profiler + generelt aktivitetsudvalg (curated).  
  - Notifikationer for:
    - Nye følgere, likes, saves.  
    - Bud på egne auktioner.  
    - Prisændringer/salg på watchlisted jerseys.
- **Acceptkriterier:**
  - Bruger kan følge andre og se et relevant feed.  
  - Actions (like/save/follow) påvirker feed og notifikationer.

#### 5.1.5 Trust & ID-verifikation

- **Krav:**
  - ID-verifikation (Stripe Identity/Veriff/Onfido) er obligatorisk for at:
    - Liste trøjer til salg.  
    - Byde på auktioner.  
  - Verified badge på profil og i listing/auktion UI.  
  - Flow til at starte verifikation fra onboarding og fra handlinger (før første listing/bid).
- **Acceptkriterier:**
  - Uverificerede brugere kan browse, men ikke handle.  
  - Gennemsnitlig bruger kan fuldføre verifikation på < 5 min (med acceptabel manuel review-SLA).

#### 5.1.6 Full-cycle Shipping (MVP)

- **Krav:**
  - Køber vælger leveringstype (pickup point eller hjemmelevering) i checkout.  
  - Systemet genererer pakkelabel via integration (direkte eller semi-manuel) med mindst én nordisk fragtløsning.  
  - Sælger modtager label (PDF/QR) med klare instruktioner.  
  - Shipping-rules styres via Medusa regions/shipping profiles.
- **Acceptkriterier:**
  - Min. 90% af completed orders har automatisk genereret label.  
  - Sælger kan få label uden at forlade Huddle.

---

### 5.2 Nice-to-Have / Fase 2+

- Collections (kuraterede samlinger: “World Cup 2010”, “AC Milan 90s” osv.).  
- Trade Mode (byttefunktion uden monetær transaktion).  
- Rating/Review-system mellem brugere.  
- Udvidet messaging (grupper, vedhæftede medier, voice notes).  
- Price history og analytics (historiske priser, trending clubs, spillere).  
- Verified Sellers-program, Pro Seller accounts.  
- Fysisk autentificeringsservice og Verified Clubs med officielle drops.  
- Dedikeret mobilapp (iOS/Android) baseret på erfaringer fra web-MVP.

---

## 6. Technical Requirements (high-level)

### 6.1 Frontend & UX

- **Next.js** (App Router) som primær web-ramme:
  - Server-side rendering og statisk generation for bedre SEO og hurtig initial load.  
  - Client-side interaktion for dashboard, feed, wardrobe osv.  
- **Tailwind CSS** til styling:
  - Dark theme, gradient-baseret sportslook, responsive UI.  
  - Komponent-bibliotek struktureret efter domæner (Wardrobe, Marketplace, Community).

### 6.2 Auth & Identity

- **Clerk** til:
  - Sign up / sign in (e-mail + password, social login senere).  
  - Session management og sikker håndtering af brugeridentitet.  
- Huddle-profiler kobles 1:1 til Clerk users med yderligere domænefelter i backend (samler-statistik, wardrobe mv.).

### 6.3 Commerce Backend – MedusaJS

- **MedusaJS** bruges som core commerce engine:
  - Marketplace engine (P2P):
    - Jerseys modelleres som “product-like” entities, men med ejerskab knyttet til bruger, ikke Huddle selv.  
  - Listings (fast pris) som produkter/varianter.  
  - Auktioner via custom Medusa-module:
    - Entities for Auction, Bid med kobling til jersey/listing.  
    - Job/cron til at lukke auktioner.  
  - Orders og transactions:
    - Oprettelse af ordrer, status-flow (pending, paid, shipped, completed, disputed).  
  - Regions & shipping rules:
    - Opsætning af regioner (Norden i første omgang) med tilknyttede shipping options og valutaer.  
  - **Medusa Admin**:
    - Internt ops-dashboard til moderation, disputes, refunds, auktionsovervågning og support.

### 6.4 Database & Storage – Supabase

- **Supabase (Postgres)** til:
  - Social graph (follows, likes, saves).  
  - Feed events og notifikationer.  
  - Evt. supplerende jersey- og brugerdata, der ikke passer naturligt i Medusa.  
- **Supabase Storage** eller Medusa-tilknyttet storage til:
  - Billeduploads af trøjer i forskellige størrelser (thumbnails, detailbilleder).

### 6.5 Payments – Stripe (Connect)

- **Stripe (formentlig Connect)** til:
  - P2P-betalinger mellem købere og sælgere med Huddles fee ovenpå.  
  - Håndtering af udbetalinger til sælgere (payouts), refunds, disputes.  
- Krav:
  - Transparent fee-struktur (procent/flat) vist i checkout.  
  - Huddle håndterer ikke rå kortdata; alt går via Stripe.

### 6.6 ID-verifikation – Stripe Identity/Veriff/Onfido

- Integration til én ID-verifikationsudbyder:
  - Onboarding-flow, der indsamler nødvendige dokumenter/billeder.  
  - Webhooks eller status-callbacks til at opdatere “verified”-status på bruger.  
- Dataopbevaring:
  - Kun nødvendige metadata gemmes i vores DB; ingen kopier af dokumenter, hvis ikke nødvendigt.

### 6.7 Shipping-integration

- Medusa regions & shipping profiles definerer:
  - Tilgængelige shipping-metoder pr. region.  
  - Prislogik og regler (vægt, destination, leveringsform).  
- Integration til mindst én nordisk fragtleverandør eller aggregator:
  - API-integration eller semiautomatisk løsning (fx CSV/label-generator) i MVP.  
  - Fokus på lave omkostninger og lav teknisk kompleksitet.

### 6.8 Background jobs & automatik

- Auktion-lukning, notifikationer og andre tidskritiske hændelser:
  - Håndteres via Medusa background jobs, cron eller Supabase Edge Functions.  
  - Krav om robusthed (ingen “hængende” auktioner).

### 6.9 Non-funktionelle krav

- **Performance:**  
  - Primære sider (landing, dashboard, wardrobe) loader hovedindhold på < 2 sek. for nordiske brugere.  
- **Sikkerhed:**  
  - Ingen lagring af følsomme kortdata.  
  - Beskyttelse mod typiske webangreb (XSS, CSRF, rate limiting på auth/ID-flow).  
- **Skalerbarhed:**  
  - Arkitektur skal kunne vokse fra ~1.000 til 50.000 brugere uden større omskrivning.  
- **Observability:**  
  - Logging og monitorering af fejl, auktioner, betalinger, shipping og verifikationsflow.

---

## 7. Success Metrics & KPIs

### 7.1 Aktivering & brug

- **User Activation:** 40–60% af nye brugere uploader en trøje inden for 24 timer.  
- **Listing Rate:** 20–30% af garderoben sættes til salg.  
- **Auction Participation:** 5–15 bud pr. aktiv auktion.

### 7.2 Marketplace & økonomi

- **Transaction Completion:** 60–80% succesfulde handler.  
- **Average Listing Value (ALV):** 40–120 EUR.  
- **Månedlig GMV (internt mål):** fx 10–30k EUR inden for de første 6 måneder efter soft launch.

### 7.3 Engagement & retention

- **DAU/MAU:** 20–30%.  
- **Saves pr. bruger pr. uge:** 3–10.  
- **Follows pr. ny bruger:** ≥ 5.  
- **Notification Interaction Rate:** 20–35%.

### 7.4 Kvalitet & trust

- **Fake reports:** < 1% (over 2% → immediate intervention).  
- **Cancelled auctions:** < 5% (over 10% → redesign af flows og regler).  
- **Return/dispute rate:** < 2% (over 5% → kvalitets- og trust-tiltag).

### 7.5 Vækst

- **Organic Social Growth:** 5–10% månedlig vækst på SoMe.  
- **Referral Rate:** 10–20% af nye brugere kommer via henvisninger.  
- **International User Mix:** 40–60% uden for Danmark (trods nordisk soft launch).

---

## 8. Timeline & Milestones

### 8.1 Fase 1 – Foundation (uge 1–3)

- Definere core data models (User, Jersey, Listing, Auction, Bid, Transaction).  
- Sætte Next.js-projekt op med Tailwind og grundlæggende design system (dark theme + gradients).  
- Opsætte MedusaJS og Supabase, inkl. basisintegration til Clerk.  
- Stubbe wardobe- og marketplace-sider (statisk/dummy data).

### 8.2 Fase 2 – Development (uge 4–10)

- Implementere wardrobe upload-flow (frontend + backend).  
- Implementere listings (fast pris) via Medusa.  
- Implementere auktioner (MVP) inkl. background jobs til closing.  
- Implementere community feed og profilvisninger.  
- Bygge right sidebar med live/mocked aktivitetsdata.  
- Implementere client-side notifikationer (UI og backend-events).

### 8.3 Fase 3 – Pre-launch (uge 11–14)

- Integrere valgt ID-verifikationsløsning.  
- Integrere første shipping-partner (DK først).  
- Integrere Stripe (Connect) for betalinger (MVP-flow).  
- Beta-test med 20–50 samlere (primært DK, evt. nordiske naboer).  
- Iteration på UX, flows og trust-bits baseret på feedback.  
- Marketing-kickoff (SoMe + creators).

### 8.4 Fase 4 – Soft launch & post-launch

- Soft launch i Norden (DK + SE/NO; UK afhænger af told/regler).  
- Løbende forbedringer af marketplace, auktioner, feed og shipping.  
- Introduktion af Verified Sellers og udvidet messaging.  
- Forberedelse af Huddle+ Premium-koncept og price history-funktioner.

---

## 9. Risk Assessment

### 9.1 Trust & fraud

- **Risiko:** Fakes, scams og chargebacks kan skade brandet massivt i starten.  
- **Impact:** Høj.  
- **Mitigation:**  
  - Obligatorisk ID-verifikation for sælgere og købere der byder.  
  - Klare policies for listings, condition og dokumentation.  
  - Rapporteringsfunktion for mistænkelige annoncer/profiler.  
  - Manuel review af tidlige sager og tydelig kommunikation i UI.

### 9.2 Liquidity & critical mass

- **Risiko:** For få aktive listings og brugere får platformen til at føles tom.  
- **Impact:** Høj.  
- **Mitigation:**  
  - Fokus på at onboarde nøglesamlere først.  
  - Pre-launch community-building (IG/TikTok, creators).  
  - Kampagner der belønner upload af wardrobe (fx badges, early access).

### 9.3 Shipping-kompleksitet

- **Risiko:** Uklare regler, forskellige shipping-priser og teknisk kompleksitet på tværs af lande.  
- **Impact:** Medium-høj.  
- **Mitigation:**  
  - Begrænse scope i MVP til Danmark + få nordiske lande.  
  - Vælge en simpel, budgetvenlig integrationsmodel.  
  - Iterere på shipping-UX efter reelle data.

### 9.4 Teknisk gæld & stack-kompleksitet

- **Risiko:** Kombinationen af Next.js, Medusa, Supabase, Clerk, Stripe og ID/KYC kan skabe kompleksitet og gæld.  
- **Impact:** Medium.  
- **Mitigation:**  
  - Klar domæne-opdeling (commerce i Medusa, social/graph i Supabase).  
  - Tydelige API-kontrakter mellem services.  
  - Dokumentere kompromiser og planlægge refactor-slots efter MVP.

### 9.5 Regulatory & KYC/AML

- **Risiko:** Højere transaktionsvolumen kan trække KYC/AML-krav ind.  
- **Impact:** Medium.  
- **Mitigation:**  
  - Bruge PSP (Stripe) og ID-udbydere med indbygget compliance.  
  - Begrænse initial GMV og geografisk scope.  
  - Løbende juridisk sparring ved skalering.

### 9.6 Monetization & fee-struktur

- **Risiko:** Forkert fee-struktur kan enten skræmme brugere væk eller ikke dække omkostninger.  
- **Impact:** Medium.  
- **Mitigation:**  
  - Starte med enkel, gennemsigtig model (fx lav procent + evt. cap).  
  - Teste med early adopters, kommunikere tydeligt og være villig til at justere.  
  - Måle sammenhæng mellem fee-niveauer og aktivitet/GMV.

---

_Dette PRD er tænkt som “source of truth” for Huddle v1.0 og bør løbende opdateres, efterhånden som brugertests, teknisk læring og markedssignaler giver nye indsigter._


