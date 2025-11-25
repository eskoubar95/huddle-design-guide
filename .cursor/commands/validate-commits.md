# Validate Commits

**Goal:** Ensure commit messages follow Conventional Commits and suggest fixes for invalid commits.

**Context:**
- Beauty Shop uses Conventional Commits standard
- Format: `<type>(<scope>): <description>`
- Clean git history improves collaboration and automation
- Helps with changelog generation

---

## Usage

```
/validate-commits
/validate-commits --fix
/validate-commits --from main
```

---

## Conventional Commits Format

**Pattern:**
```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `chore`: Maintenance (deps, config)
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `build`: Build system changes
- `ci`: CI configuration
- `revert`: Revert previous commit

**Examples:**
```
✅ feat(filters): add category filter dropdown
✅ fix(checkout): resolve payment validation error
✅ test(filters): add filter store unit tests
✅ docs: update README with filter usage
✅ chore(deps): upgrade react to 19.0.0
```

---

## Validation Process

### Step 1: List Commits

```
Listing commits on feature/BS-152-product-catalog...

Comparing: feature/BS-152-product-catalog vs main

Found 6 commits:
```

### Step 2: Validate Each Commit

```
## Validation Results

1. ✅ feat(filters): add Zustand filter store
   - Type: feat ✅
   - Scope: filters ✅
   - Summary: clear and descriptive ✅

2. ✅ feat(filters): implement filter UI components
   - Type: feat ✅
   - Scope: filters ✅
   - Summary: clear and descriptive ✅

3. ❌ "added tests"
   - Missing type ❌
   - Missing scope ❌
   - Summary too vague ❌
   - **Should be:** test(filters): add filter store and component tests

4. ❌ "fixed bug in price filter"
   - Type should be "fix" not "fixed" ❌
   - Missing scope ❌
   - **Should be:** fix(filters): correct price range validation

5. ❌ "WIP"
   - Not a valid commit message ❌
   - **Action:** Squash with next commit or rewrite

6. ⚠️ "refactor"
   - Type: refactor ✅
   - Missing scope ⚠️
   - Summary too vague ⚠️
   - **Should be:** refactor(filters): extract filter logic to custom hook

---

**Summary:**
- ✅ Valid: 2 / 6 (33%)
- ❌ Invalid: 3 / 6 (50%)
- ⚠️ Warning: 1 / 6 (17%)

**Recommendation:** Fix invalid commits before PR
```

---

## Step 3: Provide Fix Suggestions

```
## Recommended Fixes

### Option 1: Interactive Rebase (Recommended)

Rewrite commit history:

```bash
git rebase -i main
```

**In the editor:**

```
pick abc1234 feat(filters): add Zustand filter store
pick def5678 feat(filters): implement filter UI components
reword ghi9012 added tests
reword jkl3456 fixed bug in price filter
squash mno7890 WIP
reword pqr1234 refactor
```

**Change to:**

```
pick abc1234 feat(filters): add Zustand filter store
pick def5678 feat(filters): implement filter UI components
reword ghi9012 test(filters): add filter store and component tests
reword jkl3456 fix(filters): correct price range validation
drop mno7890 WIP
reword pqr1234 refactor(filters): extract filter logic to custom hook
```

**Then for each "reword":**
- Update commit message to follow convention
- Save and continue

**Commands:**
```bash
# Start interactive rebase
git rebase -i main

# For each "reword", update message, then:
git rebase --continue

# When done, force push (⚠️ be careful!)
git push origin feature/BS-152-product-catalog --force-with-lease
```

---

### Option 2: Amend Last Commit (If Only Last is Bad)

If only the most recent commit is invalid:

```bash
# Amend last commit message
git commit --amend -m "fix(filters): correct price range validation"

# Force push
git push origin feature/BS-152-product-catalog --force-with-lease
```

---

### Option 3: Squash All (Nuclear Option)

Squash all commits into one:

```bash
# Reset to main, keeping changes
git reset --soft main

# Create one clean commit
git commit -m "feat(filters): implement product filtering and search"

# Force push
git push origin feature/BS-152-product-catalog --force-with-lease
```

**⚠️ Warning:** Loses commit history, use only if history doesn't matter

---

### Option 4: Accept and Note in PR

If time-constrained and commits don't matter for history:

**Add to PR description:**
```
## Note on Commits

Commit messages don't all follow Conventional Commits due to WIP nature.
Squash merge recommended.
```

**Not recommended** - Clean history is preferred

---

## Auto-Fix Mode

```
/validate-commits --fix
```

**I will:**
1. Detect invalid commit patterns
2. Suggest conventional format
3. Generate rebase script
4. (Optional) Execute rebase with your approval

**Example Output:**

```
Auto-generating fixes...

## Proposed Changes:

Commit 3: "added tests"
  → "test(filters): add filter store and component tests"

Commit 4: "fixed bug in price filter"
  → "fix(filters): correct price range validation"

Commit 5: "WIP"
  → Squash into Commit 4

Commit 6: "refactor"
  → "refactor(filters): extract filter logic to custom hook"

---

**Generated rebase script:**

```bash
#!/bin/bash
git rebase -i main <<EOF
pick abc1234 feat(filters): add Zustand filter store
pick def5678 feat(filters): implement filter UI components
reword ghi9012 test(filters): add filter store and component tests
reword jkl3456 fix(filters): correct price range validation
squash mno7890
reword pqr1234 refactor(filters): extract filter logic to custom hook
EOF
```

Execute this fix? (y/n)
```

---

## Commit Message Guidelines

### Good Commit Messages:

**✅ Clear and Specific:**
```
feat(auth): add Google OAuth integration
fix(checkout): resolve stripe webhook timeout
test(cart): add integration tests for add/remove
docs(api): document product filter endpoints
```

**✅ With Body (for complex changes):**
```
feat(filters): add cursor-based pagination

Implements cursor pagination for large product lists.
Improves performance from 3s to 0.8s with 1000+ products.

Refs: BS-152
```

**✅ With Breaking Change:**
```
feat(api)!: change product filter API format

BREAKING CHANGE: Filter API now uses POST instead of GET
to support complex filter combinations.

Migration guide: docs/migrations/filter-api-v2.md
```

### Bad Commit Messages:

**❌ Too Vague:**
```
fix bug
update code
changes
```

**❌ Wrong Format:**
```
Fixed the thing
Adding new feature
Updated files
```

**❌ Not Descriptive:**
```
wip
temp
asdf
```

---

## Scope Guidelines

**Use specific, consistent scopes:**

**Frontend:**
- `filters`, `checkout`, `cart`, `product`, `auth`, `ui`

**Backend:**
- `api`, `db`, `auth`, `services`, `models`

**Infrastructure:**
- `ci`, `build`, `deps`, `config`

**Cross-cutting:**
- `a11y` (accessibility), `perf`, `security`, `i18n`

**Examples:**
```
feat(filters): add price range slider
fix(api): resolve product query timeout
chore(deps): upgrade next to 15.0.2
docs(checkout): add payment flow diagram
test(cart): add edge case for empty cart
perf(filters): optimize filter computation
```

---

## Integration with CI

**If you have CI commit validation:**

```
GitHub Actions will fail if commits don't follow convention.

Validate locally with this command before push:
/validate-commits

Or add pre-push hook:
```bash
# .git/hooks/pre-push
#!/bin/bash
npx commitlint --from main --to HEAD
```
```

---

## Tips

### During Development:
1. **Use WIP commits locally** - that's fine
2. **Before PR:** Clean up with interactive rebase
3. **Follow convention** from the start (saves time later)

### Tools to Help:
1. **Commitizen:** Interactive commit message generator
   ```bash
   npm install -g commitizen
   git cz  # instead of git commit
   ```

2. **Commitlint:** Automatic validation
   ```bash
   npm install --save-dev @commitlint/cli @commitlint/config-conventional
   ```

3. **VS Code Extension:** Conventional Commits

---

## Related Commands

- `/generate-commit-message` - Generate convention-following commits
- `/prepare-pr` - Validates commits as part of PR checks
- `/cleanup-branch` - Clean up commits and messages

