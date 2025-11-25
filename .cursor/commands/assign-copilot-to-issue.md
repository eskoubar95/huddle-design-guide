# Assign Copilot to GitHub Issue

**Goal:** Assign GitHub Copilot Coding Agent to a GitHub issue after validation

**Context:**
- Uses GitHub MCP for automation
- Validates Linear issue is in "Planned" status before assignment
- Triggers Copilot via AssignCodingAgent MCP tool (or @mention fallback)
- Can be called manually after Make.com creates GitHub issue

---

## Usage

```
/assign-copilot-to-issue [issue-number] [optional-prompt]
```

**Examples:**
```
/assign-copilot-to-issue 123

/assign-copilot-to-issue 123 "Follow validation patterns in components/admin/"

/assign-copilot-to-issue 123 "Use Zod validation, ensure WCAG 2.1 AA compliance"
```

**Parameters:**
- `issue-number` - GitHub issue number (required)
- `optional-prompt` - Additional guidance for Copilot (optional)

---

## Process

### Step 1: Fetch GitHub Issue Details

**MCP Call:** `mcp_github_get_issue`

```
Fetching GitHub issue #123...

✅ Issue #123: [Bug] Price filter validation broken

Title: [Bug] Price filter validation broken
Status: Open
Labels: bug, frontend, copilot-ready
Created: 2025-10-20
Author: eskoubar95

Body (first 200 chars):
## Problem
Users cannot filter products by price range. The slider exists but 
validation fails when min > max...
```

---

### Step 2: Extract Linear Issue ID

I will search for Linear issue reference in:
- GitHub issue title: `[Bug] Price filter validation broken BS-456`
- GitHub issue body: `Linear: BS-456` or `BS-456`
- GitHub issue body: `https://linear.app/beauty-shop/issue/BS-456`

**Pattern matching:**
```
Analyzing GitHub issue #123...

Found Linear issue reference: BS-456

Pattern detected: "Linear: BS-456" in issue body
```

**If no Linear reference found:**
```
⚠️ No Linear issue reference found in GitHub issue #123

Cannot validate Linear status. This may cause issues because:
- Make.com expects Linear → GitHub sync
- Copilot should only work on planned issues
- Status validation provides safety check

**Options:**
1. Add "Linear: BS-XXX" to GitHub issue description
2. Continue without validation (not recommended)
3. Cancel and fix issue description first

Recommendation: Add Linear reference and try again

Continue without validation? (y/n)
```

---

### Step 3: Validate Linear Status

**MCP Call:** `mcp_Linear_get_issue({ id: "BS-456" })`

```
Checking Linear issue BS-456 status...

✅ Linear Status: Planned
✅ Has label: copilot-ready
✅ No blocking dependencies
✅ Ready for Copilot assignment
```

**Validation Checks:**

| Check | Required | Why |
|-------|----------|-----|
| **Status = "Planned"** | ✅ Yes | Make.com only syncs Planned issues |
| **Has "copilot-ready" label** | ⚠️ Warning | Indicates suitable for autonomous work |
| **No "needs-research" label** | ❌ Block | Research must be done first |
| **No "human-required" label** | ⚠️ Warning | May need human judgment |
| **No blocking dependencies** | ⚠️ Warning | May not be ready |

---

### Validation Examples

#### ✅ Pass - All Checks Green

```
✅ Validation Passed

Linear issue BS-456:
- Status: Planned ✅
- Label: copilot-ready ✅
- No blockers ✅

Proceeding with Copilot assignment...
```

#### ❌ Fail - Wrong Status

```
❌ Cannot assign Copilot to issue #123

**Problem:** Linear issue BS-456 is in "Backlog" status (must be "Planned")

**Why this matters:**
- Make.com only syncs issues in "Planned" status
- Copilot should only work on planned, ready issues  
- Prevents accidental implementation of unplanned work

**Fix:**
1. Go to Linear: https://linear.app/beauty-shop/issue/BS-456
2. Move status to "Planned"
3. Try again: /assign-copilot-to-issue 123

**Alternative:** If issue is not ready, implement manually:
/create-implementation-plan BS-456
```

#### ⚠️ Warning - Missing copilot-ready Label

```
⚠️ Linear issue BS-456 does not have "copilot-ready" label

This issue may not be suitable for Copilot because:
- Complex UX decisions required
- Brand-sensitive content
- >400 LOC estimate
- Missing clear acceptance criteria

**Current labels:** Area:Frontend, Type:Bug, human-required

**Recommendation:**
- Use /create-implementation-plan for structured human implementation
- Or add "copilot-ready" label if you believe Copilot can handle it

**Options:**
1. Cancel and add "copilot-ready" label in Linear
2. Cancel and implement manually: /create-implementation-plan
3. Continue anyway (Copilot may struggle)

Continue? (y/n)
```

#### ❌ Fail - needs-research Label

```
❌ Cannot assign Copilot to issue #123

**Problem:** Linear issue BS-456 has "needs-research" label

**Why this blocks Copilot:**
- Research/investigation needed before implementation
- Approach is unclear or uncertain
- May require exploring multiple solutions

**Next Steps:**
1. Complete research first: /research-feature-patterns
2. Update Linear issue with findings
3. Remove "needs-research" label
4. Add "copilot-ready" or "human-required" based on complexity
5. Try again: /assign-copilot-to-issue 123

**Or implement manually:**
/create-implementation-plan BS-456
```

#### ⚠️ Warning - human-required Label

```
⚠️ Linear issue BS-456 has "human-required" label

**This indicates:**
- Complex UX or brand decisions needed
- Human judgment required
- Not suitable for autonomous agent
- Likely >400 LOC

**Recommended approach:**
- /create-implementation-plan for structured human implementation
- Break into phases with checkpoints
- Or remove "human-required" if Copilot can handle

**Why you might want to continue:**
- You want to let Copilot try first
- Issue is simpler than expected
- You'll review carefully before merge

Continue with Copilot anyway? (y/n)
```

---

### Step 4: Assign Copilot via MCP

Once validation passes, I will attempt Copilot assignment.

**Option A: If AssignCodingAgent MCP Tool Exists**

```
Assigning GitHub Copilot Coding Agent...

Calling: mcp_github_AssignCodingAgent({
  owner: "eskoubar95",
  repo: "beauty-shop",
  issue_number: 123,
  base_branch: "main",
  optional_prompt: "Follow the technical context in the issue description. Use patterns from .cursor/rules/ and reference similar implementations mentioned in the issue."
})

⏳ Waiting for Copilot to accept assignment...

✅ Copilot Coding Agent assigned to issue #123!
```

**Option B: Fallback if AssignCodingAgent Does NOT Exist**

```
Note: AssignCodingAgent MCP tool not available. Using @mention fallback.

Assigning via @mention...

Calling: mcp_github_add_issue_comment({
  owner: "eskoubar95",
  repo: "beauty-shop",
  issue_number: 123,
  body: "@copilot Please implement this issue following the technical context in the description.\n\nAdditional guidance:\n- Follow patterns from .cursor/rules/\n- Reference similar implementations in the issue\n- Ensure tests are added for new functionality\n\nBase branch: main"
})

✅ Copilot triggered via @mention on issue #123

**Note:** Copilot will respond to the @mention and begin work.
Monitor the issue for Copilot's response.
```

---

### Step 5: Update Linear with Progress

**MCP Call:** `mcp_Linear_create_comment({ issueId: "BS-456", body: "..." })`

```
Posting update to Linear issue BS-456...

Comment:
"🤖 GitHub Copilot has been assigned to GitHub Issue #123

**Assignment Details:**
- GitHub Issue: #123
- Base Branch: main
- Status: Copilot will create branch and begin implementation

**What Copilot will do:**
1. Create feature branch from main
2. Implement changes per acceptance criteria
3. Add/update tests
4. Create PR when complete

**Monitor progress:**
https://github.com/eskoubar95/beauty-shop/issues/123

Expected completion: 5-15 minutes
"

✅ Linear issue updated
```

---

### Step 6: Confirmation Output

```
═══════════════════════════════════════════════════════════
✅ Successfully assigned GitHub Copilot to issue #123!
═══════════════════════════════════════════════════════════

## What Copilot Will Do

1. ✅ Read issue description and technical context
2. ✅ Create new branch from: main
3. ✅ Implement changes following patterns mentioned
4. ✅ Add/update tests
5. ✅ Run linter and type checks
6. ✅ Create PR back to main

## Monitor Progress

**GitHub Issue:** https://github.com/eskoubar95/beauty-shop/issues/123
**Pull Requests:** https://github.com/eskoubar95/beauty-shop/pulls

**Linear Issue:** BS-456 (Status will update to "In Progress" when Copilot starts)

## Copilot Configuration

**Base Branch:** main
**Optional Prompt:** Follow patterns from .cursor/rules/
**Estimated Time:** 5-15 minutes (depending on complexity)

## Next Steps

### 1. Monitor Copilot Progress
- Watch GitHub issue for Copilot's activity
- Copilot will comment with updates
- You'll be @mentioned when PR is ready

### 2. Review PR When Ready
- Copilot will create PR following Beauty Shop conventions
- PR will include:
  - Conventional Commit messages
  - Tests for new functionality
  - Link to Linear issue BS-456
  - Description following template

### 3. If Copilot Gets Stuck
If no progress after 30 minutes:

**Option A:** Take over manually
```
/fetch-linear-ticket BS-456
/create-implementation-plan BS-456
/execute-plan-phase [plan-file] 1
```

**Option B:** Provide additional guidance
```
# Comment on GitHub issue #123 with more context:
@copilot Here's additional context: [specific guidance]
```

**Option C:** Restart with different prompt
```
# Close Copilot's current attempt, then:
/assign-copilot-to-issue 123 "More specific prompt here"
```

---

## Advanced: Custom Prompt

Estimated time: 5-15 minutes
═══════════════════════════════════════════════════════════
```

---

## Advanced Usage

### Custom Prompt Examples

**Example 1: Specify Pattern to Follow**
```
/assign-copilot-to-issue 123 "Follow the validation pattern in components/admin/ProductFilters.tsx"

Copilot receives:
"Follow the validation pattern in components/admin/ProductFilters.tsx. Follow the technical context in the issue description. Use patterns from .cursor/rules/"
```

**Example 2: Multiple Constraints**
```
/assign-copilot-to-issue 123 "Use Zod for validation, ensure WCAG 2.1 AA compliance, add comprehensive tests"

Copilot receives detailed guidance on:
- Validation library (Zod)
- Accessibility standards (WCAG 2.1 AA)
- Test coverage requirements
```

**Example 3: Reference Similar Implementation**
```
/assign-copilot-to-issue 123 "Similar to CategoryFilter implementation in components/filters/, reuse validation helpers from lib/validation/filters.ts"

Copilot will:
- Examine CategoryFilter pattern
- Reuse existing validation helpers
- Maintain consistency with codebase
```

**Example 4: Performance Constraints**
```
/assign-copilot-to-issue 123 "Optimize for performance: debounce user input, use React.memo, ensure < 50ms render time"
```

---

## Error Handling

### Error 1: GitHub Issue Not Found

```
❌ Issue #999 not found in eskoubar95/beauty-shop

**Possible causes:**
- Issue number is incorrect
- Issue was deleted
- Wrong repository

**Fix:**
- Verify issue number on GitHub
- Check repository: https://github.com/eskoubar95/beauty-shop/issues
- Try again with correct issue number
```

### Error 2: No Linear Reference

**Already shown in Step 2** - See "If no Linear reference found" section.

### Error 3: Linear Issue Not Found

```
❌ Linear issue BS-456 not found

**Possible causes:**
- Issue ID incorrect in GitHub issue body
- Issue was deleted in Linear
- Wrong workspace

**Fix:**
1. Verify Linear issue exists: https://linear.app/beauty-shop
2. Update GitHub issue #123 with correct Linear ID
3. Try again: /assign-copilot-to-issue 123
```

### Error 4: MCP Tool Failure

```
❌ Failed to assign Copilot via MCP

**Error:** [MCP error message]

**Possible causes:**
- GitHub MCP not configured correctly
- Network connectivity issue
- Copilot Workspace not enabled for this repo

**Fallback Options:**

### Option 1: Manual @mention
Go to GitHub issue #123 and comment:
```
@copilot Please implement this issue following the technical context.
```

### Option 2: Implement Manually
```
/create-implementation-plan BS-456
```

### Option 3: Retry
```
# Wait 1 minute, then:
/assign-copilot-to-issue 123
```

**If error persists:** Check Cursor MCP settings and GitHub integration.
```

### Error 5: Copilot Not Available for Repo

```
❌ GitHub Copilot Workspace not available for this repository

**Possible causes:**
- Copilot Workspace not enabled
- Organization settings restrict Copilot
- Repository not eligible

**Fix:**
1. Check GitHub org settings → Copilot
2. Enable Copilot Workspace for beauty-shop repo
3. Or implement manually: /create-implementation-plan BS-456

**Reference:** https://docs.github.com/en/copilot/github-copilot-workspace
```

---

## Safety Features

### 1. Status Validation
- ❌ **Blocks assignment** if Linear status != "Planned"
- **Why:** Ensures only planned work is implemented

### 2. Label Validation
- ⚠️ **Warns** if missing "copilot-ready" label
- ❌ **Blocks** if "needs-research" label exists
- **Why:** Prevents Copilot from working on unsuitable issues

### 3. Dependency Check
- ⚠️ **Warns** if Linear issue has blocking dependencies
- **Why:** Implementation may fail without dependencies resolved

### 4. Complexity Warning
- ⚠️ **Warns** if "human-required" label exists
- **Why:** Complex issues may need human judgment

### 5. Linear Comment Audit Trail
- ✅ **Always posts** update to Linear
- **Why:** Maintains traceability of Copilot assignments

---

## Integration with Workflow

### Complete Workflow: Linear → GitHub → Copilot

```
1. Create Linear issue with /create-linear-issue
   ↓
2. Tag with "copilot-ready" label
   ↓
3. Move to "Planned" status
   ↓
4. Make.com monitors Linear webhooks
   ↓
5. Make.com creates GitHub Issue #123
   ↓
6. Make.com posts comment in Linear: "GitHub Issue #123 created"
   ↓
7. Developer runs: /assign-copilot-to-issue 123
   ↓
8. Command validates Linear status = Planned ✅
   ↓
9. Command assigns Copilot via MCP
   ↓
10. Command posts update to Linear
   ↓
11. Copilot creates branch, implements, creates PR
   ↓
12. Developer reviews PR (standard process)
   ↓
13. PR merged → Linear auto-closes via Make.com
```

---

## Copilot vs. Human Decision Tree

Use this command when:

✅ **Copilot-Ready Issues:**
- Clear acceptance criteria
- < 400 LOC estimate
- Similar patterns exist in codebase
- No complex UX decisions
- Repetitive work (CRUD, forms, API endpoints)

❌ **Human-Required Issues:**
- > 400 LOC estimate
- Complex UX or brand decisions
- Novel patterns (never seen before)
- Auth, payments, or PII handling
- Architecture changes

**For Human-Required:** Use `/create-implementation-plan` instead.

---

## Tips for Best Results

### 1. Ensure Linear Issue Quality

Before assigning Copilot:
- ✅ Clear problem statement
- ✅ Specific acceptance criteria (not vague)
- ✅ Technical context (file paths, patterns to follow)
- ✅ Expected outcome defined

**Bad Linear issue:**
```
Title: Fix the filter
Description: The filter doesn't work.
```

**Good Linear issue:**
```
Title: [Bug] Price filter validation broken
Description:
## Problem
Users can set min > max with no validation error.

## Acceptance Criteria
- Error shown when min > max
- Message: "Minimum must be less than maximum"
- Filter disabled until valid
- Tests cover edge cases

## Technical Context
File: components/filters/PriceRangeFilter.tsx
Pattern: components/filters/CategoryFilter.tsx (similar validation)
```

### 2. Use Custom Prompts for Specificity

Generic assignment:
```
/assign-copilot-to-issue 123
```

Better with prompt:
```
/assign-copilot-to-issue 123 "Follow CategoryFilter pattern, use Zod for validation, ensure min/max are numbers"
```

### 3. Monitor Copilot Progress

- Check GitHub issue for Copilot comments
- Copilot will update with progress
- Typically takes 5-15 minutes
- If > 30 minutes, consider manual takeover

### 4. Review Copilot PRs Carefully

Copilot PRs follow same review process:
- ✅ Automated checks (lint, type, test, build)
- ✅ AI review (BugBot/Copilot reviewer)
- ✅ Human review (min 1 approval)
- ⚠️ Verify Copilot understood requirements correctly

### 5. Provide Feedback

If Copilot's implementation is wrong:
- Comment on PR with specific feedback
- Copilot can iterate based on review comments
- Or close PR and implement manually

---

## Metrics to Track

**Copilot Success Rate:**
- % of Copilot PRs merged without major revisions
- Target: 70%+

**Time to PR:**
- Copilot vs. human implementation time
- Target: 2x faster with Copilot

**Code Quality:**
- Lint errors, test coverage, type safety
- Target: Same quality as human code

---

## Related Commands

- `/create-linear-issue` - Create Linear issue with copilot-ready label
- `/fetch-linear-ticket` - View Linear ticket details before assigning
- `/update-linear-status` - Post updates to Linear during Copilot work
- `/create-implementation-plan` - Manual implementation (human-required)
- `/research-feature-patterns` - Research before Copilot (needs-research)

---

## FAQ

**Q: Can I assign multiple issues to Copilot at once?**
A: Yes, but run command separately for each issue. Copilot handles them in parallel.

**Q: What if Copilot fails to complete the task?**
A: You'll be notified. Take over manually with `/create-implementation-plan`.

**Q: Can I guide Copilot mid-implementation?**
A: Yes, comment on the GitHub issue with additional context or corrections.

**Q: Does this work with any GitHub issue?**
A: Works best with issues synced from Linear (via Make.com) with proper structure.

**Q: What if I don't have AssignCodingAgent MCP tool?**
A: Command falls back to @mention method. Copilot still works, just different trigger.

---

**Need help?** Check Linear issue status with `/fetch-linear-ticket BS-XXX` or see full workflow in `PLAN-BASED-WORKFLOW.md`.

