## What

[Beskriv hvad denne PR gør - kort og præcist]

## Why

Closes [ISSUE-ID](https://linear.app/huddle-world/issue/[ISSUE-ID])

**Acceptance Criteria Status:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## How

**Key Technical Decisions:**
- [Decision 1]
- [Decision 2]

**Files Changed:**
- `path/to/file.ts` (new/modified)
- `path/to/file.ts` (new/modified)

**Risks:**
- [Risk 1 og hvordan det håndteres]
- [Risk 2 og hvordan det håndteres]

## Tests

**Automated:**
- [ ] Type check: `npx tsc --noEmit` - Passed
- [ ] Build: `npm run build` - Passed
- [ ] Lint: `npm run lint` - Passed

**Manual:**
- [ ] Tested on [browsers/devices]
- [ ] [Specific test case]
- [ ] [Specific test case]

## Screenshots

[Føj screenshots hvis UI ændringer]

## Rollback Plan

If issues arise:
1. **Immediate:** [Rollback strategy]
2. **Partial:** [Partial rollback if applicable]
3. **Data:** [Data migration considerations]

**Rollback command:**
```bash
git revert <commit-sha>
```

## Checklist

- [ ] Follows `.cursor/rules` (SRP, small files, explicit types)
- [ ] No secrets or PII added
- [ ] `npm run build` passes (type-check, lint, build)
- [ ] PR size reasonable (≤ 400 LOC / ≤ 20 files per project rules)
- [ ] Docs updated (README/ADR) if architecture affected
- [ ] Accessibility tested (WCAG 2.1 AA compliant)
- [ ] Performance meets requirements
- [ ] Mobile responsive
- [ ] No breaking changes
- [ ] Linear ticket updated with progress

---

**Related Issues:**
- Depends on: [ISSUE-ID] - [Status]
- Blocks: [ISSUE-ID] - [Status]

**Reviewers:**
@[reviewer]

**Estimated Review Time:** [X] minutes

