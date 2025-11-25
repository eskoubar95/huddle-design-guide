# Migration Plan: Vite React → Next.js Monorepo

## 1. Formål

Denne guide beskriver **trin-for-trin** hvordan vi migrerer fra den nuværende Vite + React SPA struktur til en Next.js monorepo uden at miste eksisterende frontend-arbejde.

**Nuværende struktur:**
- Vite + React SPA i `src/`
- React Router for routing
- Supabase integration
- Shadcn UI komponenter
- TanStack Query

**Målstruktur:**
- Monorepo med Next.js App Router
- Frontend i `apps/web/app/`
- Backend API routes i `apps/web/app/api/v1/`
- Shared packages for types/utils

---

## 2. Strategi: Gradvis Migration

Vi migrerer **gradvist** i faser, så eksisterende frontend fortsat kan bruges undervejs:

1. **Fase 1:** Opret monorepo struktur (bevarer eksisterende `src/`)
2. **Fase 2:** Setup Next.js app parallelt med eksisterende frontend
3. **Fase 3:** Migrer komponenter og pages gradvist
4. **Fase 4:** Opret backend API routes
5. **Fase 5:** Fjern Vite frontend når Next.js er komplet

---

## 3. Fase 1: Monorepo Setup (Udestyrer ikke eksisterende kode)

### 3.1 Opret monorepo struktur

```text
huddle-design-guide/
├── apps/
│   └── web/              # Next.js app (ny)
│       ├── app/          # Next.js App Router
│       ├── components/   # Komponenter (migreres fra src/)
│       ├── lib/          # Utilities
│       └── package.json
├── packages/
│   ├── ui/               # Shared UI komponenter (fremtidig)
│   ├── types/            # Shared TypeScript types
│   └── config/           # Shared configs (Tailwind, TS, ESLint)
├── src/                  # EKSISTERENDE FRONTEND (bevares!)
│   ├── components/
│   ├── pages/
│   └── ...
├── supabase/             # Eksisterende migrations
├── .project/             # Projekt-dokumentation
├── package.json          # Root package.json (workspaces)
└── pnpm-workspace.yaml   # pnpm workspaces config
```

### 3.2 Root package.json setup

Opret root `package.json` med workspaces:

```json
{
  "name": "huddle-monorepo",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter web dev",
    "dev:legacy": "pnpm --filter legacy dev",
    "build": "pnpm --filter web build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

### 3.3 pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'src'  # Bevarer eksisterende frontend som "legacy" workspace
```

### 3.4 Omdøb eksisterende package.json

Flyt `package.json` til `src/package.json` og opdater navn:

```json
{
  "name": "legacy-frontend",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  // ... eksisterende dependencies
}
```

**Resultat:** Eksisterende frontend kører stadig med `pnpm dev:legacy` eller `cd src && pnpm dev`.

---

## 4. Fase 2: Next.js App Setup (Parallelt med eksisterende)

### 4.1 Opret Next.js app

```bash
cd apps
npx create-next-app@latest web --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

### 4.2 Kopier shared configs

**Tailwind config:** Kopier `tailwind.config.ts` til `apps/web/tailwind.config.ts` (opdater paths)

**PostCSS:** Kopier `postcss.config.js` til `apps/web/`

**TypeScript:** Opret `apps/web/tsconfig.json` baseret på Next.js standard + path aliases

### 4.3 Opret shared packages

**packages/types/package.json:**
```json
{
  "name": "@huddle/types",
  "version": "0.0.0",
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts"
  }
}
```

**packages/types/index.ts:** Kopier fra `src/types/index.ts`

**packages/config/tailwind/package.json:** Shared Tailwind config (valgfrit)

### 4.4 Installer dependencies i Next.js app

```bash
cd apps/web
pnpm add @tanstack/react-query @supabase/supabase-js react-hook-form zod @hookform/resolvers
pnpm add -D @types/node
```

**Resultat:** Next.js app kører på `localhost:3000`, eksisterende frontend på `localhost:5173`.

---

## 5. Fase 3: Gradvis Komponent Migration

### 5.1 Strategi

Migrer komponenter **én ad gangen** eller per feature-område:

1. Start med **shared UI komponenter** (`src/components/ui/`)
2. Migrer **domain komponenter** (`JerseyCard`, `Sidebar`, etc.)
3. Migrer **pages** til Next.js App Router struktur

### 5.2 Migrer UI komponenter først

**Trin 1:** Kopier `src/components/ui/` til `apps/web/components/ui/`

**Trin 2:** Opdater imports i Next.js app:
- `@/components/ui/button` i stedet for `@/components/ui/button`

**Trin 3:** Test at komponenter virker i Next.js

### 5.3 Migrer domain komponenter

**Eksempel: JerseyCard**

1. Kopier `src/components/JerseyCard.tsx` til `apps/web/components/JerseyCard.tsx`
2. Opdater imports (Supabase client, types)
3. Test i Next.js page

**Eksempel: Sidebar**

1. Kopier `src/components/Sidebar.tsx` til `apps/web/components/layout/Sidebar.tsx`
2. Opdater routing (Next.js `usePathname` i stedet for React Router)
3. Integrer i Next.js layout

### 5.4 Migrer pages til App Router

**Next.js App Router struktur:**

```text
apps/web/app/
├── (auth)/
│   └── auth/
│       └── page.tsx          # Migrer fra src/pages/Auth.tsx
├── (dashboard)/
│   ├── layout.tsx            # Sidebar + CommandBar wrapper
│   ├── page.tsx              # Home (fra src/pages/Home.tsx)
│   ├── wardrobe/
│   │   └── page.tsx          # Migrer fra src/pages/Wardrobe.tsx
│   ├── marketplace/
│   │   └── page.tsx          # Migrer fra src/pages/Marketplace.tsx
│   ├── jersey/
│   │   └── [id]/
│   │       └── page.tsx      # Migrer fra src/pages/JerseyDetail.tsx
│   └── profile/
│       └── page.tsx          # Migrer fra src/pages/Profile.tsx
└── layout.tsx                # Root layout (providers)
```

**Migration checklist per page:**

- [ ] Kopier page komponent til `app/[route]/page.tsx`
- [ ] Opdater imports (Supabase, types, components)
- [ ] Konverter React Router hooks til Next.js (`useRouter`, `usePathname`)
- [ ] Opdater data fetching (Server Components hvor muligt)
- [ ] Test routing og funktionalitet
- [ ] Fjern fra `src/pages/` når bekræftet fungerer

### 5.5 Supabase Client Migration

**Eksisterende:** `src/integrations/supabase/client.ts`

**Next.js:** Opret `apps/web/lib/supabase/client.ts` (browser) og `apps/web/lib/supabase/server.ts` (server)

**Browser client:**
```typescript
// apps/web/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Server client:**
```typescript
// apps/web/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Next.js server component cookie handling
        },
      },
    }
  )
}
```

### 5.6 Auth Context Migration

**Eksisterende:** `src/contexts/AuthContext.tsx` (Supabase auth)

**Next.js:** Migrer til Clerk integration (jf. `33-clerk_auth.mdc`)

Eller bevar Supabase auth indtil Clerk er klar.

---

## 6. Fase 4: Backend API Routes

### 6.1 Opret API struktur

```text
apps/web/app/api/v1/
├── jerseys/
│   ├── route.ts            # GET /api/v1/jerseys
│   └── [id]/
│       └── route.ts        # GET /api/v1/jerseys/:id
├── listings/
│   ├── route.ts            # GET /api/v1/listings
│   └── [id]/
│       └── route.ts        # GET /api/v1/listings/:id
├── auctions/
│   ├── route.ts
│   └── [id]/
│       └── route.ts
└── auth/
    └── route.ts            # Auth endpoints
```

### 6.2 Implementer endpoints

Følg `06-Backend_Guide.md` for implementering.

**Eksempel: GET /api/v1/jerseys**

```typescript
// apps/web/app/api/v1/jerseys/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('jerseys')
    .select('*')
    .limit(20)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ data })
}
```

### 6.3 Opdater frontend til at bruge API

I stedet for direkte Supabase queries i komponenter, brug fetch mod Next.js API:

```typescript
// apps/web/app/wardrobe/page.tsx
async function getJerseys() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jerseys`, {
    cache: 'no-store' // eller 'force-cache' for SSG
  })
  return res.json()
}
```

---

## 7. Fase 5: Cleanup (Når Next.js er komplet)

### 7.1 Verificer alle features

- [ ] Alle pages migreret og testet
- [ ] Alle komponenter fungerer
- [ ] API endpoints implementeret
- [ ] Auth flow fungerer
- [ ] Supabase integration fungerer

### 7.2 Fjern Vite frontend

**Først:** Tag backup af `src/` (git branch eller arkiv)

**Derefter:**
1. Fjern `src/` fra workspace
2. Opdater root `package.json` (fjern `dev:legacy` script)
3. Opdater `.gitignore` hvis nødvendigt
4. Commit og tag som "migration-complete"

---

## 8. Best Practices Under Migration

### 8.1 Git Strategy

- **Branch:** `feature/huddle-XXX-migrate-to-nextjs-monorepo`
- **Commits:** Små, inkrementelle commits per komponent/page
- **PR:** Åbn PR tidligt, merge gradvist når features er migreret

### 8.2 Testing

- **Eksisterende frontend:** Fortsæt at teste under migration
- **Next.js app:** Test hver migrerede komponent/page
- **API:** Test endpoints med Postman/Thunder Client

### 8.3 Dokumentation

- Opdater `07-Frontend_Guide.md` når struktur ændres
- Dokumenter beslutninger i PR descriptions

### 8.4 Dependencies

- **Synkroniser:** Hold dependencies synkroniserede mellem `src/` og `apps/web/` under migration
- **Cleanup:** Fjern unused dependencies når migration er færdig

---

## 9. Tidsestimering

- **Fase 1 (Monorepo setup):** 1-2 timer
- **Fase 2 (Next.js setup):** 2-3 timer
- **Fase 3 (Komponent migration):** 1-2 dage (afhænger af antal komponenter)
- **Fase 4 (API routes):** 2-3 dage (jf. backend guide)
- **Fase 5 (Cleanup):** 1-2 timer

**Total:** ~1 uge for en udvikler (med eksisterende frontend som reference)

---

## 10. Risici & Mitigation

| Risiko | Mitigation |
|--------|-----------|
| Mist eksisterende arbejde | Bevar `src/` som backup, migrer gradvist |
| Breaking changes i komponenter | Test hver komponent efter migration |
| Supabase client incompatibility | Brug `@supabase/ssr` til Next.js |
| Routing differences | Opdater alle navigation calls |
| Auth flow changes | Test auth flow grundigt før cleanup |

---

## 11. Næste Skridt

1. **Opret Linear issue:** "Migrate frontend to Next.js monorepo"
2. **Start Fase 1:** Opret monorepo struktur
3. **Test:** Verificer eksisterende frontend stadig virker
4. **Fortsæt:** Fase 2-5 gradvist

---

**Opdateret:** 2025-11-25  
**Status:** Planlagt

