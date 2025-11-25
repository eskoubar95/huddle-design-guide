# Update Linear Status

**Goal:** Post progress updates and change status of Linear issues via MCP.

**Context:**
- Uses Linear MCP integration (mcp_Linear_update_issue, mcp_Linear_create_comment)
- Quick updates during development
- Post phase completion to stakeholders
- Keep Linear in sync with actual progress

---

## Usage

```
/update-linear-status BS-XXX [update-type] [details]
```

**Examples:**
```
/update-linear-status BS-152 progress "Phase 1 complete"
/update-linear-status BS-152 status "Review"
/update-linear-status BS-152 phase-complete 1
/update-linear-status BS-152 blocked "Waiting on API docs"
```

**Parameters:**
- `issue-id`: Linear issue identifier (BS-XXX)
- `update-type`: progress | status | phase-complete | blocked | comment
- `details`: Update details (optional for some types)

---

## Update Types

### 1. Progress Comment

Post a progress update comment to Linear.

**Usage:**
```
/update-linear-status BS-152 progress "Started Phase 2 - UI components"
```

**Result:**
```
✅ Posted progress to BS-152

Comment:
---
🔄 Progress Update

Started Phase 2 - UI components

**Current Status:**
- Phase 1: ✅ Complete (Zustand store)
- Phase 2: 🔄 In Progress (UI components)
- Phase 3: ⏳ Pending (API integration)
- Phase 4: ⏳ Pending (Polish)

**Recent Changes:**
- Created filter store with Zustand
- All Phase 1 tests passing
- Ready to build UI components

**Next Steps:**
- Implement filter sidebar
- Add category dropdown
- Create price range slider

---
```

---

### 2. Status Change

Update Linear issue status.

**Usage:**
```
/update-linear-status BS-152 status "In Review"
```

**Interactive prompt:**
```
Current status: In Progress
New status: In Review

Available statuses:
- Todo
- In Progress
- In Review
- Done
- Blocked
- Cancelled

Confirm change to "In Review"? (y/n)
```

**Result:**
```
✅ Updated BS-152 status: In Progress → In Review

Posted comment:
---
📋 Status Update: In Review

PR created and ready for review:
[#123 - Product Catalog Filtering](https://github.com/beauty-shop/pull/123)

All phases complete:
- ✅ Phase 1: Zustand store
- ✅ Phase 2: UI components
- ✅ Phase 3: API integration
- ✅ Phase 4: Polish & testing

**Testing completed:**
- ✅ All automated tests pass
- ✅ Manual testing complete
- ✅ Accessibility verified
- ✅ Performance target met (1.8s avg)

Ready for code review!
---
```

---

### 3. Phase Complete

Post phase completion update (used with plan-based workflow).

**Usage:**
```
/update-linear-status BS-152 phase-complete 1
```

**Requires:**
- Plan file reference (auto-detected or prompt)

**Result:**
```
✅ Phase 1 complete - Posted to BS-152

Comment:
---
### Phase 1 Complete: Zustand Filter Store

**Status:** ✅ Completed
**Plan:** `.project/plans/2025-10-20-BS-152-product-catalog-filtering.md`

**Automated Verification:**
- ✅ Type check passed
- ✅ Lint passed
- ✅ Tests passed (12/12)
- ✅ Build passed

**Manual Verification:**
- ✅ Store working correctly
- ✅ State management functional
- ✅ DevTools integration confirmed
- ✅ No console errors

**Files Changed:**
- `lib/stores/filter-store.ts` (new)
- `lib/types/filters.ts` (new)

**Next:** Phase 2 - UI Components (starting now)

---
```

---

### 4. Blocked

Mark issue as blocked and explain blocker.

**Usage:**
```
/update-linear-status BS-152 blocked "Waiting for MedusaJS API documentation"
```

**Result:**
```
✅ Updated BS-152: Status → Blocked

Posted comment:
---
🚫 Issue Blocked

**Blocker:** Waiting for MedusaJS API documentation

**Impact:**
- Cannot implement Phase 3 (API integration) without docs
- Phase 1 and 2 complete and ready
- Estimated delay: 2-3 days

**Action Required:**
- Need API endpoint specification for product filtering
- Need cursor pagination details
- Need error response format

**Workaround:**
- Can proceed with Phase 2 UI (not blocked)
- Can create mock API responses for development

**Owner:** [tag relevant person/team]

---
```

Also updates issue status to "Blocked" in Linear.

---

### 5. Simple Comment

Post a simple comment without structured format.

**Usage:**
```
/update-linear-status BS-152 comment "Updated price range max to 10,000 DKK per design feedback"
```

**Result:**
```
✅ Posted comment to BS-152

Comment:
---
Updated price range max to 10,000 DKK per design feedback
---
```

---

## Interactive Mode

If called without parameters:

```
/update-linear-status BS-152
```

**Prompts:**
```
What type of update for BS-152?

1. Progress update - Post development progress
2. Status change - Change issue status
3. Phase complete - Mark phase done
4. Blocked - Mark as blocked
5. Comment - Simple comment

Select (1-5):
```

Then guides through prompts for selected type.

---

## Smart Features

### A. Auto-Detect Plan File

When posting phase completion:

```
Looking for plan file for BS-152...

Found: `.project/plans/2025-10-20-BS-152-product-catalog-filtering.md`

Use this plan? (y/n)
```

### B. PR Link Detection

If you recently created PR:

```
Detected recent PR: #123 - Product Catalog Filtering

Include PR link in update? (y/n)
```

### C. Progress Tracking

Maintains context of previous updates:

```
Last update: 2 days ago - "Phase 1 complete"

Progress since last update:
- Phase 2 completed
- 8 commits pushed
- 12 files changed
```

### D. Suggested Comments

Based on context, suggests comment templates:

```
Suggested comment:

"Phase 2 complete - UI components implemented. All components responsive and accessible. Moving to Phase 3 (API integration)."

Use this? (y/edit/n)
```

---

## Error Handling

### If Issue Not Found

```
❌ Linear issue not found: BS-999

Verify ticket ID and try again.
```

### If Invalid Status

```
❌ Invalid status: "InProgress"

Valid statuses:
- Todo
- In Progress
- In Review
- Done
- Blocked
- Cancelled

Did you mean: "In Progress"?
```

### If MCP Not Available

```
❌ Linear MCP not available

Cannot update Linear without MCP integration.

Alternative: Copy update text and post manually to Linear.
```

---

## Formatting Guidelines

All updates follow consistent formatting:

### Progress Updates:
```
🔄 Progress Update

[Summary]

**Current Status:**
[Phase breakdown with status icons]

**Recent Changes:**
[Bullet list]

**Next Steps:**
[Bullet list]
```

### Status Changes:
```
📋 Status Update: [New Status]

[Context/reason for change]

[Additional details]
```

### Phase Complete:
```
### Phase [N] Complete: [Phase Name]

**Status:** ✅ Completed
**Plan:** [link]

**Automated Verification:**
[Checklist]

**Manual Verification:**
[Checklist]

**Files Changed:**
[List]

**Next:** [Next phase]
```

### Blocked:
```
🚫 Issue Blocked

**Blocker:** [Description]

**Impact:**
[Bullet list]

**Action Required:**
[Bullet list]

**Workaround:**
[If any]
```

---

## Best Practices

### 1. Update Frequently
- After each phase completion
- Daily for active work
- When blocked or unblocked
- When status changes

### 2. Be Specific
- Link to commits/PRs
- Reference specific files
- Note test results
- Mention any issues

### 3. Use Consistent Format
- Follow formatting templates
- Use status icons (✅ 🔄 ⏳ ❌)
- Include context
- Make updates scannable

### 4. Tag People When Needed
- Blockers: tag person who can unblock
- Reviews: tag reviewers
- Questions: tag relevant team members

### 5. Link to Evidence
- PRs on GitHub
- Plans in .project/plans/
- Related Linear issues
- Documentation

---

## Integration with Other Commands

### Typical Flow:

```
1. /fetch-linear-ticket BS-152
   ↓

2. /create-implementation-plan BS-152
   ↓

3. /execute-plan-phase [file] 1
   ↓

4. /update-linear-status BS-152 phase-complete 1
   ↓ (Phase 1 update posted)

5. /execute-plan-phase [file] 2
   ↓

6. /update-linear-status BS-152 phase-complete 2
   ↓

7. /prepare-pr
   ↓

8. /create-pr-with-linear BS-152
   ↓ (Auto-updates Linear with PR link)

9. /update-linear-status BS-152 status "In Review"
   ↓ (Final status update)
```

---

## Tips for Best Results

1. **Update after each phase** - Keeps stakeholders informed
2. **Include test results** - Shows work quality
3. **Link to artifacts** - PRs, commits, plans
4. **Be honest about blockers** - Early warning helps
5. **Celebrate wins** - Mark completions clearly

---

## Related Commands

- `/fetch-linear-ticket` - Get ticket details first
- `/execute-plan-phase` - Often triggers status updates
- `/create-pr-with-linear` - Creates PR and updates Linear
- `/prepare-pr` - Before final status change to Review

