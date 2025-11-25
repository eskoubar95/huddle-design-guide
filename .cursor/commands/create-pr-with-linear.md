# Create PR with Linear

**Goal:** Create GitHub PR with full Linear integration - auto-fetch ticket, generate description, link issues, and update status.

**Source:** Enhanced version of `generate-pr-description.md` + [HumanLayer's describe_pr.md](https://raw.githubusercontent.com/humanlayer/humanlayer/refs/heads/main/.claude/commands/describe_pr.md)

**Context:**
- Uses GitHub MCP (`mcp_github_create_pull_request`)
- Uses Linear MCP (`mcp_Linear_get_issue`, `mcp_Linear_create_comment`, `mcp_Linear_update_issue`)
- Generates comprehensive PR description from template
- Auto-links Linear ticket ("Closes BS-XXX")
- Posts PR link back to Linear
- Updates Linear status to "Review"

---

## Usage

```
/create-pr-with-linear BS-XXX
```

**Examples:**
```
/create-pr-with-linear BS-152
/create-pr-with-linear BS-152 --draft
/create-pr-with-linear BS-152 --base develop
```

**Parameters:**
- `issue-id`: Linear ticket (BS-XXX)
- `--draft`: Create as draft PR (optional)
- `--base`: Target branch (default: main)

---

## Process

### Step 1: Fetch Linear Ticket

```
Fetching Linear ticket BS-152 via MCP...

✅ Found: BS-152 - Product Catalog Filtering
```

Extract:
- Title → PR title
- Description → PR context
- Acceptance criteria → Checklist
- Technical notes → Implementation details

### Step 2: Analyze Changes

```
Analyzing git changes...

**Branch:** feature/BS-152-product-catalog
**Base:** main
**Commits:** 4
**Files:** 12 (+427 / -89 lines)
```

### Step 3: Generate PR Title

```
**Proposed PR Title:**

feat(catalog): implement product filtering and search (BS-152)

Format: <type>(<scope>): <description> (BS-XXX)
```

**Title Options:**
- Auto-generated from commits
- Extracted from Linear ticket title
- Custom (prompt for input)

### Step 4: Generate PR Description

Using `.github/pull_request_template.md` + Linear ticket data:

```markdown
## What

Implements product catalog filtering and search functionality for the e-commerce platform.

Users can now:
- Filter products by category
- Set price range with slider (0-10,000 DKK)
- Search products by name with debounce
- Share filters via URL parameters

## Why

Closes [BS-152](https://linear.app/beauty-shop/issue/BS-152)

**Acceptance Criteria Status:**
- ✅ Product listing page displays all products
- ✅ Users can filter by category (dropdown)
- ✅ Users can set price range (slider with min/max)
- ✅ Search by product name functional with 300ms debounce
- ✅ Filters persist in URL query parameters
- ✅ Mobile responsive design (tested on iOS/Android)
- ✅ Page load time < 2 seconds (avg 1.8s measured)
- ✅ Keyboard navigation works for all filters

**Implementation Plan:**
Followed plan: `.project/plans/2025-10-20-BS-152-product-catalog-filtering.md`

Completed in 4 phases:
1. ✅ Zustand filter store
2. ✅ UI components (sidebar, inputs, slider)
3. ✅ MedusaJS API integration
4. ✅ Polish, performance, accessibility

## How

**Key Technical Decisions:**
- **State Management:** Zustand for client-side filter state (follows existing pattern)
- **API Integration:** MedusaJS product endpoints with cursor pagination
- **URL Sync:** React Hook Form + Next.js router for shareable filters
- **Performance:** Debounced search (300ms), optimistic UI updates
- **Accessibility:** ARIA labels, keyboard navigation, focus management

**Architecture:**
```
User Input
  ↓
Zustand Store (lib/stores/filter-store.ts)
  ↓
URL State Sync
  ↓
MedusaJS API (lib/services/products/filter-products.ts)
  ↓
Product List Re-render
```

**Files Changed:**
- `lib/stores/filter-store.ts` - Filter state management
- `lib/services/products/filter-products.ts` - API integration
- `components/filters/FilterSidebar.tsx` - Filter UI container
- `components/filters/CategoryFilter.tsx` - Category dropdown
- `components/filters/PriceRangeFilter.tsx` - Price slider
- `components/filters/SearchFilter.tsx` - Search input with debounce
- 6 test files added

**Risks:**
- Large product catalogs (>1000) may need virtualization (Phase 2 optimization)
- Filter combinations could create empty states (handled with clear messaging)

## Tests

**Automated:**
- ✅ Unit tests: 12 tests added (filter-store, services)
- ✅ Component tests: 6 tests (all filter components)
- ✅ Integration test: Full filter flow
- ✅ All existing tests still pass (47/47)

**Manual:**
- ✅ Tested on Chrome, Safari, Firefox
- ✅ Mobile tested on iOS (iPhone 13) and Android (Pixel 6)
- ✅ Keyboard navigation verified (Tab, Enter, Escape)
- ✅ Screen reader tested (VoiceOver on macOS)
- ✅ Performance tested with 500 products (1.8s avg load)

**Coverage:**
- Filter store: 100%
- Filter components: 95%
- API integration: 100%

## Screenshots

### Desktop - Filter Sidebar
![Filter Sidebar](https://...)

### Mobile - Filters Modal
![Mobile Filters](https://...)

### Empty State
![No Results](https://...)

## Rollback Plan

If issues arise:
1. **Immediate:** Revert PR (no DB migrations)
2. **Partial:** Disable via feature flag `ENABLE_PRODUCT_FILTERS` (not implemented yet - consider for risky features)
3. **Data:** No data migration needed

**Rollback command:**
```bash
git revert <commit-sha>
```

## Checklist

- [x] Follows `.cursor/rules` (SRP, small files, explicit types)
- [x] No secrets or PII added
- [x] `npm run check` passes (type-check, lint, test, build)
- [x] PR size reasonable (338 LOC, 12 files - under 400/20 limit)
- [x] Docs updated (README updated with filter usage)
- [x] Accessibility tested (WCAG 2.1 AA compliant)
- [x] Performance meets PRD (< 2 sec target, measured 1.8s)
- [x] Mobile responsive
- [x] No breaking changes
- [x] Linear ticket updated with PR link

---

**Related Issues:**
- Depends on: BS-148 (Product detail page) - ✅ Merged
- Blocks: BS-153 (Checkout flow) - Ready to start

**Reviewers:**
@frontend-team @nicklas

**Estimated Review Time:** 30-45 minutes
```

### Step 5: Create GitHub PR

Using GitHub MCP:

```
Creating PR via GitHub MCP...

mcp_github_create_pull_request({
  owner: "beauty-shop",
  repo: "beauty-shop",
  title: "feat(catalog): implement product filtering and search (BS-152)",
  body: [generated description above],
  head: "feature/BS-152-product-catalog",
  base: "main"
})

✅ PR created: #123
🔗 https://github.com/beauty-shop/beauty-shop/pull/123
```

### Step 6: Post to Linear

Using Linear MCP:

```
Posting PR link to Linear BS-152...

mcp_Linear_create_comment({
  issueId: "BS-152",
  body: "✅ PR Ready for Review\n🔗 [#123: Implement Product Filtering](https://github.com/beauty-shop/pull/123)\n\nAll acceptance criteria met. Ready for code review!"
})

✅ Posted to Linear
```

### Step 7: Update Linear Status

```
Updating Linear status: In Progress → In Review...

mcp_Linear_update_issue({
  id: "BS-152",
  state: "In Review"
})

✅ Status updated
```

---

## Success Output

```
✅ PR Created Successfully!

**GitHub PR:** #123
🔗 https://github.com/beauty-shop/beauty-shop/pull/123

**Title:** feat(catalog): implement product filtering and search (BS-152)

**Actions Completed:**
- ✅ PR created on GitHub
- ✅ Linear ticket linked (Closes BS-152)
- ✅ Comment posted to Linear with PR link
- ✅ Linear status updated: In Progress → In Review
- ✅ Reviewers assigned: @frontend-team, @nicklas

**Next Steps:**
1. Wait for CI to complete
2. Address review feedback
3. Merge when approved

**CI Status:** 🔄 Running checks...
Monitor: https://github.com/beauty-shop/beauty-shop/pull/123/checks
```

---

## Options

### Draft PR

```
/create-pr-with-linear BS-152 --draft
```

Creates draft PR (not ready for review yet). Useful for:
- Early feedback on approach
- Showing progress
- CI validation before review

### Custom Base Branch

```
/create-pr-with-linear BS-152 --base develop
```

Target different branch (for multi-branch workflows).

### Skip Linear Integration

```
/create-pr-with-linear --no-linear
```

Create PR without Linear updates (if ticket already closed or not applicable).

---

## Error Handling

### If Linear Ticket Not Found

```
❌ Linear ticket BS-999 not found

Options:
1. Create PR without Linear integration
2. Verify ticket ID and retry
3. Use `/generate-pr-description` for manual PR

Proceed without Linear? (y/n)
```

### If Branch Not Pushed

```
❌ Branch not pushed to origin

Push branch first:
```bash
git push origin feature/BS-152-product-catalog
```

Then retry.
```

### If No Changes

```
❌ No changes detected

Branch is up-to-date with main. Nothing to PR.
```

### If PR Already Exists

```
⚠️ PR already exists for this branch

**Existing PR:** #120
🔗 https://github.com/beauty-shop/beauty-shop/pull/120

Options:
1. Update existing PR description
2. Close existing and create new
3. Cancel

Select option (1-3):
```

---

## Related Commands

- `/fetch-linear-ticket` - Preview ticket before PR
- `/prepare-pr` - Run quality checks first
- `/validate-commits` - Fix commits before PR
- `/pr-size-analyzer` - Check if PR should be split
- `/update-linear-status` - Manual Linear updates

