# Resume Task

**Goal:** Resume work on an existing task by analyzing Linear issue, git history, plan progress, and code changes to provide complete context for continuing work in a new chat.

**Source:** Inspired by [HumanLayer's resume_handoff.md](https://raw.githubusercontent.com/humanlayer/humanlayer/refs/heads/main/.claude/commands/resume_handoff.md), adapted for Cursor with Linear + GitHub MCP integration.

**Context:**
- Solves chat context limits for long tasks
- Reconstructs progress from objective sources (Linear, git, plan files)
- Provides actionable next steps
- No manual summarization needed
- Works across multiple chat sessions

---

## Usage

```
/resume-task [issue-id]
```

**Examples:**
```
/resume-task CORE-4
/resume-task BS-152
/resume-task CORE-15
```

**Parameter:**
- `issue-id`: Linear issue ID (CORE-XXX or BS-XXX)

---

## Process

### Step 1: Fetch Linear Issue Status

**MCP Call:** `mcp_Linear_get_issue`

```
Fetching Linear issue CORE-4...

✅ Found: CORE-4 - GitHub Repository Setup

**Current Status:** In Progress
**Assignee:** @nicklas
**Priority:** High
**Labels:** human-required, Infra
**Created:** 2025-10-15
**Updated:** 2025-10-21 19:30
**URL:** https://linear.app/beauty-shop/issue/CORE-4
```

**Extract key info:**
- Current status (Backlog/Planned/In Progress/Review/Done)
- Last updated timestamp
- Assignee
- Recent comments (last 3-5)
- Linked GitHub PRs or issues

---

### Step 2: Find Implementation Plan

**Search for plan file:**

```
Searching for implementation plan...

✅ Found: .project/plans/2025-01-21-CORE-4-github-repository-setup.md

**Plan Overview:**
- Created: 2025-01-21
- Phases: 5
- Total LOC: ~800
- Status: ⚠️ Partial implementation
```

**If plan exists:**
- Read plan structure (phases, tasks, success criteria)
- Will compare with actual progress in next steps

**If no plan:**
```
⚠️ No implementation plan found

This task may have been implemented directly without a plan.
Will rely on git history and Linear comments for progress tracking.
```

---

### Step 3: Analyze Git History

**Find feature branch:**

```bash
# Check for branch matching issue ID
git branch --all | grep -i "CORE-4\|BS-XXX"
```

**Output:**
```
Found branch: feature/CORE-4-github-repository-setup

**Branch info:**
- Created from: main
- Current commit: 3a4b5c6
- Total commits: 5
- Last commit: "feat(repo): add documentation and final polish (Phase 5)"
- Last commit time: 2025-01-21 18:45
```

**Analyze commits:**
```
Analyzing commit history on feature/CORE-4-github-repository-setup...

**Commits (most recent first):**
1. 3a4b5c6 - feat(repo): add documentation and final polish (Phase 5)
2. 2b3c4d5 - feat(repo): create issue templates and PR template (Phase 4)
3. 1a2b3c4 - feat(repo): setup CI/CD pipeline and branch protection (Phase 3)
4. 9a8b7c6 - feat(repo): configure Dependabot and security scanning (Phase 2)
5. 8a7b6c5 - feat(repo): setup GitHub repository basics and README (Phase 1)

**Pattern detected:** ✅ Phased implementation (5 phases)
```

---

### Step 4: Analyze Code Changes

**Compare branch with main:**

```bash
git diff main..feature/CORE-4-github-repository-setup --stat
```

**Output:**
```
Files changed: 12 files
Additions: +850 lines
Deletions: -45 lines

**Key files changed:**
- .github/workflows/ci.yml (new, 120 lines)
- .github/dependabot.yml (new, 35 lines)
- .github/PULL_REQUEST_TEMPLATE.md (new, 80 lines)
- .github/ISSUE_TEMPLATE/bug_report.yml (new, 65 lines)
- .github/ISSUE_TEMPLATE/feature_request.yml (new, 55 lines)
- CONTRIBUTING.md (new, 180 lines)
- LICENSE (new, 21 lines)
- README.md (modified, +95/-20 lines)
- scripts/validate-env.js (new, 90 lines)
- scripts/security-audit.js (new, 176 lines)
- .project/security-checklist.md (new, 158 lines)
- .project/security-guidelines.md (new, 240 lines)

**Areas touched:**
- CI/CD pipeline ✅
- Security scanning ✅
- Issue templates ✅
- Documentation ✅
- Scripts ✅
```

---

### Step 5: Compare Plan vs. Actual Progress

**If plan exists:**

```
Cross-checking plan phases with git commits...

**Plan Progress:**

Phase 1: Repository Basics & README ✅
- Commits: 8a7b6c5
- Files: README.md, .gitignore
- Status: DONE

Phase 2: Security & Dependency Management ✅
- Commits: 9a8b7c6
- Files: .github/dependabot.yml, scripts/security-audit.js
- Status: DONE

Phase 3: CI/CD Pipeline & Branch Protection ✅
- Commits: 1a2b3c4
- Files: .github/workflows/ci.yml, branch protection (manual)
- Status: DONE

Phase 4: Issue & PR Templates ✅
- Commits: 2b3c4d5
- Files: ISSUE_TEMPLATE/*, PULL_REQUEST_TEMPLATE.md
- Status: DONE

Phase 5: Final Documentation & Polish ✅
- Commits: 3a4b5c6
- Files: CONTRIBUTING.md, LICENSE, security docs
- Status: DONE

**Overall Progress:** 5/5 phases complete (100%) ✅
```

**If deviations detected:**
```
⚠️ Deviations from plan:

1. Plan Phase 3 expected "branch protection via script" 
   → Actual: Manual setup (noted in commit message)
   
2. Plan Phase 4 expected 2 issue templates
   → Actual: Created 2 (bug_report, feature_request) ✅

3. Plan Phase 5 expected just CONTRIBUTING.md
   → Actual: Also added LICENSE + security docs (bonus!) ✅
```

---

### Step 6: Check for Uncommitted Changes

```
Checking working directory for uncommitted changes...

git status --short
```

**Scenarios:**

**A. Clean working directory:**
```
✅ Working directory is clean (no uncommitted changes)

All work has been committed to: feature/CORE-4-github-repository-setup
```

**B. Uncommitted changes:**
```
⚠️ Found uncommitted changes:

M  README.md (+15/-3)
M  .github/workflows/ci.yml (+8/-2)
?? temp-notes.md

**Recommendation:**
These changes need to be committed before creating PR:

git add README.md .github/workflows/ci.yml
git commit -m "fix(repo): update CI workflow and README"

# Delete temp file if not needed
rm temp-notes.md
```

**C. Untracked important files:**
```
⚠️ Found untracked files that may be important:

?? scripts/new-helper.js
?? .env.local.example

**Recommendation:**
Review if these should be committed:
- scripts/new-helper.js - Looks like new utility
- .env.local.example - Should probably be committed

git add scripts/new-helper.js .env.local.example
git commit -m "feat(scripts): add helper utility and env example"
```

---

### Step 7: Check PR Status

**Search for existing PR:**

```
Checking for existing GitHub PR...
```

**MCP Call:** `mcp_github_search_pull_requests`

**Scenarios:**

**A. No PR exists:**
```
✅ No PR found for CORE-4

**Next step:** Create PR after all work is committed and pushed
```

**B. Draft PR exists:**
```
Found: PR #7 (Draft)
Title: "feat(repo): GitHub repository setup (CORE-4)"
Status: Draft
URL: https://github.com/eskoubar95/beauty-shop/pull/7

**Next step:** Continue work, then mark as ready for review
```

**C. Open PR exists:**
```
Found: PR #7 (Open)
Title: "feat(repo): GitHub repository setup (CORE-4)"
Status: Open, awaiting review
URL: https://github.com/eskoubar95/beauty-shop/pull/7
Created: 2025-01-21 18:50
Checks: ✅ Passing (4/4)

**Next step:** Address review comments or wait for approval
```

**D. Merged PR exists:**
```
Found: PR #7 (Merged)
Title: "feat(repo): GitHub repository setup (CORE-4)"
Status: Merged to main
URL: https://github.com/eskoubar95/beauty-shop/pull/7
Merged: 2025-01-21 19:30

✅ Task is complete! PR already merged.

**Next step:** Update Linear issue to "Done" if not already
```

---

### Step 8: Generate Complete Status Summary

**Compile all findings into structured output:**

```markdown
# 📊 Task Resume: CORE-4 - GitHub Repository Setup

**Generated:** 2025-01-21 20:00  
**Purpose:** Resume work in new chat after context limit

---

## 📍 Current Status: ALMOST DONE (95%)

**Linear Issue:** [CORE-4](https://linear.app/beauty-shop/issue/CORE-4)
- Status: In Progress → Should be "Review"
- Last Updated: 2025-01-21 19:30
- Assignee: @nicklas
- Labels: human-required, Infra

**Git Branch:** `feature/CORE-4-github-repository-setup`
- Total commits: 5
- Last commit: 3a4b5c6 "feat(repo): add documentation and final polish (Phase 5)"
- Files changed: 12 (+850, -45 lines)

**GitHub PR:** PR #7
- Status: Open, awaiting review
- URL: https://github.com/eskoubar95/beauty-shop/pull/7
- CI: ✅ All checks passing

---

## ✅ What's Been Done

### Implementation Plan Progress: 5/5 Phases ✅

**Phase 1:** Repository Basics & README ✅ (Commit 8a7b6c5)
- README.md with project overview
- .gitignore with comprehensive patterns
- Repository description and topics

**Phase 2:** Security & Dependency Management ✅ (Commit 9a8b7c6)
- Dependabot configuration (npm, GitHub Actions)
- Security audit script (scripts/security-audit.js)
- Security scanning workflow

**Phase 3:** CI/CD Pipeline & Branch Protection ✅ (Commit 1a2b3c4)
- GitHub Actions workflow (lint, test, build)
- Branch protection rules (manual setup)
- CI badge in README
- Fixed Trufflehog version issue

**Phase 4:** Issue & PR Templates ✅ (Commit 2b3c4d5)
- Bug report template (YAML)
- Feature request template (YAML)
- PR template with comprehensive sections
- Issue template config

**Phase 5:** Final Documentation & Polish ✅ (Commit 3a4b5c6)
- CONTRIBUTING.md (180 lines)
- LICENSE (MIT)
- Security guidelines (240 lines)
- Security checklist (158 lines)

### Files Created/Modified: 12 files

**New Files (10):**
- .github/workflows/ci.yml
- .github/dependabot.yml
- .github/PULL_REQUEST_TEMPLATE.md
- .github/ISSUE_TEMPLATE/bug_report.yml
- .github/ISSUE_TEMPLATE/feature_request.yml
- CONTRIBUTING.md
- LICENSE
- scripts/validate-env.js
- scripts/security-audit.js
- .project/security-checklist.md
- .project/security-guidelines.md

**Modified Files (2):**
- README.md (+95/-20 lines)
- package.json (scripts updated)

### Acceptance Criteria Status: 8/8 ✅

- ✅ Repository oprettet med korrekt naming convention
- ✅ Branch protection rules aktiveret (require PR, 1+ review, green CI)
- ✅ GitHub Actions workflow konfigureret (lint, typecheck, test, build)
- ✅ Issue templates oprettet (bug report, feature request)
- ✅ PR template oprettet med standardiseret struktur
- ✅ Dependabot aktiveret (npm, GitHub Actions)
- ✅ Security scanning konfigureret (secrets scan, dependency audit)
- ✅ CONTRIBUTING.md + LICENSE tilføjet

---

## 🔄 Recent Activity (Last 3 Linear Comments)

1. **2025-01-21 19:30** (You):
   "✅ Phase 5 complete! All documentation done. Ready for PR."

2. **2025-01-21 18:45** (You):
   "Phase 4 done. Issue templates and PR template created."

3. **2025-01-21 18:15** (You):
   "Completed CI/CD setup (Phase 3). Branch protection configured manually via GitHub UI."

---

## ⚠️ Outstanding Items

### 1. Uncommitted Changes ⚠️

```
M  README.md (+5/-2)
?? temp-debug.log
```

**Action Required:**
```bash
# Commit README changes
git add README.md
git commit -m "docs(readme): minor typo fixes"

# Remove temp file
rm temp-debug.log

# Push
git push origin feature/CORE-4-github-repository-setup
```

### 2. PR Waiting for Review 📋

**PR #7** is open and all CI checks pass, but needs:
- Human review (0/1 approvals)
- Optional: Self-review first (`/review-pr-self`)

### 3. Linear Status Update Needed 📝

**Current:** In Progress  
**Should be:** Review (since PR is open)

**Action:**
```
/update-linear-status CORE-4 Review
```

---

## 🎯 Recommended Next Steps

### Immediate (Do Now):

**1. Commit Uncommitted Changes (2 min)**
```bash
git add README.md
git commit -m "docs(readme): minor typo fixes"
git push origin feature/CORE-4-github-repository-setup
```

**2. Self-Review PR (5 min)**
```
/review-pr-self
```

Check for:
- Typos in documentation
- Unused imports
- Debug logs
- TODO comments

**3. Update Linear Status (1 min)**
```
/update-linear-status CORE-4 Review
```

Or manually: https://linear.app/beauty-shop/issue/CORE-4

### Then (Wait):

**4. Request Review**
- Tag reviewer in PR #7
- Or wait for automated review (BugBot/Copilot)

**5. Address Review Comments**
- Fix any issues raised
- Push fixes to same branch
- Re-request review

**6. Merge PR**
- Once approved + CI green
- Use "Squash and merge"
- Delete feature branch

**7. Update Linear to Done**
```
/update-linear-status CORE-4 Done
```

---

## 🗂️ Reference Files

**Implementation Plan:**
`.project/plans/2025-01-21-CORE-4-github-repository-setup.md`

**Related Issues:**
- ✅ Depends on: CORE-15 (Environment Config) - DONE
- ⏳ Blocks: CORE-5 (Supabase Setup)
- ⏳ Blocks: CORE-6 (MedusaJS Setup)
- ⏳ Blocks: CORE-7 (Next.js Setup)

**Branch:**
`feature/CORE-4-github-repository-setup`

**PR:**
https://github.com/eskoubar95/beauty-shop/pull/7

---

## 💡 Context for New Chat

**You were working on:** CORE-4 (GitHub Repository Setup)

**You completed:** All 5 implementation phases, created 12 files, committed all changes

**You're currently at:** PR created and open, waiting for review

**Previous chat:** Likely hit context limit after implementing all phases + plan validation + execution

**This chat should:** Handle final steps (self-review, merge, Linear update)

---

## 🚨 Watch Out For

1. **Branch protection:** Manually configured (not via script) - document this in PR
2. **CI fixes:** Trufflehog version was fixed, package-lock.json added
3. **Extra docs:** Added security guidelines beyond plan (good!)
4. **Dependabot:** Set to weekly (not daily) to reduce noise

---

**Ready to continue?** Start with:
```
/review-pr-self
```
```

---

### Step 9: Save Summary to File (Optional)

**Offer to save for reference:**

```
Would you like me to save this summary?

I can create:
.project/task-resumes/CORE-4-resume-2025-01-21.md

This way you can reference it later or share with team.
```

---

## Output Format

The command generates a **comprehensive markdown document** with all sections above, providing:

✅ Complete task status  
✅ What's been done (commits, files, phases)  
✅ What's outstanding (uncommitted changes, PR status)  
✅ Precise next steps (commands to run)  
✅ Context for why you're resuming (chat limit, handoff, etc.)  
✅ References (plan, branch, PR, Linear issue)

---

## Use Cases

### 1. Chat Context Limit Hit

```
Scenario: You're on message 80 in a chat, agent suggests starting new chat

Action:
1. In OLD chat: Note where you are
2. Open NEW chat
3. Run: /resume-task CORE-4
4. NEW chat now has full context
5. Continue work
```

### 2. Switching Phases

```
Scenario: Completed implementation, now need to handle PR review

Action:
1. In NEW chat: /resume-task CORE-4
2. Agent reconstructs all implementation work
3. Provides next steps for PR phase
4. Continue with /review-pr-self, merge, etc.
```

### 3. Picking Up After Break

```
Scenario: Took 2 days off, forgot where you were

Action:
1. Open NEW chat
2. Run: /resume-task CORE-4
3. Instantly see: what's done, what's left, next steps
4. Continue without confusion
```

### 4. Handoff to Another Developer

```
Scenario: You worked on CORE-4, now colleague takes over

Action:
1. Colleague opens NEW chat
2. Runs: /resume-task CORE-4
3. Gets complete context from objective sources
4. Continues work seamlessly
```

### 5. Debugging "What Went Wrong"

```
Scenario: Task was paused 1 week ago, need to remember what failed

Action:
1. Run: /resume-task CORE-4
2. See last commits, uncommitted changes, Linear comments
3. Identify where it stopped (e.g., "PR blocked by CI failure")
4. Fix and continue
```

---

## Validation & Error Handling

### Scenario A: Issue Not Found

```
❌ Linear issue CORE-99 not found

Please verify:
- Issue ID spelling (CORE-99 vs BS-99)
- Issue exists in Beauty Shop workspace
- You have access to the issue

Available issues: CORE-4, CORE-5, CORE-6, CORE-7, CORE-15
```

### Scenario B: No Work Started

```
⚠️ No progress detected for CORE-8

**Linear Status:** Backlog (not started)
**Git Branch:** None found
**Plan File:** None found
**Commits:** 0

This task hasn't been started yet.

**To start:**
1. /fetch-linear-ticket CORE-8
2. /create-implementation-plan (if > 400 LOC)
3. Create feature branch: git checkout -b feature/CORE-8-task-name
4. /execute-plan-phase (or implement directly)
```

### Scenario C: Multiple Branches

```
⚠️ Multiple branches found for CORE-4:

1. feature/CORE-4-github-repository-setup (5 commits, last: 2025-01-21)
2. fix/CORE-4-ci-improvements (2 commits, last: 2025-01-20)

**Recommendation:** Most recent branch is likely active:
→ feature/CORE-4-github-repository-setup

Analyzing this branch...
```

### Scenario D: Plan vs. Reality Mismatch

```
⚠️ Plan deviation detected

**Plan expects:** 4 phases
**Actual commits:** 6 commits

**Possible reasons:**
- Plan was not followed strictly
- Extra fixes/improvements added
- Phases were split differently

Continuing analysis based on actual commits...
```

---

## Advanced Features

### Auto-Detect Context Switch Reasons

```
Why are you resuming this task?

**Analysis:**
- Old chat: 85 messages → Likely hit context limit
- Last activity: 2 hours ago → Took a break
- Last Linear comment: "Stuck on CI issue" → Debugging session
- New assignee: @colleague → Handoff

**Detected reason:** Context limit + debugging

**Recommendation:** 
Focus on CI issue first (check last commits for fix attempts)
```

### Suggest Related Commands

```
**Based on task status, you might need:**

- /prepare-pr - Run pre-PR checks
- /review-pr-self - Self-review before requesting review  
- /cleanup-branch - Remove debug code and TODOs
- /update-linear-status CORE-4 Review - Update status

**Most likely next:** /review-pr-self
```

### Link to Previous Chats (If Named Properly)

```
**Related chats (if you named them):**

1. "CORE-4 - Planning Phase" - Plan creation
2. "CORE-4 - Implementation Phases 1-3" - First half
3. "🔄 CORE-4 - Implementation Phases 4-5" - Second half (previous)
4. [THIS CHAT] - PR & Merge

**Tip:** Use consistent naming for easy reference!
```

---

## Integration with Other Commands

### Before `/execute-plan-phase`

```
Scenario: Resuming multi-phase implementation

/resume-task CORE-4
→ Shows: Completed Phases 1-3, Phase 4 next

/execute-plan-phase 2025-01-21-CORE-4-github-repository-setup.md 4
→ Continues with Phase 4
```

### Before `/create-pr-with-linear`

```
Scenario: All implementation done, ready for PR

/resume-task CORE-4
→ Confirms: All phases done, changes committed, ready for PR

/prepare-pr
→ Runs checks

/create-pr-with-linear CORE-4
→ Creates PR
```

### After Long Break

```
Scenario: Came back after weekend

/resume-task CORE-4
→ Full status recap

[Proceed with suggested next steps]
```

---

## Tips for Best Results

### 1. Name Your Chats Consistently

**Good:**
- "CORE-4 - Planning"
- "CORE-4 - Implementation"
- "✅ CORE-4 - PR & Merge"

**Bad:**
- "Working on stuff"
- "Chat 1"
- "Untitled"

### 2. Commit Frequently

More commits = better progress tracking = better resume context

### 3. Update Linear Regularly

Linear comments = breadcrumbs for resume

### 4. Use Plans for Complex Tasks

Plans make resume much more accurate (plan vs. actual comparison)

### 5. Push Your Branch

Unpushed commits are still tracked, but pushing shows intent

---

## Limitations

### What `/resume-task` CAN do:

✅ Read Linear issue + comments via MCP  
✅ Analyze git history + commits  
✅ Compare plan vs. actual progress  
✅ Check PR status via GitHub MCP  
✅ Detect uncommitted changes  
✅ Suggest precise next steps  

### What `/resume-task` CANNOT do:

❌ Read previous chat history directly (Cursor limitation)  
❌ Know your thoughts/decisions not in Linear/git/code  
❌ Detect in-progress work not committed  
❌ Read your mind about next steps (but makes educated guess)

**Workaround:** 
Add Linear comments or commit messages with context before switching chats!

---

## Examples

### Example 1: Simple Resume (Clean State)

```
User: /resume-task CORE-15

Agent:
📊 Task Resume: CORE-15 - Environment Configuration

Status: Done ✅
PR: #5 merged 2 days ago
Linear: Done

🎉 This task is complete! Nothing to resume.

Suggested: Start next task (CORE-4)
/fetch-linear-ticket CORE-4
```

### Example 2: Resume Mid-Implementation

```
User: /resume-task CORE-4

Agent:
📊 Task Resume: CORE-4 - GitHub Repository Setup

Status: In Progress (60% done)
Branch: feature/CORE-4-github-repository-setup
Commits: 3/5 phases done

✅ Done: Phase 1, 2, 3
⏳ Next: Phase 4 (Issue Templates)
📋 Plan: .project/plans/2025-01-21-CORE-4-github-repository-setup.md

🎯 Next Step:
/execute-plan-phase 2025-01-21-CORE-4-github-repository-setup.md 4
```

### Example 3: Resume at PR Stage

```
User: /resume-task CORE-4

Agent:
📊 Task Resume: CORE-4 - GitHub Repository Setup

Status: Implementation Complete, PR Open
PR: #7 (awaiting review)
Commits: 5 (all phases done)

⚠️ Found: 2 uncommitted files (README typos)

🎯 Next Steps:
1. Commit fixes: git add README.md && git commit -m "docs: fix typos"
2. Self-review: /review-pr-self
3. Request review: Tag reviewer in PR #7
```

---

## Maintenance Notes

**This command depends on:**
- Linear MCP (`mcp_Linear_get_issue`, `mcp_Linear_list_comments`)
- GitHub MCP (`mcp_github_search_pull_requests`, `mcp_github_list_commits`)
- Git CLI access
- Plan files in `.project/plans/`
- Standard branch naming (`feature/CORE-X-*`)

**Update needed if:**
- Branch naming convention changes
- Plan template structure changes
- New Linear fields added
- New MCP tools available

---

**Created:** 2025-01-21  
**Author:** Cursor AI + Nicklas  
**Inspiration:** HumanLayer's `resume_handoff.md`  
**Last Updated:** 2025-01-21

