# Branch Protection Configuration Guide

## Overview

Denne guide beskriver hvordan du konfigurerer branch protection for `main` branch i GitHub, i overensstemmelse med projektets regler.

## Branch Protection Rules

### 1. Naviger til Settings

1. Gå til GitHub repository: https://github.com/eskoubar95/huddle-design-guide
2. Klik på **Settings** (øverst i repository)
3. I venstre menu, klik på **Branches**

### 2. Opret Branch Protection Rule

1. Klik på **Add rule** eller **Add branch protection rule**
2. I **Branch name pattern**, indtast: `main`
3. Konfigurer følgende indstillinger:

#### Required Settings:

✅ **Require a pull request before merging**
   - ✅ Require approvals: `1` (minimum)
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require review from Code Owners (hvis Code Owners er konfigureret)

✅ **Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - ✅ Status checks to require:
     - `typecheck` (Type Check job)
     - `lint` (Lint job)
     - `build` (Build job)
     - `ci-success` (CI Success job)

✅ **Require conversation resolution before merging**
   - Alle PR kommentarer skal være løst før merge

✅ **Do not allow bypassing the above settings**
   - Selv admins skal følge reglerne

#### Optional but Recommended:

✅ **Restrict who can push to matching branches**
   - Ingen kan pushe direkte til `main` (kun via PR)

✅ **Allow force pushes**
   - ❌ IKKE tilladt (unchecked)

✅ **Allow deletions**
   - ❌ IKKE tilladt (unchecked)

✅ **Require linear history**
   - ✅ Anbefalet for ren git historik

✅ **Include administrators**
   - ✅ Ja, inkluder admins i reglerne

### 3. Auto-delete Branches

GitHub vil automatisk slette branches efter merge hvis:
- Branch protection er aktiveret
- PR er merged

Dette er standard behavior og kræver ingen ekstra konfiguration.

## Expected Behavior

Efter konfiguration:

1. **Direct pushes to main:** ❌ Blokkeret
2. **PR without approvals:** ❌ Blokkeret
3. **PR with failing CI:** ❌ Blokkeret
4. **PR with unresolved comments:** ❌ Blokkeret
5. **Merge via PR with approvals + green CI:** ✅ Tilladt
6. **Branch auto-deleted after merge:** ✅ Automatisk

## Verification

Efter konfiguration, test at det virker:

1. Opret en test branch
2. Lav en PR til main
3. Verificer at merge er blokeret indtil:
   - CI checks passerer
   - Review approval er givet
   - Alle kommentarer er løst

## Troubleshooting

### CI checks vises ikke i required checks liste

- Vent på at CI workflow har kørt mindst én gang
- Checks skal have kørt på en PR før de vises som valgbare
- Refresh GitHub settings siden efter første CI run

### Cannot merge selvom alt er grønt

- Tjek at alle required checks faktisk er "required" i branch protection
- Tjek at PR er up-to-date med base branch
- Tjek at alle kommentarer er resolved

## Related Documentation

- `.cursor/rules/01-git_branch_pr.mdc` - Git branching and PR governance
- `.cursor/rules/31-ci_cd_pipeline.mdc` - CI/CD pipeline configuration

