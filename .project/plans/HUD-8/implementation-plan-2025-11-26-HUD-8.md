# Fase 3.2: Migrer Supabase Client Integration - Implementation Plan

## Overview

Migrer Supabase client setup fra `src/integrations/supabase/` til Next.js SSR-compatible setup i `apps/web/lib/supabase/`. Dette er kritisk foundation for alle data-fetching komponenter i Next.js appen.

**Hvorfor:** Next.js App Router kræver SSR-compatible Supabase clients med korrekt cookie handling. Den nuværende Vite-baserede client bruger `@supabase/supabase-js` direkte, hvilket ikke fungerer optimalt med Next.js server components og cookie-based authentication.

## Linear Issue

**Issue:** [HUD-8](https://linear.app/huddle-world/issue/HUD-8/fase-32-migrer-supabase-client-integration)  
**Status:** In Progress  
**Labels:** Migration, Frontend, Feature  
**Branch:** `nicklaseskou95/hud-8-fase-32-migrer-supabase-client-integration`

## Current State Analysis

### Eksisterende Setup

**Location:** `src/integrations/supabase/`

**Files:**
- `client.ts` - Bruger `@supabase/supabase-js` direkte med Vite env vars
- `types.ts` - Database types (genereret fra Supabase)

**Current Implementation:**
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**Bruges i:**
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/components/CommandBar.tsx` - Search queries
- `src/pages/Wardrobe.tsx` - Jersey queries
- `src/pages/Auth.tsx` - Authentication
- Flere andre komponenter med direkte Supabase queries

### Next.js App State

**Location:** `apps/web/`

**Dependencies (allerede installeret):**
- ✅ `@supabase/ssr@^0.7.0`
- ✅ `@supabase/supabase-js@^2.84.0`

**Manglende:**
- ❌ `apps/web/lib/supabase/` directory
- ❌ Browser client (`client.ts`)
- ❌ Server client (`server.ts`)
- ❌ Types (`types.ts`)

**Environment Variables:**
- Skal bruge `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Nuværende Vite vars: `VITE_SUPABASE_URL` og `VITE_SUPABASE_PUBLISHABLE_KEY`

### Key Discoveries

1. **Dependencies allerede installeret** - Ingen installation nødvendig
2. **Types skal migreres** - Kopier fra `src/integrations/supabase/types.ts`
3. **Server client skal være async** - Next.js `cookies()` API er async
4. **Cookie handling kritisk** - For authentication flow i Next.js
5. **Ingen eksisterende Supabase setup i Next.js** - Ren migration

## Desired End State

### Directory Structure

```
apps/web/lib/supabase/
├── client.ts      # Browser client (Client Components)
├── server.ts      # Server client (Server Components, API routes)
└── types.ts       # Database types (migreret fra src/)
```

### Browser Client (`client.ts`)

**Purpose:** Brug i Client Components (`"use client"`)

**Requirements:**
- Bruger `createBrowserClient` fra `@supabase/ssr`
- Konfigureret med `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Type-safe med Database types
- Export funktion: `createClient()`

### Server Client (`server.ts`)

**Purpose:** Brug i Server Components og API routes

**Requirements:**
- Bruger `createServerClient` fra `@supabase/ssr`
- Async funktion (Next.js `cookies()` API)
- Korrekt cookie handling med Next.js cookies API
- Type-safe med Database types
- Export funktion: `createClient()` (async)

### Types (`types.ts`)

**Purpose:** TypeScript types for database schema

**Requirements:**
- Kopieret fra `src/integrations/supabase/types.ts`
- Ingen ændringer nødvendig
- Eksporterer `Database` type

### Verification Criteria

**Automated:**
- ✅ Type check: `npm run typecheck` (i `apps/web`)
- ✅ Build: `npm run build` (i `apps/web`)
- ✅ Lint: `npm run lint` (i `apps/web`)

**Manual:**
- ✅ Browser client fungerer i Client Component
- ✅ Server client fungerer i Server Component
- ✅ Cookie handling fungerer korrekt
- ✅ Authentication flow fungerer (sign in/out)
- ✅ Types er tilgængelige i Next.js app

## What We're NOT Doing

- ❌ **Migrere eksisterende komponenter** - Dette er kun client setup, ikke komponent migration
- ❌ **Opdatere imports i `src/`** - Eksisterende frontend forbliver uændret
- ❌ **Implementere authentication** - Kun client setup, auth implementation er separat
- ❌ **Oprette API routes** - Dette er foundation, ikke implementation
- ❌ **Opdatere environment variables** - Antager de allerede er sat (eller skal sættes manuelt)
- ❌ **Service role client** - Kun anon key client (service role er separat concern)

## Implementation Approach

**Strategy:** Incremental, testable phases med pause points

**Pattern:** Følg Next.js + Supabase SSR best practices fra `.cursor/rules/32-supabase_patterns.mdc`

**Key Decisions:**
1. Separer browser og server clients (Next.js pattern)
2. Brug `@supabase/ssr` ikke `@supabase/supabase-js` direkte
3. Async server client pga. Next.js cookies API
4. Kopier types direkte (ingen transformation nødvendig)

---

## Phase 1: Directory Structure & Dependencies

### Overview

Opret directory structure og verificer at alle dependencies er installeret.

### Changes Required

#### 1. Opret Supabase Directory

**File:** `apps/web/lib/supabase/` (directory)

**Changes:** Opret directory structure

**Rationale:** Organiseret struktur for Supabase integration

#### 2. Verificer Dependencies

**File:** `apps/web/package.json`

**Changes:** Verificer at følgende er installeret:
- `@supabase/ssr@^0.7.0` ✅ (allerede installeret)
- `@supabase/supabase-js@^2.84.0` ✅ (allerede installeret)

**Rationale:** Dependencies skal være installeret før implementation

### Success Criteria

#### Automated Verification:
- [ ] Directory eksisterer: `apps/web/lib/supabase/`
- [ ] Dependencies verificeret i `package.json`

#### Manual Verification:
- [ ] Directory structure klar til implementation

**⚠️ PAUSE HERE** - Verificer directory structure før Phase 2

---

## Phase 2: Browser Client Implementation

### Overview

Implementer browser client til brug i Client Components. Dette er den primære client for client-side data fetching.

### Changes Required

#### 1. Browser Client File

**File:** `apps/web/lib/supabase/client.ts`

**Changes:** Opret browser client med `createBrowserClient`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  // Validate environment variables at runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
```

**Rationale:**
- `createBrowserClient` fra `@supabase/ssr` håndterer cookie management automatisk
- Type-safe med Database types
- Simpel API: `createClient()` returnerer client instance
- Runtime validation for environment variables (bedre error messages)

**Key Points:**
- Bruger `NEXT_PUBLIC_*` env vars (Next.js pattern)
- Runtime validation for missing env vars (bedre end non-null assertion)
- Ingen auth config nødvendig - `@supabase/ssr` håndterer det

### Success Criteria

#### Automated Verification:
- [ ] Type check: `cd apps/web && npx tsc --noEmit` (ingen errors)
- [ ] Build: `cd apps/web && npm run build` (ingen errors - inkluderer type checking)

#### Manual Verification:
- [ ] Fil eksisterer: `apps/web/lib/supabase/client.ts`
- [ ] Import fungerer: `import { createClient } from '@/lib/supabase/client'`
- [ ] Type safety: IntelliSense viser Database types

**⚠️ PAUSE HERE** - Verificer browser client før Phase 3

---

## Phase 3: Server Client Implementation

### Overview

Implementer server client til brug i Server Components og API routes. Dette er kritisk for SSR og server-side data fetching.

### Changes Required

#### 1. Server Client File

**File:** `apps/web/lib/supabase/server.ts`

**Changes:** Opret server client med `createServerClient` og Next.js cookies integration

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createClient() {
  // Validate environment variables at runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

**Rationale:**
- `createServerClient` fra `@supabase/ssr` håndterer server-side cookie management
- Async funktion pga. Next.js `cookies()` API er async
- Cookie handling med `getAll()` og `setAll()` for session management
- Error handling i `setAll()` - kan ignoreres hvis middleware refresher sessions
- Runtime validation for environment variables (bedre error messages)

**Key Points:**
- **Async required:** Next.js `cookies()` er async i App Router
- **Cookie management:** Kritisk for authentication flow
- **Error handling:** `setAll` kan fejle i Server Components (normal behavior)
- **Env var validation:** Runtime check for missing variables

### Success Criteria

#### Automated Verification:
- [ ] Type check: `cd apps/web && npx tsc --noEmit` (ingen errors)
- [ ] Build: `cd apps/web && npm run build` (ingen errors - inkluderer type checking)

#### Manual Verification:
- [ ] Fil eksisterer: `apps/web/lib/supabase/server.ts`
- [ ] Import fungerer: `import { createClient } from '@/lib/supabase/server'`
- [ ] Async funktion: `await createClient()` fungerer
- [ ] Type safety: IntelliSense viser Database types

**⚠️ PAUSE HERE** - Verificer server client før Phase 4

---

## Phase 4: Types Migration

### Overview

Migrer database types fra eksisterende Vite frontend til Next.js app. Dette sikrer type safety i alle Supabase queries.

### Changes Required

#### 1. Copy Types File

**File:** `apps/web/lib/supabase/types.ts`

**Changes:** Kopier hele indholdet fra `src/integrations/supabase/types.ts`

**Rationale:**
- Types er genereret fra Supabase schema
- Ingen transformation nødvendig
- Ensartede types mellem Vite og Next.js (indtil Vite frontend fjernes)

**Note:** Brug `read_file` tool til at kopiere hele filen (kan være lang)

#### 2. Update Type Imports

**Files:**
- `apps/web/lib/supabase/client.ts` - Verificer `import type { Database } from './types'`
- `apps/web/lib/supabase/server.ts` - Verificer `import type { Database } from './types'`

**Changes:** Ingen ændringer nødvendig (allerede korrekt i Phase 2 og 3)

**Rationale:** Types er allerede refereret korrekt i client implementations

### Success Criteria

#### Automated Verification:
- [ ] Type check: `cd apps/web && npx tsc --noEmit` (ingen errors)
- [ ] Build: `cd apps/web && npm run build` (ingen errors - inkluderer type checking)

#### Manual Verification:
- [ ] Fil eksisterer: `apps/web/lib/supabase/types.ts`
- [ ] Types eksporteret: `Database` type er tilgængelig
- [ ] Type safety: IntelliSense viser korrekte types i clients

**⚠️ PAUSE HERE** - Verificer types før Phase 5

---

## Phase 5: Testing & Verification

### Overview

Test browser og server clients i Next.js komponenter. Verificer at authentication flow fungerer korrekt.

### Changes Required

#### 1. Test Browser Client (Client Component)

**File:** `apps/web/app/test-supabase-client/page.tsx` (temporary test file)

**Changes:** Opret test Client Component der bruger browser client

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function TestClientPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testClient() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('jerseys')
        .select('id, title')
        .limit(1)

      if (error) {
        setError(error.message)
      } else {
        setData(data)
      }
    }

    testClient()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Browser Client Test</h1>
      {error && <p className="text-red-500">Error: {error}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  )
}
```

**Rationale:** Test browser client med simple query

**Cleanup:** Fjern test fil efter verificering

#### 2. Test Server Client (Server Component)

**File:** `apps/web/app/test-supabase-server/page.tsx` (temporary test file)

**Changes:** Opret test Server Component der bruger server client

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function TestServerPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('jerseys')
    .select('id, title')
    .limit(1)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Server Client Test</h1>
      {error && <p className="text-red-500">Error: {error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  )
}
```

**Rationale:** Test server client med simple query

**Cleanup:** Fjern test fil efter verificering

#### 3. Test Authentication Flow

**File:** `apps/web/app/test-auth/page.tsx` (temporary test file)

**Changes:** Opret test page der tester sign in/out flow

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'

export default function TestAuthPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setUser(session?.user ?? null)
        }
      )

      return () => subscription.unsubscribe()
    }

    checkAuth()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test</h1>
      {user ? (
        <div>
          <p>Logged in as: {user.email}</p>
          <button
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
            }}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <p>Not logged in</p>
      )}
    </div>
  )
}
```

**Rationale:** Test authentication flow med cookie handling

**Cleanup:** Fjern test fil efter verificering

### Success Criteria

#### Automated Verification:
- [ ] Type check: `cd apps/web && npx tsc --noEmit` (ingen errors)
- [ ] Build: `cd apps/web && npm run build` (ingen errors - inkluderer type checking)
- [ ] Lint: `cd apps/web && npm run lint` (ingen errors)

#### Manual Verification:
- [ ] Browser client test: Query virker i Client Component
- [ ] Server client test: Query virker i Server Component
- [ ] Authentication test: Sign in/out flow virker
- [ ] Cookie handling: Cookies håndteres korrekt (check browser DevTools)
- [ ] No console errors: Ingen errors i browser console

**⚠️ PAUSE HERE** - Verificer alle tests før cleanup

---

## Phase 6: Cleanup

### Overview

Fjern test filer og dokumenter implementation.

### Changes Required

#### 1. Remove Test Files

**Files:**
- `apps/web/app/test-supabase-client/page.tsx`
- `apps/web/app/test-supabase-server/page.tsx`
- `apps/web/app/test-auth/page.tsx`

**Changes:** Slet test filer

**Rationale:** Test filer er kun til verificering, ikke production code

### Success Criteria

#### Automated Verification:
- [ ] Build: `cd apps/web && npm run build` (ingen errors)

#### Manual Verification:
- [ ] Test filer fjernet
- [ ] Production code intakt

---

## Testing Strategy

### Unit Testing

**Not Required:** Client setup er simpelt og testes via integration tests

### Integration Testing

**Manual Testing:**
1. Browser client i Client Component
2. Server client i Server Component
3. Authentication flow (sign in/out)
4. Cookie handling (browser DevTools)

### Edge Cases

1. **Missing env vars:** Type check vil fejle (non-null assertion)
2. **Cookie errors:** Håndteres i server client `setAll` catch block
3. **RLS policies:** Test med authenticated og unauthenticated users

---

## References

- **Linear:** [HUD-8](https://linear.app/huddle-world/issue/HUD-8/fase-32-migrer-supabase-client-integration)
- **Migration Plan:** `.project/08-Migration_Plan.md` - Fase 5.5
- **Supabase Patterns:** `.cursor/rules/32-supabase_patterns.mdc`
- **Current Client:** `src/integrations/supabase/client.ts`
- **Current Types:** `src/integrations/supabase/types.ts`
- **Next.js Supabase Guide:** [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

## Notes

### Environment Variables

**Required in `.env.local` (apps/web):**
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Note:** Disse skal sættes manuelt (ikke del af denne plan)

### Future Considerations

1. **Service Role Client:** Kan tilføjes senere i `apps/web/lib/supabase/server-admin.ts` hvis nødvendig
2. **Middleware:** Kan tilføjes senere for session refresh
3. **Type Generation:** Types kan regenereres med `npx supabase gen types typescript`

### Migration Path

Efter denne plan:
1. Komponenter kan migreres til at bruge nye clients
2. Eksisterende `src/integrations/supabase/` kan fjernes når alle komponenter er migreret
3. Environment variables skal opdateres i deployment configs

### Rollback Strategy

**Hvis implementation fejler eller skal rulles tilbage:**

1. **Slet Supabase directory:**
   ```bash
   rm -rf apps/web/lib/supabase/
   ```

2. **Verificer build:**
   ```bash
   cd apps/web && npm run build
   ```

**Note:** Ingen data migration nødvendig - dette er kun client setup. Eksisterende `src/integrations/supabase/` forbliver uændret og kan fortsat bruges.

**Rollback er simpelt og sikkert** - kun nye filer fjernes, ingen eksisterende funktionalitet påvirkes.

---

**Plan Created:** 2025-11-26  
**Status:** Ready for Implementation  
**Estimated Time:** 3-4 timer  
**Complexity:** Medium

