# Fase 1: Opret Monorepo Struktur - Implementation Plan

## Overview

Opret monorepo struktur der bevarer eksisterende `src/` frontend mens vi forbereder for Next.js app parallelt. Dette er **kun struktur setup** - ingen kode migration endnu.

**Mål:** Eksisterende frontend kører stadig, og root workspace er klar til at tilføje Next.js app i Fase 2.

---

## Linear Issue

**Issue:** HUD-5  
**Title:** Fase 1: Opret monorepo struktur  
**Status:** Backlog  
**Labels:** Migration, Frontend, Feature  
**Project:** Frontend Migration  
**URL:** https://linear.app/huddle-world/issue/HUD-5/fase-1-opret-monorepo-struktur

---

## Current State Analysis

### Eksisterende Struktur:
```
huddle-design-guide/
├── src/                    # Vite + React SPA (bevares!)
│   ├── components/
│   ├── pages/
│   ├── contexts/
│   ├── hooks/
│   ├── integrations/
│   ├── lib/
│   ├── types/
│   └── package.json        # Skal flyttes til src/package.json
├── supabase/              # Eksisterende migrations
├── public/                # Static assets
├── package.json           # Skal blive root package.json
├── package-lock.json      # npm lockfile (bemærk: migration plan nævner pnpm)
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Key Discoveries:

1. **Package Manager:** Projektet bruger **npm** (package-lock.json eksisterer). Vi bruger **npm workspaces** (indbygget i npm 7+).
2. **Eksisterende scripts:** `dev`, `build`, `build:dev`, `lint`, `preview` i package.json
3. **Vite config:** Bruger port 8080, path alias `@/*` -> `./src/*`
4. **TypeScript:** Løsere config (noImplicitAny: false, strictNullChecks: false)

### Constraints:

- **KRITISK:** Eksisterende `src/` skal bevares intakt - ingen breaking changes
- Git history skal bevares
- Eksisterende frontend skal kunne køre med `npm run dev:legacy` eller `cd src && npm run dev`
- Ingen kode migration i denne fase - kun struktur

---

## Desired End State

### Målstruktur:
```
huddle-design-guide/
├── apps/
│   └── web/              # Next.js app (oprettes i Fase 2)
│       └── (tom directory)
├── packages/
│   ├── types/            # Shared TypeScript types (fremtidig)
│   ├── ui/               # Shared UI komponenter (fremtidig)
│   └── config/           # Shared configs (fremtidig)
├── src/                  # EKSISTERENDE FRONTEND (bevares!)
│   ├── components/
│   ├── pages/
│   ├── ... (alle eksisterende filer)
│   └── package.json      # Flyttet fra root, navn: "legacy-frontend"
├── supabase/            # Eksisterende (uændret)
├── public/              # Eksisterende (uændret)
├── package.json         # Root package.json med workspaces
└── package-lock.json    # npm lockfile (bevares)
```

### Verification Criteria:

- ✅ `npm run dev:legacy` starter eksisterende frontend på port 8080
- ✅ `npm install` i root installerer alle dependencies
- ✅ Workspace structure er korrekt (apps/*, packages/*, src)
- ✅ Eksisterende scripts fungerer (`dev`, `build`, `preview` i src/)
- ✅ Ingen breaking changes til eksisterende frontend

---

## What We're NOT Doing

- ❌ **Ingen kode migration** - kun struktur setup
- ❌ **Ingen Next.js app** - det er Fase 2
- ❌ **Ingen komponent migration** - det er Fase 3
- ❌ **Ingen API routes** - det er Fase 4
- ❌ **Ingen cleanup af src/** - det er Fase 5
- ❌ **Ingen dependency updates** - bevarer eksisterende versions
- ❌ **Ingen TypeScript config changes** - bevarer eksisterende config

---

## Implementation Approach

**Strategi:** Gradvist, inkrementelt setup med pause points efter hver phase. Hver phase kan testes isoleret.

**Package Manager:** Bruger npm workspaces (indbygget i npm 7+). Ingen migration nødvendig - npm workspaces er allerede tilgængelig.

---

## Phase 1: Opret Monorepo Directory Struktur

### Overview

Opret directory struktur for monorepo uden at røre eksisterende filer.

### Changes Required:

#### 1. Opret apps/web/ directory
**File:** `apps/web/` (ny directory)  
**Changes:** Opret tom directory for fremtidig Next.js app  
**Rationale:** Standard monorepo struktur for apps

```bash
mkdir -p apps/web
```

#### 2. Opret packages/ directory med subdirectories
**File:** `packages/` (ny directory)  
**Changes:** Opret packages/ med subdirectories:
- `packages/types/` - for shared TypeScript types (fremtidig)
- `packages/ui/` - for shared UI komponenter (fremtidig)
- `packages/config/` - for shared configs (fremtidig)

**Rationale:** Standard monorepo struktur for shared packages

```bash
mkdir -p packages/types
mkdir -p packages/ui
mkdir -p packages/config
```

### Success Criteria:

#### Automated Verification:
- [ ] Directory `apps/web/` eksisterer
- [ ] Directory `packages/types/` eksisterer
- [ ] Directory `packages/ui/` eksisterer
- [ ] Directory `packages/config/` eksisterer
- [ ] Eksisterende `src/` directory er uændret

#### Manual Verification:
- [ ] Directory struktur matcher desired end state
- [ ] Ingen filer i `src/` er blevet flyttet eller slettet

**⚠️ PAUSE HERE** - Verificer directory struktur før Phase 2

---

## Phase 2: Root package.json og Workspace Config

### Overview

Opret root `package.json` med npm workspaces config. npm workspaces er indbygget i npm 7+ og kræver ingen ekstra filer.

### Changes Required:

#### 1. Verificer npm version
**File:** N/A (system command)  
**Changes:** Verificer at npm version er 7+ (workspaces support)  
**Rationale:** npm workspaces kræver npm 7 eller nyere

```bash
# Verificer npm version
npm --version

# Skal være 7.0.0 eller nyere
```

#### 2. Opret root package.json
**File:** `package.json` (overskriv eksisterende)  
**Changes:** Opret root package.json med workspaces config

**Rationale:** Root package.json koordinerer alle workspaces med npm workspaces

```json
{
  "name": "huddle-monorepo",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*",
    "src"
  ],
  "scripts": {
    "dev:legacy": "npm run dev --workspace=legacy-frontend",
    "build:legacy": "npm run build --workspace=legacy-frontend",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspaces",
    "preview:legacy": "npm run preview --workspace=legacy-frontend"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

**Bemærk:** 
- `workspaces` array definerer hvilke directories der er workspaces
- `--workspace=legacy-frontend` kører script i specifik workspace
- `--workspaces` (flertal) kører script i alle workspaces
- TypeScript version matcher eksisterende
- **`dev` og `build` scripts tilføjes i Fase 2** når Next.js app (`apps/web/`) er oprettet

**Alternativ syntax (kortere):**
- `npm run dev:legacy -w legacy-frontend` (i stedet for `--workspace=legacy-frontend`)
- `npm run lint -ws` (i stedet for `--workspaces`)

#### 3. Bevar package-lock.json
**File:** `package-lock.json` (bevares)  
**Changes:** Ingen - package-lock.json bevares som den er  
**Rationale:** npm workspaces bruger samme package-lock.json format

**⚠️ NOTE:** package-lock.json opdateres automatisk når vi kører `npm install` efter Phase 3.

### Success Criteria:

#### Automated Verification:
- [ ] Root `package.json` eksisterer med korrekt workspaces config
- [ ] `workspaces` array er defineret i package.json
- [ ] npm version er 7+ (verificer med `npm --version`)
- [ ] Scripts i root package.json er defineret korrekt

#### Manual Verification:
- [ ] Root package.json navn er "huddle-monorepo"
- [ ] Workspaces array indeholder: `["apps/*", "packages/*", "src"]`
- [ ] Scripts bruger korrekt `--workspace=` eller `-w` syntax

**⚠️ PAUSE HERE** - Verificer config før Phase 3

---

## Phase 3: Migrer Eksisterende package.json

### Overview

Flyt eksisterende `package.json` til `src/package.json` og opdater navn til "legacy-frontend".

### Changes Required:

#### 1. Læs eksisterende package.json
**File:** `package.json` (læs først)  
**Changes:** Læs indhold for at bevare alle dependencies og scripts  
**Rationale:** Vi skal bevare alle eksisterende config

#### 2. Flyt package.json til src/package.json
**File:** `package.json` → `src/package.json` (flyt og opdater)  
**Changes:** Flyt eksisterende package.json til src/ og opdater navn

**Rationale:** Legacy frontend skal have egen package.json i src/. Brug `git mv` for at bevare git history.

```bash
# Flyt package.json til src/ og bevar git history
git mv package.json src/package.json
```

**Derefter opdater navn i src/package.json:**

```json
{
  "name": "legacy-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  // ... alle eksisterende dependencies og devDependencies
}
```

**Bemærk:** 
- **KRITISK:** Brug `git mv` i stedet for `mv` eller `cp` for at bevare git history
- Opdater kun `name` til "legacy-frontend"
- Bevar alle andre felter uændret
- Alle dependencies skal bevares

#### 3. Opdater root package.json (hvis nødvendigt)
**File:** `package.json` (root)  
**Changes:** Verificer at scripts peger korrekt på "legacy-frontend"  
**Rationale:** Root scripts skal kunne finde legacy workspace

#### 4. Opdater package-lock.json
**File:** `package-lock.json` (opdateres automatisk)  
**Changes:** 
1. Kør `npm install` i root (efter src/package.json er oprettet i Phase 3)
2. package-lock.json opdateres automatisk med workspaces info

**Rationale:** npm workspaces opdaterer package-lock.json automatisk

```bash
# I root directory (efter Phase 3)
npm install
```

**Bemærk:** package-lock.json opdateres med workspaces information, men formatet forbliver det samme.

### Success Criteria:

#### Automated Verification:
- [ ] `src/package.json` eksisterer med navn "legacy-frontend"
- [ ] Alle dependencies i src/package.json matcher eksisterende
- [ ] `package-lock.json` er opdateret i root
- [ ] `npm install` kører uden fejl

#### Manual Verification:
- [ ] `src/package.json` scripts er uændret (dev, build, lint, preview)
- [ ] Alle dependencies er bevaret
- [ ] package-lock.json indeholder workspaces information

**⚠️ PAUSE HERE** - Verificer package.json migration før Phase 4

---

## Phase 4: Verificering og Testing

### Overview

Test at eksisterende frontend stadig fungerer og at workspace structure er korrekt.

### Changes Required:

#### 1. Test npm install
**File:** N/A (command)  
**Changes:** Kør `npm install` i root og verificer installation  
**Rationale:** Verificer at workspaces installerer korrekt

```bash
# I root directory
npm install
```

**Forventet output:**
- Alle dependencies installeres
- Ingen fejl
- Workspaces genkendes korrekt
- package-lock.json opdateres

#### 2. Test dev:legacy script
**File:** N/A (command)  
**Changes:** Kør `npm run dev:legacy` og verificer at frontend starter  
**Rationale:** Verificer at legacy frontend stadig fungerer

```bash
# I root directory
npm run dev:legacy
```

**Forventet:**
- Vite dev server starter på port 8080
- Ingen fejl i console
- Frontend loader korrekt i browser

#### 3. Test build script
**File:** N/A (command)  
**Changes:** Kør `npm run build:legacy` og verificer build  
**Rationale:** Verificer at build process fungerer

```bash
# I root directory
npm run build:legacy
```

**Forventet:**
- Build gennemføres uden fejl
- Output genereres i `src/dist/` (eller standard Vite output)

#### 4. Verificer workspace structure
**File:** N/A (inspection)  
**Changes:** Verificer at alle directories eksisterer og er korrekt strukturerede  
**Rationale:** Verificer at monorepo struktur matcher desired end state

**Checklist:**
- [ ] `apps/web/` eksisterer (tom)
- [ ] `packages/types/` eksisterer (tom)
- [ ] `packages/ui/` eksisterer (tom)
- [ ] `packages/config/` eksisterer (tom)
- [ ] `src/` indeholder alle eksisterende filer
- [ ] `src/package.json` eksisterer med navn "legacy-frontend"
- [ ] Root `package.json` har workspaces config
- [ ] `workspaces` array er defineret korrekt

#### 5. Test alternativ start metode
**File:** N/A (command)  
**Changes:** Test at `cd src && npm run dev` også fungerer  
**Rationale:** Verificer at legacy frontend kan startes direkte fra src/

```bash
cd src
npm run dev
```

**Forventet:** Samme som `npm run dev:legacy` fra root

### Success Criteria:

#### Automated Verification:
- [ ] `npm install` kører uden fejl
- [ ] `npm run dev:legacy` starter frontend på port 8080
- [ ] `npm run build:legacy` gennemføres uden fejl
- [ ] Alle workspaces genkendes korrekt

#### Manual Verification:
- [ ] Frontend loader korrekt i browser (localhost:8080)
- [ ] Ingen console errors
- [ ] Alle routes fungerer (test navigation)
- [ ] Build output er korrekt
- [ ] Workspace structure matcher desired end state
- [ ] `cd src && npm run dev` fungerer også

**⚠️ PAUSE HERE** - Verificer alle tests før afslutning

---

## Testing Strategy

### Unit Tests
- **N/A for denne fase** - ingen kode ændringer, kun struktur

### Integration Tests
- **Workspace installation:** `npm install` skal installere alle dependencies
- **Script execution:** Alle scripts skal fungere korrekt
- **Path resolution:** Imports i src/ skal stadig virke (test med eksisterende komponenter)

### Manual Tests
- **Frontend functionality:** Test at alle pages loader korrekt
- **Navigation:** Test at routing fungerer
- **Build:** Test at production build fungerer
- **Hot reload:** Test at Vite HMR fungerer under dev

### Edge Cases
- **Git history:** Verificer at git history bevares (ingen filer slettet, kun flyttet)
- **Dependencies:** Verificer at alle dependencies matcher eksisterende versions
- **Environment variables:** Verificer at .env filer stadig fungerer (hvis eksisterende)

---

## Rollback Strategy

Hvis noget går galt:

1. **Git reset:** `git reset --hard HEAD` (hvis ikke committet)
2. **Restore package.json:** 
   - Hvis root package.json er ændret: `git checkout HEAD -- package.json`
   - Hvis src/package.json er oprettet (efter Phase 3): `git checkout HEAD -- src/package.json` og derefter `git mv src/package.json package.json`
3. **Restore package-lock.json:** `git checkout HEAD -- package-lock.json` (hvis opdateret forkert)
4. **Remove new directories:** Slet `apps/`, `packages/` hvis nødvendigt

**Bemærk:** 
- Da vi bevarer `src/` intakt, er rollback relativt sikkert
- Hvis `git mv` er brugt, kan vi altid restore med `git checkout HEAD -- src/package.json`

---

## Risks & Mitigation

| Risiko | Mitigation |
|--------|-----------|
| npm version for gammel (under 7) kan mangle workspaces support | Verificer npm version før start (skal være 7+) |
| Workspace config fejl kan gøre scripts ubrugelige | Test hver script efter oprettelse |
| Git history kan mistes hvis filer flyttes forkert | Brug `git mv` i stedet for `mv` for package.json |
| Eksisterende frontend kan stoppe med at virke | Test `npm run dev:legacy` efter hver phase |
| package-lock.json konflikter | Test `npm install` grundigt, commit lockfile efter verificering |

---

## Dependencies

### System Requirements:
- **npm:** Version 7+ (krævet for workspaces support)
- **Node.js:** Eksisterende version (verificer kompatibilitet)

### Project Dependencies:
- **Ingen nye dependencies** - bevarer eksisterende
- **TypeScript:** ^5.8.3 (allerede i devDependencies)

---

## Timeline Estimate

- **Phase 1 (Directory structure):** 15 minutter
- **Phase 2 (Root config):** 30-45 minutter
- **Phase 3 (Package.json migration):** 30-45 minutter
- **Phase 4 (Testing):** 30-45 minutter

**Total:** ~2-3 timer (inkl. testing og verificering)

---

## Next Steps After Completion

1. **Commit changes:** 
   ```bash
   git add .
   git commit -m "feat: setup monorepo structure (HUD-5)"
   ```

2. **Update Linear:** Mark HUD-5 som "In Progress" → "Done"

3. **Prepare for Fase 2:** Næste fase er Next.js app setup i `apps/web/`

4. **Documentation:** Opdater `.project/08-Migration_Plan.md` hvis nødvendigt

---

## References

- **Linear Issue:** HUD-5 - Fase 1: Opret monorepo struktur
- **Migration Plan:** `.project/08-Migration_Plan.md` - Fase 1 (sektion 3)
- **Tech Stack:** `.project/03-Tech_Stack.md`
- **Current package.json:** `package.json` (før migration)
- **Vite config:** `vite.config.ts`
- **TypeScript config:** `tsconfig.json`

---

## Questions & Open Items

### Resolved:
- ✅ Package manager: npm workspaces (brugerens præference)
- ✅ Workspace structure: apps/*, packages/*, src
- ✅ npm workspaces er indbygget i npm 7+ (ingen ekstra installation nødvendig)

### To Clarify (hvis nødvendigt):
- [ ] Skal vi opdatere .gitignore for eventuelle workspace-specifikke filer?
- [ ] Skal vi dokumentere npm workspaces i README?

---

**Plan Created:** 2025-11-25  
**Status:** Ready for Implementation  
**Estimated Complexity:** Low-Medium (primært konfiguration, lav risiko)

