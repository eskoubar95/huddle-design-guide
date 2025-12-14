# Getting Started: Cursor + Claude Code Multi-Agent Workflow

## Prerequisites

### Installer Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

### Verify Installation
```bash
claude-code --version
```

### Authenticate
```bash
claude-code auth login
# Follow prompts to authenticate with Anthropic account
```

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────┐
│ CURSOR (Human) - Planlægning & Koordinering            │
├─────────────────────────────────────────────────────────┤
│ 1. Fetch Linear ticket                                  │
│ 2. Research patterns                                    │
│ 3. Create implementation plan (multi-agent)            │
│ 4. Validate plan                                        │
│ 5. Assign phases to agents                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ CLAUDE CODE (Agents) - Parallel Eksekvering            │
├─────────────────────────────────────────────────────────┤
│ Agent 1: Database  → Phase 1 (sekventiel)              │
│ Agent 2: Backend   ┐                                    │
│ Agent 3: Frontend  ├─ Phase 2-3 (parallel)             │
│ Agent 4: Testing   → Phase 4 (sekventiel)              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ CURSOR (Human) - Review & Merge                        │
├─────────────────────────────────────────────────────────┤
│ 1. Review agent outputs                                 │
│ 2. Test integration locally                             │
│ 3. Create unified PR                                    │
│ 4. Merge to main                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Guide

### Phase 1: Planning (I Cursor)

#### 1.1 Fetch Linear Ticket
```bash
# I Cursor chat
/fetch-linear-ticket HUD-35
```

#### 1.2 Research Existing Patterns
```bash
/research-feature-patterns "auction bidding system"
```

#### 1.3 Create Multi-Agent Implementation Plan
```bash
/create-implementation-plan HUD-35

# Cursor bruger MULTI-AGENT-TEMPLATE.md
# Udfylder agent assignments, dependencies, osv.
```

**Output:** `.project/plans/HUD-35/implementation-plan-2025-12-05-HUD-35.md`

#### 1.4 Validate Plan
```bash
/validate-plan .project/plans/HUD-35/implementation-plan-2025-12-05-HUD-35.md

# Check:
# - Agent assignments korrekt?
# - Dependencies identificeret?
# - Success criteria clear?
# - No open questions?
```

#### 1.5 Commit Plan
```bash
git add .project/plans/HUD-35/
git commit -m "docs: add multi-agent implementation plan for HUD-35"
git push origin main
```

---

### Phase 2: Execution (Claude Code Agents)

#### 2.1 Start Database Agent (Sekventiel - kører først)

**Terminal 1:**
```bash
cd /Users/nicklaseskou/Documents/GitHub/huddle-design-guide

# Start database agent
claude-code task \
  --agent database \
  --context ".claude/agents/database-agent.md" \
  --context ".cursor/rules/" \
  --context "openmemory.md" \
  --context ".project/plans/HUD-35/implementation-plan-2025-12-05-HUD-35.md" \
  --instructions "Execute Phase 1 from the implementation plan. Follow database-agent.md rules strictly. Update plan file with progress."
```

**Agent output:**
```
✅ Phase 1 complete
- Created: supabase/migrations/20251205120000_create_bids_table.sql
- Created: supabase/migrations/20251205120001_add_bids_rls_policies.sql
- Created: supabase/migrations/20251205120002_add_bids_indexes.sql
- Generated: apps/web/lib/db/database.types.ts
- Branch: feature/huddle-35-auction-bidding-database
- Commit: abc123def
```

**Manual verification (dig):**
```bash
# Test migration
supabase db reset
supabase migration up

# Check types generated
cat apps/web/lib/db/database.types.ts | grep "bids"

# Test RLS
supabase test db
```

**Hvis OK:**
```bash
git checkout feature/huddle-35-auction-bidding-database
git push origin feature/huddle-35-auction-bidding-database
```

---

#### 2.2 Start Backend + Frontend Agents (Parallel)

**Terminal 2 (Backend):**
```bash
# Backend agent (venter på types fra Phase 1)
claude-code task \
  --agent backend \
  --context ".claude/agents/backend-agent.md" \
  --context ".cursor/rules/" \
  --context "openmemory.md" \
  --context ".project/plans/HUD-35/implementation-plan-2025-12-05-HUD-35.md" \
  --context "apps/web/lib/db/database.types.ts" \
  --instructions "Execute Phase 2 from the implementation plan. Follow backend-agent.md rules strictly. Use generated types from Phase 1."
```

**Terminal 3 (Frontend - parallel):**
```bash
# Frontend agent (kan starte med mocks hvis backend ikke færdig)
claude-code task \
  --agent frontend \
  --context ".claude/agents/frontend-agent.md" \
  --context ".cursor/rules/" \
  --context "openmemory.md" \
  --context ".project/plans/HUD-35/implementation-plan-2025-12-05-HUD-35.md" \
  --context "apps/web/lib/db/database.types.ts" \
  --instructions "Execute Phase 3 from the implementation plan. Follow frontend-agent.md rules strictly. Use mocks for API calls until backend Phase 2 completes."
```

**Wait for both:**
```bash
# Terminal 2 output
✅ Phase 2 complete (Backend)
- Branch: feature/huddle-35-auction-bidding-backend

# Terminal 3 output
✅ Phase 3 complete (Frontend)
- Branch: feature/huddle-35-auction-bidding-frontend
```

**Manual verification (dig):**
```bash
# Test backend
curl -X POST http://localhost:3000/api/v1/auctions/123/bid \
  -H "Authorization: Bearer {token}" \
  -d '{"amount": 100}'

# Test frontend
npm run dev
# Åbn browser, test UI flow
```

**Hvis OK:**
```bash
git push origin feature/huddle-35-auction-bidding-backend
git push origin feature/huddle-35-auction-bidding-frontend
```

---

#### 2.3 Start Testing Agent (Sekventiel - kører sidst)

**Terminal 4:**
```bash
# Testing agent (venter på alle)
claude-code task \
  --agent testing \
  --context ".claude/agents/testing-agent.md" \
  --context ".cursor/rules/" \
  --context "openmemory.md" \
  --context ".project/plans/HUD-35/implementation-plan-2025-12-05-HUD-35.md" \
  --instructions "Execute Phase 4 from the implementation plan. Write comprehensive tests for all phases. Ensure >80% coverage."
```

**Output:**
```
✅ Phase 4 complete (Testing)
- Unit tests: 23 passing
- Integration tests: 8 passing
- Coverage: 87%
- Branch: feature/huddle-35-auction-bidding-testing
```

**Manual verification (dig):**
```bash
npm run test -- --coverage
npm run test:integration
```

**Hvis OK:**
```bash
git push origin feature/huddle-35-auction-bidding-testing
```

---

### Phase 3: Integration & Review (I Cursor)

#### 3.1 Merge All Agent Branches Lokalt

```bash
# Opret unified feature branch
git checkout -b feature/huddle-35-auction-bidding

# Merge agent branches i rækkefølge
git merge feature/huddle-35-auction-bidding-database
git merge feature/huddle-35-auction-bidding-backend
git merge feature/huddle-35-auction-bidding-frontend
git merge feature/huddle-35-auction-bidding-testing

# Løs konflikter hvis nogen
```

#### 3.2 Test Integration Lokalt

```bash
# Run all checks
npm run type-check
npm run lint
npm run test
npm run build

# Test manually
supabase db reset
supabase migration up
npm run dev

# Test auction bidding flow end-to-end
```

#### 3.3 Review Code Quality (I Cursor)

```bash
/review-pr-self

# Cursor checker:
# - Code style consistency
# - Error handling
# - Security issues
# - Missing tests
# - Documentation gaps
```

#### 3.4 Prepare PR

```bash
/prepare-pr

# Cursor checker:
# - Commit messages conventional?
# - PR size reasonable? (<1000 LOC?)
# - No debug code?
# - Docs updated?
```

#### 3.5 Create PR

```bash
/create-pr-with-linear HUD-35

# Cursor opretter PR med:
# - Title: "feat(auctions): Add bidding system (HUD-35)"
# - Body: WHAT/WHY/HOW + test results
# - Links Linear issue
# - Updates Linear status → Review
```

---

### Phase 4: Merge & Deploy

#### 4.1 PR Review Process

**Automated:**
- ✅ GitHub Actions CI passes
- ✅ Vercel preview deploys

**Human review:**
- ✅ Code quality acceptable
- ✅ Tests adequate
- ✅ Security concerns addressed

#### 4.2 Merge to Main

```bash
# I GitHub PR
Click "Squash and merge"

# Cleanup branches
git branch -D feature/huddle-35-auction-bidding
git branch -D feature/huddle-35-auction-bidding-database
git branch -D feature/huddle-35-auction-bidding-backend
git branch -D feature/huddle-35-auction-bidding-frontend
git branch -D feature/huddle-35-auction-bidding-testing
```

#### 4.3 Update Linear

```bash
# I Cursor
/update-linear-status HUD-35 complete

# Eller manuel:
# - Move HUD-35 to Done
# - Add comment med PR link og metrics
```

---

## Advanced: Orchestration Script

For at automatisere agent koordinering, opret helper script:

**File:** `scripts/run-multi-agent.sh`

```bash
#!/bin/bash

# Usage: ./scripts/run-multi-agent.sh HUD-35

ISSUE_ID=$1
PLAN_FILE=".project/plans/${ISSUE_ID}/implementation-plan-*.md"

echo "🚀 Starting multi-agent workflow for ${ISSUE_ID}"

# Phase 1: Database (sekventiel)
echo "📊 Phase 1: Database agent..."
claude-code task \
  --agent database \
  --context ".claude/agents/database-agent.md" \
  --context ".cursor/rules/" \
  --context "openmemory.md" \
  --context "${PLAN_FILE}" \
  --instructions "Execute Phase 1. Follow database-agent.md rules." \
  --wait

echo "✅ Phase 1 complete. Verify manually? (y/n)"
read verify
if [ "$verify" != "y" ]; then
  echo "❌ Aborted by user"
  exit 1
fi

# Phase 2-3: Backend + Frontend (parallel)
echo "🔄 Phase 2-3: Backend + Frontend agents (parallel)..."
claude-code task \
  --agent backend \
  --context ".claude/agents/backend-agent.md" \
  --context ".cursor/rules/" \
  --context "openmemory.md" \
  --context "${PLAN_FILE}" \
  --instructions "Execute Phase 2. Follow backend-agent.md rules." &

BACKEND_PID=$!

claude-code task \
  --agent frontend \
  --context ".claude/agents/frontend-agent.md" \
  --context ".cursor/rules/" \
  --context "openmemory.md" \
  --context "${PLAN_FILE}" \
  --instructions "Execute Phase 3. Follow frontend-agent.md rules." &

FRONTEND_PID=$!

# Wait for both
wait $BACKEND_PID
wait $FRONTEND_PID

echo "✅ Phase 2-3 complete. Verify manually? (y/n)"
read verify
if [ "$verify" != "y" ]; then
  echo "❌ Aborted by user"
  exit 1
fi

# Phase 4: Testing (sekventiel)
echo "🧪 Phase 4: Testing agent..."
claude-code task \
  --agent testing \
  --context ".claude/agents/testing-agent.md" \
  --context ".cursor/rules/" \
  --context "openmemory.md" \
  --context "${PLAN_FILE}" \
  --instructions "Execute Phase 4. Write comprehensive tests." \
  --wait

echo "✅ All phases complete!"
echo "Next steps:"
echo "1. Review agent outputs"
echo "2. Merge branches: git merge feature/huddle-${ISSUE_ID}-*"
echo "3. Test integration: npm run test && npm run build"
echo "4. Create PR: /create-pr-with-linear ${ISSUE_ID}"
```

**Make executable:**
```bash
chmod +x scripts/run-multi-agent.sh
```

**Usage:**
```bash
# Efter du har oprettet plan i Cursor
./scripts/run-multi-agent.sh HUD-35

# Script kører alle agents med pause points
```

---

## Tips & Best Practices

### 1. Always Start with Database Agent
- Database schema er fundamentet
- Types skal genereres før Backend/Frontend
- RLS policies skal testes før API implementering

### 2. Use Mocks for Parallel Development
- Frontend kan starte med mock API responses
- Swap til real API når Backend agent færdig
- Reducer blocking dependencies

### 3. Human Verification is Critical
- Don't blindly trust agent output
- Test hver phase før næste starter
- Review migrations MEGET nøje (breaking changes)

### 4. Keep Agents Focused
- Max 400 LOC per agent per task
- Split large phases into sub-phases
- One agent = one domain

### 5. Communication via Plan File
- Agents updater plan fil med progress
- Cursor (human) coordinator læser plan
- Use checkboxes for status tracking

### 6. Rollback Strategy
- Each agent branch er isoleret
- Easy to rollback individual phases
- Test before merging to unified branch

### 7. CI/CD Integration
- Each agent branch køres gennem CI
- Catch errors early (before integration)
- Green CI = ready for integration

---

## Troubleshooting

### Problem: Agent stuck eller producerer forkert output

**Solution:**
```bash
# Stop agent
Ctrl+C

# Review partial output
git diff

# Restart med klarere instruktioner
claude-code task \
  --agent {agent-name} \
  --context {same-contexts} \
  --instructions "REDO Phase X. Previous attempt had {problem}. Ensure {specific-requirement}."
```

### Problem: Conflicts ved merge af agent branches

**Solution:**
```bash
# Review conflicts
git diff

# Resolve manually (Cursor har god merge tool)
# Usually: one agent updated shared types, another used old types

# Re-run tests after resolution
npm run test
```

### Problem: Agent output mangler quality

**Solution:**
```bash
# Review i Cursor
/review-pr-self

# Be specific om problemer
claude-code task \
  --agent {agent-name} \
  --context ".cursor/rules/" \
  --instructions "REFACTOR Phase X output. Issues: {list-issues}. Follow {relevant-rule}."
```

---

## FAQ

**Q: Skal jeg altid bruge multi-agent?**
A: Nej. Kun for features > 400 LOC eller multi-domain features. Små tasks: brug Cursor direkte.

**Q: Kan agents tale sammen?**
A: Nej, agents er isolerede. Coordination via plan file + human (dig i Cursor).

**Q: Hvad hvis en agent fejler?**
A: Rollback den agent's branch og restart med klarere instruktioner.

**Q: Hvor mange agents kan køre parallel?**
A: Teoretisk unlimited. Praktisk: 2-3 (backend + frontend + test-write).

**Q: Koster det mere at køre multiple agents?**
A: Ja, men du betaler for parallel tid ikke sekventiel tid. Overall hurtigere development.

---

**Last Updated:** December 5, 2025  
**Maintainer:** Nicklas Eskou

