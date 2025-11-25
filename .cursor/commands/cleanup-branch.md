# Cleanup Branch

**Goal:** Remove debug code, commented blocks, and organize commits before creating PR.

**Context:**
- Auto-detects common issues (console.log, debugger, commented code)
- Scans for unlinked TODOs
- Suggests commit organization
- Prepares branch for professional PR

---

## Usage

```
/cleanup-branch
/cleanup-branch --auto-fix
/cleanup-branch --dry-run
```

---

## Cleanup Checklist

I will scan for:

1. **Debug Code** - console.log, debugger, console.warn, etc.
2. **Commented Code** - Large blocks of commented-out code
3. **TODO Comments** - TODOs without issue links
4. **Temporary Code** - Marked with TEMP, FIXME, HACK
5. **Unused Imports** - Via ESLint
6. **Git Issues** - WIP commits, merge commits

---

## Step 1: Scan for Debug Code

```
## Debug Code

Scanning for console.log, debugger, etc...

Found 5 instances:
```

### console.log

```
❌ components/filters/CategoryFilter.tsx:
  Line 24: console.log('Selected category:', category)
  Line 67: console.log('Filter state:', filterState)

❌ lib/stores/filter-store.ts:
  Line 45: console.log('Store updated', newState)

**Recommendation:** Remove all console.log statements
```

### debugger

```
❌ lib/services/products/filter-products.ts:
  Line 89: debugger;

**Recommendation:** Remove debugger statement
```

### console.warn / console.error

```
⚠️ lib/utils/api-client.ts:
  Line 123: console.warn('API rate limit approaching')

**Note:** This may be intentional logging. Review and keep if needed.
```

---

## Step 2: Scan for Commented Code

```
## Commented Code

Found 3 blocks of commented code:
```

### Large Comment Blocks

```
❌ components/filters/PriceRangeFilter.tsx (Lines 34-52, 18 lines):

```typescript
// const oldImplementation = () => {
//   const [min, setMin] = useState(0)
//   const [max, setMax] = useState(10000)
//   // ... 15 more lines
// }
```

**Recommendation:** Remove dead code. If needed for reference, check git history.

---

❌ lib/stores/filter-store.ts (Lines 78-89, 11 lines):

```typescript
// Alternative approach - keep for now?
// const alternativeSetCategory = (category: string) => {
//   // ... implementation
// }
```

**Recommendation:** Remove or document why it's kept.
```

---

## Step 3: Scan for TODOs

```
## TODO Comments

Found 4 TODOs:
```

### Linked TODOs (Good)

```
✅ components/filters/FilterSidebar.tsx:
  Line 156: // TODO(BS-153): Add keyboard shortcuts

✅ lib/stores/filter-store.ts:
  Line 234: // TODO(BS-154): Optimize with memoization
```

### Unlinked TODOs (Fix)

```
❌ components/filters/CategoryFilter.tsx:
  Line 89: // TODO: fix this later

**Recommendation:** 
- Fix now before PR, OR
- Create Linear issue and link: // TODO(BS-XXX): description, OR
- Remove if not important

---

❌ lib/utils/url-params.ts:
  Line 45: // FIXME: handle edge case

**Recommendation:** Fix the edge case or create issue

---

⚠️ components/filters/PriceRangeFilter.tsx:
  Line 123: // HACK: temporary workaround

**Recommendation:** Either fix properly or document why hack is needed
```

---

## Step 4: Scan for Temporary Code

```
## Temporary Code

Found 2 instances:
```

### TEMP Markers

```
❌ lib/services/products/filter-products.ts:
  Line 67: const TEMP_API_URL = 'http://localhost:3000/api'

**Recommendation:** Use environment variable instead
```

### Mock Data

```
⚠️ lib/mocks/product-data.ts:
  // Entire file is mock data

**Note:** If needed for tests, keep but ensure not imported in production
```

---

## Step 5: Check Commits

```
## Git Commit Status

Found 6 commits on this branch:

1. ✅ feat(filters): add Zustand filter store
2. ✅ feat(filters): implement filter UI
3. ❌ "WIP: testing stuff" - Should be squashed
4. ❌ "oops" - Should be squashed
5. ✅ test(filters): add tests
6. ❌ "Merge branch 'main'" - Should be removed (rebase instead)

**Recommendation:** 
- Squash commits 3 & 4 into commit 2
- Remove merge commit (use rebase)
- Result: 3 clean commits

See `/validate-commits` for detailed commit fixing
```

---

## Cleanup Summary

```
# Branch Cleanup Report

**Branch:** feature/BS-152-product-catalog

---

## Issues Found: 15

### Critical (Must Fix):
1. 5x console.log statements
2. 1x debugger statement
3. 2x Unlinked TODO comments

### Warnings (Should Fix):
4. 2x Large commented code blocks (29 lines total)
5. 1x TEMP variable
6. 3x Commits to squash

### Info (Review):
7. 1x console.warn (may be intentional)
8. 2x Linked TODOs (good practice)

---

## Auto-Fix Available: 8 / 15 items

**Can auto-fix:**
- ✅ Remove console.log
- ✅ Remove debugger
- ✅ Remove commented code
- ✅ Fix TEMP variables

**Requires manual fix:**
- ❌ TODO comments (need decision)
- ❌ Commit squashing (use interactive rebase)

---

Would you like to auto-fix 8 items? (y/n)
```

---

## Auto-Fix Mode

```
/cleanup-branch --auto-fix
```

### What Gets Fixed:

```
Applying auto-fixes...

✅ Removed 5 console.log statements:
  - components/filters/CategoryFilter.tsx (2)
  - lib/stores/filter-store.ts (1)
  - [2 more files]

✅ Removed 1 debugger statement:
  - lib/services/products/filter-products.ts

✅ Removed 2 commented code blocks (29 lines):
  - components/filters/PriceRangeFilter.tsx (18 lines)
  - lib/stores/filter-store.ts (11 lines)

✅ Fixed 1 TEMP variable:
  - Changed to use process.env.API_URL

---

## Changes Made:

**Modified files:** 5
**Lines removed:** 35

**Next steps:**
1. Review changes: `git diff`
2. Run tests: `npm run test`
3. Commit: `git add . && git commit -m "chore: cleanup debug code and comments"`

Auto-commit these changes? (y/n)
```

---

## Dry Run Mode

```
/cleanup-branch --dry-run
```

Shows what would be changed without actually changing anything:

```
## Dry Run - No Changes Applied

**Would remove:**
- 5x console.log
- 1x debugger
- 2x commented code blocks

**Would fix:**
- 1x TEMP variable

**Would NOT change:**
- TODOs (manual decision needed)
- Commits (use interactive rebase)

Run `/cleanup-branch --auto-fix` to apply these changes.
```

---

## Manual Cleanup Guide

For items that can't be auto-fixed:

### Fix Unlinked TODOs:

**Option 1: Fix Now**
```typescript
// Before:
// TODO: fix this later
const result = hackyImplementation()

// After: (fixed)
const result = properImplementation()
```

**Option 2: Link to Issue**
```typescript
// Before:
// TODO: optimize performance

// After:
// TODO(BS-155): optimize filter computation with memoization
```

**Option 3: Remove**
```typescript
// If not important, just remove the TODO
```

### Squash Commits:

```bash
# Interactive rebase to squash
git rebase -i main

# In editor, change "pick" to "squash" for WIP commits
# Then edit commit message
```

See `/validate-commits` for detailed instructions.

---

## Best Practices

### During Development:

**DO:**
- ✅ Use console.log freely while debugging
- ✅ Leave WIP commits locally
- ✅ Comment out code temporarily

**BEFORE PR:**
- ✅ Run `/cleanup-branch`
- ✅ Remove all debug code
- ✅ Clean up commits
- ✅ Link or remove TODOs

### Keeping Intentional Logs:

```typescript
// If logging is intentional (not debug), use proper logger:

// ❌ Debug log (remove)
console.log('User clicked filter:', filter)

// ✅ Intentional log (keep)
logger.info('Filter applied', { filter, userId })

// ✅ Error logging (keep)
logger.error('Filter API failed', { error, context })
```

### Commented Code:

```typescript
// ❌ Don't keep large commented blocks
// const oldFunction = () => {
//   // ... 20 lines
// }

// ✅ If you need reference, add git hash
// Previous implementation removed in commit abc1234
// See git history for alternative approach

// ✅ Or keep small snippets with clear reason
// Note: Alternative approach would be X, but we chose Y because Z
```

---

## Integration with Other Commands

**Typical cleanup flow:**

```
1. /cleanup-branch
   ↓ Identifies issues

2. /cleanup-branch --auto-fix
   ↓ Fixes what it can

3. [Manual fixes for TODOs]
   ↓ Fix or link remaining items

4. /validate-commits
   ↓ Fix commit messages

5. /prepare-pr
   ↓ Final verification

6. /create-pr-with-linear BS-XXX
   ↓ Create clean PR
```

---

## Configuration

Create `.cleanup-branch.json` to customize:

```json
{
  "ignorePatterns": [
    "**/*.test.ts",  // Allow console.log in tests
    "**/mocks/**"    // Allow anything in mocks
  ],
  "allowedConsole": [
    "console.warn",  // Keep warnings
    "console.error"  // Keep errors
  ],
  "todoLinkPattern": "BS-\\d+",
  "autoCommit": false
}
```

---

## Tips

1. **Clean as you go** - Remove debug code after fixing issues
2. **Use feature flags** - Instead of commenting code, use flags
3. **Git history > Comments** - Don't keep old code "just in case"
4. **Link TODOs immediately** - Or fix them right away
5. **Run before every PR** - Make it a habit

---

## Related Commands

- `/prepare-pr` - Runs cleanup as part of checks
- `/validate-commits` - Fix commit messages
- `/lint-fix` - Auto-fix linting issues
- `/code-review` - Comprehensive code review

