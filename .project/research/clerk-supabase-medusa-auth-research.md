# Research: Clerk Auth + Supabase Sync + Medusa Integration

**Dato:** 2025-01-27  
**Mål:** Konfigurer 100% korrekt auth og Clerk i web appen, få 100% opsat forbindelse og sync mellem Supabase database, samt tjekke op ift. Medusa backend customers modul.

---

## Executive Summary

**Status:** 🔴 **KRITISKE PROBLEMER FUNDET - SIGN UP VIRKER IKKE KORREKT**

Der er flere kritiske problemer i den nuværende implementering der forhindrer korrekt integration mellem Clerk, Supabase og Medusa:

### 🔴 KRITISK: ClerkProvider Mangler Konfiguration
**Problem:** `ClerkProvider` i `apps/web/app/layout.tsx` har ingen `publishableKey` prop eller environment variable konfiguration. Dette betyder at:
- Sign up flow virker teknisk (mail sendes fra accounts.dev)
- Men brugeren bliver **IKKE** oprettet i Clerk dashboard
- Clerk kan ikke initialisere korrekt uden publishable key

**Symptom:** Brugere kan sign up og modtage verification mail, men intet vises i Clerk dashboard.

### Andre Kritiske Problemer:
1. ❌ **lib/auth.ts bruger forkert Clerk API** - skal bruge `@clerk/backend`
2. ❌ **Supabase migration har forkert foreign key** - refererer til `auth.users` (Supabase auth) i stedet for Clerk
3. ❌ **RLS policies virker ikke med Clerk** - bruger `auth.uid()` som er Supabase auth
4. ❌ **Ingen Medusa customer sync** - ingen integration mellem Clerk users og Medusa customers
5. ⚠️ **Session data fra Clerk** - `session.username` og `session.imageUrl` eksisterer muligvis ikke i JWT token

---

## 1. Current State Analysis

### 1.0 🔴 KRITISK: ClerkProvider Konfiguration Problem

**Fil:** `apps/web/app/layout.tsx`  
**Linje:** 35  
**Severity:** 🔴 KRITISK - BLOCKER

**Nuværende kode:**
```typescript
<ClerkProvider>
  <QueryProvider>
    {children}
  </QueryProvider>
</ClerkProvider>
```

**Problem:**
- `ClerkProvider` mangler `publishableKey` prop
- Environment variable `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` er muligvis ikke sat
- Uden publishable key kan Clerk ikke initialisere korrekt
- Dette forklarer hvorfor sign up virker (mail sendes), men brugeren ikke vises i Clerk dashboard

**Symptom (rapporteret af bruger):**
- ✅ Man kan sign up
- ✅ Man får besked om verification er sendt til mail
- ✅ Man modtager mail fra accounts.dev
- ❌ **Men intet kan ses i Clerk dashboard**

**Status:** ✅ Environment variabler ER sat korrekt i `.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...` ✅
- `CLERK_SECRET_KEY=sk_test_...` ✅
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in` ✅
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up` ✅
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/` ✅
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/` ✅

**Root Cause (OPDATERET):**
Problemet er IKKE manglende environment variabler, men:

1. **ClerkProvider mangler eksplicit `publishableKey` prop** - Selvom ClerkProvider læser automatisk fra env vars, kan det være nødvendigt at passere den eksplicit i nogle tilfælde
2. **Sign up flow stopper ved email verification** - I `auth/page.tsx` linje 124-129:
   ```typescript
   if (result.status === 'missing_requirements') {
     await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
     toast.info("Please check your email for a verification code");
     return;  // ❌ Stopper her - brugeren er IKKE oprettet endnu!
   }
   ```
   **Problem:** Når email verification er påkrævet, stopper flowet. Brugeren bliver IKKE oprettet i Clerk før email er verificeret. Dette er normalt Clerk adfærd, men betyder at brugeren ikke vises i dashboard før verification.

3. **Ingen verification page** - Der er ingen side til at indtaste verification code, så brugeren kan ikke gennemføre sign up

**Fix:**
1. Tilføj eksplicit `publishableKey` prop til ClerkProvider (bedre practice)
2. Implementer email verification flow med verification code input
3. Eller deaktiver email verification i Clerk dashboard (for development)
4. Genstart dev server efter env var ændringer

**Verificering:**
- Tjek browser console for Clerk fejl
- Tjek om dev server er genstartet efter env vars blev sat
- Test sign up flow og verificer email
- Tjek Clerk dashboard efter email verification er gennemført

---

### 1.1 Clerk Authentication Setup

**✅ Hvad virker:**
- `ClerkProvider` er korrekt sat op i `apps/web/app/layout.tsx`
- Middleware beskytter routes korrekt (`apps/web/middleware.ts`)
- Frontend hooks (`useUser()`, `useAuth()`) bruges korrekt i komponenter
- API client (`apps/web/lib/api/client.ts`) henter token korrekt fra Clerk

**❌ Hvad virker IKKE:**
- `lib/auth.ts` bruger `verifyToken` fra `@clerk/nextjs/server` i stedet for `@clerk/backend`
- Reglerne (`.cursor/rules/33-clerk_auth.mdc`) specificerer at man skal bruge `@clerk/backend` og `clerk.verifyToken()`

**Nuværende kode:**
```typescript
// apps/web/lib/auth.ts (FORKERT)
import { verifyToken } from "@clerk/nextjs/server";

const session = await verifyToken(token, {
  secretKey: process.env.CLERK_SECRET_KEY!,
});
```

**Korrekt kode (ifølge regler):**
```typescript
// SKAL VÆRE:
import { clerkClient } from "@clerk/backend";

const clerk = clerkClient(process.env.CLERK_SECRET_KEY!);
const session = await clerk.verifyToken(token);
```

---

### 1.2 Supabase Profile Sync

**✅ Hvad virker:**
- `requireAuth()` opretter automatisk profile ved første API kald
- Service client bruges korrekt til at bypass RLS
- Profile sync logik eksisterer i `lib/auth.ts`

**❌ Hvad virker IKKE:**

#### Problem 1: Forkert Foreign Key Reference

**Migration:** `supabase/migrations/20251125180851_eb64a1cf-7551-46a3-ad40-805ceba56bc3.sql`

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,  -- ❌ FORKERT!
  ...
);
```

**Problem:** `auth.users` er Supabase's eget auth system, men vi bruger Clerk. Denne foreign key reference virker ikke og kan forårsage fejl.

**Løsning:** Fjern foreign key constraint og brug bare UUID primary key uden reference.

#### Problem 2: Supabase Auth Trigger

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users  -- ❌ FORKERT!
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Problem:** Triggeren lytter til Supabase `auth.users` tabel, men vi bruger Clerk. Denne trigger vil aldrig blive triggered.

**Løsning:** Fjern triggeren. Profile oprettes allerede i `requireAuth()` når første API kald sker.

#### Problem 3: RLS Policies Bruger Supabase Auth

```sql
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);  -- ❌ FORKERT!
```

**Problem:** `auth.uid()` er Supabase's auth funktion, ikke Clerk. RLS policies vil ikke virke korrekt med Clerk authentication.

**Løsning:** 
- Da vi bruger service role client i API routes (bypasses RLS), er dette ikke kritisk
- Men hvis vi vil bruge client-side Supabase queries med RLS, skal vi enten:
  - Oprette en custom RLS funktion der accepterer Clerk user ID
  - Eller dokumentere at RLS kun virker via service role client i API routes

---

### 1.3 Clerk Session Data

**⚠️ Potentielt Problem:**

```typescript
// lib/auth.ts linje 44-45
username: session.username || `user_${userId.slice(0, 8)}`,
avatar_url: session.imageUrl || null,
```

**Problem:** JWT tokens fra Clerk indeholder typisk ikke `username` eller `imageUrl` direkte. Disse skal hentes fra Clerk API.

**Løsning:** Hent user data fra Clerk API:
```typescript
const clerk = clerkClient(process.env.CLERK_SECRET_KEY!);
const user = await clerk.users.getUser(userId);
const username = user.username || user.firstName || `user_${userId.slice(0, 8)}`;
const avatarUrl = user.imageUrl || null;
```

---

### 1.4 Medusa Customer Integration

**✅ Hvad eksisterer:**
- Medusa backend er installeret i `apps/medusa/`
- Bruger separat `medusa` schema i Supabase
- Medusa har sit eget customer system

**❌ Hvad mangler:**
- **INGEN integration mellem Clerk users og Medusa customers**
- Når en Clerk user opretter en profil i Supabase, oprettes der ikke automatisk en Medusa customer
- Ingen sync mellem `profiles` tabel og Medusa customers

**Medusa Customer Module:**
- Medusa har et `customer` modul med customers tabel i `medusa` schema
- Customers har typisk: `id`, `email`, `first_name`, `last_name`, `created_at`, etc.
- Medusa bruger sit eget auth system (ikke Clerk)

**Integration Patterns (fra `.project/04-Database_Schema.md`):**
- Cross-schema references via UUID felter (ikke foreign keys)
- Huddle tabeller kan referere til Medusa tabeller via UUID

**Foreslået Løsning:**
1. Når Clerk user opretter profile i Supabase, opret også Medusa customer
2. Gem Medusa customer ID i `profiles` tabel: `ALTER TABLE profiles ADD COLUMN medusa_customer_id UUID;`
3. Sync email, navn mellem Clerk user og Medusa customer
4. Opret helper funktion til at synkronisere data

---

## 2. Identificerede Problemer

### 2.0 🔴 KRITISK: Manglende Email Verification Flow (BLOCKER)

**Fil:** `apps/web/app/(auth)/auth/page.tsx`  
**Linje:** 124-129  
**Severity:** 🔴 KRITISK - BLOCKER

**Problem:**
```typescript
if (result.status === 'missing_requirements') {
  await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
  toast.info("Please check your email for a verification code");
  // In a real app, you'd redirect to a verification page
  // For now, we'll just show a message
  return;  // ❌ Stopper her - brugeren er IKKE oprettet endnu!
}
```

**Root Cause:**
- ✅ Environment variabler ER sat korrekt (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, etc.)
- ✅ ClerkProvider er sat op (læser automatisk fra env vars)
- ❌ **Email verification flow mangler** - brugeren kan ikke gennemføre sign up
- ❌ **Brugeren bliver IKKE oprettet i Clerk før email er verificeret** (dette er korrekt Clerk adfærd)

**Impact:**
- Sign up starter teknisk (mail sendes med verification code)
- Men brugeren kan ikke indtaste verification code
- Brugeren bliver IKKE oprettet i Clerk før email er verificeret
- Derfor vises brugeren ikke i Clerk dashboard

**Fix:**
1. Implementer email verification page/flow med input til verification code
2. Tilføj state til at håndtere verification step
3. Efter verification, gennemfør sign up med `signUp.attemptEmailAddressVerification()`

**Alternative Fix (for development):**
- Deaktiver email verification i Clerk Dashboard → Settings → Email & Phone → Email → Disable "Require email verification"

**Test:**
- Sign up en test bruger
- Verificer email med code fra mail (når flow er implementeret)
- Tjek Clerk dashboard om brugeren vises EFTER verification

---

### 2.1 Kritisk: Forkert Clerk API Brug

**Fil:** `apps/web/lib/auth.ts`  
**Linje:** 1, 23-25  
**Severity:** 🔴 KRITISK

**Problem:**
- Bruger `verifyToken` fra `@clerk/nextjs/server`
- Skal bruge `@clerk/backend` og `clerk.verifyToken()` ifølge reglerne

**Impact:**
- Måske virker det nu, men er ikke best practice
- Kan give problemer ved opgraderinger
- Følger ikke projektets regler

**Fix:**
```typescript
import { clerkClient } from "@clerk/backend";

const clerk = clerkClient(process.env.CLERK_SECRET_KEY!);
const session = await clerk.verifyToken(token);
```

---

### 2.2 Kritisk: Forkert Foreign Key i Migration

**Fil:** `supabase/migrations/20251125180851_eb64a1cf-7551-46a3-ad40-805ceba56bc3.sql`  
**Linje:** 3  
**Severity:** 🔴 KRITISK

**Problem:**
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
```

**Impact:**
- Foreign key reference til `auth.users` virker ikke med Clerk
- Kan forårsage database fejl eller migration problemer
- `ON DELETE CASCADE` vil ikke virke korrekt

**Fix:**
```sql
id UUID PRIMARY KEY,  -- Fjern REFERENCES auth.users(id) ON DELETE CASCADE
```

---

### 2.3 Kritisk: Supabase Auth Trigger

**Fil:** `supabase/migrations/20251125180851_eb64a1cf-7551-46a3-ad40-805ceba56bc3.sql`  
**Linje:** 50-54  
**Severity:** 🔴 KRITISK

**Problem:**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
```

**Impact:**
- Triggeren vil aldrig blive triggered (vi bruger ikke Supabase auth)
- Unødvendig kode der kan forvirre
- Profile oprettes allerede i `requireAuth()` når første API kald sker

**Fix:**
- Fjern triggeren og `handle_new_user()` funktionen
- Profile oprettes allerede i `lib/auth.ts` via `requireAuth()`

---

### 2.4 Høj: RLS Policies Bruger Supabase Auth

**Fil:** `supabase/migrations/20251125180851_eb64a1cf-7551-46a3-ad40-805ceba56bc3.sql`  
**Linje:** 21-28  
**Severity:** 🟡 HØJ

**Problem:**
```sql
USING (auth.uid() = id);
WITH CHECK (auth.uid() = id);
```

**Impact:**
- RLS policies virker ikke med Clerk authentication
- Men da vi bruger service role client i API routes (bypasses RLS), er dette ikke kritisk
- Hvis vi vil bruge client-side Supabase queries med RLS, vil det ikke virke

**Fix:**
- Dokumenter at RLS kun virker via service role client i API routes
- Eller opret custom RLS funktion der accepterer Clerk user ID (kompleks)

---

### 2.5 Høj: Manglende Clerk User Data

**Fil:** `apps/web/lib/auth.ts`  
**Linje:** 44-45  
**Severity:** 🟡 HØJ

**Problem:**
```typescript
username: session.username || `user_${userId.slice(0, 8)}`,
avatar_url: session.imageUrl || null,
```

**Impact:**
- JWT tokens indeholder typisk ikke `username` eller `imageUrl`
- Profile oprettes med fallback værdier i stedet for rigtige data fra Clerk

**Fix:**
- Hent user data fra Clerk API:
```typescript
const clerk = clerkClient(process.env.CLERK_SECRET_KEY!);
const user = await clerk.users.getUser(userId);
const username = user.username || user.firstName || `user_${userId.slice(0, 8)}`;
const avatarUrl = user.imageUrl || null;
```

---

### 2.6 Høj: Ingen Medusa Customer Sync

**Fil:** Ingen  
**Severity:** 🟡 HØJ

**Problem:**
- Når Clerk user opretter profile i Supabase, oprettes der ikke automatisk Medusa customer
- Ingen sync mellem `profiles` og Medusa customers

**Impact:**
- Medusa customers modul er ikke integreret med Clerk auth
- Kan ikke bruge Medusa commerce features med Clerk users

**Fix:**
1. Opret Medusa customer når Clerk user opretter profile
2. Gem Medusa customer ID i `profiles` tabel
3. Sync email, navn mellem Clerk og Medusa
4. Opret helper funktion til sync

---

## 3. Løsningsforslag

### 3.1 Fix Clerk Auth Implementation

**Fil:** `apps/web/lib/auth.ts`

**Changes:**
1. Skift fra `@clerk/nextjs/server` til `@clerk/backend`
2. Hent user data fra Clerk API i stedet for at bruge session claims
3. Forbedret error handling

**Kode:**
```typescript
import { clerkClient } from "@clerk/backend";
import { ApiError } from "@/lib/api/errors";

const clerk = clerkClient(process.env.CLERK_SECRET_KEY!);

export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // Verify token using @clerk/backend
    const session = await clerk.verifyToken(token);
    const userId = session.sub;

    // Get user data from Clerk API
    const user = await clerk.users.getUser(userId);
    const username = user.username || user.firstName || `user_${userId.slice(0, 8)}`;
    const avatarUrl = user.imageUrl || null;

    // Sync profile i Supabase
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!profile) {
      // Opret profile ved første API kald
      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          username,
          avatar_url: avatarUrl,
        })
        .select("id")
        .single();

      if (error) {
        throw new ApiError(
          "INTERNAL_SERVER_ERROR",
          "Failed to create profile",
          500
        );
      }

      return { userId, profileId: newProfile.id };
    }

    return { userId, profileId: profile.id };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("UNAUTHORIZED", "Invalid token", 401);
  }
}
```

---

### 3.2 Fix Supabase Migration

**Fil:** `supabase/migrations/20251127_fix_profiles_clerk.sql` (ny migration)

**Changes:**
1. Fjern foreign key reference til `auth.users`
2. Fjern Supabase auth trigger
3. Fjern `handle_new_user()` funktion
4. Opdater RLS policies (dokumenter at de kun virker via service role)

**Kode:**
```sql
-- Fix profiles table for Clerk authentication
-- Remove foreign key reference to auth.users (we use Clerk, not Supabase auth)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Remove Supabase auth trigger (we use Clerk, profile created in requireAuth())
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Note: RLS policies using auth.uid() won't work with Clerk
-- We use service role client in API routes which bypasses RLS
-- If client-side RLS is needed, we'll need custom functions
```

---

### 3.3 Implementer Medusa Customer Sync

**Fil:** `apps/web/lib/services/medusa-customer-service.ts` (ny fil)

**Purpose:**
- Opret og synkroniser Medusa customers med Clerk users
- Gem Medusa customer ID i profiles tabel

**Kode:**
```typescript
import { clerkClient } from "@clerk/backend";
import { createServiceClient } from "@/lib/supabase/server";

const clerk = clerkClient(process.env.CLERK_SECRET_KEY!);

/**
 * Opret eller synkroniser Medusa customer med Clerk user
 */
export async function syncMedusaCustomer(clerkUserId: string) {
  // 1. Hent Clerk user data
  const clerkUser = await clerk.users.getUser(clerkUserId);
  
  // 2. Tjek om Medusa customer allerede eksisterer
  const supabase = await createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("medusa_customer_id")
    .eq("id", clerkUserId)
    .single();

  // 3. Hvis Medusa customer ID findes, synkroniser data
  if (profile?.medusa_customer_id) {
    // TODO: Opdater Medusa customer med ny data fra Clerk
    // await updateMedusaCustomer(profile.medusa_customer_id, clerkUser);
    return profile.medusa_customer_id;
  }

  // 4. Opret ny Medusa customer
  // TODO: Implementer Medusa API kald til at oprette customer
  // const medusaCustomer = await createMedusaCustomer({
  //   email: clerkUser.emailAddresses[0]?.emailAddress,
  //   first_name: clerkUser.firstName,
  //   last_name: clerkUser.lastName,
  // });

  // 5. Gem Medusa customer ID i profile
  // await supabase
  //   .from("profiles")
  //   .update({ medusa_customer_id: medusaCustomer.id })
  //   .eq("id", clerkUserId);

  // return medusaCustomer.id;
}
```

**Migration:** `supabase/migrations/20251127_add_medusa_customer_id.sql`

```sql
-- Add Medusa customer ID to profiles table
ALTER TABLE public.profiles 
ADD COLUMN medusa_customer_id UUID;

-- Create index for lookups
CREATE INDEX idx_profiles_medusa_customer_id ON public.profiles(medusa_customer_id);
```

---

## 4. Implementation Plan

### Phase 0: Fix Email Verification Flow (BLOCKER)

**Estimat:** 1-2 timer

1. ✅ Environment variabler ER sat korrekt (bekræftet)
2. ✅ Implementer email verification flow i `auth/page.tsx`
3. ✅ Tilføj state til at håndtere verification step
4. ✅ Tilføj input til verification code
5. ✅ Implementer `attemptEmailAddressVerification()` efter code input
6. ✅ Test sign up flow end-to-end med verification

**Files:**
- `apps/web/app/(auth)/auth/page.tsx`

**Alternative (for development):**
- Deaktiver email verification i Clerk Dashboard (hurtigere løsning)

**KRITISK:** Dette skal fixes FØRST, ellers kan brugere ikke gennemføre sign up!

---

### Phase 1: Fix Clerk Auth (KRITISK)

**Estimat:** 1-2 timer

1. ✅ Opdater `lib/auth.ts` til at bruge `@clerk/backend`
2. ✅ Hent user data fra Clerk API i stedet for session claims
3. ✅ Test auth flow end-to-end

**Files:**
- `apps/web/lib/auth.ts`

---

### Phase 2: Fix Supabase Migration (KRITISK)

**Estimat:** 1 time

1. ✅ Opret ny migration til at fjerne foreign key og trigger
2. ✅ Test migration på lokal Supabase
3. ✅ Dokumenter RLS begrænsninger

**Files:**
- `supabase/migrations/20251127_fix_profiles_clerk.sql`

---

### Phase 3: Implementer Medusa Customer Sync (HØJ)

**Estimat:** 3-4 timer

1. ✅ Opret migration til at tilføje `medusa_customer_id` til profiles
2. ✅ Opret `medusa-customer-service.ts`
3. ✅ Integrer sync i `requireAuth()` eller separat endpoint
4. ✅ Test sync flow

**Files:**
- `supabase/migrations/20251127_add_medusa_customer_id.sql`
- `apps/web/lib/services/medusa-customer-service.ts`
- `apps/web/lib/auth.ts` (opdater)

---

### Phase 4: Testing & Verification

**Estimat:** 2 timer

1. ✅ Test Clerk auth flow end-to-end
2. ✅ Test Supabase profile sync
3. ✅ Test Medusa customer sync
4. ✅ Verificer alle edge cases

---

## 5. Recommendations

### 5.1 Umiddelbare Actions (KRITISK)

1. **Fix Clerk auth implementation** - Skift til `@clerk/backend`
2. **Fix Supabase migration** - Fjern `auth.users` reference og trigger
3. **Hent Clerk user data korrekt** - Brug Clerk API i stedet for session claims

### 5.2 Kortsigtet (HØJ)

1. **Implementer Medusa customer sync** - Opret customers når Clerk users oprettes
2. **Dokumenter RLS begrænsninger** - Klarhed om at RLS kun virker via service role

### 5.3 Langsigtet (MEDIUM)

1. **Overvej custom RLS functions** - Hvis client-side RLS er nødvendigt
2. **Bidirectional sync** - Sync data mellem Clerk, Supabase og Medusa
3. **Error handling improvements** - Bedre error messages og retry logic

---

## 6. Testing Checklist

### 6.1 Clerk Auth

- [ ] Sign up flow opretter Clerk user
- [ ] Sign in flow autentificerer korrekt
- [ ] API routes kræver korrekt token
- [ ] Invalid token giver 401
- [ ] Missing token giver 401

### 6.2 Supabase Profile Sync

- [ ] Første API kald opretter profile automatisk
- [ ] Profile oprettes med korrekt Clerk user ID
- [ ] Profile oprettes med korrekt username fra Clerk
- [ ] Profile oprettes med korrekt avatar_url fra Clerk
- [ ] Eksisterende profile returneres korrekt

### 6.3 Medusa Customer Sync

- [ ] Medusa customer oprettes når Clerk user opretter profile
- [ ] Medusa customer ID gemmes i profiles tabel
- [ ] Email synkroniseres korrekt
- [ ] Navn synkroniseres korrekt
- [ ] Opdateringer synkroniseres korrekt

---

## 7. References

- **Clerk Auth Rules:** `.cursor/rules/33-clerk_auth.mdc`
- **Supabase Patterns:** `.cursor/rules/32-supabase_patterns.mdc`
- **Database Schema:** `.project/04-Database_Schema.md`
- **Backend Guide:** `.project/06-Backend_Guide.md`
- **Medusa Integration:** `.project/plans/HUD-15/implementation-plan-2025-11-26-HUD-15.md`

---

## 8. Next Steps

1. **Review denne rapport** med teamet
2. **Prioriter fixes** baseret på severity
3. **Implementer Phase 1-2** (kritiske fixes)
4. **Test grundigt** før production deploy
5. **Dokumenter** alle ændringer i PR

---

**Rapport genereret:** 2025-01-27  
**Status:** ⚠️ KRITISKE PROBLEMER - ACTION REQUIRED

