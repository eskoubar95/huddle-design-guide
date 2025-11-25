# Plan-Based Development Workflow

**New in October 2025** - 15 commands inspired by [HumanLayer](https://github.com/humanlayer/humanlayer/tree/main/.claude/commands), adapted for Cursor capabilities.

## Overview

For large features (>400 LOC) or complex changes, use this structured workflow that breaks work into phases with verification checkpoints.

### When to Use

- ✅ Features > 400 LOC or > 20 files
- ✅ Multi-component features (backend + frontend + database)
- ✅ Complex refactoring touching many files
- ✅ Risky changes requiring phased rollout
- ✅ Features with unclear requirements needing research

**For smaller features (< 400 LOC):** Use direct commands like `/setup-nextjs-feature`.

---

## Complete Workflow

```
1. /fetch-linear-ticket BS-152
   ↓ Get Linear ticket with acceptance criteria, technical notes

2. /research-feature-patterns [feature-description]
   ↓ Find similar code, patterns, reusable components

3. /create-implementation-plan BS-152
   ↓ Interactive planning → .project/plans/YYYY-MM-DD-BS-XXX-name.md

4. /validate-plan [plan-file]
   ↓ Review plan completeness, dependencies, scope

5. /execute-plan-phase [plan-file] 1
   ↓ Implement Phase 1
   ↓ Run automated checks (type, lint, test, build)
   ↓ ⚠️ PAUSE for manual testing

6. /update-linear-status BS-152 phase-complete 1
   ↓ Post progress to Linear with details

7. /execute-plan-phase [plan-file] 2
   ↓ Continue with Phase 2... (repeat 5-7 for each phase)

8. /prepare-pr
   ↓ Pre-PR quality checks (code, size, git, security, docs)

9. /create-pr-with-linear BS-152
   ↓ Create PR, link Linear, update status to "Review"

10. [Review & Merge]
```

---

## Directory Structure

```
.project/
├── plans/                    # 🆕 Implementation plans directory
│   ├── README.md            # How to use plans
│   ├── template.md          # HumanLayer-style plan template
│   └── 2025-10-20-BS-152-product-filtering.md  # Actual plans
```

**Plan naming:** `YYYY-MM-DD-BS-XXX-feature-name.md`

---

## Commands Reference

### 1. Plan-Based Commands (3)

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `/create-implementation-plan` | Create phase-based plan | Linear ticket BS-XXX or feature description | Plan file in `.project/plans/` |
| `/execute-plan-phase` | Implement one phase | Plan file + phase number | Code changes + verification |
| `/validate-plan` | Review plan quality | Plan file | Validation report with issues |

---

### 2. Linear Integration (3)

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `/create-linear-issue` | Create Linear issue with labels | Type + title + description | Linear issue + automation labels |
| `/fetch-linear-ticket` | Get ticket details | BS-XXX | Formatted ticket + complexity analysis |
| `/update-linear-status` | Post updates to Linear | BS-XXX + update type | Linear comment/status change |

---

### 3. GitHub Workflow (6)

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `/assign-copilot-to-issue` | Assign GitHub Copilot to issue | GitHub issue number | Copilot assignment + Linear update |
| `/prepare-pr` | Pre-PR quality gate | Current branch | Readiness report with issues |
| `/create-pr-with-linear` | Create PR + link Linear | BS-XXX | GitHub PR + Linear updates |
| `/pr-size-analyzer` | Analyze PR size | Current branch | Size metrics + split suggestions |
| `/validate-commits` | Check commit messages | Current branch | Validation + fix suggestions |
| `/cleanup-branch` | Remove debug code | Current branch | Cleaned files or report |

---

### 4. Code Quality (4)

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `/research-feature-patterns` | Research before planning | Feature description | Patterns, components, recommendations |
| `/review-pr-self` | Self-review assistant | Current branch | File-by-file review with suggestions |
| `/add-tests-for-changes` | Generate missing tests | Current branch | Test files with coverage analysis |
| `/update-docs-from-changes` | Update documentation | Current branch | Doc updates (README, JSDoc, etc.) |

---

### 5. Session Management (1)

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `/resume-task` | Resume work across chat sessions | BS-XXX | Complete task context + next steps |

**Use when:**
- Chat context limit hit (80+ messages)
- Switching between task phases
- Picking up work after a break
- Handing off to another developer
- Need to reconstruct progress

**Reconstructs from:**
- Linear issue (status, comments via MCP)
- Git history (commits, branches, changes)
- Implementation plan (plan vs. actual progress)
- GitHub PR status (via MCP)
- Uncommitted changes (working directory)

---

## Detailed Command Documentation

### `/create-implementation-plan`

**Inspired by:** [HumanLayer's create_plan.md](https://raw.githubusercontent.com/humanlayer/humanlayer/refs/heads/main/.claude/commands/create_plan.md)

**Interactive Process:**
1. **Context Gathering** - Fetch Linear ticket, read project docs
2. **Research & Discovery** - Find similar features using codebase_search
3. **Plan Structure** - Propose phases, get approval
4. **Detailed Plan** - Write specifics with file paths and code examples
5. **Validation** - Review and refine

**Plan Template Includes:**
- Linear issue integration (auto-fetched)
- Current state analysis with code references
- Desired end state specification
- **"What We're NOT Doing"** section (critical!)
- Phase-by-phase breakdown with:
  - Overview
  - Changes required (file paths + code snippets)
  - Success criteria: Automated vs Manual
  - **⚠️ PAUSE points** for approval
- Testing strategy
- Rollback plan
- References

**Example Usage:**
```
User: /create-implementation-plan BS-152

AI: Fetching Linear BS-152... Found: "Product Catalog Filtering"

    Researching similar features...
    - Found: components/admin/ProductFilters.tsx (similar pattern)
    - Found: lib/stores/cart-store.ts (Zustand pattern to follow)
    
    Proposed structure:
    Phase 1: Zustand Filter Store (~150 LOC)
    Phase 2: UI Components (~200 LOC)
    Phase 3: API Integration (~100 LOC)
    Phase 4: Polish & Testing (~80 LOC)
    
    Looks good? (y/n)

User: y

AI: [Writes detailed plan to .project/plans/2025-10-20-BS-152-product-catalog-filtering.md]

    ✅ Plan created!
    Post link to Linear BS-152? (y/n)
```

---

### `/execute-plan-phase`

**Inspired by:** [HumanLayer's implement_plan.md](https://raw.githubusercontent.com/humanlayer/humanlayer/refs/heads/main/.claude/commands/implement_plan.md)

**Phase-by-Phase Implementation:**
1. Read plan and display phase overview
2. Implement all changes for the phase
3. Run automated checks:
   - `npm run type-check`
   - `npm run lint`
   - `npm run test`
   - `npm run build`
4. **⚠️ PAUSE** - Request manual testing
5. Post progress to Linear (optional)
6. Offer to continue to next phase

**Why Phase-by-Phase:**
- ✅ Incremental progress with early feedback
- ✅ Catch issues early (easier to fix)
- ✅ Smaller, focused PRs (easier review)
- ✅ Can rollback to last successful phase
- ✅ Clear checkpoints for stakeholders

**Example:**
```
User: /execute-plan-phase 2025-10-20-BS-152-product-catalog.md 1

AI: ## Phase 1: Zustand Filter Store
    
    Creating:
    - lib/stores/filter-store.ts
    - lib/types/filters.ts
    
    [Code generated...]
    
    ## Automated Verification:
    Running: npm run type-check → ✅ Passed
    Running: npm run lint → ✅ Passed
    Running: npm run test → ✅ 12/12 passed
    Running: npm run build → ✅ Succeeded
    
    ## Manual Verification Required:
    Please test:
    - [ ] Store imports correctly
    - [ ] State updates in React DevTools
    - [ ] DevTools shows "FilterStore"
    
    ⚠️ PAUSE - Complete manual testing before Phase 2
    
    All tests passed? (y/n)
```

---

### `/validate-plan`

**Inspired by:** [HumanLayer's validate_plan.md](https://raw.githubusercontent.com/humanlayer/humanlayer/refs/heads/main/.claude/commands/validate_plan.md)

**Validation Criteria:**
1. **Scope & Requirements** - Clear overview, AC, "What We're NOT Doing"
2. **Phase Structure** - Logical order, reasonable size (< 500 LOC/phase)
3. **Technical Detail** - Specific file paths, code examples, patterns
4. **Success Criteria** - Automated vs Manual, measurable
5. **Dependencies** - Internal/external dependencies identified
6. **Edge Cases & Risks** - Error handling, performance, security
7. **Standards Compliance** - Follows `.cursor/rules/`

**Example Output:**
```
# Plan Validation Report
**Plan:** 2025-10-20-BS-152-product-catalog.md
**Overall:** ⚠️ NEEDS REVISION
**Score:** 75/100

## Issues Found: 3

### 🔴 Critical:
1. Missing error handling in Phase 3 (API integration)
   → Add error states, retry logic, user messages

### ⚠️ Warnings:
2. Phase 2 too large (650 LOC)
   → Split into Phase 2A (components) and 2B (integration)

3. Vague manual criteria: "Test that it works"
   → Specify: "Click filter, verify products update, check network tab"

## Recommendations:
1. Fix critical issue #1 before implementation
2. Address warnings #2 and #3
3. Re-validate after changes

Fix issues? (y/n)
```

---

## MCP Integration

All commands use Linear and GitHub MCP when applicable:

### Linear MCP Tools:
- `mcp_Linear_get_issue` - Fetch ticket details
- `mcp_Linear_create_comment` - Post updates
- `mcp_Linear_update_issue` - Change status

### GitHub MCP Tools:
- `mcp_github_create_pull_request` - Create PR
- `mcp_github_list_commits` - Get commit history

**Note:** MCP integration is transparent - commands use it automatically when available.

---

## GitHub Copilot Integration

### When to Use Copilot vs. Plan-Based Workflow

**Use Copilot Workspace** (`/assign-copilot-to-issue`):
- ✅ Well-defined, < 400 LOC tasks
- ✅ Clear patterns already exist in codebase
- ✅ Repetitive work (CRUD, forms, API endpoints)
- ✅ No complex UX or brand decisions

**Use Plan-Based Workflow** (`/create-implementation-plan`):
- ✅ Complex features > 400 LOC
- ✅ Multi-component features (backend + frontend + database)
- ✅ Novel implementations (no existing patterns)
- ✅ Requires phased rollout or careful planning

### Copilot Assignment Workflow

1. **Create Linear Issue:**
   ```
   /create-linear-issue feature "Add product variant selector"
   
   → Creates BS-234 with "copilot-ready" label
   ```

2. **Move to Planned:**
   - Manually move Linear issue to "Planned" status
   - Make.com auto-creates GitHub Issue #123

3. **Assign Copilot:**
   ```
   /assign-copilot-to-issue 123
   
   → Validates Linear status = Planned
   → Triggers GitHub Copilot Workspace
   → Posts update to Linear
   ```

4. **Monitor Progress:**
   - Copilot creates branch, implements, tests, creates PR
   - Review PR when ready (standard process)

### Hybrid Approach: Human + Copilot

**Large feature with small, well-defined sub-tasks:**

1. **Human creates implementation plan:**
   ```
   /create-implementation-plan
   → Creates plan with 5 phases
   ```

2. **Human implements complex phases (1-2):**
   ```
   /execute-plan-phase 1
   → Database schema + migrations
   
   /execute-plan-phase 2
   → Backend API endpoints
   ```

3. **Copilot implements repetitive phases (3-5):**
   - Create Linear sub-issues for each phase
   - Tag with "copilot-ready"
   - Move to "Planned"
   - Run `/assign-copilot-to-issue` for each

**Result:** Human focuses on architecture, Copilot handles implementation details.

---

## Package.json Updates

New script added for pre-PR checks:

```json
{
  "scripts": {
    "pre-pr": "npm run check && npm run build"
  }
}
```

Run manually: `npm run pre-pr` or use `/prepare-pr` command.

---

## Tips & Best Practices

### Planning:
1. **Research first** - Use `/research-feature-patterns` before planning
2. **Be thorough** - Good plans save time in implementation
3. **No open questions** - Resolve all unknowns during planning
4. **Scope guard** - Always include "What We're NOT Doing"

### Implementation:
1. **One phase at a time** - Never skip phases
2. **Respect pause points** - Test thoroughly between phases
3. **Update Linear** - Keep stakeholders informed
4. **Commit per phase** - Easier to rollback if needed

### PR Creation:
1. **Prepare first** - Run `/prepare-pr` before creating PR
2. **Check size** - Use `/pr-size-analyzer` if unsure
3. **Clean commits** - Use `/validate-commits` to check messages
4. **Self-review** - Use `/review-pr-self` before requesting review

---

## Comparison: Cursor vs Claude Code

HumanLayer's original commands were built for Claude Code with capabilities Cursor doesn't have:

| Feature | Claude Code | Cursor (Our Adaptation) |
|---------|-------------|-------------------------|
| Sub-agents | ✅ Yes | ❌ No |
| Parallel research | ✅ Automatic | 🔄 Interactive guided |
| Thoughts directory | ✅ Yes | ❌ No (use `.project/plans/`) |
| TodoWrite | ✅ Yes | 🔄 Markdown checkboxes |
| MCP integration | ✅ Yes | ✅ Yes |

**Our Solution:**
- Replace sub-agents with **interactive, step-by-step wizards**
- Use `codebase_search` instead of parallel research agents
- Store plans in `.project/plans/` instead of thoughts directory
- Use markdown checkboxes for todos instead of TodoWrite
- Keep full MCP integration (Linear + GitHub)

---

## Examples

### Example 1: Simple Feature (Direct)

**Scenario:** Add a "Clear Cart" button (< 100 LOC)

```
/setup-nextjs-feature

Feature: Clear cart button
Route: None (add to existing cart page)
```

**No plan needed** - too small, straightforward.

---

### Example 2: Medium Feature (Consider Plan)

**Scenario:** Product filtering (~ 500 LOC, 12 files)

```
1. /fetch-linear-ticket BS-152
2. /create-implementation-plan BS-152
   → Creates plan with 4 phases
3. /execute-plan-phase [file] 1-4
   → Implement phase by phase
4. /create-pr-with-linear BS-152
```

**Plan recommended** - crosses threshold, multi-component.

---

### Example 3: Large Feature (Must Plan)

**Scenario:** Complete checkout flow (>1000 LOC, 25+ files)

```
1. /fetch-linear-ticket BS-160
2. /research-feature-patterns checkout flow
   → Find patterns, constraints
3. /create-implementation-plan BS-160
   → Creates plan with 6 phases
4. /validate-plan [file]
   → Check plan quality
5. /execute-plan-phase [file] 1
6. /update-linear-status BS-160 phase-complete 1
7. /execute-plan-phase [file] 2
   ... continue for all phases
8. /pr-size-analyzer
   → Check if should split into multiple PRs
9. /create-pr-with-linear BS-160 (or split into 2-3 PRs)
```

**Plan required** - too large, too complex, too risky without structure.

---

## References

- **Inspiration:** [HumanLayer Commands](https://github.com/humanlayer/humanlayer/tree/main/.claude/commands)
- **Key Sources:**
  - [create_plan.md](https://raw.githubusercontent.com/humanlayer/humanlayer/refs/heads/main/.claude/commands/create_plan.md)
  - [implement_plan.md](https://raw.githubusercontent.com/humanlayer/humanlayer/refs/heads/main/.claude/commands/implement_plan.md)
  - [validate_plan.md](https://raw.githubusercontent.com/humanlayer/humanlayer/refs/heads/main/.claude/commands/validate_plan.md)
- **Beauty Shop Rules:** `.cursor/rules/` for coding standards
- **Project Docs:** `.project/` for context

---

## Questions?

- **Slack:** #dev-tooling channel
- **Linear:** Tag @nicklas with questions
- **Documentation:** See `.cursor/commands/README.md` for all commands

---

**Last Updated:** October 20, 2025  
**Maintainer:** Nicklas Eskou

