# Multi-Agent Workflow med MCP Integration

## Din Vision (Korrekt Workflow)

```
┌─────────────────────────────────────────────────────────┐
│ 1. CURSOR: Planlægning & Samling af Issues             │
├─────────────────────────────────────────────────────────┤
│ - Fetch multiple Linear issues                         │
│ - Analyse og gruppér relaterede issues                 │
│ - Opret unified implementation plan                     │
│ - Define agent assignments                              │
│ - Approve plan                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. CLAUDE CODE: Orchestrator Agent starter             │
├─────────────────────────────────────────────────────────┤
│ - Orchestrator læser implementation plan                │
│ - Bruger Linear MCP til at opdatere issue status        │
│ - Starter specialized agents (database, backend, etc.)  │
│ - Koordinerer parallel arbejde                          │
│ - Bruger Supabase MCP til migrations og tests          │
│ - Integrerer alle outputs                               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. CURSOR: Review & Finalize                           │
├─────────────────────────────────────────────────────────┤
│ - Human review af agent outputs                         │
│ - Test integration                                      │
│ - Create PR                                             │
│ - Merge til main                                        │
└─────────────────────────────────────────────────────────┘
```

---

## MCP Servers Setup

### 1. Supabase MCP

**Hvad giver det dig:**
- Agents kan køre migrations direkte
- Agents kan teste RLS policies
- Agents kan query database for validation
- Agents kan generate TypeScript types

**Setup i Claude Code:**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_PROJECT_ID": "din-project-id",
        "SUPABASE_ACCESS_TOKEN": "din-access-token"
      }
    }
  }
}
```

**Usage i agents:**
```
Database agent kan nu:
- list_migrations
- apply_migration
- test_rls_policies
- generate_types
- execute_sql (for validation)
```

---

### 2. Linear MCP

**Hvad giver det dig:**
- Orchestrator kan fetch multiple issues at once
- Agents kan opdatere issue status automatisk
- Agents kan create sub-issues
- Agents kan post comments med progress

**Setup i Claude Code:**
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@linear/mcp-server"],
      "env": {
        "LINEAR_API_KEY": "din-linear-api-key"
      }
    }
  }
}
```

**Usage i agents:**
```
Orchestrator agent kan nu:
- list_issues (filter: team, project, status)
- get_issue (fetch single issue details)
- update_issue (status, assignee, etc.)
- create_comment (post progress updates)
- create_sub_issues (break down work)
```

---

## Komplet Workflow: Multi-Issue Feature

### **Phase 1: Planlægning i Cursor (15-30 min)**

#### 1.1 Saml Relaterede Issues

```bash
# I Cursor chat
/fetch-linear-ticket HUD-35
/fetch-linear-ticket HUD-36
/fetch-linear-ticket HUD-37

# Eller batch fetch:
Fetch Linear issues: HUD-35, HUD-36, HUD-37
```

**Cursor analyzer:**
- HUD-35: Auction bidding API (backend)
- HUD-36: Auction bidding UI (frontend)
- HUD-37: Auction notifications (backend + realtime)

**Relations:**
- HUD-36 depends on HUD-35 (frontend needs API)
- HUD-37 depends on HUD-35 (notifications need bid events)

#### 1.2 Research Patterns

```bash
/research-feature-patterns "auction bidding system with real-time notifications"

# Cursor finder:
# - Eksisterende auction implementation
# - Realtime patterns med Supabase
# - Notification patterns
```

#### 1.3 Opret Unified Implementation Plan

```bash
/create-implementation-plan HUD-35-36-37-auction-bidding-system

# Cursor opretter plan med:
# - Alle 3 issues inkluderet
# - Dependencies mappet
# - Agent assignments clear
# - Phase breakdown med parallel execution
```

**Plan struktur:**
```markdown
# Auction Bidding System - Multi-Issue Implementation

## Linear Issues
- HUD-35: Auction bidding API (backend)
- HUD-36: Auction bidding UI (frontend)
- HUD-37: Auction notifications (backend + realtime)

## Agent Assignment
| Phase | Agent | Issues | LOC | Parallel? |
|-------|-------|--------|-----|-----------|
| 1 | database | HUD-35 | ~200 | No (runs first) |
| 2 | backend | HUD-35, HUD-37 | ~600 | Yes (with frontend) |
| 3 | frontend | HUD-36 | ~400 | Yes (with backend) |
| 4 | testing | ALL | ~500 | No (runs last) |

## Phase 1: Database Schema
**Agent:** database
**Issues:** HUD-35
- Create bids table
- Create bid_events table (for HUD-37)
- Add RLS policies
- Create indexes

## Phase 2: Backend APIs + Notifications
**Agent:** backend
**Issues:** HUD-35, HUD-37
- POST /api/v1/auctions/:id/bid (HUD-35)
- Realtime subscription setup (HUD-37)
- Notification service (HUD-37)

## Phase 3: Frontend UI
**Agent:** frontend
**Issues:** HUD-36
**Dependency:** Phase 2 (kan starte med mocks)
- Bid form component
- Real-time bid updates
- Notification UI

## Phase 4: Testing
**Agent:** testing
**Issues:** ALL
- Unit tests for all modules
- Integration tests for full flow
- E2E test: Place bid → receive notification
```

#### 1.4 Validate & Approve

```bash
/validate-plan .project/plans/HUD-35-36-37/implementation-plan-*.md

# Check:
# - All dependencies clear?
# - Agent assignments optimal?
# - Parallel execution safe?
# - Success criteria measurable?

# Hvis OK → commit plan
git add .project/plans/HUD-35-36-37/
git commit -m "docs: add multi-issue plan for auction bidding system"
git push
```

---

### **Phase 2: Eksekvering i Claude Code (30-60 min)**

#### 2.1 Start Orchestrator Agent

```bash
# I terminal
claude-code chat

# Talk to orchestrator agent:
Execute the implementation plan at .project/plans/HUD-35-36-37/implementation-plan-*.md

Use Linear MCP to:
1. Update HUD-35, HUD-36, HUD-37 status to "In Progress"
2. Post comment on each issue with plan link

Then coordinate the specialized agents:
- Phase 1: database agent (sequential)
- Phase 2-3: backend + frontend agents (parallel)
- Phase 4: testing agent (sequential)

Update Linear issues as each phase completes.
```

#### 2.2 Orchestrator Execution (Automated)

**Orchestrator gør:**

```
1. Read plan file ✅

2. Linear MCP: Update issues
   - HUD-35 → In Progress
   - HUD-36 → In Progress
   - HUD-37 → In Progress
   - Post comment: "🤖 Starting multi-agent implementation"

3. Start database agent (Phase 1)
   → database agent creates migrations
   → Supabase MCP: Apply migrations
   → Supabase MCP: Test RLS policies
   → Supabase MCP: Generate types
   ✅ Phase 1 complete

4. Pause for human verification
   → "Phase 1 complete. Verify migrations? (y/n)"
   → [You verify] → "y"

5. Start backend + frontend agents (Phase 2-3 parallel)
   → backend agent creates API + notification service
   → frontend agent creates UI (uses mocks initially)
   → backend completes first
   → frontend swaps to real API
   ✅ Phase 2-3 complete

6. Pause for human verification
   → "Phase 2-3 complete. Verify integration? (y/n)"
   → [You verify] → "y"

7. Start testing agent (Phase 4)
   → testing agent writes all tests
   → Supabase MCP: Run integration tests
   ✅ Phase 4 complete

8. Linear MCP: Update issues
   - HUD-35 → Review (post: "Backend implementation complete")
   - HUD-36 → Review (post: "Frontend implementation complete")
   - HUD-37 → Review (post: "Notifications implementation complete")

9. Create unified branch
   → Merge all agent branches
   → Run full test suite
   → Ready for PR

✅ Orchestration complete!
```

#### 2.3 Monitor Progress (Real-time)

**Du kan følge med i:**

1. **Claude Code UI:**
   - Se hvilke agents kører
   - Se output i real-time
   - Pause/resume ved behov

2. **Linear:**
   - Se status updates automatisk
   - Læs agent comments
   - Track progress

3. **Git:**
   - Se branches blive oprettet
   - Se commits i real-time

---

### **Phase 3: Review & Finalize i Cursor (10-20 min)**

#### 3.1 Checkout Unified Branch

```bash
# Orchestrator har skabt:
git checkout feature/huddle-35-36-37-auction-bidding-system

# Branch indeholder alle agent outputs merged
```

#### 3.2 Review i Cursor

```bash
/review-pr-self

# Cursor checker:
# - Code quality
# - Test coverage
# - Security
# - Documentation
```

#### 3.3 Test Integration Lokalt

```bash
# Full test suite
npm run type-check
npm run lint
npm run test -- --coverage
npm run build

# Manual E2E test
supabase db reset
npm run dev
# Test: Create auction → Place bid → Receive notification
```

#### 3.4 Create PR

```bash
/create-pr-with-linear HUD-35,HUD-36,HUD-37

# Cursor opretter PR med:
# - Title: "feat(auctions): Add bidding system with notifications (HUD-35, HUD-36, HUD-37)"
# - Body: WHAT/WHY/HOW for all 3 issues
# - Links: All 3 Linear issues
# - Updates: All 3 issues → Review status
```

---

## Advanced: Epic-Level Orchestration

### For MEGET Store Features (5-10 Issues)

**Example: Complete Marketplace Overhaul**
- HUD-40: Search filters
- HUD-41: Sort options
- HUD-42: Pagination
- HUD-43: Saved searches
- HUD-44: Search analytics

**Workflow:**

#### 1. Cursor: Epic Planning (30-60 min)
```bash
# Fetch all issues
/fetch-linear-epic EPIC-5

# Cursor analyzer alle issues og opretter:
# - Epic-level plan
# - Sub-plans for hver issue cluster
# - Dependencies graph
# - Agent orchestration strategy
```

#### 2. Claude Code: Multi-Wave Execution (2-4 timer)

**Orchestrator kører waves:**

```
Wave 1 (Foundation):
- HUD-40 (search filters) → database + backend + frontend
- HUD-42 (pagination) → database + backend + frontend

Wave 2 (Enhancement - venter på Wave 1):
- HUD-41 (sort options) → backend + frontend
- HUD-43 (saved searches) → database + backend + frontend

Wave 3 (Analytics - venter på Wave 1+2):
- HUD-44 (search analytics) → database + backend
```

**Hver wave:**
1. Linear MCP: Update issues → In Progress
2. Koordinér agents (parallel hvor muligt)
3. Integrate outputs
4. Pause for human verification
5. Linear MCP: Update issues → Review
6. Continue til next wave

#### 3. Cursor: Epic Review (30 min)
```bash
# Review hele epic
# Test alle features sammen
# Create PR med alle issues linked
```

---

## Fordele ved Din Workflow

### 1. **Cursor (Human) fokuserer på:**
- ✅ Strategy & planning
- ✅ Issue analysis & grouping
- ✅ Dependencies mapping
- ✅ Quality review
- ✅ Final decision-making

### 2. **Orchestrator Agent håndterer:**
- ✅ Multi-agent coordination
- ✅ Linear status updates
- ✅ Progress tracking
- ✅ Error handling & rollbacks
- ✅ Integration mellem agents

### 3. **Specialized Agents håndterer:**
- ✅ Domain-specific implementation
- ✅ Code generation
- ✅ Testing
- ✅ Documentation

### 4. **MCP Servers giver:**
- ✅ Direct database access (Supabase)
- ✅ Issue tracking automation (Linear)
- ✅ Real-time validation
- ✅ Type generation

---

## Metrics & KPIs

### Før (Cursor alene, sekventiel):
```
5-10 issues × 2-4 timer = 10-40 timer total
```

### Nu (Cursor + Claude Code Orchestration):
```
Planning (Cursor): 30-60 min
Execution (Parallel agents): 2-4 timer real time (8-16 timer agent time)
Review (Cursor): 20-40 min
───────────────
Total: 3-5 timer real time for 10-40 timer work
```

**Speedup:** 3-8x hurtigere ⚡

---

## Næste Steps

1. **Opret agents i Claude Code** (følg CREATE-AGENTS.md)
2. **Konfigurer MCP servers** (Supabase + Linear)
3. **Test med 1 issue** (simpel feature)
4. **Prøv med 2-3 relaterede issues** (medium complexity)
5. **Scale til epic-level** (5-10 issues)

---

**Version:** 2.0.0  
**Last Updated:** December 5, 2025  
**Maintainer:** Nicklas Eskou


