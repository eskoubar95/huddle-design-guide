# Fase 2: Setup Next.js App Parallelt med Eksisterende Frontend - Implementation Plan

## Overview

Opret Next.js app i `apps/web/` parallelt med eksisterende frontend, så begge kan køre samtidigt under migration. Dette er foundation setup før komponent migration i Fase 3.

**Mål:** Next.js app kører på `localhost:3000`, eksisterende frontend kører stadig på `localhost:5173`, og begge apps kan køre samtidigt uden konflikter.

---

## Linear Issue

**Issue:** HUD-6  
**Title:** Fase 2: Setup Next.js app parallelt med eksisterende frontend  
**Status:** Todo  
**Labels:** Migration, Frontend, Feature  
**Project:** Frontend Migration  
**URL:** https://linear.app/huddle-world/issue/HUD-6/fase-2-setup-nextjs-app-parallelt-med-eksisterende-frontend

---

## Current State Analysis

### Eksisterende Struktur:
```
huddle-design-guide/
├── apps/
│   └── web/              # Tom directory (oprettet i HUD-5)
├── packages/
│   ├── types/            # Tom directory (oprettet i HUD-5)
│   ├── ui/               # Tom directory (oprettet i HUD-5)
│   └── config/           # Tom directory (oprettet i HUD-5)
├── src/                  # Eksisterende Vite + React SPA
│   ├── components/
│   ├── pages/
│   ├── integrations/supabase/
│   ├── types/index.ts    # Types der skal deles
│   └── package.json      # legacy-frontend
├── tailwind.config.ts    # Eksisterende config (skal kopieres)
├── postcss.config.js     # Eksisterende config (skal kopieres)
└── package.json          # Root med workspaces config
```

### Key Discoveries:

1. **Package Manager:** Projektet bruger **npm workspaces** (ikke pnpm som nævnt i ticket)
2. **Eksisterende configs:**
   - `tailwind.config.ts` - Bruger darkMode: ["class"], custom colors, animations
   - `postcss.config.js` - Simpel config med tailwindcss og autoprefixer
   - Content paths i tailwind: `["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"]`
3. **Types:** `src/types/index.ts` indeholder: Jersey, Post, User, Notification interfaces
4. **Supabase:** Eksisterende bruger `@supabase/supabase-js` direkte, men Next.js skal bruge `@supabase/ssr`
5. **Dependencies:** Legacy frontend har alle dependencies vi skal bruge i Next.js app

### Constraints:

- **KRITISK:** Eksisterende frontend skal fortsat kunne køre på `localhost:5173`
- Next.js app skal køre på `localhost:3000` (standard Next.js port)
- Ingen breaking changes til eksisterende frontend
- Shared types skal være tilgængelige fra Next.js app
- Tailwind config skal være synkroniseret mellem begge apps

---

## Desired End State

### Målstruktur:
```
huddle-design-guide/
├── apps/
│   └── web/              # Next.js app
│       ├── app/           # Next.js App Router
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/    # (tom - komponenter migreres i Fase 3)
│       ├── lib/          # (tom - utilities migreres i Fase 3)
│       ├── public/       # Static assets
│       ├── tailwind.config.ts  # Kopieret fra root, opdateret paths
│       ├── postcss.config.js   # Kopieret fra root
│       ├── tsconfig.json       # Next.js standard + path aliases
│       └── package.json        # Next.js app dependencies
├── packages/
│   └── types/            # Shared types package
│       ├── package.json  # @huddle/types
│       └── index.ts      # Kopieret fra src/types/index.ts
├── src/                  # EksISTERENDE FRONTEND (uændret)
│   └── ... (alle eksisterende filer)
└── package.json         # Root med workspaces (opdateret med "dev" script)
```

### Verification Criteria:

- ✅ Next.js app kører på `localhost:3000`
- ✅ Eksisterende frontend kører stadig på `localhost:8080`
- ✅ Shared types package er tilgængelig fra Next.js app (`@huddle/types`)
- ✅ Tailwind config er synkroniseret mellem begge apps
- ✅ Begge apps kan køre samtidigt uden konflikter
- ✅ Ingen breaking changes til eksisterende frontend

---

## What We're NOT Doing

- ❌ **Ingen komponent migration** - det er Fase 3
- ❌ **Ingen page migration** - det er Fase 3
- ❌ **Ingen Supabase client migration** - det er Fase 3 (men vi opretter struktur)
- ❌ **Ingen API routes** - det er Fase 4
- ❌ **Ingen Clerk integration** - det er senere fase
- ❌ **Ingen UI komponenter** - Next.js app starter tom
- ❌ **Ingen business logic** - kun foundation setup

---

## Implementation Approach

**Strategi:** Gradvist, inkrementelt setup med pause points efter hver phase. Hver phase kan testes isoleret.

**Package Manager:** Bruger npm workspaces (ikke pnpm som nævnt i ticket). Opdater alle kommandoer til npm syntax.

**Supabase:** Next.js skal bruge `@supabase/ssr` (ikke `@supabase/supabase-js` direkte). Vi opretter struktur, men implementerer ikke client i denne fase.

---

## Phase 1: Opret Next.js App

### Overview

Opret Next.js app i `apps/web/` med TypeScript, Tailwind CSS, og App Router.

### Changes Required:

#### 1. Kør create-next-app
**File:** `apps/web/` (ny Next.js app)  
**Changes:** Opret Next.js app med specifikke options

**Rationale:** Standard Next.js setup med vores præferencer

```bash
cd apps
npx create-next-app@latest web --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

**Options:**
- `--typescript` - TypeScript support
- `--tailwind` - Tailwind CSS (vi opdaterer config senere)
- `--app` - App Router (ikke Pages Router)
- `--no-src-dir` - Ingen src/ directory (direkte i apps/web/)
- `--import-alias "@/*"` - Path alias for imports
- `--yes` - Non-interactive (accepter alle defaults)

**Bemærk:** 
- Dette opretter Next.js app med standard Tailwind config
- Vi opdaterer Tailwind config i Phase 2
- Next.js opretter automatisk `apps/web/package.json` med navn "web"

#### 2. Verificer Next.js app er oprettet
**File:** N/A (inspection)  
**Changes:** Verificer at Next.js app struktur er korrekt

**Rationale:** Sikre at create-next-app gennemførte korrekt

**Checklist:**
- [ ] `apps/web/app/` directory eksisterer
- [ ] `apps/web/app/layout.tsx` eksisterer
- [ ] `apps/web/app/page.tsx` eksisterer
- [ ] `apps/web/package.json` eksisterer med navn "web"
- [ ] `apps/web/tailwind.config.ts` eksisterer (standard Next.js config)
- [ ] `apps/web/tsconfig.json` eksisterer

### Success Criteria:

#### Automated Verification:
- [ ] Next.js app directory struktur eksisterer (`apps/web/app/`, `apps/web/public/`)
- [ ] `apps/web/package.json` eksisterer med navn "web"
- [ ] `apps/web/tsconfig.json` eksisterer
- [ ] `apps/web/tailwind.config.ts` eksisterer (standard Next.js)

#### Manual Verification:
- [ ] Next.js app struktur matcher Next.js 15 App Router standard
- [ ] Ingen fejl i create-next-app output

**⚠️ PAUSE HERE** - Verificer Next.js app struktur før Phase 2

---

## Phase 2: Kopier og Opdater Shared Configs

### Overview

Kopier eksisterende Tailwind og PostCSS configs til Next.js app og opdater paths til Next.js struktur.

### Changes Required:

#### 1. Kopier og opdater tailwind.config.ts
**File:** `apps/web/tailwind.config.ts` (overskriv standard Next.js config)  
**Changes:** Kopier fra root og opdater content paths

**Rationale:** Bevar eksisterende Tailwind theme og opdater paths til Next.js struktur

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          glow: "hsl(var(--accent-glow))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          hover: "hsl(var(--card-hover))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

**Bemærk:**
- Content paths opdateret til Next.js struktur: `./app/**/*.{ts,tsx}`, `./components/**/*.{ts,tsx}`, `./lib/**/*.{ts,tsx}`
- Fjernet `./pages/**/*.{ts,tsx}` og `./src/**/*.{ts,tsx}` (ikke relevant for Next.js app)
- Alle theme colors, animations, og plugins bevaret

#### 2. Kopier postcss.config.js
**File:** `apps/web/postcss.config.js` (kopier fra root)  
**Changes:** Kopier eksisterende PostCSS config

**Rationale:** PostCSS config er identisk mellem apps

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Bemærk:** PostCSS config er simpel og kan kopieres direkte uden ændringer.

#### 3. Opdater tsconfig.json
**File:** `apps/web/tsconfig.json` (opdater eksisterende Next.js config)  
**Changes:** Tilføj path aliases og bevar Next.js standard config

**Rationale:** Next.js opretter standard tsconfig.json, vi tilføjer path aliases

**Eksisterende Next.js tsconfig.json (bevar dette):**
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Bemærk:**
- Next.js opretter allerede `"@/*": ["./*"]` path alias
- Vi behøver ikke ændre noget - Next.js standard er korrekt
- Verificer at path alias matcher import alias fra create-next-app

### Success Criteria:

#### Automated Verification:
- [ ] `apps/web/tailwind.config.ts` eksisterer med opdaterede content paths
- [ ] `apps/web/postcss.config.js` eksisterer og matcher root version
- [ ] `apps/web/tsconfig.json` har path alias `"@/*": ["./*"]`
- [ ] Tailwind config indeholder alle custom colors og animations fra root

#### Manual Verification:
- [ ] Content paths i tailwind.config.ts peger på Next.js struktur (app/, components/, lib/)
- [ ] PostCSS config er identisk med root version
- [ ] TypeScript config er korrekt (Next.js standard + path aliases)

**⚠️ PAUSE HERE** - Verificer configs før Phase 3

---

## Phase 3: Opret Shared Types Package

### Overview

Opret shared types package i `packages/types/` så Next.js app og legacy frontend kan dele samme types.

### Changes Required:

#### 1. Opret packages/types/package.json
**File:** `packages/types/package.json` (ny fil)  
**Changes:** Opret package.json for shared types package

**Rationale:** Shared package skal have egen package.json for workspace support

```json
{
  "name": "@huddle/types",
  "version": "0.0.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts"
  }
}
```

**Bemærk:**
- `name` skal matche workspace navn (`@huddle/types`)
- `main` og `types` peger på samme fil (TypeScript source)
- `exports` definerer package entry point

#### 2. Kopier types til packages/types/index.ts
**File:** `packages/types/index.ts` (ny fil)  
**Changes:** Kopier indhold fra `src/types/index.ts`

**Rationale:** Shared types skal være tilgængelige fra Next.js app

```typescript
// Kopier eksakt indhold fra src/types/index.ts
export interface Jersey {
  id: string;
  images: string[];
  club: string;
  season: string;
  type: JerseyType;
  // ... (alle felter fra src/types/index.ts)
}

export type JerseyType = "Home" | "Away" | "Third" | /* ... */;

// ... (alle andre types)
```

**Bemærk:**
- Kopier eksakt indhold fra `src/types/index.ts`
- Ingen ændringer til types - kun flytning til shared package

#### 3. Opdater Next.js app til at bruge @huddle/types
**File:** `apps/web/app/page.tsx` (opdater eksempel)  
**Changes:** Test import af @huddle/types

**Rationale:** Verificer at shared package er tilgængelig

```typescript
// apps/web/app/page.tsx
import type { Jersey } from "@huddle/types";

export default function HomePage() {
  // Test import - kan fjerne senere
  return (
    <div>
      <h1>Next.js App</h1>
      <p>Shared types package test</p>
    </div>
  );
}
```

**Bemærk:**
- ⚠️ **Dette er kun midlertidig test kode**
- Test import og test kode skal fjernes i Phase 5 (Step 4 og 5)
- Import skal fungere uden fejl for at verificere shared package
- **VIKTIGT:** Husk at fjerne test kode før afslutning af Phase 5

#### 4. Opdater root package.json (hvis nødvendigt)
**File:** `package.json` (root)  
**Changes:** Verificer at workspaces inkluderer packages/types

**Rationale:** Workspaces skal genkende packages/types

**Check:**
- [ ] `workspaces` array indeholder `"packages/*"` (allerede i HUD-5)
- [ ] `packages/types/` er inkluderet via `packages/*` pattern

### Success Criteria:

#### Automated Verification:
- [ ] `packages/types/package.json` eksisterer med navn "@huddle/types"
- [ ] `packages/types/index.ts` eksisterer med alle types fra src/types/index.ts
- [ ] `npm install` kører uden fejl (installerer @huddle/types)
- [ ] TypeScript kan resolve `@huddle/types` import i Next.js app

#### Manual Verification:
- [ ] Import `import type { Jersey } from "@huddle/types"` virker i Next.js app
- [ ] Alle types fra src/types/index.ts er tilgængelige
- [ ] Workspaces genkender packages/types

**⚠️ PAUSE HERE** - Verificer shared types package før Phase 4

---

## Phase 4: Installer Dependencies i Next.js App

### Overview

Installer core dependencies i Next.js app som matcher legacy frontend dependencies.

### Changes Required:

#### 1. Installer core dependencies
**File:** `apps/web/package.json` (opdateres automatisk)  
**Changes:** Installer dependencies i Next.js app

**Rationale:** Next.js app skal have samme dependencies som legacy frontend (når relevant)

```bash
cd apps/web
npm install @tanstack/react-query @supabase/supabase-js react-hook-form zod @hookform/resolvers
```

**Dependencies:**
- `@tanstack/react-query` - Data fetching og caching (bruges i legacy frontend)
- `@supabase/supabase-js` - Supabase client (bruges til types, @supabase/ssr installeres senere)
- `react-hook-form` - Form handling (bruges i legacy frontend)
- `zod` - Schema validation (bruges i legacy frontend)
- `@hookform/resolvers` - Zod resolver for RHF (bruges i legacy frontend)

**Bemærk:**
- Vi installerer `@supabase/supabase-js` for types, men bruger `@supabase/ssr` til client (Fase 3)
- Dependencies matcher legacy frontend versions (fra src/package.json)

#### 2. Installer dev dependencies
**File:** `apps/web/package.json` (opdateres automatisk)  
**Changes:** Installer dev dependencies

**Rationale:** Dev dependencies for TypeScript og development

```bash
cd apps/web
npm install -D @types/node
```

**Bemærk:**
- `@types/node` er allerede inkluderet i Next.js standard setup
- Verificer at version matcher legacy frontend hvis nødvendigt

#### 3. Installer @supabase/ssr (for fremtidig brug)
**File:** `apps/web/package.json` (opdateres automatisk)  
**Changes:** Installer @supabase/ssr for Next.js Supabase integration

**Rationale:** Next.js skal bruge @supabase/ssr i stedet for @supabase/supabase-js direkte (jf. migration plan)

```bash
cd apps/web
npm install @supabase/ssr
```

**Bemærk:**
- Vi installerer @supabase/ssr nu, men implementerer ikke client i denne fase
- Client implementeres i Fase 3 (komponent migration)

#### 4. Verificer dependencies
**File:** N/A (inspection)  
**Changes:** Verificer at alle dependencies er installeret korrekt

**Rationale:** Sikre at Next.js app har alle nødvendige dependencies

```bash
cd apps/web
npm list --depth=0
```

**Forventet:**
- Alle dependencies fra step 1-3 er installeret
- Ingen version konflikter
- Workspace dependencies resolver korrekt

### Success Criteria:

#### Automated Verification:
- [ ] Alle core dependencies installeret i apps/web/package.json
- [ ] `npm install` kører uden fejl i apps/web/
- [ ] Ingen dependency version konflikter
- [ ] @supabase/ssr installeret (for fremtidig brug)

#### Manual Verification:
- [ ] Dependencies matcher legacy frontend versions (hvor relevant)
- [ ] Workspace dependencies resolver korrekt
- [ ] package-lock.json opdateret i root

**⚠️ PAUSE HERE** - Verificer dependencies før Phase 5

---

## Phase 5: Verificering og Testing

### Overview

Test at Next.js app kører korrekt, legacy frontend stadig fungerer, og begge apps kan køre samtidigt.

### Changes Required:

#### 1. Test Next.js app kører
**File:** N/A (command)  
**Changes:** Start Next.js app og verificer den kører

**Rationale:** Verificer at Next.js app er korrekt sat op

```bash
# Fra root directory
npm run dev --workspace=web
```

**Forventet:**
- Next.js dev server starter på `localhost:3000`
- Ingen fejl i console
- Standard Next.js welcome page loader i browser

**Alternativ (fra apps/web):**
```bash
cd apps/web
npm run dev
```

#### 2. Test legacy frontend stadig kører
**File:** N/A (command)  
**Changes:** Start legacy frontend og verificer den kører

**Rationale:** Verificer at eksisterende frontend ikke er påvirket

```bash
# Fra root directory
npm run dev:legacy
```

**Forventet:**
- Vite dev server starter på `localhost:8080` (konfigureret i src/vite.config.ts)
- Ingen fejl i console
- Legacy frontend loader korrekt i browser

#### 3. Test begge apps kører samtidigt
**File:** N/A (command)  
**Changes:** Start begge apps samtidigt og verificer ingen konflikter

**Rationale:** Verificer at begge apps kan køre parallelt

```bash
# Terminal 1: Next.js app
npm run dev --workspace=web

# Terminal 2: Legacy frontend
npm run dev:legacy
```

**Forventet:**
- Begge apps kører samtidigt uden port konflikter
- Next.js på `localhost:3000`
- Legacy frontend på `localhost:8080` (konfigureret i src/vite.config.ts)
- Ingen fejl i console for begge apps

#### 4. Test Tailwind styles i Next.js app
**File:** `apps/web/app/page.tsx` (opdater test)  
**Changes:** Tilføj Tailwind classes for at teste config

**Rationale:** Verificer at Tailwind config fungerer i Next.js app

```typescript
// apps/web/app/page.tsx
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-primary">Next.js App</h1>
        <p className="mt-4 text-muted-foreground">
          Tailwind styles test - custom colors should work
        </p>
        <div className="mt-8 rounded-lg bg-card p-4">
          <p className="text-card-foreground">Card component test</p>
        </div>
      </div>
    </div>
  );
}
```

**Forventet:**
- Tailwind classes anvendes korrekt
- Custom colors (primary, card, etc.) fungerer
- Dark mode support fungerer (hvis testet)

#### 5. Test shared types import
**File:** `apps/web/app/page.tsx` (opdater test)  
**Changes:** Test import af @huddle/types

**Rationale:** Verificer at shared types package er tilgængelig

```typescript
// apps/web/app/page.tsx
import type { Jersey, User } from "@huddle/types";

export default function HomePage() {
  // Test types (compile-time only)
  const testJersey: Jersey = {
    id: "test",
    images: [],
    club: "Test Club",
    season: "2024/25",
    type: "Home",
    // ... (alle required fields)
  };

  return (
    <div>
      <h1>Next.js App</h1>
      <p>Shared types test - check TypeScript compilation</p>
    </div>
  );
}
```

**Forventet:**
- TypeScript compiler accepterer import
- Ingen type errors
- Types er korrekt tilgængelige

**⚠️ VIKTIGT:** Dette er test kode - fjern test imports og test variabler efter verificering (se Step 8).

#### 6. Verificer workspace structure
**File:** N/A (inspection)  
**Changes:** Verificer at alle directories og filer er korrekt oprettet

**Rationale:** Verificer at monorepo struktur matcher desired end state

**Checklist:**
- [ ] `apps/web/app/` eksisterer med layout.tsx og page.tsx
- [ ] `apps/web/tailwind.config.ts` eksisterer med opdaterede paths
- [ ] `apps/web/postcss.config.js` eksisterer
- [ ] `apps/web/tsconfig.json` eksisterer med path aliases
- [ ] `packages/types/package.json` eksisterer
- [ ] `packages/types/index.ts` eksisterer med alle types
- [ ] Root `package.json` har workspaces config
- [ ] `apps/web/package.json` har alle dependencies

#### 7. Opdater root package.json med dev script
**File:** `package.json` (root)  
**Changes:** Tilføj `dev` script for Next.js app

**Rationale:** Gør det nemt at starte Next.js app fra root

```json
{
  "scripts": {
    "dev": "npm run dev --workspace=web",
    "dev:legacy": "npm run dev --workspace=legacy-frontend",
    // ... (eksisterende scripts)
  }
}
```

**Bemærk:**
- `dev` script starter Next.js app (standard)
- `dev:legacy` starter legacy frontend
- Begge kan køres fra root directory

#### 8. Cleanup test kode
**File:** `apps/web/app/page.tsx` (opdater)  
**Changes:** Fjern test imports og test kode fra Phase 3 og Phase 5

**Rationale:** Test kode skal ikke være i production code

**Fjern:**
- Test imports fra Phase 3: `import type { Jersey } from "@huddle/types";` (hvis kun brugt til test)
- Test variabler fra Phase 5 Step 5: `const testJersey: Jersey = { ... }`
- Test kommentarer: `// Test import - kan fjerne senere`, `// Test types (compile-time only)`

**Efter cleanup, page.tsx skal være:**
```typescript
// apps/web/app/page.tsx
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-primary">Next.js App</h1>
        <p className="mt-4 text-muted-foreground">
          Next.js app er klar til komponent migration (Fase 3)
        </p>
      </div>
    </div>
  );
}
```

**Bemærk:**
- Behold Tailwind test styles (Step 4) - de viser at config fungerer
- Fjern kun test imports og test variabler der ikke bruges
- Page skal være ren og klar til næste fase

### Success Criteria:

#### Automated Verification:
- [ ] `npm run dev --workspace=web` starter Next.js app uden fejl
- [ ] `npm run dev:legacy` starter legacy frontend uden fejl
- [ ] Begge apps kan køre samtidigt (test manuelt)
- [ ] TypeScript compilation virker i Next.js app
- [ ] `@huddle/types` import virker i Next.js app

#### Manual Verification:
- [ ] Next.js app loader på `localhost:3000`
- [ ] Legacy frontend loader på `localhost:8080` (konfigureret i src/vite.config.ts)
- [ ] Tailwind styles fungerer i Next.js app (custom colors)
- [ ] Ingen console errors i begge apps
- [ ] Workspace structure matcher desired end state
- [ ] Root `dev` script starter Next.js app korrekt
- [ ] Test kode er fjernet fra apps/web/app/page.tsx (Step 8)

**⚠️ PAUSE HERE** - Verificer alle tests og cleanup før afslutning

---

## Testing Strategy

### Unit Tests
- **N/A for denne fase** - ingen business logic, kun setup

### Integration Tests
- **Workspace installation:** `npm install` skal installere alle dependencies
- **Script execution:** Alle scripts skal fungere korrekt
- **Type resolution:** TypeScript skal kunne resolve @huddle/types
- **Port conflicts:** Begge apps skal kunne køre samtidigt

### Manual Tests
- **Next.js app functionality:** Test at Next.js app kører og loader korrekt
- **Legacy frontend functionality:** Test at legacy frontend stadig fungerer
- **Tailwind styles:** Test at custom Tailwind colors fungerer i Next.js app
- **Shared types:** Test at types kan importeres og bruges
- **Concurrent execution:** Test at begge apps kan køre samtidigt

### Edge Cases
- **Port conflicts:** Verificer at begge apps bruger forskellige porte
- **Dependency conflicts:** Verificer at ingen version konflikter
- **Workspace resolution:** Verificer at @huddle/types resolver korrekt
- **Config sync:** Verificer at Tailwind config er synkroniseret

---

## Rollback Strategy

Hvis noget går galt:

1. **Git reset:** `git reset --hard HEAD` (hvis ikke committet)
2. **Remove Next.js app:** `rm -rf apps/web` (hvis Next.js app skal slettes)
3. **Remove shared package:** `rm -rf packages/types` (hvis shared package skal slettes)
4. **Restore root package.json:** `git checkout HEAD -- package.json` (hvis root scripts er ændret)

**Bemærk:** Da vi ikke ændrer eksisterende frontend, er rollback relativt sikkert.

---

## Risks & Mitigation

| Risiko | Mitigation |
|--------|-----------|
| Port konflikter mellem Next.js og Vite | Verificer porte før start (3000 vs 5173/8080) |
| Dependency version konflikter | Brug samme versions som legacy frontend hvor muligt |
| Tailwind config paths fejl | Test Tailwind styles grundigt, verificer content paths |
| Shared types package ikke resolver | Test import grundigt, verificer workspace config |
| Next.js og Vite bruger forskellige Node versions | Verificer Node version kompatibilitet |
| Config files ikke synkroniseret | Kopier configs direkte, test begge apps |

---

## Dependencies

### System Requirements:
- **Node.js:** Eksisterende version (verificer kompatibilitet med Next.js 15)
- **npm:** Version 7+ (workspaces support - allerede verificeret)

### Project Dependencies:
- **Next.js:** Latest (installeres via create-next-app)
- **React:** 19 (Next.js 15 inkluderer React 19)
- **TypeScript:** ^5.8.3 (allerede i root devDependencies)
- **Tailwind CSS:** ^3.4.17 (allerede i legacy frontend)
- **@tanstack/react-query:** ^5.83.0 (fra legacy frontend)
- **@supabase/supabase-js:** ^2.84.0 (fra legacy frontend)
- **@supabase/ssr:** Latest (ny dependency for Next.js)
- **react-hook-form:** ^7.61.1 (fra legacy frontend)
- **zod:** ^4.1.13 (fra legacy frontend)

---

## Timeline Estimate

- **Phase 1 (Next.js app):** 15-20 minutter
- **Phase 2 (Configs):** 20-30 minutter
- **Phase 3 (Shared types):** 15-20 minutter
- **Phase 4 (Dependencies):** 15-20 minutter
- **Phase 5 (Testing):** 30-45 minutter

**Total:** ~2-3 timer (inkl. testing og verificering)

---

## Next Steps After Completion

1. **Commit changes:** 
   ```bash
   git add .
   git commit -m "feat: setup Next.js app in monorepo (HUD-6)"
   ```

2. **Update Linear:** Mark HUD-6 som "In Progress" → "Done"

3. **Prepare for Fase 3:** Næste fase er komponent migration til Next.js app

4. **Documentation:** Opdater `.project/08-Migration_Plan.md` hvis nødvendigt

---

## References

- **Linear Issue:** HUD-6 - Fase 2: Setup Next.js app parallelt med eksisterende frontend
- **Migration Plan:** `.project/08-Migration_Plan.md` - Fase 2 (sektion 4)
- **Frontend Guide:** `.project/07-Frontend_Guide.md`
- **Next.js Rules:** `.cursor/rules/10-nextjs_frontend.mdc`
- **Supabase Patterns:** `.cursor/rules/32-supabase_patterns.mdc`
- **Current tailwind.config.ts:** `tailwind.config.ts` (root)
- **Current postcss.config.js:** `postcss.config.js` (root)
- **Current types:** `src/types/index.ts`
- **Legacy dependencies:** `src/package.json`

---

## Questions & Open Items

### Resolved:
- ✅ Package manager: npm workspaces (ikke pnpm)
- ✅ Next.js version: Latest (via create-next-app)
- ✅ Supabase: @supabase/ssr for Next.js (ikke @supabase/supabase-js direkte)
- ✅ Shared types: packages/types/ med @huddle/types

### To Clarify (hvis nødvendigt):
- [ ] Skal Next.js app bruge samme Tailwind theme som legacy frontend? (JA - kopierer config)
- [ ] Skal vi oprette packages/ui/ nu eller vente til Fase 3? (VENT - ikke i scope)
- [ ] Skal vi oprette Supabase client struktur nu eller vente til Fase 3? (VENT - kun dependencies)

### Environment Variables Note:
**⚠️ VIKTIGT:** Environment variables (NEXT_PUBLIC_SUPABASE_URL, etc.) skal oprettes i Fase 3 når Supabase client implementeres. I denne fase (Fase 2) installerer vi kun dependencies - ingen env vars nødvendige endnu.

**Fremtidig (Fase 3):**
- Opret `apps/web/.env.local` med:
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- Kopier fra eksisterende `.env` eller `.env.local` i root (hvis eksisterer)

---

**Plan Created:** 2025-11-25  
**Status:** Ready for Implementation  
**Estimated Complexity:** Low-Medium (primært setup og konfiguration, lav risiko)

