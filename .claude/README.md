# Claude Code Multi-Agent Setup

Dette directory indeholder al konfiguration til at køre Claude Code agents med orchestration på Huddle projektet.

## ⚠️ VIGTIG: Agents skal oprettes i Claude Code UI

Filerne i `agents/` mappen er **documentation**, ikke faktiske Claude Code agents.

**Du skal oprette agents via Claude Code UI** - se [CREATE-AGENTS.md](./CREATE-AGENTS.md)

## Structure

```
.claude/
├── README.md                          # This file
├── CREATE-AGENTS.md                   # 🔴 START HER - Opret agents i UI
├── WORKFLOW-WITH-MCP.md              # Komplet workflow med MCP integration
├── GETTING-STARTED-MULTI-AGENT.md    # Detailed guide (deprecated - use CREATE-AGENTS.md)
├── QUICK-REFERENCE.md                # Quick reference
└── agents/
    ├── README.md                      # Documentation only
    ├── database-agent.md              # System prompts reference
    ├── backend-agent.md               # System prompts reference
    ├── frontend-agent.md              # System prompts reference
    └── testing-agent.md               # System prompts reference
```

## Quick Start

### 1. Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
claude-code auth login
```

### 2. Opret Agents i Claude Code UI
```bash
claude-code
> /agents
> Create new agent

# Opret disse 5 agents (følg CREATE-AGENTS.md for system prompts):
# 1. database
# 2. backend
# 3. frontend
# 4. testing
# 5. orchestrator (VIGTIG!)
```

Se detaljerede instruktioner i: [CREATE-AGENTS.md](./CREATE-AGENTS.md)

### 3. Konfigurer MCP Servers

**Supabase MCP:**
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

**Linear MCP:**
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

**Context7 MCP:**
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"],
      "env": {
        "CONTEXT7_API_KEY": "din-context7-api-key"
      }
    }
  }
}
```

**GitHub:** Vi bruger **GitHub CLI (`gh`)** i stedet for GitHub MCP. Se [GITHUB-CLI-GUIDE.md](./GITHUB-CLI-GUIDE.md) for details.

### 4. Test Orchestrator

**I Cursor (Planning):**
```bash
/fetch-linear-ticket HUD-XX,HUD-YY,HUD-ZZ
/create-implementation-plan HUD-XX-YY-ZZ-feature-name
```

**I Claude Code (Execution):**
```bash
claude-code chat

# Talk to orchestrator agent:
Execute the implementation plan at .project/plans/HUD-XX-YY-ZZ/implementation-plan-*.md

Use Linear MCP to update issue status and coordinate specialized agents.
```

**I Cursor (Review):**
```bash
/review-pr-self
/create-pr-with-linear HUD-XX,HUD-YY,HUD-ZZ
```

Se komplet workflow: [WORKFLOW-WITH-MCP.md](./WORKFLOW-WITH-MCP.md)

## Agent Roles

| Agent | Scope | Max LOC | Typical Runtime |
|-------|-------|---------|-----------------|
| **database** | `supabase/migrations/` | 300 | 5-10 min |
| **backend** | `supabase/functions/`, `apps/web/app/api/` | 400 | 15-25 min |
| **frontend** | `apps/web/components/`, `apps/web/hooks/` | 400 | 15-25 min |
| **testing** | `**/*.test.ts` | 500 | 10-20 min |

## When to Use Multi-Agent vs Single Agent (Cursor)

### Use Multi-Agent (Claude Code):
- ✅ Feature > 400 LOC
- ✅ Multi-domain (database + backend + frontend)
- ✅ Clear requirements, no ambiguity
- ✅ Can be broken into parallel phases

### Use Single Agent (Cursor):
- ✅ Feature < 400 LOC
- ✅ Single domain (only frontend OR only backend)
- ✅ Requires human decision-making
- ✅ UI/UX refinement needed
- ✅ Architecture exploration

## Cost Considerations

**Cursor (single agent):**
- Charged per message
- Good for exploration and planning

**Claude Code (multi-agent):**
- Charged per agent per task
- Good for deterministic execution
- **Cost example:** 4 agents × 20 min = 80 agent-minutes
- **Benefit:** 80 min of work done in 20 min real time

**Rule of Thumb:**
- Planning in Cursor (cheap, interactive)
- Execution in Claude Code (fast, parallel)
- Review in Cursor (cheap, human oversight)

## Integration with Existing Workflow

### Cursor Commands (Still Use These for Planning):
- `/fetch-linear-ticket` - Get ticket details
- `/research-feature-patterns` - Find similar code
- `/create-implementation-plan` - Generate multi-agent plan
- `/validate-plan` - Check plan quality

### Claude Code Tasks (New for Execution):
- `claude-code task --agent database ...` - Execute database phase
- `claude-code task --agent backend ...` - Execute backend phase
- `claude-code task --agent frontend ...` - Execute frontend phase
- `claude-code task --agent testing ...` - Execute testing phase

### Cursor Commands (Still Use These for Review):
- `/review-pr-self` - Self-review code
- `/prepare-pr` - Pre-PR checks
- `/create-pr-with-linear` - Create PR + update Linear

## Rules Inheritance

All agents automatically inherit:
1. `.cursor/rules/00-foundations.mdc` (always)
2. `.cursor/rules/01-git_branch_pr.mdc` (git conventions)
3. Domain-specific rules (see each agent config)
4. `openmemory.md` (project context)

Agents DO NOT need to be explicitly told about these rules - they are passed via `--context` flag.

## Testing Your Setup

### Test 1: Single Agent (Database)
```bash
# Create a simple migration
claude-code task \
  --agent database \
  --context ".claude/agents/database-agent.md" \
  --instructions "Create a migration that adds a 'test_column' TEXT column to the profiles table. Include up and down migrations."

# Expected: Creates migration file in supabase/migrations/
```

### Test 2: Parallel Agents (Backend + Frontend)
```bash
# Backend: Simple API endpoint
claude-code task \
  --agent backend \
  --context ".claude/agents/backend-agent.md" \
  --instructions "Create GET /api/v1/health endpoint that returns {status: 'ok'}" &

# Frontend: Simple component
claude-code task \
  --agent frontend \
  --context ".claude/agents/frontend-agent.md" \
  --instructions "Create HealthCheck component that calls /api/v1/health and displays status" &

wait

# Expected: Both complete in parallel, ~same time
```

## Troubleshooting

### Problem: "agent not found"
```bash
# Solution: Specify agent config explicitly
claude-code task \
  --agent database \
  --context ".claude/agents/database-agent.md" \
  ...
```

### Problem: Agent produces low-quality code
```bash
# Solution: Add more context + stricter instructions
claude-code task \
  --agent {agent-name} \
  --context ".claude/agents/{agent-name}-agent.md" \
  --context ".cursor/rules/" \
  --context "openmemory.md" \
  --context ".project/plans/{ISSUE}/implementation-plan-*.md" \
  --instructions "Execute Phase X. Follow {agent-name}-agent.md rules STRICTLY. Ensure {specific-quality-requirement}."
```

### Problem: Agent conflicts with another agent
```bash
# Solution: Run sequentially instead of parallel
# OR: Coordinate via better plan (specify file ownership)
```

## Advanced Usage

### Custom Agent Configurations
You can create additional agents for specialized tasks:

```bash
# Example: E2E testing agent
.claude/agents/e2e-agent.md

# Example: Documentation agent
.claude/agents/docs-agent.md

# Example: Refactoring agent
.claude/agents/refactor-agent.md
```

### Agent Orchestration Script
Use `scripts/run-multi-agent.sh` for automated orchestration:

```bash
./scripts/run-multi-agent.sh HUD-35
```

See [GETTING-STARTED-MULTI-AGENT.md](./GETTING-STARTED-MULTI-AGENT.md) for details.

## References

- **Claude Code Docs:** https://docs.anthropic.com/claude-code
- **Cursor MCP:** `.cursor/rules/`
- **Huddle Plan Template:** `.project/plans/MULTI-AGENT-TEMPLATE.md`
- **Getting Started:** [CREATE-AGENTS.md](./CREATE-AGENTS.md) (START HER)
- **GitHub CLI Guide:** [GITHUB-CLI-GUIDE.md](./GITHUB-CLI-GUIDE.md)
- **Complete Workflow:** [WORKFLOW-WITH-MCP.md](./WORKFLOW-WITH-MCP.md)

---

**Created:** December 5, 2025  
**Maintainer:** Nicklas Eskou  
**Version:** 1.0.0

