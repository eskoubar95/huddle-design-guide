# PR Size Analyzer

**Goal:** Analyze PR size and suggest logical splits if too large for effective review.

**Context:**
- Target: < 400 LOC, < 20 files (per Beauty Shop standards)
- Large PRs reduce review quality and increase risk
- Provides actionable split suggestions
- Helps maintain reviewable PRs

---

## Usage

```
/pr-size-analyzer
/pr-size-analyzer --suggest-split
/pr-size-analyzer --base develop
```

---

## Analysis Process

### Step 1: Calculate Metrics

```
Analyzing changes: feature/BS-152-product-catalog vs main...

## Size Metrics

**Lines of Code:**
- Added: +427
- Deleted: -89
- Net change: +338 LOC

**Files:**
- Total changed: 12
- New files: 6
- Modified files: 5
- Deleted files: 1

**Commits:**
- Total: 4 commits
- Merge commits: 0
```

### Step 2: Assess Size

**Good (< 400 LOC, < 20 files):**
```
✅ PR Size: GOOD

Your PR is within recommended limits:
- LOC: 338 / 400 (85%) ✅
- Files: 12 / 20 (60%) ✅

**Review Estimate:** 20-30 minutes
**Merge Confidence:** High

No split needed. Proceed with `/create-pr-with-linear BS-XXX`
```

**Large (400-800 LOC or 20-40 files):**
```
⚠️ PR Size: LARGE

Your PR exceeds recommended size:
- LOC: 627 / 400 (157%) ⚠️
- Files: 18 / 20 (90%) ⚠️

**Review Estimate:** 45-60 minutes
**Merge Confidence:** Medium
**Risk:** Reviewers may miss issues

**Recommendations:**
1. Split into 2 PRs (see suggestions below)
2. OR add extra detail to PR description
3. OR request 2+ reviewers

Continue with large PR? (y/n)
```

**Too Large (> 800 LOC or > 40 files):**
```
❌ PR Size: TOO LARGE

Your PR is too large for effective review:
- LOC: 1,247 / 400 (312%) ❌
- Files: 34 / 20 (170%) ❌

**Review Estimate:** 2-3 hours
**Merge Confidence:** Low
**Risk:** High chance of bugs slipping through

**Recommendation:** MUST split into smaller PRs

See split suggestions below.
```

---

## Step 3: File Breakdown

```
## Breakdown by Category

**Backend/Logic:** 385 LOC (61%)
- lib/stores/filter-store.ts: +142
- lib/services/products/filter-products.ts: +98
- lib/types/filters.ts: +45
- lib/utils/url-params.ts: +67
- lib/hooks/useFilterState.ts: +33

**Frontend/UI:** 167 LOC (27%)
- components/filters/FilterSidebar.tsx: +89
- components/filters/CategoryFilter.tsx: +38
- components/filters/PriceRangeFilter.tsx: +40

**Tests:** 95 LOC (15%)
- lib/stores/filter-store.test.ts: +62
- components/filters/FilterSidebar.test.tsx: +33

**Config/Docs:** 15 LOC (2%)
- README.md: +12
- package.json: +3
```

---

## Step 4: Split Suggestions

**For Large PRs:**

```
## Suggested Split (2 PRs)

### PR 1: Backend & State Management (Foundation)
**LOC:** ~285 (46%)
**Files:** 7
**Estimated Review:** 25-30 min

**Includes:**
- lib/stores/filter-store.ts
- lib/services/products/filter-products.ts
- lib/types/filters.ts
- lib/utils/url-params.ts
- lib/hooks/useFilterState.ts
- Tests for above
- package.json updates

**Rationale:** 
- Foundation that UI depends on
- Can be reviewed/merged independently
- Tests provide confidence

**Branch:** `feature/BS-152-backend`

---

### PR 2: UI Components (Depends on PR 1)
**LOC:** ~167 (27%)
**Files:** 5
**Estimated Review:** 15-20 min

**Includes:**
- components/filters/FilterSidebar.tsx
- components/filters/CategoryFilter.tsx
- components/filters/PriceRangeFilter.tsx
- Component tests
- README updates

**Rationale:**
- Clear separation from backend
- Depends on PR 1 being merged
- Easier to review UI in isolation

**Branch:** `feature/BS-152-ui`

---

**Benefits of Split:**
- ✅ Each PR < 400 LOC
- ✅ Clear separation of concerns
- ✅ Faster reviews (2x 20min vs 1x 60min)
- ✅ Can merge foundation early
- ✅ Easier to revert if issues

**Drawbacks:**
- ⚠️ Requires 2 review cycles
- ⚠️ PR 2 waits for PR 1 merge
- ⚠️ Slightly more overhead

**Recommendation:** Split for better review quality
```

**For Very Large PRs (> 800 LOC):**

```
## Suggested Split (3-4 PRs)

### PR 1: Types & Utilities
**LOC:** ~112
**Branch:** `feature/BS-152-types`

**Includes:**
- lib/types/filters.ts
- lib/utils/url-params.ts
- Unit tests

**Rationale:** Foundation with zero dependencies

---

### PR 2: State Management (Depends on PR 1)
**LOC:** ~175
**Branch:** `feature/BS-152-store`

**Includes:**
- lib/stores/filter-store.ts
- lib/hooks/useFilterState.ts
- Store tests

**Rationale:** Core state logic, depends on types

---

### PR 3: API Integration (Depends on PR 1)
**LOC:** ~98
**Branch:** `feature/BS-152-api`

**Includes:**
- lib/services/products/filter-products.ts
- API integration tests

**Rationale:** Can be reviewed parallel to PR 2

---

### PR 4: UI Components (Depends on PR 2 & 3)
**LOC:** ~227
**Branch:** `feature/BS-152-ui`

**Includes:**
- All component files
- Component tests
- README updates

**Rationale:** Final integration, depends on all others

---

**Timeline:**
1. Week 1: Submit PR 1 → Merge
2. Week 1: Submit PR 2 & 3 (parallel) → Merge
3. Week 2: Submit PR 4 → Merge

**Total Time:** Similar to one large PR, but higher quality
```

---

## Step 5: Commit Analysis

```
## Commit Organization

Your 4 commits could be reorganized:

**Current:**
1. feat(filters): add store (142 LOC)
2. feat(filters): add UI (167 LOC)
3. feat(filters): API integration (98 LOC)
4. test: add tests + docs (95 LOC)

**Suggested for Split:**

**PR 1 (Backend):**
1. feat(filters): add types and utils
2. feat(filters): add Zustand store
3. feat(filters): add API integration
4. test(filters): add backend tests

**PR 2 (Frontend):**
1. feat(filters): add filter sidebar
2. feat(filters): add filter components
3. test(filters): add component tests
4. docs: update README

**Action:**
Use cherry-pick to reorganize:
```bash
git checkout main
git checkout -b feature/BS-152-backend
git cherry-pick <commit-1> <commit-3> <parts-of-commit-4>
```
```

---

## Complexity Scoring

```
## Complexity Analysis

**Overall Complexity:** Medium-High

**Factors:**
- Multi-file changes: Medium (12 files)
- New patterns introduced: Low (follows existing)
- External integrations: Medium (MedusaJS API)
- Test coverage: High (95%)
- Documentation: Good

**Cognitive Load for Reviewer:**
- Understanding time: 15-20 min
- Review time: 30-40 min
- Total: ~50-60 min

**Recommendation:** 
Split reduces cognitive load to 2x 25min sessions = easier reviews
```

---

## Auto-Split (Experimental)

```
/pr-size-analyzer --auto-split
```

**I will:**
1. Analyze dependencies between files
2. Create logical groupings
3. Generate new branches
4. Cherry-pick commits
5. Push branches
6. Provide PR commands for each

**Warning:** Requires careful review of splits before creating PRs

---

## Tips

### Keep PRs Small:
1. **Plan ahead:** Use `/create-implementation-plan` to define phases
2. **Commit strategically:** One logical change per commit
3. **Branch per phase:** Separate branches for foundation vs features
4. **Incremental merge:** Merge phases as completed

### When to Split:
- ✅ Clear separation (backend vs frontend)
- ✅ Dependencies are linear (A → B → C)
- ✅ Each part is independently testable

### When NOT to Split:
- ❌ Tightly coupled changes
- ❌ Emergency hotfixes
- ❌ Refactoring (all-or-nothing)

---

## Related Commands

- `/prepare-pr` - Check size before creating PR
- `/create-pr-with-linear` - Create PR (warns if too large)
- `/validate-commits` - Organize commits for easier splitting

