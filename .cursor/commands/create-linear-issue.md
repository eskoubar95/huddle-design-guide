# Create Linear Issue

**Goal:** Create new Linear issue from Cursor with proper formatting and automation labels

**Context:**
- Quick issue creation during development
- Auto-assigns appropriate labels (Area, Type, Automation)
- Links to code context automatically
- Uses Linear MCP: `mcp_Linear_create_issue`
- Inspired by [HumanLayer's linear.md](https://github.com/humanlayer/humanlayer/raw/refs/heads/main/.claude/commands/linear.md)

---

## Usage

```
/create-linear-issue [type] [title]
```

**Types:**
- `bug` - Bug found during development
- `feature` - Feature idea or enhancement
- `chore` - Maintenance or improvement
- `spike` - Research or investigation needed

**Examples:**
```
/create-linear-issue bug "Price filter validation broken"
/create-linear-issue feature "Add dark mode toggle"
/create-linear-issue chore "Upgrade dependencies"
/create-linear-issue spike "Research Next.js 15 migration"
```

---

## Interactive Process

### Step 1: Gather Information

I will interactively ask for:

**Required:**
- **Type:** bug | feature | chore | spike
- **Title:** Short, descriptive (10-100 chars)
- **Description:** What problem are we solving? (min 50 chars)

**Optional:**
- **Acceptance Criteria:** Clear, testable outcomes
- **Priority:** Auto-suggested based on type (1=Urgent, 2=High, 3=Normal, 4=Low)
- **Status:** Default "Backlog", option for "Planned" if ready

**Example interaction:**
```
AI: What is the problem to solve? (Describe the issue, not the solution)

User: Users cannot filter products by price range. The slider exists but validation fails when min > max.

AI: What are the acceptance criteria? (Leave empty to skip)

User: 
- Price range slider validates min < max
- Error message shown when validation fails
- Filter applies correctly to product list
- Tests cover edge cases

AI: Priority? (1=Urgent, 2=High, 3=Normal, 4=Low) [auto-suggested: 2]

User: [press enter to accept 2]

AI: Status? (Backlog | Planned) [Default: Backlog]

User: Planned
```

---

### Step 2: Auto-Detect Context

I will automatically detect:

**Current File Context:**
```
Analyzing current workspace...

Current file: /components/filters/PriceRangeFilter.tsx
Git branch: feature/BS-148-product-filters
Related files:
  - components/filters/CategoryFilter.tsx
  - lib/stores/filterStore.ts
  - app/products/page.tsx
```

**Suggested Area Label:**
- `analytics/` → Analytics
- `auth/`, `lib/clerk/` → Auth
- `lib/medusa/`, `api/` → Backend
- `cms/`, `payload/` → CMS
- `app/`, `components/` → Frontend
- `.github/`, `docker/`, config files → Infra
- `lib/stripe/`, `checkout/` → Payments

**Git Context:**
- Current branch name
- Recent commits (for related work)
- Unstaged changes (if any)

---

### Step 3: Intelligent Label Assignment

Based on your input, I will suggest labels:

**Area Labels** (auto-suggested from file paths):
```
Detected: components/filters/PriceRangeFilter.tsx
→ Suggest: Area:Frontend
```

**Type Labels** (based on issue type):
- `bug` → Type:Bug
- `feature` → Type:Feature
- `chore` → Type:Chore
- `spike` → Type:Spike

**Automation Labels** (intelligent suggestions):

**Suggest `copilot-ready` if:**
- ✅ Well-defined problem and AC
- ✅ < 400 LOC estimate (based on description)
- ✅ Clear technical context
- ✅ No complex UX decisions
- ✅ No auth/payments/PII involved

**Suggest `human-required` if:**
- ❌ > 400 LOC estimate
- ❌ Complex UX or brand decisions needed
- ❌ Vague or missing AC
- ❌ Novel patterns (not seen before)

**Suggest `needs-research` if:**
- ❌ Type is `spike`
- ❌ Uncertain technical approach
- ❌ Description contains "investigate", "research", "explore"

**Suggest `high-risk` if:**
- ❌ Mentions: auth, payment, PII, security, database migration
- ❌ Breaking changes
- ❌ Critical infrastructure

**Suggest `tech-debt` if:**
- ✅ Type is `chore`
- ✅ Mentions: refactor, cleanup, optimize, improve code quality

**Example output:**
```
## Suggested Labels

**Area:** Frontend (based on file path)
**Type:** Bug (from input)
**Automation:** copilot-ready ✅

Why copilot-ready?
- Clear problem statement with specific validation logic
- Estimated ~100 LOC (single component fix)
- Similar patterns exist in CategoryFilter.tsx
- No complex UX decisions needed

You can modify these labels before creating the issue.
```

---

### Step 4: Confirm & Create

**Confirmation prompt:**
```
## Ready to Create Linear Issue

**Title:** [Bug] Price filter validation broken
**Status:** Planned
**Priority:** High (2)
**Labels:** 
  - Area:Frontend
  - Type:Bug
  - copilot-ready

**Description:**
## Problem
Users cannot filter products by price range. The slider exists but validation fails when min > max.

## Acceptance Criteria
- Price range slider validates min < max
- Error message shown when validation fails
- Filter applies correctly to product list
- Tests cover edge cases

## Technical Context
**Current File:** components/filters/PriceRangeFilter.tsx
**Branch:** feature/BS-148-product-filters
**Pattern Reference:** components/filters/CategoryFilter.tsx (similar validation)

**Estimated Complexity:** ~100 LOC, 1-2 hours

---

Create this issue? (y/n)
```

---

### Step 5: Create via MCP

Once confirmed, I will use Linear MCP:

```typescript
mcp_Linear_create_issue({
  teamId: "beauty-shop-team-id",
  title: "[Bug] Price filter validation broken",
  description: "## Problem\n...\n## Acceptance Criteria\n...\n## Technical Context\n...",
  priority: 2,
  state: { name: "Planned" },
  labelIds: ["area-frontend-id", "type-bug-id", "copilot-ready-id"]
})
```

**Note:** Team ID and label IDs are retrieved from Linear MCP metadata.

---

### Step 6: Success Output

```
✅ Created Linear issue: BS-234

**Title:** [Bug] Price filter validation broken
**Status:** Planned
**Priority:** High
**Labels:** Area:Frontend, Type:Bug, copilot-ready
**URL:** https://linear.app/beauty-shop/issue/BS-234

---

## Next Steps

### Option 1: Copilot Implementation (Recommended for this issue)
This issue is tagged `copilot-ready` and will be synced to GitHub when Make.com detects:
- Status = Planned ✅
- Label = copilot-ready ✅

**After GitHub issue is created:**
```
/assign-copilot-to-issue [github-issue-number]
```

**GitHub Copilot will:**
- Create branch from main
- Implement validation fix
- Add tests
- Create PR

**Estimated time:** 5-15 minutes

---

### Option 2: Manual Implementation
If you prefer to implement manually:
```
/setup-nextjs-feature
```
Or create implementation plan for larger scope:
```
/create-implementation-plan BS-234
```

---

### Option 3: Start Immediately (Backlog items)
If issue is still in Backlog and you want to start now:
```
# Move to Planned first in Linear UI, then:
/fetch-linear-ticket BS-234
/setup-nextjs-feature
```

---

**Make.com Sync Status:**
- ⏳ Waiting for sync (checks every 5 minutes)
- ✅ Will sync when: Status=Planned + copilot-ready label
```

---

## Validation

**Pre-submission checks:**

**Title Validation:**
- ✅ Min 10 chars, max 100 chars
- ✅ Descriptive (not just "Fix bug")
- ⚠️ Warning if missing type prefix ([Bug], [Feature], etc.)

**Description Validation:**
- ✅ Min 50 chars
- ✅ Describes problem, not solution
- ⚠️ Warning if no "Problem" section
- ⚠️ Warning if too solution-focused

**Acceptance Criteria:**
- ⚠️ Warning if missing (recommended for all types)
- ⚠️ Warning if < 2 criteria (too vague)
- ⚠️ Warning if not testable

**Example validation warnings:**
```
⚠️ Validation Warnings

1. Description is solution-focused
   "Add validation logic to PriceRangeFilter component"
   
   Better approach: Describe the problem
   "Users can set invalid price ranges (min > max) with no error"

2. Missing technical context
   Add: Current file, related files, similar patterns

3. Acceptance criteria not specific enough
   Instead of: "Validation works"
   Better: "Error shown when min > max with message 'Minimum must be less than maximum'"

Continue anyway? (y/n)
```

---

## Error Handling

### Error 1: Linear MCP Not Available

```
❌ Linear MCP not available

This command requires Linear MCP integration.

**Setup:**
1. Check Linear MCP is configured in Cursor settings
2. Verify Linear API token is valid
3. Restart Cursor if needed

**Alternative:** Create issue manually in Linear UI
https://linear.app/beauty-shop
```

### Error 2: Invalid Team ID

```
❌ Could not find Beauty Shop team in Linear

**Possible causes:**
- Team ID not configured
- Missing permissions
- Wrong workspace

**Fix:** Verify team access in Linear settings
```

### Error 3: Label Not Found

```
⚠️ Label "copilot-ready" not found in Linear workspace

The issue will be created without this label.

**To add labels later:**
1. Go to Linear settings → Labels
2. Create missing labels (see label reference below)
3. Manually add to issue: BS-234

**Required labels for automation:**
- copilot-ready (blue) - Auto-assign to Copilot Workspace
- human-required (orange) - Requires human developer
- needs-research (purple) - Start with /research-feature-patterns
- high-risk (red) - Auth, payments, PII, breaking changes
- tech-debt (gray) - Code quality improvements

Continue without labels? (y/n)
```

---

## Label Reference

### Area Labels (7)

| Label | Color | Description | Path Pattern |
|-------|-------|-------------|--------------|
| **Analytics** | Purple | Analytics, tracking, metrics | `analytics/`, `lib/analytics/` |
| **Auth** | Blue | Authentication, authorization | `auth/`, `lib/clerk/` |
| **Backend** | Green | API, Medusa, backend logic | `lib/medusa/`, `api/` |
| **CMS** | Orange | Content management, Payload | `cms/`, `payload/` |
| **Frontend** | Cyan | Next.js, React, UI components | `app/`, `components/` |
| **Infra** | Gray | CI/CD, Docker, config | `.github/`, `docker/`, config files |
| **Payments** | Yellow | Stripe, checkout, payments | `lib/stripe/`, `checkout/` |

### Type Labels (4)

| Label | Color | Description |
|-------|-------|-------------|
| **Bug** | Red | Something broken or incorrect |
| **Feature** | Green | New functionality or enhancement |
| **Chore** | Gray | Maintenance, deps, tooling |
| **Spike** | Purple | Research, investigation, POC |

### Automation Labels (3)

| Label | Color | Description |
|-------|-------|-------------|
| **copilot-ready** | Blue | Ready for GitHub Copilot Workspace |
| **human-required** | Orange | Requires human developer (complex/brand-sensitive) |
| **needs-research** | Purple | Start with /research-feature-patterns |

### Risk Labels (3)

| Label | Color | Description |
|-------|-------|-------------|
| **high-risk** | Red | Auth, payments, PII, critical infrastructure |
| **tech-debt** | Gray | Code quality, refactoring |
| **breaking-change** | Orange | Non-backward compatible |

---

## Tips for Best Results

### 1. Focus on the Problem, Not the Solution

❌ **Bad:** "Add validation to PriceRangeFilter component"
✅ **Good:** "Users can set invalid price ranges (min > max) with no error feedback"

### 2. Provide Technical Context

Include:
- Current file(s) affected
- Related files with similar patterns
- Known constraints or dependencies

### 3. Write Testable Acceptance Criteria

❌ **Bad:** "Validation works"
✅ **Good:** "Error message 'Min must be < Max' shown when min > max"

### 4. Use Labels Strategically

- `copilot-ready` → Fast implementation for well-defined tasks
- `human-required` → Complex UX, brand decisions, >400 LOC
- `needs-research` → Uncertain approach, new patterns

### 5. Be Specific About Priority

- **Urgent (1):** Blocks launch, broken production
- **High (2):** Important for current sprint
- **Normal (3):** Should have
- **Low (4):** Nice to have

---

## Advanced Usage

### A. Create from Error Log

```
/create-linear-issue bug "TypeError in checkout flow" --from-error

AI: Paste error stack trace:

User: [pastes error]

AI: [Auto-extracts file, line, error type, creates issue with full context]
```

### B. Create from PR Review Comment

```
/create-linear-issue chore "Extract ProductCard validation logic" --from-pr-comment

AI: [Creates tech-debt issue with reference to PR and specific code]
```

### C. Bulk Create from Spec

```
/create-linear-issue feature "User authentication" --create-sub-issues

AI: Analyzes feature scope, suggests 3-5 sub-issues
User: Confirms
AI: Creates parent issue + linked sub-issues
```

---

## Integration with Workflow

### Typical Developer Flow:

```
1. Find bug during development
   ↓
2. /create-linear-issue bug "Description"
   ↓ (Creates BS-234 with copilot-ready label)
   ↓
3. Move to Planned in Linear
   ↓
4. Make.com syncs to GitHub (creates Issue #567)
   ↓
5. /assign-copilot-to-issue 567
   ↓ (Copilot implements, creates PR)
   ↓
6. Review & merge PR
   ↓
7. Linear auto-closes BS-234 (via Make.com)
```

---

## Related Commands

- `/fetch-linear-ticket` - Get ticket details after creation
- `/assign-copilot-to-issue` - Assign Copilot to synced GitHub issue
- `/update-linear-status` - Post updates to Linear
- `/research-feature-patterns` - Research before implementing (if needs-research)
- `/create-implementation-plan` - Create plan (if human-required, >400 LOC)

---

## HumanLayer Inspiration

This command is inspired by [HumanLayer's linear.md](https://github.com/humanlayer/humanlayer/raw/refs/heads/main/.claude/commands/linear.md) with these adaptations for Cursor:

**From HumanLayer:**
- ✅ "Problem to solve" principle (describe problem, not solution)
- ✅ Intelligent label suggestions based on context
- ✅ Auto-detection of file/code context
- ✅ Validation warnings before submission

**Cursor-Specific:**
- ✅ Direct Linear MCP integration (not API wrapper)
- ✅ Make.com + GitHub Copilot Workspace integration
- ✅ Plan-based workflow integration
- ✅ Beauty Shop specific labels and workflow

---

**Need help?** Run `/fetch-linear-ticket BS-234` after creating to verify details.

