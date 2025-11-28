# Fase 5: Cleanup og Verificering - Implementation Plan

## Overview

Verificer alle features er migreret og fjern eksisterende Vite frontend når Next.js er komplet. Dette er den afsluttende fase i frontend-migrationen fra Vite til Next.js.

**Hvorfor:** Efter alle faser (1-4) er gennemført, skal vi sikre at migrationen er komplet, dokumenteret, og legacy frontend fjernes sikkert efter backup.

**Mål:** Alle features verificeret, legacy frontend fjernet (efter backup), dokumentation opdateret, og migration markeret som færdig.

---

## Linear Issue

**Issue:** [HUD-13](https://linear.app/huddle-world/issue/HUD-13/fase-5-cleanup-og-verificering)  
**Status:** Todo  
**Priority:** High  
**Labels:** Migration, Frontend, Feature  
**Project:** Frontend Migration  
**Team:** Huddle World  
**Branch:** `nicklaseskou95/hud-13-fase-5-cleanup-og-verificering`  
**Created:** 2025-11-25  
**Updated:** 2025-11-26

---

## Current State Analysis

### Nuværende Tilstand:

**Next.js App (`apps/web/`):**
- ✅ Alle pages migreret til `apps/web/app/`:
  - Home (`(dashboard)/page.tsx`)
  - Wardrobe (`(dashboard)/wardrobe/page.tsx`)
  - Marketplace (`(dashboard)/marketplace/page.tsx`)
  - Jersey Detail (`(dashboard)/jersey/[id]/page.tsx`)
  - Profile (`(dashboard)/profile/page.tsx` + `[username]/page.tsx`)
  - Community (`(dashboard)/community/page.tsx`)
  - Messages (`(dashboard)/messages/page.tsx` + `[id]/page.tsx`)
  - Notifications (`(dashboard)/notifications/page.tsx`)
  - Settings (`(dashboard)/settings/page.tsx`)
  - Auth (`(auth)/auth/page.tsx`)

- ✅ Alle komponenter migreret til `apps/web/components/`:
  - UI komponenter (`components/ui/`) - 49 komponenter
  - Domain komponenter (`components/jersey/`, `components/marketplace/`, etc.)
  - Layout komponenter (`components/layout/`)

- ✅ API routes implementeret i `apps/web/app/api/v1/`:
  - Jerseys, Listings, Auctions, Bids, Posts, Profiles, Auth, Health

- ✅ Supabase integration:
  - Client (`lib/supabase/client.ts`)
  - Server (`lib/supabase/server.ts`)

- ✅ Ingen references til `src/` i Next.js codebase (verificeret via grep)

**Legacy Frontend (`src/`):**
- ⚠️ Eksisterer stadig med alle originale filer:
  - 13 pages i `src/pages/`
  - Komponenter i `src/components/`
  - Supabase client i `src/integrations/supabase/`
  - Types i `src/types/`

**Root Workspace:**
- ⚠️ `package.json` har `dev:legacy` script
- ⚠️ `package.json` har `src` i workspaces array
- ⚠️ `src/package.json` konfigureret som `legacy-frontend` workspace

### Key Discoveries:

1. **Migration Status:** Alle pages og komponenter er migreret til Next.js
2. **No Dependencies:** Ingen references til `src/` i Next.js codebase
3. **Legacy Still Active:** Legacy frontend kan stadig køres via `npm run dev:legacy`
4. **Documentation:** Migration plan og frontend guide skal opdateres med "Completed" status

---

## Desired End State

### Workspace Struktur:

```
huddle-design-guide/
├── apps/
│   └── web/              # Next.js app (komplet)
│       ├── app/          # All pages migrated
│       ├── components/   # All components migrated
│       └── lib/          # Utilities migrated
├── packages/
│   └── types/            # Shared types
├── supabase/             # Supabase migrations
├── .project/             # Project documentation
│   └── plans/
│       └── HUD-13/       # This plan
├── package.json          # Root (NO dev:legacy script, NO src in workspaces)
└── [NO src/ directory]   # Legacy frontend removed
```

### Verification Criteria:

- ✅ Alle features verificeret og fungerer
- ✅ Performance verificeret (page load times, bundle size)
- ✅ Dokumentation opdateret
- ✅ Legacy frontend backed up (git branch)
- ✅ `src/` directory fjernet
- ✅ Root workspace opdateret (scripts, workspaces)
- ✅ Build og dev scripts fungerer korrekt
- ✅ CI/CD pipeline fungerer (hvis sat op)
- ✅ Migration markeret som færdig

---

## What We're NOT Doing

- ❌ **Ikke migrere nye features:** Kun verificering og cleanup
- ❌ **Ikke refaktorere Next.js kode:** Ingen ændringer til Next.js app
- ❌ **Ikke optimere performance:** Performance verificering kun, ikke optimization
- ❌ **Ikke opdatere dependencies:** Kun cleanup af unused dependencies
- ❌ **Ikke ændre API routes:** API routes er allerede implementeret
- ❌ **Ikke fjerne `src/` før backup:** Backup er kritisk første skridt

---

## Implementation Approach

**Strategi:** Systematisk verificering først, derefter sikker cleanup med backup. Hver fase har klare success criteria og pause points.

**Phase Sequence:**
1. **Phase 1:** Feature Verification - Systematisk gennemgang af alle features
2. **Phase 2:** Performance Verification - Test page load times og bundle size
3. **Phase 3:** Documentation Updates - Opdater alle relevante guides
4. **Phase 4:** Backup Legacy Frontend - Git branch backup
5. **Phase 5:** Remove Vite Frontend - Fjern `src/` og opdater workspace
6. **Phase 6:** Final Verification - Test build, dev, og CI/CD
7. **Phase 7:** Git Cleanup - Commit, tag, og release notes

---

## Phase 1: Feature Verification

### Overview

Systematisk gennemgang af alle features for at sikre at migrationen er komplet. Test alle pages, komponenter, API endpoints, auth flow, og integrationer.

### Changes Required:

#### 1. Pages Verification Checklist

**File:** Create verification checklist document  
**Changes:** Opret `.project/plans/HUD-13/feature-verification-checklist.md` med detaljerede test cases

**Checklist Items:**

- [ ] **Home Page** (`apps/web/app/(dashboard)/page.tsx`)
  - [ ] Page loader korrekt
  - [ ] HeroSpotlight komponent vises
  - [ ] QuickActions fungerer
  - [ ] ActivitySnapshot viser data
  - [ ] CommunityPreview viser posts
  - [ ] MarketplaceForYou viser listings
  - [ ] RightSidebar vises korrekt
  - [ ] Navigation fungerer til andre pages

- [ ] **Wardrobe Page** (`apps/web/app/(dashboard)/wardrobe/page.tsx`)
  - [ ] Jersey grid vises korrekt
  - [ ] Filters fungerer (hvis implementeret)
  - [ ] Upload jersey funktion fungerer
  - [ ] JerseyCard komponenter vises korrekt
  - [ ] Click på jersey navigerer til detail page

- [ ] **Marketplace Page** (`apps/web/app/(dashboard)/marketplace/page.tsx`)
  - [ ] Sale listings vises
  - [ ] Auctions vises (hvis implementeret)
  - [ ] Filters fungerer
  - [ ] Pagination fungerer (hvis implementeret)
  - [ ] Create listing funktion fungerer
  - [ ] Create auction funktion fungerer

- [ ] **Jersey Detail Page** (`apps/web/app/(dashboard)/jersey/[id]/page.tsx`)
  - [ ] Dynamic route fungerer korrekt
  - [ ] Jersey data vises korrekt
  - [ ] Images vises korrekt
  - [ ] Place bid funktion fungerer (hvis auction)
  - [ ] Social interaktioner fungerer (likes, saves, comments)

- [ ] **Profile Page** (`apps/web/app/(dashboard)/profile/page.tsx`)
  - [ ] Own profile vises korrekt
  - [ ] Stats vises korrekt
  - [ ] Edit profile funktion fungerer
  - [ ] Wardrobe preview vises
  - [ ] Posts vises (hvis implementeret)

- [ ] **User Profile Page** (`apps/web/app/(dashboard)/profile/[username]/page.tsx`)
  - [ ] Dynamic route fungerer korrekt
  - [ ] Other user's profile vises korrekt
  - [ ] Follow/unfollow funktion fungerer (hvis implementeret)

- [ ] **Community Page** (`apps/web/app/(dashboard)/community/page.tsx`)
  - [ ] Posts feed vises korrekt
  - [ ] Create post funktion fungerer
  - [ ] Comments funktion fungerer
  - [ ] Like/save funktion fungerer

- [ ] **Messages Page** (`apps/web/app/(dashboard)/messages/page.tsx`)
  - [ ] Conversation list vises korrekt
  - [ ] Click på conversation navigerer til chat
  - [ ] Chat page (`[id]/page.tsx`) viser messages korrekt
  - [ ] Send message funktion fungerer

- [ ] **Notifications Page** (`apps/web/app/(dashboard)/notifications/page.tsx`)
  - [ ] Notification list vises korrekt
  - [ ] Mark as read funktion fungerer
  - [ ] Click på notification navigerer korrekt

- [ ] **Settings Page** (`apps/web/app/(dashboard)/settings/page.tsx`)
  - [ ] Settings UI vises korrekt
  - [ ] Settings kan gemmes (hvis implementeret)

- [ ] **Auth Page** (`apps/web/app/(auth)/auth/page.tsx`)
  - [ ] Login form fungerer
  - [ ] Signup form fungerer
  - [ ] Auth flow fungerer korrekt
  - [ ] Redirect efter login fungerer

#### 2. Components Verification Checklist

**File:** Update verification checklist  
**Changes:** Tilføj komponent verification til checklist

**Checklist Items:**

- [ ] **UI Komponenter** (`apps/web/components/ui/`)
  - [ ] Alle 49 UI komponenter fungerer korrekt
  - [ ] Styling matcher design system
  - [ ] Responsive design fungerer
  - [ ] Accessibility fungerer (keyboard navigation, screen reader)

- [ ] **Domain Komponenter**
  - [ ] JerseyCard (`components/jersey/JerseyCard.tsx`) fungerer
  - [ ] UploadJersey (`components/jersey/UploadJersey.tsx`) fungerer
  - [ ] Sidebar (`components/layout/Sidebar.tsx`) fungerer
  - [ ] BottomNav (`components/layout/BottomNav.tsx`) fungerer
  - [ ] CommandBar (`components/layout/CommandBar.tsx`) fungerer
  - [ ] CreateSaleListing (`components/marketplace/CreateSaleListing.tsx`) fungerer
  - [ ] CreateAuction (`components/marketplace/CreateAuction.tsx`) fungerer
  - [ ] PlaceBid (`components/marketplace/PlaceBid.tsx`) fungerer
  - [ ] CreatePost (`components/community/CreatePost.tsx`) fungerer
  - [ ] PostComments (`components/community/PostComments.tsx`) fungerer
  - [ ] EditProfile (`components/profile/EditProfile.tsx`) fungerer

#### 3. API Verification Checklist

**File:** Update verification checklist  
**Changes:** Tilføj API endpoint verification

**Checklist Items:**

- [ ] **API Endpoints** (`apps/web/app/api/v1/`)
  - [ ] `GET /api/v1/jerseys` fungerer
  - [ ] `GET /api/v1/jerseys/[id]` fungerer
  - [ ] `GET /api/v1/listings` fungerer
  - [ ] `GET /api/v1/listings/[id]` fungerer
  - [ ] `GET /api/v1/auctions` fungerer
  - [ ] `GET /api/v1/auctions/[id]` fungerer
  - [ ] `POST /api/v1/bids` fungerer
  - [ ] `GET /api/v1/posts` fungerer
  - [ ] `GET /api/v1/posts/[id]` fungerer
  - [ ] `GET /api/v1/profiles/[id]` fungerer
  - [ ] `GET /api/v1/profiles/username/[username]` fungerer
  - [ ] `GET /api/v1/health` fungerer
  - [ ] Auth endpoints fungerer

#### 4. Integration Verification Checklist

**File:** Update verification checklist  
**Changes:** Tilføj integration verification

**Checklist Items:**

- [ ] **Supabase Integration**
  - [ ] Client-side queries fungerer
  - [ ] Server-side queries fungerer
  - [ ] Auth flow fungerer korrekt
  - [ ] RLS policies fungerer korrekt

- [ ] **Routing**
  - [ ] Navigation fungerer mellem alle routes
  - [ ] Dynamic routes fungerer korrekt
  - [ ] Protected routes fungerer korrekt
  - [ ] 404 page vises korrekt

- [ ] **Styling**
  - [ ] Tailwind styles fungerer korrekt
  - [ ] CSS variables fungerer korrekt
  - [ ] Dark mode fungerer (hvis implementeret)
  - [ ] Responsive design fungerer

- [ ] **Forms**
  - [ ] React Hook Form fungerer korrekt
  - [ ] Zod validation fungerer korrekt
  - [ ] Form submission fungerer korrekt
  - [ ] Error handling fungerer korrekt

### Success Criteria:

#### Automated Verification:
- [ ] Next.js app builds: `cd apps/web && npm run build`
- [ ] Type check passes: `cd apps/web && npx tsc --noEmit`
- [ ] Lint passes: `cd apps/web && npm run lint`
- [ ] No references to `src/` in Next.js codebase: `grep -r "src/" apps/web` returns empty

#### Manual Verification:
- [ ] Alle pages fungerer korrekt (se checklist ovenfor)
- [ ] Alle komponenter fungerer korrekt
- [ ] Alle API endpoints fungerer korrekt
- [ ] Auth flow fungerer korrekt
- [ ] Supabase integration fungerer korrekt
- [ ] Routing fungerer korrekt
- [ ] Styling fungerer korrekt
- [ ] Forms fungerer korrekt
- [ ] Ingen console errors eller warnings
- [ ] Ingen broken links eller missing images

**⚠️ PAUSE HERE** - Verificer alle features før Phase 2

---

## Phase 2: Performance Verification

### Overview

Test page load times, verificer Server Components bruges hvor muligt, test image optimization, og verificer bundle size er acceptabel.

### Changes Required:

#### 1. Page Load Time Testing

**File:** Create performance test document  
**Changes:** Opret `.project/plans/HUD-13/performance-verification.md` med test results

**Test Cases:**

- [ ] **Home Page Load Time**
  - [ ] Test i dev mode: `< 3 seconds`
  - [ ] Test i production build: `< 2 seconds`
  - [ ] Test på slow 3G: `< 5 seconds`

- [ ] **Wardrobe Page Load Time**
  - [ ] Test med 10 jerseys: `< 2 seconds`
  - [ ] Test med 100 jerseys: `< 3 seconds`

- [ ] **Marketplace Page Load Time**
  - [ ] Test med 20 listings: `< 2 seconds`
  - [ ] Test med pagination: `< 2 seconds per page`

- [ ] **Jersey Detail Page Load Time**
  - [ ] Test med images: `< 2 seconds`
  - [ ] Test image lazy loading fungerer

#### 2. Server Components Verification

**File:** Review pages for Server Components usage  
**Changes:** Verificer at Server Components bruges hvor muligt

**Verification:**

- [ ] **Pages using Server Components:**
  - [ ] Home page bruger Server Components hvor muligt
  - [ ] Wardrobe page bruger Server Components hvor muligt
  - [ ] Marketplace page bruger Server Components hvor muligt
  - [ ] Jersey Detail page bruger Server Components hvor muligt
  - [ ] Profile pages bruger Server Components hvor muligt

- [ ] **Client Components only where needed:**
  - [ ] Interactive components er Client Components
  - [ ] Forms er Client Components
  - [ ] State management er Client Components

#### 3. Image Optimization Testing

**File:** Test image optimization  
**Changes:** Verificer Next.js Image component bruges hvor muligt

**Verification:**

- [ ] Next.js `Image` component bruges i stedet for `<img>` tags
- [ ] Images er optimeret (WebP format hvor muligt)
- [ ] Lazy loading fungerer korrekt
- [ ] Image sizes er korrekt defineret

#### 4. Bundle Size Verification

**File:** Test bundle size  
**Changes:** Verificer bundle size er acceptabel

**Verification:**

- [ ] Build Next.js app: `cd apps/web && npm run build`
- [ ] Check bundle size i build output
- [ ] Verify main bundle size: `< 500 KB` (gzipped)
- [ ] Verify no large dependencies er inkluderet unødvendigt
- [ ] Verify code splitting fungerer korrekt

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `cd apps/web && npm run build`
- [ ] Bundle size er acceptabel (check build output)
- [ ] No large dependencies warnings

#### Manual Verification:
- [ ] Page load times er acceptable (se test cases ovenfor)
- [ ] Server Components bruges hvor muligt
- [ ] Image optimization fungerer korrekt
- [ ] Bundle size er acceptabel

**⚠️ PAUSE HERE** - Verificer performance før Phase 3

---

## Phase 3: Documentation Updates

### Overview

Opdater alle relevante dokumentation med Next.js struktur, markér migration som færdig, og dokumenter beslutninger.

### Changes Required:

#### 1. Update Frontend Guide

**File:** `.project/07-Frontend_Guide.md`  
**Changes:** Opdater guide med Next.js struktur og markér migration som færdig

**Updates:**

- [ ] Opdater "Project Setup & Environment" sektion med Next.js struktur
- [ ] Opdater "Code Organization" sektion med Next.js App Router struktur
- [ ] Tilføj note om migration er færdig
- [ ] Opdater "Nuværende struktur" til at reflektere Next.js app
- [ ] Fjern referencer til Vite setup (eller markér som deprecated)

#### 2. Update Migration Plan

**File:** `.project/08-Migration_Plan.md`  
**Changes:** Markér Fase 5 som "Completed" og tilføj completion date

**Updates:**

- [ ] Opdater Fase 5 sektion med "✅ Completed" status
- [ ] Tilføj completion date: `2025-11-27`
- [ ] Tilføj note om backup location (git branch)
- [ ] Tilføj note om cleanup steps gennemført

#### 3. Update README

**File:** `README.md` (hvis eksisterer)  
**Changes:** Opdater med nye scripts og struktur

**Updates:**

- [ ] Opdater scripts sektion (fjern `dev:legacy` reference)
- [ ] Opdater struktur beskrivelse
- [ ] Tilføj note om Next.js app er primary frontend

#### 4. Create Migration Completion Document

**File:** `.project/plans/HUD-13/migration-completion-report.md`  
**Changes:** Opret completion report med summary

**Content:**

- [ ] Migration summary (faser gennemført)
- [ ] Features verificeret
- [ ] Performance metrics
- [ ] Known issues eller limitations
- [ ] Next steps eller recommendations

### Success Criteria:

#### Automated Verification:
- [ ] Documentation files opdateret
- [ ] No broken links i documentation
- [ ] Markdown formatering korrekt

#### Manual Verification:
- [ ] Frontend guide reflekterer Next.js struktur
- [ ] Migration plan markeret som færdig
- [ ] README opdateret (hvis relevant)
- [ ] Completion report oprettet

**⚠️ PAUSE HERE** - Verificer dokumentation før Phase 4

---

## Phase 4: Backup Legacy Frontend

### Overview

Tag backup af `src/` directory før fjernelse. Brug git branch som backup metode.

### Changes Required:

#### 1. Create Backup Branch

**File:** Git branch creation  
**Changes:** Opret git branch med legacy frontend backup

**Steps:**

- [ ] Verificer alle ændringer er committed: `git status`
- [ ] Opret backup branch: `git branch backup/legacy-frontend-2025-11-27`
- [ ] Verificer backup branch eksisterer: `git branch | grep backup`
- [ ] Dokumenter backup location i completion report

**Rationale:** Git branch er bedre end arkiv fordi:
- Bevarer git historie
- Let at gendanne hvis nødvendigt
- Ingen ekstra filer i workspace
- Kan merges tilbage hvis nødvendigt

#### 2. Verify Backup Completeness

**File:** Verification  
**Changes:** Verificer backup er komplet

**Verification:**

- [ ] Checkout backup branch: `git checkout backup/legacy-frontend-2025-11-27`
- [ ] Verificer `src/` directory eksisterer
- [ ] Verificer alle filer er inkluderet
- [ ] Checkout tilbage til main branch: `git checkout main` (eller current branch)

#### 3. Document Backup Location

**File:** `.project/plans/HUD-13/migration-completion-report.md`  
**Changes:** Tilføj backup information

**Content:**

- [ ] Backup branch name: `backup/legacy-frontend-2025-11-27`
- [ ] Backup date: `2025-11-27`
- [ ] How to restore: Instructions for restoring backup hvis nødvendigt

### Success Criteria:

#### Automated Verification:
- [ ] Backup branch eksisterer: `git branch | grep backup`
- [ ] Backup branch indeholder `src/` directory
- [ ] Git log viser backup branch creation

#### Manual Verification:
- [ ] Backup branch kan checkes ud
- [ ] Alle filer er inkluderet i backup
- [ ] Backup location dokumenteret

**⚠️ PAUSE HERE** - Verificer backup før Phase 5 (KRITISK!)

---

## Phase 5: Remove Vite Frontend

### Overview

Fjern `src/` directory og opdater root workspace konfiguration efter backup er verificeret.

### Changes Required:

#### 1. Remove src/ Directory

**File:** `src/` directory removal  
**Changes:** Fjern hele `src/` directory

**Steps:**

- [ ] Verificer backup er komplet (Phase 4)
- [ ] Fjern `src/` directory: `rm -rf src/`
- [ ] Verificer `src/` er fjernet: `ls -la | grep src` (should return empty)
- [ ] Commit removal: `git add -A && git commit -m "chore: remove legacy Vite frontend (backed up in backup/legacy-frontend-2025-11-27)"`

**Rationale:** Efter backup er verificeret, kan `src/` fjernes sikkert. Dette rydder op i workspace og markerer migration som færdig.

#### 2. Update Root package.json

**File:** `package.json`  
**Changes:** Fjern `dev:legacy` script og `src` fra workspaces

**Current State:**
```json
{
  "workspaces": [
    "apps/*",
    "packages/*",
    "src"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=web",
    "dev:legacy": "npm run dev --workspace=legacy-frontend",
    ...
  }
}
```

**Desired State:**
```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=web",
    ...
  }
}
```

**Changes:**
- [ ] Fjern `"src"` fra `workspaces` array
- [ ] Fjern `"dev:legacy"` script
- [ ] Fjern `"build:legacy"` script (hvis eksisterer)
- [ ] Fjern `"preview:legacy"` script (hvis eksisterer)
- [ ] Commit changes: `git add package.json && git commit -m "chore: remove legacy frontend scripts and workspace"`

#### 3. Update .gitignore (if needed)

**File:** `.gitignore`  
**Changes:** Verificer ingen references til `src/` er nødvendige

**Verification:**

- [ ] Check `.gitignore` for `src/` references
- [ ] Fjern `src/` references hvis de eksisterer (men ikke nødvendigt da `src/` er fjernet)
- [ ] Commit hvis ændringer: `git add .gitignore && git commit -m "chore: remove src/ references from .gitignore"`

#### 4. Clean Up Unused Dependencies

**File:** Root `package.json`  
**Changes:** Verificer ingen unused dependencies

**Verification:**

- [ ] Review root `package.json` dependencies
- [ ] Fjern unused dependencies hvis nogen (men sandsynligvis ingen da root kun har devDependencies)
- [ ] Commit hvis ændringer

### Success Criteria:

#### Automated Verification:
- [ ] `src/` directory er fjernet: `ls -la | grep src` returns empty
- [ ] `package.json` opdateret (ingen `src` i workspaces, ingen `dev:legacy` script)
- [ ] Git status viser `src/` som deleted
- [ ] Build succeeds: `npm run build` (root level)

#### Manual Verification:
- [ ] `src/` directory eksisterer ikke længere
- [ ] Root `package.json` er opdateret korrekt
- [ ] Ingen broken references til `src/` i kodebase
- [ ] Git commits er korrekte

**⚠️ PAUSE HERE** - Verificer cleanup før Phase 6

---

## Phase 6: Final Verification

### Overview

Final verificering af at alt fungerer korrekt efter cleanup: build, dev scripts, tests, og CI/CD pipeline.

### Changes Required:

#### 1. Verify Dev Script

**File:** Test dev script  
**Changes:** Verificer `npm run dev` starter Next.js app korrekt

**Verification:**

- [ ] Run dev script: `npm run dev` (root level)
- [ ] Verificer Next.js app starter på `localhost:3000`
- [ ] Verificer ingen errors i console
- [ ] Verificer pages loader korrekt
- [ ] Stop dev server

#### 2. Verify Build Script

**File:** Test build script  
**Changes:** Verificer `npm run build` bygger Next.js app korrekt

**Verification:**

- [ ] Run build script: `npm run build` (root level)
- [ ] Verificer build succeeds
- [ ] Verificer ingen build errors
- [ ] Verificer output er korrekt

#### 3. Verify Tests (if exist)

**File:** Test test scripts  
**Changes:** Verificer tests passerer hvis tests eksisterer

**Verification:**

- [ ] Check om tests eksisterer: `find . -name "*.test.ts" -o -name "*.test.tsx"`
- [ ] Run tests hvis de eksisterer: `npm run test` (hvis script eksisterer)
- [ ] Verificer tests passerer

#### 4. Verify CI/CD Pipeline (if set up)

**File:** Test CI/CD pipeline  
**Changes:** Verificer CI/CD pipeline fungerer hvis sat op

**Verification:**

- [ ] Check om CI/CD pipeline er sat op: `.github/workflows/` directory
- [ ] Push changes til remote branch
- [ ] Verificer CI/CD pipeline kører korrekt
- [ ] Verificer build step succeeds
- [ ] Verificer test step succeeds (hvis tests eksisterer)
- [ ] Verificer deploy step succeeds (hvis deploy er sat op)

#### 5. Verify No References to src/

**File:** Final verification  
**Changes:** Verificer ingen references til `src/` eksisterer i kodebase

**Verification:**

- [ ] Search for `src/` references: `grep -r "src/" . --exclude-dir=node_modules --exclude-dir=.git`
- [ ] Verificer ingen matches (eller kun i documentation/comments hvis relevant)
- [ ] Verificer alle imports peger på korrekte paths (`@/` eller relative paths)

### Success Criteria:

#### Automated Verification:
- [ ] Dev script fungerer: `npm run dev` starter Next.js app
- [ ] Build script fungerer: `npm run build` succeeds
- [ ] Tests passerer (hvis tests eksisterer)
- [ ] CI/CD pipeline fungerer (hvis sat op)
- [ ] Ingen references til `src/` i kodebase

#### Manual Verification:
- [ ] Next.js app kører korrekt i dev mode
- [ ] Next.js app bygger korrekt
- [ ] Alle pages loader korrekt
- [ ] Ingen console errors eller warnings
- [ ] CI/CD pipeline kører korrekt (hvis sat op)

**⚠️ PAUSE HERE** - Verificer alt fungerer før Phase 7

---

## Phase 7: Git Cleanup

### Overview

Commit alle ændringer, tag commit som "migration-complete", og opret release notes hvis relevant.

### Changes Required:

#### 1. Commit All Changes

**File:** Git commit  
**Changes:** Commit alle ændringer fra Phase 1-6

**Steps:**

- [ ] Verificer git status: `git status`
- [ ] Stage alle ændringer: `git add -A`
- [ ] Commit med beskrivende message: `git commit -m "chore(HUD-13): complete frontend migration cleanup and verification

- Verified all features migrated and working
- Updated documentation (Frontend Guide, Migration Plan)
- Backed up legacy frontend in backup/legacy-frontend-2025-11-27
- Removed src/ directory and legacy scripts
- Updated root workspace configuration
- All tests passing, build succeeds"`

#### 2. Tag Commit as Migration Complete

**File:** Git tag  
**Changes:** Tag commit som "migration-complete"

**Steps:**

- [ ] Create tag: `git tag -a migration-complete -m "Frontend migration from Vite to Next.js completed

All features migrated and verified.
Legacy frontend backed up in backup/legacy-frontend-2025-11-27.
Documentation updated.
Migration phase 5 (HUD-13) complete."`
- [ ] Verificer tag eksisterer: `git tag | grep migration-complete`
- [ ] Push tag til remote: `git push origin migration-complete` (hvis remote eksisterer)

#### 3. Create Release Notes (if relevant)

**File:** `.project/plans/HUD-13/RELEASE-NOTES.md`  
**Changes:** Opret release notes hvis relevant

**Content:**

- [ ] Migration completion summary
- [ ] Features migrated
- [ ] Breaking changes (hvis nogen)
- [ ] Migration guide for team members
- [ ] Next steps

### Success Criteria:

#### Automated Verification:
- [ ] All changes committed: `git status` shows clean working directory
- [ ] Tag created: `git tag | grep migration-complete`
- [ ] Git log viser migration commit

#### Manual Verification:
- [ ] Commit message er beskrivende
- [ ] Tag message er beskrivende
- [ ] Release notes oprettet (hvis relevant)

**✅ PHASE COMPLETE** - Migration cleanup og verificering færdig!

---

## Testing Strategy

### Unit Tests

- [ ] Test Next.js app build process
- [ ] Test type checking
- [ ] Test linting

### Integration Tests

- [ ] Test dev server startup
- [ ] Test build process
- [ ] Test CI/CD pipeline (hvis sat op)

### Manual Tests

- [ ] Test alle pages fungerer korrekt
- [ ] Test alle komponenter fungerer korrekt
- [ ] Test alle API endpoints fungerer korrekt
- [ ] Test auth flow fungerer korrekt
- [ ] Test navigation fungerer korrekt
- [ ] Test forms fungerer korrekt
- [ ] Test performance er acceptabel

### End-to-End Tests

- [ ] Test complete user flows:
  - [ ] Sign up → Upload jersey → List for sale
  - [ ] Browse marketplace → View jersey → Place bid
  - [ ] Create post → View in feed → Comment
  - [ ] Send message → View conversation

---

## Rollback Strategy

Hvis noget går galt under cleanup:

1. **Hvis backup ikke er taget:**
   - Stop cleanup process
   - Tag backup først (Phase 4)
   - Fortsæt med cleanup

2. **Hvis `src/` er fjernet før backup:**
   - Checkout backup branch: `git checkout backup/legacy-frontend-2025-11-27`
   - Copy `src/` tilbage: `cp -r src/ ../src-restored/`
   - Checkout tilbage til main branch
   - Move `src/` tilbage: `mv ../src-restored src/`
   - Tag backup først, derefter fortsæt cleanup

3. **Hvis build fejler efter cleanup:**
   - Check git log for breaking changes
   - Revert breaking commits: `git revert <commit-hash>`
   - Fix issues og commit fixes

4. **Hvis CI/CD pipeline fejler:**
   - Check CI/CD logs for errors
   - Fix issues i kode
   - Push fixes og verificer pipeline succeeds

---

## References

- **Linear Issue:** [HUD-13](https://linear.app/huddle-world/issue/HUD-13/fase-5-cleanup-og-verificering)
- **Migration Plan:** `.project/08-Migration_Plan.md`
- **Frontend Guide:** `.project/07-Frontend_Guide.md`
- **Previous Migration Phases:**
  - HUD-5: Fase 1 - Opret monorepo struktur
  - HUD-6: Fase 2 - Setup Next.js app
  - HUD-7: Fase 3.1 - Migrer UI komponenter
  - HUD-8: Fase 3.2 - Migrer Supabase client
  - HUD-9: Fase 3.3 - Migrer domain komponenter
  - HUD-10: Fase 3.4 - Migrer pages
  - HUD-11: Fase 4 - Opret backend API routes (hvis relevant)
  - HUD-12: Fase 4 verification (hvis relevant)

---

## Notes

- **VIGTIGT:** Tag backup FØR fjernelse af `src/` (Phase 4 er kritisk!)
- Verificer ALT fungerer før cleanup (Phase 1-3 er vigtige!)
- Dokumenter eventuelle known issues eller limitations
- Migration er færdig når denne issue er lukket

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Mist eksisterende arbejde | Backup først (Phase 4) - git branch backup |
| Breaking changes efter cleanup | Grundig testing før cleanup (Phase 1-3) |
| Missing features | Feature checklist (Phase 1) |
| Build fejler efter cleanup | Test build før cleanup (Phase 6) |
| CI/CD pipeline fejler | Test pipeline før cleanup (Phase 6) |

---

## Timeline Estimate

- **Phase 1 (Feature Verification):** 2-3 timer
- **Phase 2 (Performance Verification):** 1-2 timer
- **Phase 3 (Documentation Updates):** 1-2 timer
- **Phase 4 (Backup Legacy Frontend):** 15-30 minutter
- **Phase 5 (Remove Vite Frontend):** 30-60 minutter
- **Phase 6 (Final Verification):** 1-2 timer
- **Phase 7 (Git Cleanup):** 15-30 minutter

**Total:** ~6-11 timer

---

**Plan Created:** 2025-11-27  
**Status:** Ready for execution  
**Next Step:** Start Phase 1 - Feature Verification

