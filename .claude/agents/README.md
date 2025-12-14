# Claude Code Agent Configuration

Dette directory indeholder agent-specifikke konfigurationer til parallel udvikling med Claude Code.

## Agent Roles

### Frontend Agent
- **Scope:** `apps/web/`
- **Ansvar:** React komponenter, hooks, UI logic
- **Rules:** `.cursor/rules/10-nextjs_frontend.mdc`, `.cursor/rules/12-forms_actions_validation.mdc`
- **Max LOC/task:** 400
- **Dependencies:** Venter på Backend/Database agents hvis API/schema ændringer

### Backend Agent
- **Scope:** `supabase/functions/`, `apps/web/app/api/v1/`
- **Ansvar:** Edge functions, API routes, business logic
- **Rules:** `.cursor/rules/21-api_design.mdc`, `.cursor/rules/32-supabase_patterns.mdc`
- **Max LOC/task:** 400
- **Dependencies:** Venter på Database agent hvis schema ændringer

### Database Agent
- **Scope:** `supabase/migrations/`
- **Ansvar:** SQL migrations, RLS policies, indexes
- **Rules:** `.cursor/rules/30-database_postgres.mdc`, `.cursor/rules/32-supabase_patterns.mdc`
- **Max LOC/task:** 300
- **Dependencies:** Ingen (kører først typisk)

### Testing Agent
- **Scope:** `**/*.test.ts`, `**/*.spec.ts`
- **Ansvar:** Unit tests, integration tests
- **Rules:** `.cursor/rules/00-foundations.mdc` (testing section)
- **Max LOC/task:** 500
- **Dependencies:** Venter på alle implementerings-agents

## Workflow: Plan → Execute

### I Cursor (Planlægning):
```bash
# 1. Hent ticket fra Linear
/fetch-linear-ticket HUD-35

# 2. Research patterns
/research-feature-patterns "auction bidding system"

# 3. Opret implementation plan
/create-implementation-plan HUD-35

# 4. Valider plan
/validate-plan .project/plans/HUD-35/implementation-plan-*.md
```

### I Claude Code (Eksekvering):

**Opdel planen i agent tasks:**

```bash
# Agent 1: Database (kører først)
claude-code execute \
  --agent database \
  --plan .project/plans/HUD-35/implementation-plan-*.md \
  --phase 1 \
  --scope "supabase/migrations/**"

# Agent 2-4: Frontend, Backend, Testing (parallel)
claude-code execute --agent frontend --plan ... --phase 2 &
claude-code execute --agent backend --plan ... --phase 3 &
claude-code execute --agent testing --plan ... --phase 4 &
wait
```

## Agent Communication

Agents kommunikerer via:
1. **Git branches:** `feature/huddle-35-auction-bidding-{agent-name}`
2. **Shared plan file:** `.project/plans/HUD-35/implementation-plan-*.md` (status updates)
3. **Agent logs:** `.project/plans/HUD-35/agent-logs/`

### Status Tracking:
```markdown
## Phase 1: Database Schema
**Agent:** database
**Status:** ✅ Complete
**Branch:** feature/huddle-35-auction-bidding-database
**Commit:** abc123

## Phase 2: Frontend Components
**Agent:** frontend
**Status:** 🔄 In Progress
**Branch:** feature/huddle-35-auction-bidding-frontend
**Dependencies:** Phase 1 (✅)
```

## Conflict Resolution

### Scenario: Overlapping files
Hvis to agents rører samme fil → sekventiel eksekvering:

```bash
# ❌ Parallel (konflikt risiko):
claude-code execute --agent frontend --phase 2 &
claude-code execute --agent backend --phase 3 &  # Begge rører lib/types/auction.ts

# ✅ Sekventiel:
claude-code execute --agent backend --phase 3   # Opretter auction.ts først
claude-code execute --agent frontend --phase 2  # Bruger auction.ts derefter
```

**Cursor's rolle:** Opdage konflikter i planning-fasen og specificere ordre i planen.

## Rules Enforcement

Alle agents arver automatisk `.cursor/rules/` + `openmemory.md`:

1. **Foundation rules:** `00-foundations.mdc` (altid)
2. **Domain rules:** Agent-specifik (se ovenfor)
3. **Memory context:** `openmemory.md` (project knowledge)

## Testing Strategy

### Per-Phase Testing (agent selv):
```bash
npm run type-check
npm run lint
npm run test -- {agent-files}
```

### Integration Testing (testing agent):
```bash
npm run test:integration
npm run test:e2e
```

## Rollback Plan

Hvis agent fejler:
```bash
# Rollback agent's branch
git checkout feature/huddle-35-auction-bidding-frontend
git reset --hard {last-good-commit}

# Genstart agent med opdateret plan
claude-code execute --agent frontend --phase 2 --retry
```

## Metrics

Track agent performance:
- **Velocity:** LOC/time per agent
- **Quality:** Lint/test failures per agent
- **Rework:** Rollbacks per agent

Gem i: `.project/plans/HUD-35/agent-metrics.json`

---

## GitHub Operations

**IMPORTANT:** All agents use **GitHub CLI (`gh`)** via terminal access, NOT GitHub MCP.

- Create branches: `git checkout -b feature/huddle-XX-{feature}-{agent}`
- Commit: `git commit -m "feat(domain): Description (HUD-XX)"`
- Push: `git push -u origin feature/huddle-XX-{feature}-{agent}`
- View issues: `gh issue view HUD-XX`

See [.claude/GITHUB-CLI-GUIDE.md](../GITHUB-CLI-GUIDE.md) for complete reference.

## MCP Servers

Agents have access to:
- **Supabase MCP**: Database operations, migrations, RLS testing
- **Linear MCP**: Issue tracking, status updates (backend, frontend, orchestrator)
- **Context7 MCP**: Library documentation and code examples (all agents)

Agents do NOT have access to:
- **GitHub MCP** (use GitHub CLI instead)

---

**Maintainer:** Nicklas Eskou  
**Last Updated:** December 5, 2025

