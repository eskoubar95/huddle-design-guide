## Overview
- Huddle er en global platform for fodboldtrøje-samlere med fokus på digital garderobe, marketplace (fast pris + auktioner) og community.
- Stack: React + Vite frontend, Supabase (Postgres + Edge Functions) som backend og database.

## Architecture
- Frontend: Single-page app i `src/` med domæneorganiserede komponenter (fx `pages/`, `components/home/`, `contexts/` for auth).
- Backend: Supabase-projekt i `supabase/` med SQL-migrationer og Edge Functions (fx `close-auctions`) til tidsstyrede jobs.
- Integrationslag i `src/integrations/supabase/` til klient og typer.

## Components & Domains
- Wardrobe & jerseys: UI-komponenter til upload, visning og organisering af trøjer (`UploadJersey`, `JerseyCard`, mv.).
- Marketplace & auktioner: Skærme til listings, auktioner og bud (`Marketplace`, `CreateSaleListing`, `CreateAuction`, `PlaceBid`).
- Community & feed: Hjemme-dashboard med aktivitet, preview og right sidebar (`home/` komponenter).

## Patterns
- Domæne-før struktur (pages + kontekst + UI-bibliotek i `components/ui`).
- Supabase som single source of truth for data og auth.

## User Defined Namespaces
- frontend
- backend
- database
