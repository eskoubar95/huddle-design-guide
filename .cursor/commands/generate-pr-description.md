# Generate PR Description

Generate a PR description matching our template.

```md
Goal: Summarize this PR using our template

Context:
- Use `.github/pull_request_template.md`
- Keep it concise and actionable

Inputs:
- WHAT: {{what}}
- WHY (link issue/ADR): {{why}}
- HOW (key decisions/risks): {{how}}
- TESTS (unit/integration/manual): {{tests}}
- UI screenshots/recordings (if UI): {{screens}}
- Rollback plan: {{rollback}}

Output structure:
## What
{{what}}

## Why
{{why}}

## How
{{how}}

## Tests
{{tests}}

## Screenshots (if UI)
{{screens}}

## Rollback plan
{{rollback}}

## Checklist
- [ ] Follows `.cursor/rules`
- [ ] No secrets or PII added
- [ ] `npm run check` passes
- [ ] Scope small; docs updated if needed
```


