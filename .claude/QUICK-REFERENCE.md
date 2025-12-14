# Quick Reference: Cursor + Claude Code Workflow

## TL;DR

```bash
# 1. CURSOR: Plan (10-20 min)
/fetch-linear-ticket HUD-XX,HUD-YY
/create-implementation-plan HUD-XX-YY-feature

# 2. CLAUDE CODE: Execute med Orchestrator (30-60 min)
claude-code chat
> Execute plan at .project/plans/HUD-XX-YY/...
> Use Linear MCP to update issues and coordinate agents

# 3. CURSOR: Review & PR (10-20 min)
/review-pr-self
/create-pr-with-linear HUD-XX,HUD-YY
```

**Total Time:** ~50-100 min for 1000+ LOC feature (vs. 4-8 hours sequential)

**⚠️ VIGTIG:** Agents skal oprettes i Claude Code UI først - se [CREATE-AGENTS.md](./CREATE-AGENTS.md)

---

## Command Cheat Sheet

### Cursor Commands (Planning)
| Command | Purpose | When |
|---------|---------|------|
| `/fetch-linear-ticket HUD-XX` | Get ticket details | Start of workflow |
| `/research-feature-patterns "text"` | Find similar code | Before planning |
| `/create-implementation-plan HUD-XX` | Generate plan | After research |
| `/validate-plan {file}` | Check plan quality | After plan creation |

### Cursor Commands (Review)
| Command | Purpose | When |
|---------|---------|------|
| `/review-pr-self` | Self-review code | After integration |
| `/prepare-pr` | Pre-PR checks | Before PR creation |
| `/create-pr-with-linear HUD-XX` | Create PR | Ready to merge |

### Claude Code Commands (Execution)
| Command | Purpose | When |
|---------|---------|------|
| `claude-code chat` → talk to orchestrator | Let orchestrator coordinate all agents | After plan approved (RECOMMENDED) |
| `claude-code task --agent {name} ...` | Run single agent manually | Debug/testing individual agents |

**Anbefalet:** Brug orchestrator agent til at koordinere alt. Den håndterer dependencies, parallel execution, og Linear updates automatisk.

---

## File Locations

### Configurations
- Agent configs: `.claude/agents/`
- Rules: `.cursor/rules/`
- Project context: `openmemory.md`
- Plan template: `.project/plans/MULTI-AGENT-TEMPLATE.md`

### Generated Files
- Plans: `.project/plans/HUD-XX/`
- Agent logs: `.project/plans/HUD-XX/agent-logs/`
- Branches: `feature/huddle-XX-{feature}-{agent}`

---

## Agent Orchestration

### Orchestrator Agent (Anbefalet Workflow)

```
Orchestrator Agent
  ↓ Reads implementation plan
  ↓ Updates Linear issues via MCP
  ↓
Phase 1: Database (sekventiel)
  ↓ Pause for human verification
  ↓
Phase 2: Backend  ┐
Phase 3: Frontend ├─ (parallel via orchestrator)
  ↓               ┘
  ↓ Pause for human verification
  ↓
Phase 4: Testing (sekventiel)
  ↓
Orchestrator: Merge branches + Update Linear
```

**Fordele:**
- ✅ Automatisk dependency management
- ✅ Linear status updates via MCP
- ✅ Pause points for human verification
- ✅ Automatic error handling & rollbacks
- ✅ Integrated final output

---

## Decision Tree

### Should I use multi-agent?

```
Start
  ↓
Feature > 400 LOC?
  ├─ No → Use Cursor directly
  └─ Yes
      ↓
      Multi-domain (DB + BE + FE)?
      ├─ No → Use Cursor directly
      └─ Yes
          ↓
          Clear requirements?
          ├─ No → Research in Cursor first
          └─ Yes → ✅ Use multi-agent
```

---

## Typical Timing

| Phase | Agent | Typical Time | Can Parallelize? |
|-------|-------|--------------|------------------|
| Phase 1 | database | 5-10 min | ❌ No (runs first) |
| Phase 2 | backend | 15-25 min | ✅ Yes (with frontend) |
| Phase 3 | frontend | 15-25 min | ✅ Yes (with backend) |
| Phase 4 | testing | 10-20 min | ❌ No (runs last) |

**Sequential:** 45-80 min  
**Parallel:** 30-55 min  
**Savings:** ~33% time reduction

---

## Common Issues

### Issue: Agent produces incorrect code
```bash
# Solution: Add stricter context
claude-code task \
  --agent {agent} \
  --context ".claude/agents/{agent}-agent.md" \
  --context ".cursor/rules/" \
  --context "openmemory.md" \
  --context ".project/plans/HUD-XX/implementation-plan-*.md" \
  --instructions "REDO Phase X. Previous had {issue}. Ensure {requirement}."
```

### Issue: Merge conflicts
```bash
# Solution: Resolve manually, re-test
git checkout feature/huddle-XX-complete
git merge {conflicting-branch}
# Resolve conflicts in editor
npm run test && npm run build
```

### Issue: Tests failing after integration
```bash
# Solution: Run testing agent again
claude-code task \
  --agent testing \
  --context ".claude/agents/testing-agent.md" \
  --instructions "Fix failing tests. Current failures: {list}."
```

---

## Quality Gates

### After Each Phase
- [ ] Agent completed successfully
- [ ] Manual verification passed
- [ ] Branch pushed to remote

### Before PR Creation
- [ ] All branches merged to unified feature branch
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (>80% coverage)
- [ ] `npm run build` succeeds
- [ ] Manual E2E testing complete

---

## Cost Estimation

### Small Feature (~400 LOC, 2 agents)
- Planning (Cursor): ~$0.50
- Execution (Claude Code): ~$4-6
- Review (Cursor): ~$0.50
- **Total:** ~$5-7

### Medium Feature (~800 LOC, 3 agents)
- Planning (Cursor): ~$1
- Execution (Claude Code): ~$10-15
- Review (Cursor): ~$1
- **Total:** ~$12-17

### Large Feature (~1200 LOC, 4 agents)
- Planning (Cursor): ~$2
- Execution (Claude Code): ~$20-30
- Review (Cursor): ~$2
- **Total:** ~$24-34

**Note:** Parallel execution = pay for time × agents, but total real time is reduced.

---

## Emergency Rollback

### Rollback Single Agent
```bash
git checkout feature/huddle-XX-{feature}-{agent}
git reset --hard {last-good-commit}
# Restart agent
```

### Rollback Entire Feature
```bash
git checkout main
git branch -D feature/huddle-XX-*
# Start over with refined plan
```

---

## Best Practices

1. ✅ **Always start with database agent** (types first)
2. ✅ **Verify each phase manually** (don't trust blindly)
3. ✅ **Use mocks for parallel dev** (frontend can start before backend done)
4. ✅ **Keep agents focused** (max 400 LOC per task)
5. ✅ **Test integration locally** (before PR)
6. ✅ **Update plan file as you go** (source of truth)

---

## Links

- [Getting Started Guide](./GETTING-STARTED-MULTI-AGENT.md) - Complete walkthrough
- [Agent Configs](./agents/README.md) - Agent details + workflow
- [Plan Template](../.project/plans/MULTI-AGENT-TEMPLATE.md) - Implementation plan template
- [Cursor Rules](../.cursor/rules/) - Coding standards
- [Project Context](../openmemory.md) - Project knowledge base

---

**Version:** 1.0.0  
**Last Updated:** December 5, 2025  
**Maintainer:** Nicklas Eskou

