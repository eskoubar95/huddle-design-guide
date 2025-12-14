# Setup Checklist: Claude Code Multi-Agent

## ✅ Phase 1: Installation (5 min)

- [ ] Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

- [ ] Authenticate
```bash
claude-code auth login
```

- [ ] Verify installation
```bash
claude-code --version
```

---

## ✅ Phase 2: Create Agents in UI (15-20 min)

- [ ] Åbn Claude Code
```bash
claude-code
> /agents
```

- [ ] Opret **Database Agent**
  - Name: `database`
  - System Prompt: Copy fra [CREATE-AGENTS.md](./CREATE-AGENTS.md#3-opret-database-agent)
  - Tools: File access, Terminal, MCP: Supabase, MCP: GitHub
  - Context: `.cursor/rules/30-database_postgres.mdc`, `.cursor/rules/32-supabase_patterns.mdc`, `openmemory.md`

- [ ] Opret **Backend Agent**
  - Name: `backend`
  - System Prompt: Copy fra [CREATE-AGENTS.md](./CREATE-AGENTS.md#4-opret-backend-agent)
  - Tools: File access, Terminal, MCP: Supabase, MCP: Linear, MCP: GitHub
  - Context: `.cursor/rules/21-api_design.mdc`, `.cursor/rules/32-supabase_patterns.mdc`, `.cursor/rules/33-clerk_auth.mdc`, `openmemory.md`

- [ ] Opret **Frontend Agent**
  - Name: `frontend`
  - System Prompt: Copy fra [CREATE-AGENTS.md](./CREATE-AGENTS.md#5-opret-frontend-agent)
  - Tools: File access, Terminal, MCP: Linear, MCP: GitHub
  - Context: `.cursor/rules/10-nextjs_frontend.mdc`, `.cursor/rules/12-forms_actions_validation.mdc`, `openmemory.md`

- [ ] Opret **Testing Agent**
  - Name: `testing`
  - System Prompt: Copy fra [CREATE-AGENTS.md](./CREATE-AGENTS.md#6-opret-testing-agent)
  - Tools: File access, Terminal, MCP: Supabase, MCP: GitHub
  - Context: `.cursor/rules/00-foundations.mdc`, `openmemory.md`

- [ ] Opret **Orchestrator Agent** ⭐ (VIGTIGST!)
  - Name: `orchestrator`
  - System Prompt: Copy fra [CREATE-AGENTS.md](./CREATE-AGENTS.md#7-opret-orchestrator-agent-vigtig)
  - Tools: File access, Terminal, Agent Delegation, MCP: Supabase, MCP: Linear, MCP: GitHub
  - Context: ALL `.cursor/rules/*.mdc`, `openmemory.md`, `.project/plans/`

- [ ] Verify alle 5 agents vises i `/agents`

---

## ✅ Phase 3: Configure MCP Servers (10 min)

### Supabase MCP

- [ ] Get Supabase credentials
  - Project ID: Fra Supabase dashboard
  - Access Token: Settings → API → Service role key

- [ ] Add til Claude Code config
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_PROJECT_ID": "YOUR_PROJECT_ID",
        "SUPABASE_ACCESS_TOKEN": "YOUR_SERVICE_ROLE_KEY"
      }
    }
  }
}
```

### Linear MCP

- [ ] Get Linear API key
  - Linear → Settings → API → Personal API keys → Create new key

- [ ] Add til Claude Code config
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@linear/mcp-server"],
      "env": {
        "LINEAR_API_KEY": "YOUR_LINEAR_API_KEY"
      }
    }
  }
}
```

- [ ] Restart Claude Code
```bash
# Quit Claude Code (Ctrl+C eller exit)
claude-code
# MCP servers should now be available
```

---

## ✅ Phase 4: Test Setup (15-20 min)

### Test 1: Verify Agents Exist

- [ ] Open Claude Code
```bash
claude-code
> /agents
```

- [ ] Verify alle 5 agents vises:
  - [x] database
  - [x] backend
  - [x] frontend
  - [x] testing
  - [x] orchestrator

### Test 2: Test MCP Connections

- [ ] Test Supabase MCP
```bash
claude-code chat
> Use Supabase MCP to list all migrations in the project
```
Expected: List of migrations fra `supabase/migrations/`

- [ ] Test Linear MCP
```bash
claude-code chat
> Use Linear MCP to fetch the last 3 issues from team Huddle World
```
Expected: List af 3 issues med details

### Test 3: Test Simple Agent Task

- [ ] Test database agent
```bash
claude-code chat
> Talk to database agent: Explain your role and constraints
```
Expected: Database agent beskriver sin rolle, scope, rules

### Test 4: Test Orchestrator

- [ ] Create a simple test plan i Cursor
```bash
# I Cursor
/fetch-linear-ticket HUD-XX (vælg en simpel task)
/create-implementation-plan HUD-XX
```

- [ ] Test orchestrator execution
```bash
claude-code chat
> Talk to orchestrator: Read the plan at .project/plans/HUD-XX/implementation-plan-*.md and explain the execution strategy
```
Expected: Orchestrator beskriver hvordan den vil koordinere agents

---

## ✅ Phase 5: Your First Multi-Agent Feature (1-2 timer)

### Planning (Cursor)

- [ ] Fetch Linear issue(s)
```bash
/fetch-linear-ticket HUD-XX
# Eller multiple: HUD-XX,HUD-YY,HUD-ZZ
```

- [ ] Research patterns
```bash
/research-feature-patterns "your feature description"
```

- [ ] Create implementation plan
```bash
/create-implementation-plan HUD-XX
# Eller multi-issue: HUD-XX-YY-ZZ
```

- [ ] Validate plan
```bash
/validate-plan .project/plans/HUD-XX/implementation-plan-*.md
```

- [ ] Commit plan
```bash
git add .project/plans/HUD-XX/
git commit -m "docs: add implementation plan for HUD-XX"
git push
```

### Execution (Claude Code)

- [ ] Start orchestrator
```bash
claude-code chat

# Talk to orchestrator agent:
Execute the implementation plan at .project/plans/HUD-XX/implementation-plan-*.md

Use Linear MCP to:
1. Update issue status to In Progress
2. Post comment with plan link

Then coordinate specialized agents according to the plan.

After each phase, pause for human verification.
```

- [ ] Monitor execution
  - [ ] Watch orchestrator output
  - [ ] Check Linear for status updates
  - [ ] Verify branches being created

- [ ] Human verification after Phase 1 (Database)
  - [ ] Check migrations applied: `supabase migration up`
  - [ ] Check types generated: `apps/web/lib/db/database.types.ts`
  - [ ] Approve to continue: "y" i orchestrator chat

- [ ] Human verification after Phase 2-3 (Backend+Frontend)
  - [ ] Test API endpoints: `curl` eller Postman
  - [ ] Test frontend: `npm run dev`
  - [ ] Check integration works
  - [ ] Approve to continue: "y" i orchestrator chat

- [ ] Final verification after Phase 4 (Testing)
  - [ ] All tests pass: `npm run test`
  - [ ] Coverage > 80%
  - [ ] Build succeeds: `npm run build`

### Review (Cursor)

- [ ] Checkout unified branch
```bash
git checkout feature/huddle-XX-complete
```

- [ ] Review code
```bash
/review-pr-self
```

- [ ] Test integration lokalt
```bash
npm run type-check
npm run lint
npm run test -- --coverage
npm run build
npm run dev # manual testing
```

- [ ] Create PR
```bash
/create-pr-with-linear HUD-XX
```

- [ ] Merge when approved 🎉

---

## 🎊 Success Metrics

After completing your first multi-agent feature, track:

- [ ] **Time saved:** _____ hours (compare to manual implementation)
- [ ] **Code quality:** Linter errors? Test coverage %?
- [ ] **Agent accuracy:** Did agents produce good code first try?
- [ ] **Coordination:** Did orchestrator handle dependencies well?
- [ ] **MCP usage:** Did Linear updates work automatically?

**Reflection:**
- What went well?
- What needs improvement?
- Would you use this workflow again?

---

## 📚 References

- [CREATE-AGENTS.md](./CREATE-AGENTS.md) - Agent creation guide
- [WORKFLOW-WITH-MCP.md](./WORKFLOW-WITH-MCP.md) - Complete workflow with MCP
- [VISUAL-WORKFLOW.md](./VISUAL-WORKFLOW.md) - Visual diagrams
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Quick command reference

---

## 🆘 Troubleshooting

### Problem: "No agents found" i Claude Code
**Solution:** Agents skal oprettes i UI, ikke via `.md` filer. Se [CREATE-AGENTS.md](./CREATE-AGENTS.md)

### Problem: MCP servers not working
**Solution:**
1. Check credentials are correct
2. Restart Claude Code
3. Test connection: `claude-code chat` → "Use {MCP-NAME} MCP to..."

### Problem: Orchestrator ikke koordinerer agents
**Solution:**
1. Check orchestrator agent har "Agent Delegation" tool enabled
2. Check plan file path er korrekt
3. Try explicit instructions: "Start database agent first, then backend+frontend in parallel"

### Problem: Agent producerer dårlig kode
**Solution:**
1. Check agent har alle context files configured
2. Check rules files er opdateret
3. Be more specific i orchestrator instructions
4. Review agent system prompt og adjust

---

**Version:** 1.0.0  
**Last Updated:** December 5, 2025  
**Maintainer:** Nicklas Eskou

---

**Next Steps After Completion:**

1. ✅ Share learnings med team
2. ✅ Refine agent prompts baseret på experience
3. ✅ Add more agents for specialized tasks (docs, refactoring, etc.)
4. ✅ Scale to epic-level workflows (5-10 issues)

