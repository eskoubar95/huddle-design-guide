# Prepare Pull Request

**Goal:** Pre-PR quality gate checklist to ensure PR meets Beauty Shop standards before opening.

**Context:**
- Comprehensive checks before creating PR
- Catches issues early (faster than CI feedback)
- Ensures PR size, code quality, and git hygiene
- Reduces reviewer burden

---

## Usage

```
/prepare-pr
```

Runs in current branch, compares against `main`.

**Optional parameters:**
```
/prepare-pr --base develop
/prepare-pr --auto-fix
```

---

## Checklist Overview

I will systematically check:

1. **Code Quality** ✅/❌ - Automated checks (lint, test, build)
2. **PR Size** ✅/❌ - LOC and file count
3. **Git Hygiene** ✅/❌ - Branch status, commits, conflicts
4. **Security** ✅/❌ - No secrets, debug code, or sensitive data
5. **Documentation** ✅/❌ - Docs updated if needed

---

## 1. Code Quality Checks

### Running Automated Checks...

```
## Code Quality ✅/❌

### Type Checking
Running: `npm run type-check`
```

I'll run the command and show results:

**Success:**
```
✅ Type check passed
No type errors found
```

**Failure:**
```
❌ Type check failed

lib/stores/filter-store.ts:15:3 - error TS2322: Type 'string' is not assignable to type 'number'.

Fix these errors before creating PR.
```

### Linting

```
### Linting
Running: `npm run lint`
```

**Success:**
```
✅ Lint passed
No warnings or errors
```

**Failure:**
```
❌ Lint failed (3 issues)

components/ProductFilters.tsx:
  12:7   warning  Unused variable 'category'        @typescript-eslint/no-unused-vars
  45:15  error    Missing return type on function   @typescript-eslint/explicit-function-return-type

Run `npm run lint -- --fix` to auto-fix some issues.
```

### Tests

```
### Tests
Running: `npm run test`
```

**Success:**
```
✅ All tests passed (47 tests, 0 failed)

Test Suites: 12 passed, 12 total
Tests:       47 passed, 47 total
Time:        8.432s
```

**Failure:**
```
❌ Tests failed (2 failures)

FAIL lib/stores/filter-store.test.ts
  ● Filter Store › should update category

    expect(received).toBe(expected)
    Expected: "electronics"
    Received: null

Fix failing tests before creating PR.
```

### Build

```
### Build
Running: `npm run build`
```

**Success:**
```
✅ Build succeeded

Route (app)                              Size
┌ ○ /                                    142 kB
├ ○ /products                            89 kB
└ ○ /about                               76 kB

Build time: 12.3s
```

**Failure:**
```
❌ Build failed

Error: Module not found: Can't resolve './FilterStore'

Fix build errors before creating PR.
```

---

## 2. PR Size Analysis

### Analyzing Changes...

```
## PR Size ✅/❌

Comparing: feature/BS-152-product-catalog vs main

**Statistics:**
- Lines added: +427
- Lines deleted: -89
- Net change: +338 LOC
- Files changed: 12
- New files: 6
- Deleted files: 1
```

### Size Assessment

**Good (< 400 LOC, < 20 files):**
```
✅ PR Size: Good

**Breakdown:**
- LOC: 338 (Target: < 400) ✅
- Files: 12 (Target: < 20) ✅

PR is reviewable size. Good job!
```

**Large (400-800 LOC or 20-40 files):**
```
⚠️ PR Size: Large

**Breakdown:**
- LOC: 627 (Target: < 400) ⚠️
- Files: 18 (Target: < 20) ✅

**Recommendation:**
Consider splitting into 2 PRs:
1. Backend/store changes (~300 LOC)
2. UI components (~327 LOC)

Or proceed with extra scrutiny in review.

Continue with large PR? (y/n)
```

**Too Large (> 800 LOC or > 40 files):**
```
❌ PR Size: Too Large

**Breakdown:**
- LOC: 1,247 (Target: < 400) ❌
- Files: 34 (Target: < 20) ❌

**This PR is too large to review effectively.**

**Recommendation:**
Split into 3-4 smaller PRs. Use `/pr-size-analyzer` for suggestions.

**Alternative:**
If this must be one PR (major refactor), add extensive PR description and request multiple reviewers.

Proceed anyway? (y/n)
```

### File Breakdown

```
**Changed Files by Type:**

TypeScript/TSX: 10 files (+385 LOC)
  - lib/stores/filter-store.ts (+142)
  - components/ProductFilters.tsx (+167)
  - lib/types/filters.ts (+45)
  - [7 more...]

Styles: 1 file (+15 LOC)
  - styles/filters.css (+15)

Tests: 3 files (+95 LOC)
  - lib/stores/filter-store.test.ts (+62)
  - components/ProductFilters.test.tsx (+33)

Config: 1 file (+3 LOC)
  - package.json (+3)
```

---

## 3. Git Hygiene

### Branch Status

```
## Git Hygiene ✅/❌

### Branch Up-to-Date
Checking if branch is current with main...
```

**Up-to-Date:**
```
✅ Branch is up-to-date with origin/main
No merge required
```

**Behind:**
```
⚠️ Branch is behind origin/main by 5 commits

**Recommendation:** Merge main into your branch
```bash
git checkout main
git pull
git checkout feature/BS-152-product-catalog
git merge main
```

Or rebase:
```bash
git rebase main
```

Update branch before creating PR? (y/n)
```

### Merge Conflicts

```
### Merge Conflicts
Checking for conflicts with main...
```

**No Conflicts:**
```
✅ No merge conflicts detected
```

**Conflicts:**
```
❌ Merge conflicts detected

**Conflicting files:**
- lib/stores/cart-store.ts
- components/Header.tsx

Resolve conflicts before creating PR:
```bash
git merge main
# Fix conflicts
git add .
git commit
```
```

### Commit Messages

```
### Commit Messages
Validating commit messages...
```

**All Valid:**
```
✅ All commits follow Conventional Commits

Commits on this branch:
1. feat(filters): add Zustand filter store
2. feat(filters): implement filter UI components
3. test(filters): add filter store tests
4. docs: update README with filter usage
```

**Some Invalid:**
```
⚠️ Some commits don't follow Conventional Commits

✅ feat(filters): add Zustand filter store
✅ feat(filters): implement filter UI components
❌ "fixed bug" - Invalid format
❌ "WIP" - Should be squashed

**Recommendation:** Use `/validate-commits` to fix
```

---

## 4. Security Checks

### Scanning for Security Issues...

```
## Security ✅/❌

### Debug Code
Scanning for console.log, debugger, etc...
```

**Clean:**
```
✅ No debug code found
```

**Issues Found:**
```
❌ Debug code found (3 instances)

components/ProductFilters.tsx:
  Line 45: console.log('Selected category:', category)
  Line 78: console.log('Price range:', minPrice, maxPrice)

lib/stores/filter-store.ts:
  Line 23: debugger;

**Recommendation:** Remove before creating PR:
```typescript
// Remove these lines
console.log(...)
debugger;
```

Use `/cleanup-branch` to auto-remove.
```

### Secrets & Sensitive Data

```
### Secrets Scanning
Checking for hardcoded secrets...
```

**Clean:**
```
✅ No secrets or API keys detected
```

**Found:**
```
❌ Potential secrets found

lib/config/api.ts:
  Line 5: const API_KEY = 'sk_live_1234567890abcdef'

**CRITICAL:** Never commit secrets!

**Fix:**
1. Remove secret from code
2. Add to environment variables
3. Use `process.env.API_KEY` instead
4. Add to `.gitignore` if in file
5. Rotate the exposed key immediately
```

### Commented Code

```
### Commented Code
Checking for large blocks of commented code...
```

**Clean:**
```
✅ No large commented code blocks
```

**Found:**
```
⚠️ Commented code found (2 instances)

components/ProductFilters.tsx: 15 lines commented (lines 34-48)
lib/stores/filter-store.ts: 8 lines commented (lines 67-74)

**Recommendation:** Remove dead code or convert to proper comments explaining why code is kept.
```

### TODOs

```
### TODOs
Checking for TODO comments...
```

**All Linked:**
```
✅ All TODOs have issue references

Found:
- // TODO(BS-153): Optimize with virtualization
- // TODO(BS-154): Add keyboard shortcuts
```

**Unlinked:**
```
⚠️ Unlinked TODOs found (2)

components/ProductFilters.tsx:
  Line 89: // TODO: fix this later

lib/stores/filter-store.ts:
  Line 112: // TODO refactor

**Recommendation:** Either:
1. Fix now before PR
2. Create Linear issue and link: // TODO(BS-XXX): description
3. Remove if not important
```

---

## 5. Documentation

### Checking Documentation...

```
## Documentation ✅/❌

### README Updates
Checking if README needs updates...
```

**Not Needed:**
```
✅ README doesn't need updates
No new user-facing features requiring documentation
```

**Needed:**
```
⚠️ README may need updates

**New user-facing features detected:**
- Product filtering UI

**Recommendation:** Update README.md with:
- How to use product filters
- Available filter options
- URL parameter format (for shareable links)

Update README before PR? (y/n)
```

### API Documentation

```
### API Documentation
Checking if API docs need updates...
```

**Not Needed:**
```
✅ No API changes requiring documentation
```

**Needed:**
```
⚠️ API changes detected

**New/modified endpoints:**
- GET /api/v1/products (query params added)

**Recommendation:** Update `.project/05-API_Design.md` with:
- New query parameters: category, minPrice, maxPrice, search
- Example requests/responses
- Error cases

Update API docs? (y/n)
```

### JSDoc Comments

```
### JSDoc Comments
Checking complex functions for documentation...
```

**Good:**
```
✅ All complex functions documented
```

**Missing:**
```
⚠️ Some functions lack documentation (3 functions)

lib/stores/filter-store.ts:
  - setPriceRange() - Complex function, no JSDoc

components/ProductFilters.tsx:
  - handleFilterChange() - Public API, no JSDoc
  - resetFilters() - Public API, no JSDoc

**Recommendation:** Add JSDoc for public APIs and complex logic.
```

---

## Final Summary

```
# PR Readiness Report

**Branch:** feature/BS-152-product-catalog
**Base:** main
**Checked:** 2025-10-20 14:35

---

## Overall Status: [✅ READY | ⚠️ WARNINGS | ❌ NOT READY]

**Score:** 85/100

### Results:

1. Code Quality: ✅ Passed
   - Type check: ✅
   - Lint: ✅
   - Tests: ✅ (47/47)
   - Build: ✅

2. PR Size: ✅ Good
   - LOC: 338 (< 400)
   - Files: 12 (< 20)

3. Git Hygiene: ⚠️ Minor Issues
   - Branch status: ✅ Up-to-date
   - Conflicts: ✅ None
   - Commits: ⚠️ 2 invalid commit messages

4. Security: ⚠️ Minor Issues
   - Debug code: ❌ 3 instances found
   - Secrets: ✅ None
   - Commented code: ⚠️ 2 blocks
   - TODOs: ⚠️ 2 unlinked

5. Documentation: ⚠️ Updates Needed
   - README: ⚠️ Needs update
   - API docs: ✅ Not needed
   - JSDoc: ⚠️ 3 functions missing

---

## Actions Required:

### Before PR (Must Fix):
1. ❌ Remove 3 console.log statements
2. ⚠️ Fix 2 invalid commit messages

### Recommendations (Should Fix):
3. ⚠️ Update README with filter usage
4. ⚠️ Link or remove 2 TODOs
5. ⚠️ Remove commented code blocks

### Optional (Nice to Have):
6. 💡 Add JSDoc to 3 public functions
7. 💡 Add integration test for full filter flow

---

## Next Steps:

**If READY (or willing to address warnings):**
```
/create-pr-with-linear BS-152
```

**If NOT READY:**
1. Fix required issues above
2. Run `/prepare-pr` again to verify
3. Then create PR

**Need Help?**
- `/cleanup-branch` - Auto-remove debug code
- `/validate-commits` - Fix commit messages
- `/add-documentation` - Generate docs

---

Proceed with PR creation? (y/n)
```

---

## Auto-Fix Mode

```
/prepare-pr --auto-fix
```

Automatically fixes:
- Remove console.log and debugger
- Remove commented code blocks
- Run lint --fix
- Format code

Does NOT auto-fix:
- Failing tests
- Type errors
- Merge conflicts
- Invalid commit messages

---

## Tips for Best Results

1. **Run before every PR** - Catch issues early
2. **Fix all critical issues** - Don't skip required fixes
3. **Address warnings when possible** - Reduces reviewer burden
4. **Use auto-fix for simple issues** - Saves time
5. **Keep PRs small** - Easier to pass all checks

---

## Related Commands

- `/cleanup-branch` - Remove debug code automatically
- `/validate-commits` - Fix commit message format
- `/pr-size-analyzer` - Detailed size analysis with split suggestions
- `/create-pr-with-linear` - Create PR after passing checks
- `/add-documentation` - Generate missing documentation

