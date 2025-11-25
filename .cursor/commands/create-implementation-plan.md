# Create Implementation Plan

**Goal:** Create detailed implementation plans through an interactive, iterative process for large features (>400 LOC).

**Inspiration:** Adapted from [HumanLayer's create_plan.md](https://raw.githubusercontent.com/humanlayer/humanlayer/refs/heads/main/.claude/commands/create_plan.md)

**Context:**
- For features > 400 LOC, multi-component features, or complex changes
- Interactive planning with research, discovery, and validation
- Output saved to `.project/plans` -> Create subfolder `/[HUD-XXX]/implementation-plan-YYYY-MM-DD-HUD-XXX.md`
- Uses Linear MCP for ticket integration
- Phase-based approach with pause points

---

## Process Overview

This command guides you through creating a comprehensive implementation plan in 5 steps:

1. **Context Gathering** - Understand requirements and current state
2. **Research & Discovery** - Find patterns and constraints
3. **Plan Structure** - Outline phases
4. **Detailed Plan** - Write specifics
5. **Validation** - Review and refine

---

## Step 1: Context Gathering

**When invoked, I will:**

### A. Check for Parameters

**If Linear ticket provided** (e.g., `BS-152`):
- Fetch ticket via Linear MCP: `mcp_Linear_get_issue`
- Extract: title, description, acceptance criteria, technical notes
- Display formatted ticket details

**If no parameters:**
```
I'll help you create a detailed implementation plan.

Please provide:
1. Linear ticket ID (BS-XXX) OR feature description
2. Key requirements or acceptance criteria
3. Any constraints or technical considerations

Example:
/create-implementation-plan BS-152
```

### B. Read Related Documentation

I will read relevant project documentation:
- `.project/02-Product_Requirements_Document.md` - for context
- `.project/04-Database_Schema.md` - if database changes needed
- `.project/05-API_Design.md` - if API changes needed
- Any existing related plans in `.project/plans/`

### C. Ask Clarifying Questions

Based on the ticket and docs, I'll ask **only** questions I cannot answer through code:

```
Based on BS-152 and my review of the codebase, I understand we need to [summary].

Before planning, I have questions:
- [Specific technical question requiring human judgment]
- [Business logic clarification]
- [Design preference affecting implementation]

Please clarify so I can create an accurate plan.
```

---

## Step 2: Research & Discovery

**I'll guide you through researching the codebase:**

### A. Find Similar Features

```
Let me search for similar patterns in the codebase...
```

I'll use `codebase_search` to find:
- Similar features we can model after
- Existing components/services to reuse
- Patterns and conventions to follow

**Output:**
```
## Research Findings:

### Similar Features:
- `components/admin/ProductFilters.tsx` - similar filtering UI
- `lib/services/products/list-products.ts` - pagination pattern
- `lib/stores/cart-store.ts` - Zustand store example

### Reusable Components:
- `components/ui/Slider.tsx` - for price range
- `components/ui/SearchInput.tsx` - for search

### Patterns to Follow:
- Use Zustand for client state
- Cursor-based pagination for lists
- RHF + Zod for forms
```

### B. Check Database Schema

```
Checking database schema in `.project/04-Database_Schema.md`...

### Relevant Tables:
- `products` table has: id, title, description, price, category_id
- `categories` table exists with: id, name, slug
- Indexes on: category_id, price (for efficient filtering)
```

### C. API Patterns

```
Checking `.project/05-API_Design.md` for API patterns...

### Relevant Endpoints:
- `GET /api/v1/products` - supports ?category=X&minPrice=Y&maxPrice=Z
- Pagination: cursor-based with ?cursor=XXX&limit=20
- Response format: { data: [], nextCursor: string | null }
```

### D. Integration Points

```
### Dependencies Identified:
- MedusaJS Product API integration
- Supabase product queries (if direct DB access needed)
- Existing ProductList component refactor required
```

---

## Step 3: Plan Structure Development

**After research, I'll propose plan structure:**

```
Based on research, here's my proposed plan structure:

## Overview:
[1-2 sentence summary of what we're building]

## Implementation Phases:

**Phase 1: Foundation - Zustand Filter Store**
- Create filter state management
- Define filter types and initial state
- Implement filter actions (setCategory, setPriceRange, setSearch)

**Phase 2: UI Components**
- Filter sidebar component
- Category dropdown
- Price range slider
- Search input with debounce

**Phase 3: API Integration**
- Connect filter state to MedusaJS API
- Implement URL state sync (shareable filters)
- Add loading/error states

**Phase 4: Polish & Testing**
- Performance optimization
- Edge case handling
- Accessibility improvements
- Comprehensive testing

## Questions:
- Does this phasing make sense?
- Should Phase 2 and 3 be combined or separate?
- Any phases missing?

Please confirm or suggest adjustments before I write details.
```

---

## Step 4: Detailed Plan Writing

**After structure approval:**

### A. Create Plan File

**Filename:** `.project/plans/YYYY-MM-DD-BS-XXX-description.md`

**Format:** `YYYY-MM-DD-BS-XXX-description.md` where:
- `YYYY-MM-DD` = today's date
- `BS-XXX` = Linear ticket number (omit if no ticket)
- `description` = brief kebab-case description

**Examples:**
- `2025-10-20-BS-152-product-catalog-filtering.md`
- `2025-10-21-refactor-cart-state.md` (no ticket)

### B. Use Template Structure

The plan will include:

```markdown
# [Feature Name] Implementation Plan

## Overview
[What we're building and why]

## Linear Issue
**Issue:** BS-XXX
[Fetched from Linear via MCP]

## Current State Analysis
[What exists, what's missing, constraints]

### Key Discoveries:
[From research step, with file:line references]

## Desired End State
[Specification and verification criteria]

## What We're NOT Doing
[Explicit out-of-scope items - critical!]

## Implementation Approach
[High-level strategy]

## Phase 1: [Name]

### Overview
[What this accomplishes]

### Changes Required:

#### 1. [Component/File]
**File:** `path/to/file.ext`
**Changes:** [Summary]
```typescript
// Specific code examples
```
**Rationale:** [Why]

### Success Criteria:

#### Automated Verification:
- [ ] Tests pass: `npm run test`
- [ ] Type check: `npm run type-check`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] Feature works in UI
- [ ] Performance < 2 sec
- [ ] Edge cases handled

**⚠️ PAUSE HERE** - Manual approval before Phase 2

[Repeat for all phases...]

## Testing Strategy
[Unit, integration, manual test plans]

## References
- Linear: BS-XXX
- Related files: [references]
```

### C. Post to Linear (Optional)

```
Should I post a comment to Linear BS-XXX with:
- Link to implementation plan
- Estimated complexity (Low/Medium/High)
- Proposed timeline

Post to Linear? (y/n)
```

If yes, use `mcp_Linear_create_comment` to post.

---

## Step 5: Review & Iterate

**Present the plan location:**

```
✅ Implementation plan created:
`.project/plans/2025-10-20-BS-152-product-catalog-filtering.md`

Please review:
- [ ] Are phases properly scoped?
- [ ] Success criteria specific enough?
- [ ] Technical details accurate?
- [ ] Missing edge cases or considerations?
- [ ] "What We're NOT Doing" comprehensive?

I can adjust based on your feedback.
```

**Iterate until satisfied:**
- Add missing phases
- Adjust technical approach
- Clarify success criteria
- Add/remove scope items
- Update file paths or code examples

---

## Important Principles

### 1. Be Skeptical
- Question vague requirements
- Identify potential issues early
- Don't assume - verify with code
- Challenge unclear acceptance criteria

### 2. Be Interactive
- Don't write full plan in one shot
- Get buy-in at each major step
- Allow course corrections
- Work collaboratively with user

### 3. Be Thorough
- Research actual code patterns using codebase_search
- Include specific file paths and line numbers
- Write measurable success criteria (automated + manual)
- Reference existing patterns to follow
- Document constraints and assumptions

### 4. Be Practical
- Focus on incremental, testable changes
- Keep phases < 500 LOC each
- Consider rollback strategy
- Think about edge cases and error handling
- Include security and performance considerations

### 5. No Open Questions
**CRITICAL:** If you encounter open questions during planning, STOP.
- Research using codebase_search
- Ask user for clarification
- DO NOT write plan with unresolved questions
- Plan must be complete and actionable

---

## Success Criteria Guidelines

**Always separate into two categories:**

### Automated Verification (Machine-Runnable):
- Commands: `npm run test`, `npm run lint`, `npm run build`
- Specific files that should exist
- Code compilation/type checking
- Automated test suites passing

### Manual Verification (Human-Required):
- UI/UX functionality and appearance
- Performance under real conditions
- Edge cases hard to automate
- Accessibility (keyboard, screen reader)
- Cross-browser/device testing
- User acceptance criteria

**Format Example:**
```markdown
### Success Criteria:

#### Automated Verification:
- [ ] Database migration runs: `npm run migrate`
- [ ] All unit tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] Type check passes: `npm run type-check`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] New filter UI appears correctly
- [ ] Performance < 2 sec with 1000+ products
- [ ] Filters work on mobile/tablet
- [ ] Keyboard navigation functional
- [ ] No regressions in cart flow

**⚠️ PAUSE** - Verify all above before Phase 2
```

---

## Common Patterns

### For Database Changes:
1. Start with schema/migration
2. Add repository/store methods
3. Update business logic
4. Expose via API
5. Update clients/UI

### For New Features:
1. Research existing patterns first
2. Start with data model
3. Build backend logic
4. Add API endpoints
5. Implement UI last

### For Refactoring:
1. Document current behavior
2. Plan incremental changes
3. Maintain backwards compatibility
4. Include migration strategy
5. Add deprecation warnings if needed

---

## Example Interaction Flow

```
User: /create-implementation-plan BS-152

AI: Fetching Linear ticket BS-152...

## Issue: BS-152 - Product Catalog Filtering
**Status:** In Progress
**Assignee:** Nicklas

**Description:**
Add filtering by category, price range, and search.

**Acceptance Criteria:**
- [ ] Users can filter by category
- [ ] Users can set price range
- [ ] Search by product name works
- [ ] Filters persist in URL

Let me research the codebase for similar patterns...

[Research happens...]

Found similar filtering in admin panel. Based on this, I propose 4 phases:
1. Zustand store for filter state
2. UI components (sidebar, inputs)
3. API integration with MedusaJS
4. Polish and performance

Does this structure work? Any adjustments?

User: Looks good, proceed.

AI: Writing detailed plan...

✅ Plan created at `.project/plans/2025-10-20-BS-152-product-catalog-filtering.md`

Review the plan and let me know if adjustments needed.
```

---

## Tips for Best Results

1. **Start with a Linear ticket** - provides clear requirements
2. **Let me research first** - I'll find relevant patterns
3. **Give feedback on structure** - before I write details
4. **Review thoroughly** - catch issues early
5. **Use the plan** - with `/execute-plan-phase` command

---

## Next Steps After Plan Creation

1. **Validate plan:** `/validate-plan [plan-file]`
2. **Start implementation:** `/execute-plan-phase [plan-file] 1`
3. **Update Linear:** `/update-linear-status BS-XXX`

---

## Related Commands

- `/fetch-linear-ticket` - Get Linear ticket details first
- `/research-feature-patterns` - Deep research before planning
- `/validate-plan` - Review plan completeness
- `/execute-plan-phase` - Implement plan phase-by-phase

