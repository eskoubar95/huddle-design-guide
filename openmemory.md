## Overview
- Huddle er en global platform for fodboldtrøje-samlere med fokus på digital garderobe, marketplace (fast pris + auktioner) og community.
- Stack: Next.js 16 + React 19 frontend (App Router), Supabase (Postgres + Edge Functions) som backend og database, Clerk for authentication.

## Architecture
- Frontend: Next.js app i `apps/web/` med App Router struktur (`app/`, `components/`, `lib/`).
- Backend: Supabase-projekt i `supabase/` med SQL-migrationer og Edge Functions.
- Authentication: Clerk integration (`@clerk/nextjs`) med SSO support (Google, Facebook, Discord).
- Integrationslag i `apps/web/lib/supabase/` til klient og server-side operations.

## Components & Domains
- Auth: Email/password sign up med email verification flow (`apps/web/app/(auth)/auth/page.tsx`).
- Wardrobe & jerseys: UI-komponenter til upload, visning og organisering af trøjer.
- Marketplace & auktioner: Skærme til listings, auktioner og bud.
- Community & feed: Dashboard med aktivitet og community features.

## Patterns
- Domæne-før struktur (app router pages + components + lib utilities).
- Clerk som authentication provider, Supabase for data storage.
- Email verification flow med 6-digit code input (InputOTP component).

## Implementation Plans
- HUD-19: Email Verification Flow - Fix manglende email verification flow i sign up processen (.project/plans/HUD-19/implementation-plan-2025-11-28-HUD-19.md)

## User Defined Namespaces
- frontend
- backend
- database
