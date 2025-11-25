# Generate Commit Message

Generate a Conventional Commit message that follows our commit template.

```md
Goal: Create a concise commit message from staged changes

Context:
- Use `.github/commit-template.txt` structure
- Conventional Commit types: feat | fix | chore | docs | test | refactor | perf | build | ci
- Keep summary ≤ 72 chars; imperative mood

Inputs:
- scope (optional): {{scope}}
- issue id (optional): BS-{{id}}
- key changes (bullets): {{bullets}}

Output format:
<type>(<scope>): <short summary>

WHY:
- <why change is needed>

HOW:
- <key changes>

NOTES:
- <breaking changes, risks, follow-ups>

Refs: BS-<id>
```


