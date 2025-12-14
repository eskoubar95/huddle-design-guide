# Visual Workflow Guide

## Korrekt Multi-Agent Setup

### ❌ FORKERT (Hvad jeg først lavede)

```
.claude/agents/*.md filer
        ↓
Claude Code læser dem? ❌ NEJ!
        ↓
"No agents found" fejl
```

**Problem:** `.md` filer er kun documentation. Claude Code kræver agents oprettet via UI.

---

### ✅ KORREKT Setup

```
1. Opret agents i Claude Code UI
        ↓
2. Agents vises i /agents interface
        ↓
3. Orchestrator kan starte specialized agents
        ↓
4. Agents har adgang til MCP servers
```

---

## Komplet Workflow Visualization

### Phase 1: Planning i Cursor (Human)

```
┌─────────────────────────────────────────┐
│  CURSOR (IDE)                           │
│                                         │
│  You:                                   │
│  /fetch-linear-ticket HUD-35,36,37      │
│                                         │
│  Cursor + Linear MCP:                   │
│  ↓ Fetches 3 issues                     │
│  ↓ Analyzes dependencies                │
│  ↓ Groups related work                  │
│                                         │
│  You:                                   │
│  /create-implementation-plan HUD-35-37  │
│                                         │
│  Cursor:                                │
│  ↓ Uses MULTI-AGENT-TEMPLATE.md         │
│  ↓ Creates plan with agent assignments  │
│  ↓ Defines phases & dependencies        │
│  ↓ Saves to .project/plans/HUD-35-37/   │
│                                         │
│  Output: implementation-plan-*.md       │
└─────────────────────────────────────────┘
            ↓ (commit & push plan)
```

---

### Phase 2: Execution i Claude Code (Agents)

```
┌─────────────────────────────────────────────────────────┐
│  CLAUDE CODE                                            │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ORCHESTRATOR AGENT                                │ │
│  │                                                   │ │
│  │ 1. Reads implementation plan                      │ │
│  │                                                   │ │
│  │ 2. Linear MCP: Update HUD-35,36,37 → In Progress │ │
│  │                                                   │ │
│  │ 3. Starts DATABASE AGENT (sequential)            │ │
│  │    ├─ Creates migrations                          │ │
│  │    ├─ Supabase MCP: Apply migrations              │ │
│  │    ├─ Supabase MCP: Test RLS                      │ │
│  │    └─ Supabase MCP: Generate types                │ │
│  │                                                   │ │
│  │ 4. ⏸️  Pause for human verification                │ │
│  │                                                   │ │
│  │ 5. Starts BACKEND + FRONTEND (parallel)          │ │
│  │    ┌────────────────┬──────────────────┐         │ │
│  │    │ BACKEND AGENT  │  FRONTEND AGENT  │         │ │
│  │    │                │                  │         │ │
│  │    │ • API routes   │  • Components    │         │ │
│  │    │ • Services     │  • Hooks         │         │ │
│  │    │ • Validation   │  • Forms         │         │ │
│  │    │                │  • (uses mocks)  │         │ │
│  │    │ ✅ Complete     │  ✅ Complete      │         │ │
│  │    └────────────────┴──────────────────┘         │ │
│  │                                                   │ │
│  │ 6. ⏸️  Pause for human verification                │ │
│  │                                                   │ │
│  │ 7. Starts TESTING AGENT (sequential)             │ │
│  │    ├─ Unit tests                                  │ │
│  │    ├─ Integration tests                           │ │
│  │    ├─ E2E tests                                   │ │
│  │    └─ Coverage > 80%                              │ │
│  │                                                   │ │
│  │ 8. Linear MCP: Update HUD-35,36,37 → Review      │ │
│  │                                                   │ │
│  │ 9. Merges all agent branches                     │ │
│  │    → feature/huddle-35-37-complete                │ │
│  │                                                   │ │
│  │ ✅ Orchestration complete!                         │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
            ↓ (unified branch ready)
```

---

### Phase 3: Review i Cursor (Human)

```
┌─────────────────────────────────────────┐
│  CURSOR (IDE)                           │
│                                         │
│  You:                                   │
│  git checkout feature/huddle-35-37-...  │
│                                         │
│  You:                                   │
│  /review-pr-self                        │
│                                         │
│  Cursor:                                │
│  ↓ Checks code quality                  │
│  ↓ Checks test coverage                 │
│  ↓ Checks security                      │
│  ↓ Suggests improvements                │
│                                         │
│  You: (manual testing)                  │
│  npm run test && npm run build          │
│  npm run dev (test manually)            │
│                                         │
│  You:                                   │
│  /create-pr-with-linear HUD-35,36,37    │
│                                         │
│  Cursor + Linear MCP:                   │
│  ↓ Creates GitHub PR                    │
│  ↓ Links all 3 Linear issues            │
│  ↓ Updates issues → Review              │
│  ↓ Posts PR link to Linear              │
│                                         │
│  Output: Ready for human review         │
└─────────────────────────────────────────┘
```

---

## Agent Communication Flow

### Orchestrator koordinerer Specialized Agents

```
┌──────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                          │
│                                                          │
│  Responsibilities:                                       │
│  • Read implementation plan                              │
│  • Coordinate agent execution                            │
│  • Handle dependencies                                   │
│  • Update Linear via MCP                                 │
│  • Integrate outputs                                     │
│  • Rollback on failure                                   │
└──────────────────────────────────────────────────────────┘
                ↓           ↓           ↓           ↓
    ┌───────────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐
    │   DATABASE    │ │  BACKEND  │ │  FRONTEND  │ │ TESTING  │
    │               │ │           │ │            │ │          │
    │ Scope:        │ │ Scope:    │ │ Scope:     │ │ Scope:   │
    │ • Migrations  │ │ • APIs    │ │ • UI       │ │ • Tests  │
    │ • RLS         │ │ • Services│ │ • Hooks    │ │ • E2E    │
    │ • Types       │ │ • Logic   │ │ • Forms    │ │ • QA     │
    │               │ │           │ │            │ │          │
    │ MCP:          │ │ MCP:      │ │ MCP:       │ │ MCP:     │
    │ • Supabase    │ │ • Supabase│ │ • Linear   │ │ • Supabase│
    │ • GitHub      │ │ • Linear  │ │ • GitHub   │ │ • GitHub │
    │               │ │ • GitHub  │ │            │ │          │
    └───────────────┘ └───────────┘ └────────────┘ └──────────┘
```

---

## MCP Integration Points

### Supabase MCP Usage

```
┌─────────────────────────────────────────────────────────┐
│  DATABASE AGENT + Supabase MCP                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Create migration file                               │
│     ↓                                                   │
│  2. Supabase MCP: apply_migration()                     │
│     • Applies migration to local DB                     │
│     • Returns success/failure                           │
│     ↓                                                   │
│  3. Supabase MCP: test_rls_policies()                   │
│     • Tests as authenticated user                       │
│     • Tests as unauthenticated user                     │
│     • Returns test results                              │
│     ↓                                                   │
│  4. Supabase MCP: generate_types()                      │
│     • Generates TypeScript types                        │
│     • Saves to apps/web/lib/db/database.types.ts        │
│     ↓                                                   │
│  5. ✅ Phase complete, types ready for other agents      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Linear MCP Usage

```
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATOR AGENT + Linear MCP                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Start of workflow:                                     │
│  Linear MCP: update_issue(HUD-35, status="In Progress") │
│  Linear MCP: update_issue(HUD-36, status="In Progress") │
│  Linear MCP: update_issue(HUD-37, status="In Progress") │
│  Linear MCP: create_comment("🤖 Starting multi-agent")  │
│                                                         │
│  After Phase 1:                                         │
│  Linear MCP: create_comment("✅ Phase 1 complete")       │
│                                                         │
│  After Phase 2:                                         │
│  Linear MCP: create_comment("✅ Phase 2 complete")       │
│                                                         │
│  After all phases:                                      │
│  Linear MCP: update_issue(HUD-35, status="Review")      │
│  Linear MCP: update_issue(HUD-36, status="Review")      │
│  Linear MCP: update_issue(HUD-37, status="Review")      │
│  Linear MCP: create_comment("✅ Ready for review")       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Timeline Comparison

### Før (Cursor Alene, Sekventiel)

```
Time →
0h     2h     4h     6h     8h     10h    12h
│━━━━━│━━━━━│━━━━━│━━━━━│━━━━━│━━━━━│━━━━━│
│  Plan │ DB │ Backend │ Frontend │ Test │ PR│
└──────┴────┴─────────┴──────────┴──────┴───┘
Total: ~12 timer
```

### Nu (Cursor + Claude Code, Parallel)

```
Time →
0h     1h     2h     3h     4h
│━━━━━│━━━━━│━━━━━│━━━━━│━━━━━│
│ Plan │ DB │Backend  │Test│PR│
│      │    │Frontend │    │  │
└──────┴────┴─────────┴────┴──┘
Total: ~4 timer (Backend+Frontend parallel)

Speedup: 3x hurtigere! ⚡
```

---

## Cost Estimation

### Small Feature (1 issue, ~400 LOC)
```
Planning (Cursor):         $0.50
Execution (1-2 agents):    $3-5
Review (Cursor):           $0.50
──────────────────────────────
Total:                     $4-6
Time saved:                1-2 timer
```

### Medium Feature (2-3 issues, ~800 LOC)
```
Planning (Cursor):         $1
Execution (3-4 agents):    $10-15
Review (Cursor):           $1
──────────────────────────────
Total:                     $12-17
Time saved:                4-6 timer
```

### Large Epic (5-10 issues, ~2000 LOC)
```
Planning (Cursor):         $2-3
Execution (4 agents, waves): $30-50
Review (Cursor):           $2-3
──────────────────────────────
Total:                     $34-56
Time saved:                15-25 timer
```

**ROI:** Hvis din time er værd >$10, sparer du penge allerede fra medium features!

---

## Fejl at Undgå

### ❌ Fejl 1: Tro at .md filer = agents
```
.claude/agents/database-agent.md
        ↓
Claude Code finder IKKE agents automatisk
        ↓
Du skal oprette dem i UI!
```

### ❌ Fejl 2: Starte agents manuelt uden orchestrator
```
claude-code task --agent database ...
claude-code task --agent backend ...
        ↓
Ingen koordinering mellem agents
        ↓
Brug orchestrator i stedet!
```

### ❌ Fejl 3: Glemme MCP setup
```
Agents uden MCP:
  • Kan ikke opdatere Linear automatisk
  • Kan ikke teste Supabase direkte
  • Kan ikke generate types
        ↓
Setup MCP servers først!
```

---

## Næste Steps

1. ✅ Opret agents i Claude Code UI → [CREATE-AGENTS.md](./CREATE-AGENTS.md)
2. ✅ Konfigurer MCP servers → [WORKFLOW-WITH-MCP.md](./WORKFLOW-WITH-MCP.md)
3. ✅ Test med 1 simpel issue
4. ✅ Prøv 2-3 relaterede issues
5. ✅ Scale til epic-level (5-10 issues)

**Start her:** [CREATE-AGENTS.md](./CREATE-AGENTS.md)

---

**Version:** 1.0.0  
**Last Updated:** December 5, 2025


