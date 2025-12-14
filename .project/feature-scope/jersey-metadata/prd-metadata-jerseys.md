## PRD – Jersey Metadata & Football Reference Layer (v1)

### 1. Baggrund & Problem

Huddle er en platform for fodboldtrøje‑samlere med fokus på digital garderobe, marketplace og community.  
For at skabe en “premium” oplevelse, skal brugerne kunne tilknytte **korrekt metadata** til deres trøjer:
- Klub
- Sæson (inkl. gamle sæsoner, 10–15+ år tilbage)
- Spiller
- Trøjenummer

I dag:
- Brugeren indtaster disse ting manuelt (fritekst) i `public.jerseys`.
- Der er ingen kobling til officiel fodbolddata (klubber, spillere, historik).
- Det begrænser vores mulighed for:
  - præcise forslag i upload‑flowet,
  - statistik/badges (“du har 5 Superliga‑trøjer fra 2010’erne”),
  - discovery (“flest trøjer med Saka”, “klubber du samler på”).

Vi har nu adgang til et Transfermarkt‑API, der kan levere:
- Ligaer, klubber og squads per sæson.
- Spillere, klubhistorik og jersey‑numre gennem mange sæsoner.

### 2. Mål

**Primære mål**
- Gøre det markant nemmere for brugere at vælge korrekt klub/sæson/spiller/nummer for deres trøjer – også 10–15 år gamle.
- Skabe et skalerbart metadata‑lag, der kan vokse med brugernes adfærd (flere klubber, flere ligaer, mere historik).
- Holde brugerdata (jerseys, auktioner, osv.) **adskilt** fra reference‑data, så vi kan udvikle metadata‑laget uafhængigt.

**Sekundære mål**
- Understøtte rigt UI omkring klubber og spillere (logo, farver, stadion, historik).
- Gøre det muligt at bygge statistik og badges ovenpå metadata uden at ændre jersey‑modellen igen.

### 3. Scope (MVP)

**In scope**
1. **Nyt `metadata`‑schema i Supabase** med tabeller for:
   - `metadata.competitions` – ligaer/turneringer.
   - `metadata.seasons` – sæsoner, inkl. mapping mellem `seasonId=2025` og label `"25/26"`.
   - `metadata.clubs` – globale klubber med grunddata, logo og farver.
   - `metadata.players` – globale spillere med basisprofil.
   - `metadata.player_contracts` – spillerens klubhistorik pr. sæson inkl. trøjenummer.

2. **Integration til Transfermarkt‑API’et** som primær kilde:
   - Ligaer & klubber: `/competitions/search`, `/competitions/{id}/clubs`.
   - Klubber: `/clubs/search`, `/clubs/{id}/players`, `/clubs/{id}/profile`.
   - Spillere: `/players/search`, `/players/{id}/profile`, `/players/{id}/jersey_numbers`, `/players/{id}/transfers`.

3. **Valgfrie relationer fra `public.jerseys` til `metadata.*`**:
   - Nye nullable FK‑felter (fx `club_id`, `player_id`, `season_id`) uden at ændre eksisterende fritekstfelter.

4. **On‑demand dataflow**:
   - Baseline seed for udvalgte ligaer (Top 5 + udvalgte som Superliga).
   - Lazy backfill af historik (player_contracts) for klubber/sæsoner, som brugerne faktisk interagerer med.

**Out of scope (MVP)**
- Live kampdata (kampe, mål, tabeller).
- Global fulddækning af alle ligaer og klubber fra starten.
- At gøre metadata‑FK’er obligatoriske i jersey‑flowet.

### 4. Brugeroplevelse (UX) – Før vs. Efter

**I dag**
- Bruger uploader trøje, udfylder:
  - Klub (fritekst)
  - Sæson (fritekst)
  - Spiller (fritekst)
  - Nummer (fritekst)
- Ingen forslag, ingen validering, ingen forbindelse til andre brugeres data.

**MVP med metadata**
- Flow (konceptuelt):
  1. Bruger uploader trøje → vi får billede.
  2. AI estimerer klub, farver, kit‑type, nummer, evt. spiller + år.
  3. Backend matcher AI‑gæt med `metadata`:
     - Klub: søg + match mod `metadata.clubs`.
     - Sæson: match år/label mod `metadata.seasons`.
     - Spiller: via `metadata.player_contracts` (klub + sæson + nummer).
  4. UI viser et “Confirm metadata” step:
     - Klub‑dropdown (forudfyldt, men kan ændres).
     - Sæson‑felt (forudfyldt sæsonlabel, men fri tilpasning).
     - Spiller‑dropdown (1–3 kandidater, eller tom).
     - Nummer‑felt (forudfyldt).
  5. Bruger gemmer:
     - Fritekstfelter i `public.jerseys` (som i dag).
     - Valgfri FK’er til `metadata` (hvis der er et klart match).

### 5. Use Cases & Stories

1. **Upload af moderne trøje (ny sæson)**
   - Som bruger vil jeg uploade en ny FC Copenhagen‑trøje (25/26), og systemet skal:
     - Gætte klub og sæson.
     - Foreslå, at nummer 1 i FCK 25/26 sandsynligvis er “Dominik Kotarski”.
     - Lade mig bekræfte eller vælge en anden spiller, før jeg gemmer.

2. **Upload af ældre trøje (10–15 år gammel)**
   - Som bruger vil jeg uploade en Ajax‑trøje fra omkring 2010 med nummer 33, og systemet skal:
     - Forstå, at “2010” ca. svarer til sæson 10/11.
     - Bruge metadata til at finde spillere i Ajax med nummer 33 i 09/10 og 10/11, og foreslå de mest sandsynlige.

3. **Profilstatistik**
   - Som bruger vil jeg kunne se, hvor mange trøjer jeg har fra:
     - En bestemt klub (fx FCK),
     - En bestemt liga (fx Superliga),
     - En bestemt spiller.
   - Dette skal understøttes af metadata‑laget uden at kræve manuelt arbejde.

4. **Discovery / Samler‑indblik (senere)**
   - Som bruger vil jeg opdage mønstre:
     - “Du har 3 trøjer fra 2010’erne i Superligaen”
     - “Du samler på PAOK‑målmænd”
   - PRD v1 forbereder datagrundlaget til dette, selv om UI kan komme i en senere fase.

### 6. Succeskriterier

**Kvantitative**
- X% af nye jersey‑uploads bruger mindst ét metadata‑link (klub/sæson/spiller) efter 4 uger.
- Gennemsnitlig tid til at fuldføre metadata‑step i upload falder (mod baseline).
- Andel af trøjer med fuldt udfyldt (klub + sæson + nummer) øges markant vs. baseline.

**Kvalitative**
- Brugere beskriver uploadflow som “smart”, “hjælpsomt” og ikke som en barriere.
- Teamet oplever, at det er let at bygge nye features på metadata (statistik, badges, discovery).

### 7. Afhængigheder

- Stabil adgang til Transfermarkt‑API’et (rate limits, oppetid).
- Supabase migrations for nyt `metadata`‑schema.
- Edge Functions / scripts til:
  - seed og backfill af metadata,
  - evt. AI‑vision integration (senere).
- Justering af jersey‑upload‑UI i web‑appen.

### 8. Faser (High‑Level)

**Fase 1 – Datamodel & seed (backend‑fokus)**
- Opret `metadata`‑schema og tabeller.
- Seed konkurrencer, clubs, seasons og baseline players for udvalgte ligaer.

**Fase 2 – Player contracts & matching**
- Implementér import af `player_contracts` via jersey_numbers (+ optional transfers).
- Implementér et backend‑endpoint der, givet klub + sæson + nummer (+ evt. navn), returnerer kandidatspillere.

**Fase 3 – Uploadflow integration (MVP)**
- Tilføj “Confirm metadata” step i jersey‑upload.
- Brug metadata‑matching til at forudfylde felter.
- Gem både fritekst og metadata‑FK’er i `public.jerseys`.

**Fase 4 – Insights & polish (senere)**
- Byg simple statistik‑views (per klub/spiller/sæson).
- Eksperimenter med badges og samler‑indsigter.

Denne PRD er tænkt som produktets “hvorfor/hvad”, mens den tilhørende tech‑spec (`tech-spec-metadata-jerseys.md`) beskriver “hvordan” i detaljer (tabeller, felter, flows).


