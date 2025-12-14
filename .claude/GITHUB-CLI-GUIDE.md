# GitHub CLI Guide for Agents

## Oversigt

Huddle projektet bruger **GitHub CLI (`gh`)** i stedet for GitHub MCP til alle GitHub operationer.

**Rationale:**
- ✅ Mere fleksibel (kan bruge alle `gh` commands)
- ✅ Bedre integration med eksisterende workflows
- ✅ Konsistent med team's GitHub CLI usage

---

## Setup

### 1. Verify GitHub CLI er installeret

```bash
gh --version
```

Hvis ikke installeret:
```bash
# macOS
brew install gh

# Eller download fra: https://cli.github.com/
```

### 2. Authenticate

```bash
gh auth login
```

Følg prompts:
- Choose GitHub.com
- Choose HTTPS
- Authenticate via browser

### 3. Verify Authentication

```bash
gh auth status
```

Expected output:
```
✓ Logged in to github.com as {your-username}
```

---

## Agent Usage

### Alle Agents Har Adgang Til GitHub CLI

Via **Terminal access** tool kan alle agents bruge `gh` commands.

### Typiske GitHub Operations i Agents

#### 1. View Repository Info

```bash
# Get repo details
gh repo view

# Get current branch
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
```

#### 2. Create Branches

```bash
# Create and checkout new branch
git checkout -b feature/huddle-35-auction-bidding-database
git push -u origin feature/huddle-35-auction-bidding-database
```

**Note:** Agents bruger stadig `git` for branch operations. `gh` bruges primært til PR operations.

#### 3. View Issues

```bash
# View issue details
gh issue view HUD-35

# List open issues
gh issue list --limit 10

# View issue comments
gh issue view HUD-35 --comments
```

#### 4. Create Pull Requests

```bash
# Create PR with title and body
gh pr create \
  --title "feat(auctions): Add bidding system (HUD-35)" \
  --body "## What
Implements auction bidding system with real-time updates.

## Why
Users need to bid on auctions.

## How
- Database: Created bids table with RLS
- Backend: POST /api/v1/auctions/:id/bid endpoint
- Frontend: Bid form component with validation

## Testing
- [x] Unit tests passing
- [x] Integration tests passing
- [x] Manual E2E test complete

Closes HUD-35" \
  --base main \
  --head feature/huddle-35-auction-bidding-system
```

#### 5. Update Pull Requests

```bash
# Update PR title
gh pr edit {PR_NUMBER} --title "New title"

# Update PR body
gh pr edit {PR_NUMBER} --body "New body"

# Add labels
gh pr edit {PR_NUMBER} --add-label "feature,backend"

# Request review
gh pr review {PR_NUMBER} --request-changes --body "Needs fixes"
```

#### 6. View Pull Requests

```bash
# List PRs
gh pr list --limit 10

# View PR details
gh pr view {PR_NUMBER}

# View PR diff
gh pr diff {PR_NUMBER}

# View PR checks
gh pr checks {PR_NUMBER}
```

#### 7. Merge Pull Requests

```bash
# Merge PR (squash and merge)
gh pr merge {PR_NUMBER} --squash --delete-branch

# Merge PR (merge commit)
gh pr merge {PR_NUMBER} --merge --delete-branch

# Merge PR (rebase and merge)
gh pr merge {PR_NUMBER} --rebase --delete-branch
```

**Note:** Agents skal IKKE merge PRs automatisk. Det gøres manuelt efter review.

---

## Orchestrator Agent: GitHub Workflow

### Efter Alle Phases Complete

Orchestrator agent kan:

1. **Create unified branch:**
```bash
git checkout -b feature/huddle-35-complete
git merge feature/huddle-35-database
git merge feature/huddle-35-backend
git merge feature/huddle-35-frontend
git merge feature/huddle-35-testing
git push -u origin feature/huddle-35-complete
```

2. **Create PR (optional - usually done in Cursor):**
```bash
gh pr create \
  --title "feat(auctions): Add bidding system (HUD-35)" \
  --body "$(cat .project/plans/HUD-35/pr-description.md)" \
  --base main \
  --head feature/huddle-35-complete
```

3. **Link Linear issue (via Linear MCP):**
```bash
# Orchestrator bruger Linear MCP til at:
# - Update HUD-35 status → Review
# - Post comment med PR link
# - Link PR URL til issue
```

---

## Agent-Specific GitHub Operations

### Database Agent

**Typisk operations:**
- Create branch: `feature/huddle-XX-{feature}-database`
- Commit migrations
- Push branch
- **Ikke:** Create PR (orchestrator gør det)

### Backend Agent

**Typisk operations:**
- Create branch: `feature/huddle-XX-{feature}-backend`
- Commit API code
- Push branch
- **Ikke:** Create PR (orchestrator gør det)

### Frontend Agent

**Typisk operations:**
- Create branch: `feature/huddle-XX-{feature}-frontend`
- Commit UI code
- Push branch
- **Ikke:** Create PR (orchestrator gør det)

### Testing Agent

**Typisk operations:**
- Create branch: `feature/huddle-XX-{feature}-testing`
- Commit tests
- Push branch
- **Ikke:** Create PR (orchestrator gør det)

### Orchestrator Agent

**Typisk operations:**
- Merge all agent branches
- Create unified branch
- **Optional:** Create PR (usually done in Cursor)
- Update Linear via MCP med PR link

---

## Best Practices

### ✅ DO

1. **Use descriptive branch names:**
```bash
feature/huddle-35-auction-bidding-database
feature/huddle-35-auction-bidding-backend
feature/huddle-35-auction-bidding-frontend
```

2. **Commit frequently per phase:**
```bash
git add supabase/migrations/20251205120000_create_bids.sql
git commit -m "feat(database): Add bids table for auction bidding (HUD-35)"
```

3. **Push branches immediately:**
```bash
git push -u origin feature/huddle-35-auction-bidding-database
```

4. **Use conventional commit messages:**
```bash
feat(domain): Description (HUD-XX)
fix(domain): Description (HUD-XX)
chore(domain): Description (HUD-XX)
```

### ❌ DON'T

1. **Don't create PRs from individual agent branches**
   - Wait for orchestrator to merge all branches
   - Create one unified PR

2. **Don't merge PRs automatically**
   - Always require human review
   - Use `gh pr merge` only after approval

3. **Don't force push to shared branches**
   - Only force push to your own feature branches
   - Never force push to `main`

4. **Don't skip commit messages**
   - Always include meaningful commit messages
   - Reference Linear issue ID

---

## Integration med Cursor Workflow

### Cursor Commands Bruger GitHub MCP (ikke CLI)

Cursor's `/create-pr-with-linear` command bruger GitHub MCP internt.

**Det er OK** - Cursor og Claude Code agents kan bruge forskellige metoder.

### Workflow

```
1. Agents (Claude Code): Use GitHub CLI
   ↓ Create branches, commit, push
   
2. Orchestrator: Merge branches
   ↓ Create unified branch
   
3. Cursor: Review code
   ↓ /review-pr-self
   
4. Cursor: Create PR
   ↓ /create-pr-with-linear HUD-35
   ↓ (Uses GitHub MCP internally)
   
5. Human: Review & merge
   ↓ Manual review in GitHub
```

**Result:** Best of both worlds - CLI for agents, MCP for Cursor.

---

## Troubleshooting

### Problem: "gh: command not found"

**Solution:**
```bash
# Install GitHub CLI
brew install gh  # macOS
# Or: https://cli.github.com/

# Verify installation
gh --version
```

### Problem: "Authentication required"

**Solution:**
```bash
gh auth login
# Follow prompts to authenticate
```

### Problem: "Permission denied" ved PR create

**Solution:**
```bash
# Check authentication
gh auth status

# Verify repo access
gh repo view

# If needed, re-authenticate
gh auth refresh
```

### Problem: "Branch not found" ved PR create

**Solution:**
```bash
# Ensure branch is pushed
git push -u origin feature/huddle-35-branch

# Verify branch exists
gh repo view --json defaultBranchRef
```

---

## Examples

### Example 1: Database Agent Workflow

```bash
# 1. Create branch
git checkout -b feature/huddle-35-auction-bidding-database

# 2. Create migration
# ... (agent creates migration file)

# 3. Commit
git add supabase/migrations/20251205120000_create_bids.sql
git commit -m "feat(database): Add bids table for auction bidding (HUD-35)"

# 4. Push
git push -u origin feature/huddle-35-auction-bidding-database

# 5. Update plan file
# ... (agent updates plan with branch name and commit hash)
```

### Example 2: Orchestrator Creating Unified PR

```bash
# 1. Merge all branches
git checkout -b feature/huddle-35-auction-bidding-system
git merge feature/huddle-35-auction-bidding-database
git merge feature/huddle-35-auction-bidding-backend
git merge feature/huddle-35-auction-bidding-frontend
git merge feature/huddle-35-auction-bidding-testing

# 2. Resolve conflicts (if any)
# ... (manual or automated)

# 3. Push unified branch
git push -u origin feature/huddle-35-auction-bidding-system

# 4. Create PR (optional - usually done in Cursor)
gh pr create \
  --title "feat(auctions): Add bidding system (HUD-35)" \
  --body "$(cat .project/plans/HUD-35/pr-description.md)" \
  --base main \
  --head feature/huddle-35-auction-bidding-system
```

---

## Reference: Common `gh` Commands

```bash
# Authentication
gh auth login
gh auth status
gh auth refresh

# Repository
gh repo view
gh repo clone {owner}/{repo}

# Issues
gh issue list
gh issue view {number}
gh issue create --title "..." --body "..."
gh issue comment {number} --body "..."

# Pull Requests
gh pr list
gh pr view {number}
gh pr create --title "..." --body "..." --base main --head {branch}
gh pr edit {number} --title "..." --body "..."
gh pr merge {number} --squash --delete-branch
gh pr checks {number}
gh pr diff {number}

# Branches
gh repo view --json defaultBranchRef
```

---

**Version:** 1.0.0  
**Last Updated:** December 5, 2025  
**Maintainer:** Nicklas Eskou

