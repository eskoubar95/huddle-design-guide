# [Feature Name] - Multi-Agent Implementation Plan

## Overview

[Kort beskrivelse af feature og hvorfor den er vigtig]

**Hvorfor:** [Forretningsbegrundelse]

**Mål:** [Konkret målbart resultat]

---

## Linear Issue

**Issue:** [HUD-XXX](linear-link)  
**Status:** [Backlog/In Progress/Review]  
**Priority:** [1-4]  
**Labels:** [Feature/Fix/Chore, Domain]  
**Team:** Huddle World  
**Branch:** `feature/huddle-XXX-feature-name`  
**Created:** YYYY-MM-DD  
**Research:** [Link til research doc hvis relevant]

---

## Agent Assignment

| Phase | Agent | Scope | LOC | Status |
|-------|-------|-------|-----|--------|
| Phase 1 | database | `supabase/migrations/` | ~200 | ⏳ Pending |
| Phase 2 | backend | `supabase/functions/`, `apps/web/app/api/` | ~350 | ⏳ Pending |
| Phase 3 | frontend | `apps/web/components/`, `apps/web/hooks/` | ~400 | ⏳ Pending |
| Phase 4 | testing | `**/*.test.ts` | ~300 | ⏳ Pending |

**Total Estimated LOC:** ~1250

**Critical Dependencies:**
- Phase 2 → blocked by Phase 1 (needs schema)
- Phase 3 → blocked by Phase 1 (needs types), parallel with Phase 2 (use mocks)
- Phase 4 → blocked by all (needs complete implementation)

**Execution Strategy:**
```
1. Database agent (sekventiel)
   ↓
2. Backend agent + Frontend agent (parallel med mocks)
   ↓
3. Testing agent (sekventiel)
```

---

## Current State Analysis

### Nuværende Tilstand:

[Beskriv hvad der eksisterer i dag med code references]

### Key Discoveries:

1. [Discovery 1]
2. [Discovery 2]
3. [Discovery 3]

---

## Desired End State

[Beskriv den ønskede tilstand efter implementering]

---

## What We're NOT Doing

[Explicit scope guard - hvad er IKKE inkluderet]

**Reasons:**
- [Rationale for excluded scope]

**Deferred to:**
- [Link til future issue hvis relevant]

---

## Phase 1: Database Schema

### Agent: `database`
### Branch: `feature/huddle-XXX-feature-name-database`
### Estimated LOC: ~200

### Overview:
[Beskriv schema ændringer]

### Changes Required:

#### 1.1 Create [table_name] Table
**File:** `supabase/migrations/YYYYMMDDHHMMSS_create_table_name.sql`

```sql
CREATE TABLE public.table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns here
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 1.2 Add RLS Policies
**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_table_name_rls.sql`

```sql
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Policy examples
CREATE POLICY "Users can view own records"
  ON public.table_name FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

#### 1.3 Create Indexes
**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_table_name_indexes.sql`

```sql
CREATE INDEX idx_table_name_user_id ON public.table_name(user_id);
```

### Success Criteria:

**Automated:**
- [ ] `supabase db reset` succeeds
- [ ] `supabase migration up` applies cleanly
- [ ] `supabase migration down` rolls back cleanly
- [ ] TypeScript types generated successfully

**Manual (database agent må udføre):**
- [ ] RLS policies tested (authenticated user has access)
- [ ] RLS policies tested (unauthenticated user blocked)
- [ ] Foreign key constraints work correctly

### ⚠️ PAUSE - Human Approval Required
Schema changes kan være breaking. Review migrations før andre agents starter.

**Post-Phase Actions:**
1. Generate TypeScript types: `supabase gen types typescript --local > apps/web/lib/db/database.types.ts`
2. Commit to `feature/huddle-XXX-feature-name-database`
3. Update this plan: Status → ✅ Complete
4. Notify Backend + Frontend agents (types ready)

---

## Phase 2: Backend Implementation

### Agent: `backend`
### Branch: `feature/huddle-XXX-feature-name-backend`
### Estimated LOC: ~350
### Dependencies: Phase 1 (✅ types ready)

### Overview:
[Beskriv backend logic og API endpoints]

### Changes Required:

#### 2.1 Service Layer
**File:** `apps/web/lib/services/feature-service.ts` (new)

```typescript
export async function createFeature(data: CreateFeatureDTO) {
  // Business logic
}
```

#### 2.2 Repository Layer
**File:** `apps/web/lib/repositories/feature-repository.ts` (new)

```typescript
export async function insertFeature(supabase, data) {
  // Data access
}
```

#### 2.3 API Route
**File:** `apps/web/app/api/v1/features/route.ts` (new)

```typescript
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  // Handle request
}
```

#### 2.4 Edge Function (hvis relevant)
**File:** `supabase/functions/process-feature/index.ts` (new)

```typescript
Deno.serve(async (req) => {
  // Edge function logic
});
```

### Success Criteria:

**Automated:**
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run test -- apps/web/lib/services/**` passes
- [ ] `npm run build` succeeds

**Manual (backend agent må udføre):**
- [ ] API endpoint returns expected response (test med curl/Postman)
- [ ] Error cases return proper error messages
- [ ] Auth middleware works (401 if unauthorized)
- [ ] Validation rejects invalid input

### ⚠️ PAUSE - Manual Testing Required
Test API endpoints før Frontend agent integrerer.

**Post-Phase Actions:**
1. Commit to `feature/huddle-XXX-feature-name-backend`
2. Update this plan: Status → ✅ Complete
3. Notify Frontend agent (API ready)

---

## Phase 3: Frontend Implementation

### Agent: `frontend`
### Branch: `feature/huddle-XXX-feature-name-frontend`
### Estimated LOC: ~400
### Dependencies: Phase 1 (✅ types), Phase 2 (⚠️ kan starte med mocks)

### Overview:
[Beskriv UI komponenter og user flows]

### Changes Required:

#### 3.1 Component
**File:** `apps/web/components/feature/FeatureComponent.tsx` (new)

```tsx
export function FeatureComponent() {
  return <div>Component</div>;
}
```

#### 3.2 Hook
**File:** `apps/web/hooks/use-feature.ts` (new)

```typescript
export function useFeature() {
  // Custom hook logic
}
```

#### 3.3 Page
**File:** `apps/web/app/(dashboard)/feature/page.tsx` (new)

```tsx
export default function FeaturePage() {
  return <FeatureComponent />;
}
```

#### 3.4 Validation Schema
**File:** `apps/web/lib/validation/feature-schema.ts` (new)

```typescript
export const featureSchema = z.object({
  // Zod schema
});
```

### Success Criteria:

**Automated:**
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run test -- apps/web/components/feature/**` passes
- [ ] `npm run build` succeeds

**Manual (frontend agent må udføre):**
- [ ] Component renders without errors
- [ ] Form validation shows errors correctly
- [ ] Successful submission shows success message
- [ ] Loading states work correctly
- [ ] Mobile responsive (test at 375px width)

### ⚠️ PAUSE - Manual Testing Required
Test user flows i browser.

**Post-Phase Actions:**
1. Commit to `feature/huddle-XXX-feature-name-frontend`
2. Update this plan: Status → ✅ Complete
3. Notify Testing agent (ready for integration tests)

---

## Phase 4: Testing & Quality Assurance

### Agent: `testing`
### Branch: `feature/huddle-XXX-feature-name-testing`
### Estimated LOC: ~300
### Dependencies: Phase 1, 2, 3 (all ✅)

### Overview:
[Beskriv test strategi]

### Changes Required:

#### 4.1 Service Unit Tests
**File:** `apps/web/lib/services/feature-service.test.ts` (new)

```typescript
describe('FeatureService', () => {
  it('should create feature', async () => {
    // Test logic
  });
});
```

#### 4.2 API Integration Tests
**File:** `apps/web/app/api/v1/features/route.test.ts` (new)

```typescript
describe('POST /api/v1/features', () => {
  it('should return 200 on success', async () => {
    // Test logic
  });
});
```

#### 4.3 Component Tests
**File:** `apps/web/components/feature/FeatureComponent.test.tsx` (new)

```typescript
describe('FeatureComponent', () => {
  it('should render correctly', () => {
    // Test logic
  });
});
```

#### 4.4 E2E Tests (hvis kritisk)
**File:** `integration-tests/e2e/feature-flow.spec.ts` (new)

```typescript
describe('Feature Flow', () => {
  it('should complete full flow', async () => {
    // Playwright test
  });
});
```

### Success Criteria:

**Automated:**
- [ ] `npm run test -- --coverage` shows >80% coverage
- [ ] `npm run test:integration` passes
- [ ] All tests green i CI

**Manual (testing agent må udføre):**
- [ ] Edge cases covered (validation, errors, edge cases)
- [ ] Concurrent operations tested (race conditions)
- [ ] Performance acceptable (< 500ms response time)

### ⚠️ PAUSE - Quality Gate
All tests must pass før PR creation.

**Post-Phase Actions:**
1. Commit to `feature/huddle-XXX-feature-name-testing`
2. Update this plan: Status → ✅ Complete

---

## Integration & Merge Strategy

### Branch Merge Order:
```
1. Merge database branch → main
   ↓
2. Merge backend branch → main
   ↓
3. Merge frontend branch → main
   ↓
4. Merge testing branch → main
```

**Alternative (recommended):** Merge all branches into a single feature branch first, then create ONE PR to main.

```bash
# Cursor (human) koordinerer:
git checkout -b feature/huddle-XXX-feature-name
git merge feature/huddle-XXX-feature-name-database
git merge feature/huddle-XXX-feature-name-backend
git merge feature/huddle-XXX-feature-name-frontend
git merge feature/huddle-XXX-feature-name-testing

# Resolve conflicts if any
# Test locally
# Create single PR
```

---

## Rollback Plan

### If Phase 1 (Database) Fails:
```sql
-- Rollback migration
supabase migration down
```

### If Phase 2 (Backend) Fails:
```bash
# Revert commits
git checkout feature/huddle-XXX-feature-name-backend
git reset --hard {last-good-commit}
```

### If Phase 3 (Frontend) Fails:
```bash
# Revert commits
git checkout feature/huddle-XXX-feature-name-frontend
git reset --hard {last-good-commit}
```

### If Production Issue Post-Merge:
```bash
# Revert entire feature
git revert {merge-commit-sha}
```

---

## Agent Communication Log

### Database Agent:
- [ ] Phase 1 started: YYYY-MM-DD HH:MM
- [ ] Schema created: YYYY-MM-DD HH:MM
- [ ] RLS policies tested: YYYY-MM-DD HH:MM
- [ ] Types generated: YYYY-MM-DD HH:MM
- [ ] Phase 1 complete: YYYY-MM-DD HH:MM

### Backend Agent:
- [ ] Phase 2 started: YYYY-MM-DD HH:MM
- [ ] Waiting for types: ⏳
- [ ] Types received: ✅
- [ ] API implemented: YYYY-MM-DD HH:MM
- [ ] Manual testing complete: YYYY-MM-DD HH:MM
- [ ] Phase 2 complete: YYYY-MM-DD HH:MM

### Frontend Agent:
- [ ] Phase 3 started: YYYY-MM-DD HH:MM
- [ ] Waiting for types: ⏳
- [ ] Types received: ✅
- [ ] Using API mocks: ⚠️ (backend not ready)
- [ ] API integrated: ✅ (backend ready)
- [ ] Manual testing complete: YYYY-MM-DD HH:MM
- [ ] Phase 3 complete: YYYY-MM-DD HH:MM

### Testing Agent:
- [ ] Phase 4 started: YYYY-MM-DD HH:MM
- [ ] Unit tests written: YYYY-MM-DD HH:MM
- [ ] Integration tests written: YYYY-MM-DD HH:MM
- [ ] All tests passing: YYYY-MM-DD HH:MM
- [ ] Phase 4 complete: YYYY-MM-DD HH:MM

---

## References

- Linear Issue: [HUD-XXX](linear-link)
- Research Doc: [Link hvis relevant]
- Figma Design: [Link hvis relevant]
- Related PRs: [Links]
- Discussion: [Slack thread link]

---

**Created:** YYYY-MM-DD  
**Last Updated:** YYYY-MM-DD  
**Plan Author:** [Dit navn via Cursor]  
**Agents:** database, backend, frontend, testing

