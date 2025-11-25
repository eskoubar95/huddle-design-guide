# Execute Plan Phase

**Goal:** Implement one phase of an implementation plan, verify completion, then pause for approval before continuing.

**Inspiration:** Adapted from [HumanLayer's implement_plan.md](https://raw.githubusercontent.com/humanlayer/humanlayer/refs/heads/main/.claude/commands/implement_plan.md)

**Context:**
- Executes implementation plans created by `/create-implementation-plan`
- Phase-by-phase implementation with verification checkpoints
- PAUSE between phases for manual testing and approval
- Updates Linear with progress via MCP

---

## Usage

```
/execute-plan-phase [plan-file] [phase-number]
```

**Examples:**
```
/execute-plan-phase 2025-10-20-BS-152-product-catalog-filtering.md 1
/execute-plan-phase BS-152-product-catalog-filtering.md 2
```

**Parameters:**
- `plan-file`: Filename in `.project/plans/` (with or without path)
- `phase-number`: Which phase to implement (1, 2, 3, etc.)

---

## Process Overview

1. **Read Plan** - Load and parse implementation plan
2. **Display Phase** - Show what will be implemented
3. **Implement** - Generate code for phase changes
4. **Automated Verification** - Run all automated checks
5. **Manual Verification** - Pause for human testing
6. **Linear Update** - Post progress (optional)
7. **Next Phase** - Offer to continue or stop

---

## Step 1: Read Plan

**I will:**

### A. Locate Plan File

```
Reading plan: `.project/plans/2025-10-20-BS-152-product-catalog-filtering.md`
```

If file not found, I'll:
- List available plans in `.project/plans/`
- Ask you to specify the correct file

### B. Parse Plan Structure

Extract:
- Linear issue ID
- Total number of phases
- Current phase details
- Success criteria (automated + manual)
- Related files and dependencies

### C. Verify Phase Number

```
✅ Plan loaded: Product Catalog Filtering
📊 Total phases: 4
🎯 Executing: Phase 1 of 4
```

If phase number invalid:
```
❌ Phase 5 not found. This plan has 4 phases.
Available: 1, 2, 3, 4
```

---

## Step 2: Display Phase Overview

**I will show:**

```
## Phase 1: Zustand Filter Store

### Overview:
Create client-side state management for product filters using Zustand.
This provides the foundation for filter UI and API integration.

### Changes Required:

#### 1. Create Filter Store
**File:** `lib/stores/filter-store.ts` (new file)
**Changes:** Create Zustand store with filter state and actions

#### 2. Define Filter Types
**File:** `lib/types/filters.ts` (new file)
**Changes:** TypeScript types for filters

#### 3. Add Store to Layout
**File:** `app/layout.tsx`
**Changes:** Initialize store provider

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Unit tests pass: `npm run test`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Store can be imported and used
- [ ] Filter actions update state correctly
- [ ] No console errors in dev mode

**⚠️ PAUSE POINT:** Manual approval required before Phase 2

---

Ready to implement Phase 1? (y/n)
```

If you say no, I'll stop and wait for instructions.

---

## Step 3: Implement Phase Changes

**After your approval, I will:**

### A. Create/Modify Files

For each file in the phase:

```
Creating: `lib/stores/filter-store.ts`
```

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface FilterState {
  category: string | null
  minPrice: number | null
  maxPrice: number | null
  searchQuery: string
  setCategory: (category: string | null) => void
  setPriceRange: (min: number | null, max: number | null) => void
  setSearchQuery: (query: string) => void
  clearFilters: () => void
}

export const useFilterStore = create<FilterState>()(
  devtools(
    (set) => ({
      category: null,
      minPrice: null,
      maxPrice: null,
      searchQuery: '',
      setCategory: (category) => set({ category }),
      setPriceRange: (min, max) => set({ minPrice: min, maxPrice: max }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      clearFilters: () =>
        set({
          category: null,
          minPrice: null,
          maxPrice: null,
          searchQuery: '',
        }),
    }),
    { name: 'FilterStore' }
  )
)
```

```
✅ Created: lib/stores/filter-store.ts

Creating: `lib/types/filters.ts`
```

[Continue for all files in phase...]

### B. Explain Changes

```
## Implementation Summary:

**Created Files:**
- `lib/stores/filter-store.ts` - Zustand store for filter state
- `lib/types/filters.ts` - Filter type definitions

**Modified Files:**
- None in this phase

**Key Decisions:**
- Used Zustand devtools for debugging
- Kept filter state simple with nullable types
- Included clearFilters action for reset functionality
- Store is lightweight and ready for Phase 2 UI integration
```

---

## Step 4: Automated Verification

**I will guide you through running checks:**

```
## Automated Verification

Let's verify the implementation meets automated criteria.

### Run These Commands:

1. Type Check:
```bash
npm run type-check
```
Expected: ✅ No errors

2. Lint:
```bash
npm run lint
```
Expected: ✅ No warnings or errors

3. Unit Tests:
```bash
npm run test
```
Expected: ✅ All tests pass

4. Build:
```bash
npm run build
```
Expected: ✅ Build succeeds

---

**Please run these commands and report results.**

If any fail, I'll help debug and fix issues.
```

### A. If Checks Pass

```
✅ All automated checks passed!

**Results:**
- ✅ Type check: No errors
- ✅ Lint: Clean
- ✅ Tests: All passing
- ✅ Build: Success

Moving to manual verification...
```

### B. If Checks Fail

```
❌ Automated checks failed

**Issues Found:**
- Type error in `lib/stores/filter-store.ts:15` - Property 'category' missing
- Lint warning: Unused import in `lib/types/filters.ts`

Let me fix these issues...

[Fixes applied]

Please re-run: `npm run type-check && npm run lint`
```

I'll iterate until all automated checks pass.

---

## Step 5: Manual Verification

**Critical pause point:**

```
## Manual Verification Required

**⚠️ PAUSE - Human Testing Needed**

Please test the following:

### Manual Checks:

1. **Store Import Test**
   - [ ] Open dev server: `npm run dev`
   - [ ] Import store in a test component
   - [ ] Verify no console errors

2. **State Management Test**
   - [ ] Call `setCategory('electronics')`
   - [ ] Verify state updates in React DevTools
   - [ ] Call `clearFilters()`
   - [ ] Verify state resets

3. **DevTools Test**
   - [ ] Open Redux DevTools
   - [ ] Verify "FilterStore" appears
   - [ ] Verify actions are logged

---

**Have you completed manual testing?**

Results:
- All tests passed? (y/n)
- Any issues found? (describe)
```

### A. If Manual Tests Pass

```
✅ Phase 1 Complete!

**Phase 1: Zustand Filter Store** ✅
- Automated verification: ✅ Passed
- Manual verification: ✅ Passed

---

## Next Steps:

**Option 1:** Continue to Phase 2
/execute-plan-phase [same-file] 2

**Option 2:** Update Linear with progress
/update-linear-status BS-152

**Option 3:** Create PR for Phase 1
/prepare-pr

What would you like to do next?
```

### B. If Manual Tests Fail

```
❌ Manual tests failed

**Issues reported:**
- [Issue description]

Let me investigate and fix...

[Analysis and fixes]

Please re-test and confirm results.
```

---

## Step 6: Update Linear (Optional)

**Offer to post progress:**

```
Would you like to post progress update to Linear BS-152? (y/n)

Update will include:
- Phase 1 completed
- Automated checks passed
- Manual testing completed
- Link to commits/files changed
- Next phase: Phase 2 - UI Components
```

If yes, use `mcp_Linear_create_comment`:

```
✅ Posted to Linear BS-152:

---
### Phase 1 Complete: Zustand Filter Store

**Status:** ✅ Completed

**Automated Verification:**
- ✅ Type check passed
- ✅ Lint passed
- ✅ Tests passed
- ✅ Build passed

**Manual Verification:**
- ✅ Store working correctly
- ✅ State management functional
- ✅ DevTools integration confirmed

**Files Changed:**
- `lib/stores/filter-store.ts` (new)
- `lib/types/filters.ts` (new)

**Next:** Phase 2 - UI Components

---
```

---

## Step 7: Continue or Pause

**Present options:**

```
## Phase 1 Status: ✅ Complete

**Progress:** 1/4 phases (25%)

**Options:**

1. **Continue immediately** to Phase 2
   - Implement UI components
   - Estimated: ~200 LOC
   - Time: ~30-45 min

2. **Pause and commit** Phase 1 separately
   - Smaller, reviewable commit
   - Can test Phase 1 in isolation
   - Safer for critical changes

3. **Review plan** before continuing
   - Validate remaining phases
   - Adjust approach if needed

What would you like to do?
```

---

## Important Principles

### 1. One Phase at a Time
- NEVER implement multiple phases at once
- Each phase must pass all checks before next
- Allows incremental progress and early feedback

### 2. Pause Points Are Mandatory
- Always pause for manual verification
- Don't proceed without explicit approval
- Catch UX/integration issues early

### 3. Automated Checks First
- Run all automated checks before manual testing
- Fix issues immediately
- Don't waste time on manual testing if code doesn't compile

### 4. Clear Communication
- Show exactly what will change
- Explain key decisions
- Report status clearly (✅/❌)

### 5. Flexibility
- If plan needs adjustment mid-implementation, stop and update plan
- If unexpected issues arise, discuss before proceeding
- Can always pause, commit, and resume later

---

## Error Handling

### If Plan File Missing:

```
❌ Plan not found: `.project/plans/2025-10-20-BS-152.md`

**Available plans:**
1. 2025-10-20-BS-152-product-catalog-filtering.md
2. 2025-10-19-BS-151-checkout-flow.md
3. 2025-10-18-refactor-cart.md

Which plan would you like to execute?
```

### If Phase Already Complete:

```
⚠️ Phase 1 appears already implemented

**Evidence:**
- File exists: `lib/stores/filter-store.ts`
- Tests pass
- Matches plan specifications

**Options:**
1. Skip to Phase 2
2. Re-implement Phase 1 (will overwrite)
3. Review and adjust plan

What would you like to do?
```

### If Dependencies Missing:

```
❌ Cannot implement Phase 2

**Missing dependencies from Phase 1:**
- `lib/stores/filter-store.ts` not found
- Phase 1 success criteria not met

Please complete Phase 1 first:
/execute-plan-phase [file] 1
```

---

## Tips for Best Results

1. **Complete phases in order** - Don't skip ahead
2. **Test thoroughly at each pause** - Catch issues early
3. **Commit after each phase** - Easier rollback if needed
4. **Update Linear regularly** - Keep stakeholders informed
5. **Trust the process** - Pause points prevent big mistakes

---

## Related Commands

- `/create-implementation-plan` - Create the plan first
- `/validate-plan` - Review plan before starting
- `/update-linear-status` - Post updates to Linear
- `/prepare-pr` - When ready to create PR
- `/code-review` - Review implemented phase

