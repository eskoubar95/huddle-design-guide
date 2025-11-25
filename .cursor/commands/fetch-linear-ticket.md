# Fetch Linear Ticket

**Goal:** Retrieve Linear ticket details via MCP and parse for planning or implementation.

**Context:**
- Uses Linear MCP integration (mcp_Linear_get_issue)
- Extracts acceptance criteria, technical notes, and requirements
- Suggests next steps based on ticket complexity
- Starting point for plan-based workflow

---

## Usage

```
/fetch-linear-ticket BS-XXX
```

**Examples:**
```
/fetch-linear-ticket BS-152
/fetch-linear-ticket 152
```

**Parameter:**
- `issue-id`: Linear issue identifier (with or without BS- prefix)

---

## Process

### Step 1: Fetch from Linear

I will use Linear MCP to retrieve ticket:

```
Fetching Linear ticket BS-152...
```

Using: `mcp_Linear_get_issue({ id: "BS-152" })`

### Step 2: Parse & Format

Extract key information:
- Title
- Description
- Status and priority
- Assignee
- Labels/tags
- Acceptance criteria
- Technical notes
- Related issues
- Comments (recent)

### Step 3: Display Formatted Output

```
## Issue: BS-152 - Product Catalog Filtering

**Status:** In Progress  
**Priority:** High  
**Assignee:** Nicklas Eskou  
**Labels:** frontend, e-commerce, phase-1  
**Sprint:** Phase 1 - Foundation  
**Created:** 2025-10-15  
**Updated:** 2025-10-19

---

### Description

Implement product catalog with advanced filtering capabilities. Users should be able to filter products by category, price range, and search by product name. Filters should persist in URL for shareable links.

This is a core e-commerce feature required for MVP launch.

---

### Acceptance Criteria

- [ ] Product listing page displays all products
- [ ] Users can filter by category (dropdown)
- [ ] Users can set price range (slider with min/max)
- [ ] Search by product name is functional with debounce
- [ ] Filters persist in URL query parameters
- [ ] Mobile responsive design
- [ ] Page load time < 2 seconds (per PRD)
- [ ] Keyboard navigation works for all filters

---

### Technical Notes

**Backend:**
- MedusaJS product API already supports filtering via query params
- Use cursor-based pagination for performance
- Product service: `lib/services/products/`

**Frontend:**
- Use Zustand for filter state management
- Follow pattern in `components/admin/ProductFilters.tsx`
- Ensure accessibility (WCAG 2.1 AA)

**Database:**
- Products table indexed on category_id and price
- No schema changes needed

**Dependencies:**
- None - all infrastructure exists

---

### Related Issues

- [BS-148](https://linear.app/beauty-shop/issue/BS-148) - Product detail page (completed)
- [BS-153](https://linear.app/beauty-shop/issue/BS-153) - Checkout flow (blocked by this)

---

### Recent Comments

**Nicklas (Oct 19):**
> Confirmed with design team - price slider should have DKK formatting and show min 0 DKK, max 10,000 DKK.

**Sarah (Oct 18):**
> Consider implementing virtual scrolling if we have 1000+ products. Can be Phase 2 optimization.

---
```

### Step 4: Analyze Complexity

```
## Complexity Analysis

**Estimated Size:** ~600 LOC
**Estimated Time:** 6-8 hours
**Risk Level:** Medium

**Breakdown:**
- Backend integration: Low (API exists)
- Frontend UI: Medium (multiple components)
- State management: Low (Zustand pattern established)
- Testing: Medium (multiple user flows)

**Recommendation:** Use plan-based workflow (>400 LOC)
```

---

## Step 5: Suggest Next Actions

Based on ticket complexity and requirements:

```
## Recommended Next Steps

**For This Ticket (Large, 600+ LOC):**

### Option 1: Create Implementation Plan (Recommended)
```
/create-implementation-plan BS-152
```
**Why:** Complex feature with multiple components. Plan-based approach ensures:
- Clear phasing (store → UI → integration)
- Incremental progress with checkpoints
- Easier code review
- Lower risk

### Option 2: Research First
```
/research-feature-patterns product filtering
```
**Why:** Understand existing patterns before planning.
**Then:** Create plan with research insights.

---

**For Smaller Tickets (<400 LOC):**

### Option 3: Direct Implementation
```
/setup-nextjs-feature
```
**Why:** For simple, well-defined features.
**Use when:** Requirements clear, single component, < 400 LOC.

---

**Additional Actions:**

### Review Related Issues
- Check BS-148 for context
- Coordinate with BS-153 (dependent)

### Clarify Ambiguities
- Confirm price range max (10,000 DKK mentioned in comments)
- Verify mobile breakpoints with design

**Questions for Product/Design:**
- Should filters show product count? (e.g., "Electronics (234)")
- What happens when no products match filters?
- Should there be a "Clear all filters" button?

---

Would you like me to proceed with Option 1 (create plan)?
```

---

## Error Handling

### If Ticket Not Found

```
❌ Linear ticket not found: BS-999

**Possible reasons:**
- Ticket doesn't exist
- Ticket ID incorrect (check Linear)
- Missing Linear MCP permissions

**Suggestions:**
- Verify ticket ID in Linear app
- Check MCP connection: Linear server active?
- Try alternative format: /fetch-linear-ticket 152

Would you like to search Linear issues instead?
/search-linear-issues "product catalog"
```

### If MCP Not Available

```
❌ Linear MCP not available

**This command requires Linear MCP integration.**

**Setup instructions:**
1. Ensure Linear MCP is configured in Cursor
2. Verify Linear API token is valid
3. Check `.cursor/mcp.json` configuration

**Alternative:**
You can manually provide ticket details and I'll help plan:
/create-implementation-plan

Paste Linear ticket URL and acceptance criteria when prompted.
```

---

## Additional Features

### A. Fetch with Comments

```
/fetch-linear-ticket BS-152 --with-comments
```

Includes all comments (not just recent 3) for full context.

### B. Fetch Related Issues

```
/fetch-linear-ticket BS-152 --with-related
```

Automatically fetches and displays related issues (blockers, dependencies).

### C. Export to Plan Template

```
/fetch-linear-ticket BS-152 --export-plan
```

Automatically creates draft plan file with ticket details pre-filled.

---

## Tips for Best Results

1. **Always fetch tickets first** - Get latest details before planning
2. **Read comments** - Often contain important clarifications
3. **Check related issues** - Understand dependencies
4. **Clarify ambiguities** - Ask questions before planning
5. **Use recommendations** - Suggested workflow based on complexity

---

## Example: Complete Workflow

```
User: /fetch-linear-ticket BS-152

AI: [Fetches and displays ticket as shown above]

    Recommendation: Use plan-based workflow (600+ LOC)

    Proceed with /create-implementation-plan BS-152?

User: Yes

AI: [Starts create-implementation-plan command with BS-152 pre-loaded]
```

---

## Integration with Other Commands

### Typical Flow:

```
1. /fetch-linear-ticket BS-XXX
   ↓ Understand requirements

2. /research-feature-patterns
   ↓ Find similar code (if needed)

3. /create-implementation-plan BS-XXX
   ↓ Create detailed plan

4. /validate-plan
   ↓ Review plan

5. /execute-plan-phase [file] 1
   ↓ Start implementation
```

---

## Related Commands

- `/create-implementation-plan` - Create plan from ticket
- `/research-feature-patterns` - Research before planning
- `/update-linear-status` - Post updates back to Linear
- `/search-linear-issues` - Find related tickets (future command)

