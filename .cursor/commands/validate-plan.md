# Validate Plan

**Goal:** Review implementation plan for completeness, accuracy, and feasibility before starting implementation.

**Inspiration:** Adapted from [HumanLayer's validate_plan.md](https://raw.githubusercontent.com/humanlayer/humanlayer/refs/heads/main/.claude/commands/validate_plan.md)

**Context:**
- Quality gate before implementation starts
- Catches planning issues early
- Ensures plan is actionable and complete
- Validates against Beauty Shop standards

---

## Usage

```
/validate-plan [plan-file]
```

**Examples:**
```
/validate-plan 2025-10-20-BS-152-product-catalog-filtering.md
/validate-plan BS-152-product-catalog-filtering.md
```

**Parameter:**
- `plan-file`: Filename in `.project/plans/` (with or without path)

---

## Validation Checklist

I will systematically review the plan against these criteria:

### 1. Scope & Requirements ✅/❌
### 2. Phase Structure ✅/❌
### 3. Technical Detail ✅/❌
### 4. Success Criteria ✅/❌
### 5. Dependencies ✅/❌
### 6. Edge Cases & Risks ✅/❌
### 7. Standards Compliance ✅/❌

---

## 1. Scope & Requirements

### Checks:

#### A. Clear Overview ✅/❌
- [ ] Overview section present and clear
- [ ] Problem statement articulated
- [ ] Solution approach described
- [ ] Value/benefit explained

#### B. Linear Issue Integration ✅/❌
- [ ] Linear issue referenced (BS-XXX)
- [ ] Issue status shown
- [ ] Assignee specified
- [ ] Priority indicated

#### C. Acceptance Criteria ✅/❌
- [ ] Acceptance criteria listed
- [ ] Criteria map to phases
- [ ] All AC covered by plan
- [ ] AC are testable/measurable

#### D. "What We're NOT Doing" ✅/❌
- [ ] Out-of-scope section present
- [ ] At least 2-3 items listed
- [ ] Items are specific (not vague)
- [ ] Prevents common scope creep

**Example Issues:**
```
❌ ISSUE: Missing "What We're NOT Doing" section
   → RECOMMENDATION: Add explicit out-of-scope items to prevent feature creep

✅ GOOD: Clear scope with 4 out-of-scope items listed
```

---

## 2. Phase Structure

### Checks:

#### A. Logical Phasing ✅/❌
- [ ] Phases in dependency order
- [ ] Each phase builds on previous
- [ ] No circular dependencies
- [ ] Clear progression (foundation → features → polish)

#### B. Phase Size ✅/❌
- [ ] Each phase < 500 LOC (estimated)
- [ ] Each phase < 20 files
- [ ] Phases independently testable
- [ ] Not too granular (not 20 tiny phases)

#### C. Pause Points ✅/❌
- [ ] Each phase has "⚠️ PAUSE HERE"
- [ ] Pause points after manual verification
- [ ] Clear approval process
- [ ] Resume instructions present

#### D. Phase Completeness ✅/❌
- [ ] Each phase has Overview
- [ ] Each phase lists Changes Required
- [ ] Each phase has Success Criteria
- [ ] Phases cover all requirements

**Example Issues:**
```
❌ ISSUE: Phase 2 is 800+ LOC
   → RECOMMENDATION: Split into Phase 2A (components) and 2B (integration)

✅ GOOD: 4 phases, each 150-300 LOC, logical progression

⚠️ WARNING: Phase 3 depends on Phase 4's API changes
   → RECOMMENDATION: Reorder phases - API changes should come before UI
```

---

## 3. Technical Detail

### Checks:

#### A. File Paths ✅/❌
- [ ] Specific file paths provided
- [ ] Paths follow project structure
- [ ] New files clearly marked
- [ ] Modified files specified

#### B. Code Examples ✅/❌
- [ ] Code snippets for complex changes
- [ ] Language specified (```typescript)
- [ ] Snippets are realistic/compilable
- [ ] Key patterns demonstrated

#### C. Existing Pattern References ✅/❌
- [ ] References to similar code
- [ ] file:line references where applicable
- [ ] Pattern to follow specified
- [ ] Consistency with codebase

#### D. Technology Choices ✅/❌
- [ ] Tech choices justified
- [ ] Aligns with tech stack (.project/03-Tech_Stack.md)
- [ ] No unnecessary dependencies
- [ ] Follows project standards

**Example Issues:**
```
❌ ISSUE: "Update the store" - too vague
   → RECOMMENDATION: Specify which store, which file, what changes

❌ ISSUE: Using Redux (project uses Zustand)
   → RECOMMENDATION: Change to Zustand per tech stack

✅ GOOD: "Create lib/stores/filter-store.ts following pattern in cart-store.ts"
```

---

## 4. Success Criteria

### Checks:

#### A. Automated vs Manual Separation ✅/❌
- [ ] "Automated Verification" section present
- [ ] "Manual Verification" section present
- [ ] Clear distinction between them
- [ ] Both types included

#### B. Automated Criteria Runnable ✅/❌
- [ ] Specific commands listed
- [ ] Commands are valid (npm run X exists)
- [ ] Commands will actually verify changes
- [ ] No vague "tests pass" without command

#### C. Manual Criteria Specific ✅/❌
- [ ] Specific actions to test
- [ ] Expected outcomes described
- [ ] Not just "test the feature"
- [ ] Includes edge cases

#### D. Completeness ✅/❌
- [ ] Covers functional requirements
- [ ] Includes performance criteria
- [ ] Includes accessibility criteria
- [ ] Includes security checks (if applicable)

**Example Issues:**
```
❌ ISSUE: "Make sure it works" - too vague
   → RECOMMENDATION: Specify: "Click filter button, verify products update, check network tab for API call"

❌ ISSUE: Automated section has "manually test X"
   → RECOMMENDATION: Move to Manual Verification section

✅ GOOD: Clear separation with specific, actionable criteria
```

---

## 5. Dependencies

### Checks:

#### A. Internal Dependencies ✅/❌
- [ ] Dependencies between phases identified
- [ ] No missing prerequisites
- [ ] Order accounts for dependencies
- [ ] Circular dependencies avoided

#### B. External Dependencies ✅/❌
- [ ] Required packages listed
- [ ] API dependencies noted
- [ ] Database changes sequenced correctly
- [ ] Environment variables documented

#### C. Integration Points ✅/❌
- [ ] MedusaJS integration points clear
- [ ] Supabase queries documented
- [ ] Third-party services noted (Stripe, Clerk, etc.)
- [ ] Feature flag requirements stated

**Example Issues:**
```
❌ ISSUE: Phase 2 UI needs filter store, but store created in Phase 3
   → RECOMMENDATION: Move store creation to Phase 1

⚠️ WARNING: Plan requires new Stripe webhook, not mentioned
   → RECOMMENDATION: Add Phase 0 for infrastructure setup

✅ GOOD: All dependencies explicitly listed with setup instructions
```

---

## 6. Edge Cases & Risks

### Checks:

#### A. Error Handling ✅/❌
- [ ] Error scenarios considered
- [ ] User-facing error messages planned
- [ ] API error handling specified
- [ ] Fallback behaviors defined

#### B. Edge Cases ✅/❌
- [ ] Empty states handled
- [ ] Large data sets considered
- [ ] Boundary conditions addressed
- [ ] Race conditions identified

#### C. Performance ✅/❌
- [ ] Performance implications considered
- [ ] Optimization strategy present (if needed)
- [ ] PRD target (< 2 sec) mentioned
- [ ] Large data handling planned

#### D. Security & Privacy ✅/❌
- [ ] PII handling addressed (if applicable)
- [ ] Input validation planned
- [ ] GDPR considerations noted
- [ ] Auth/authorization checks specified

#### E. Rollback Strategy ✅/❌
- [ ] Rollback plan present
- [ ] Quick rollback possible
- [ ] Data migration reversible
- [ ] Feature flag for kill switch (if applicable)

**Example Issues:**
```
❌ ISSUE: No error handling for API failures
   → RECOMMENDATION: Add error states and retry logic in Phase 3

⚠️ WARNING: Filtering 10,000+ products may be slow
   → RECOMMENDATION: Add pagination or virtual scrolling in Phase 4

✅ GOOD: Comprehensive error handling and edge case coverage
```

---

## 7. Standards Compliance

### Checks:

#### A. Coding Standards (.cursor/rules/) ✅/❌
- [ ] Follows 00-foundations.mdc (SRP, small files)
- [ ] Follows 10-nextjs_frontend.mdc (if UI changes)
- [ ] Follows 12-forms_actions_validation.mdc (if forms)
- [ ] Follows relevant rules for domain

#### B. Security Standards (22-security_secrets.mdc) ✅/❌
- [ ] No secrets in code
- [ ] Input validation planned
- [ ] PII handling correct
- [ ] Follows GDPR guidelines

#### C. Observability (24-observability_sentry.mdc) ✅/❌
- [ ] Error capture with Sentry
- [ ] No PII in logs/breadcrumbs
- [ ] Performance monitoring included
- [ ] Structured logging

#### D. Testing Standards ✅/❌
- [ ] Unit tests for business logic
- [ ] Integration tests for flows
- [ ] Component tests for UI
- [ ] Coverage for critical paths

**Example Issues:**
```
❌ ISSUE: 800-line component violates small files principle
   → RECOMMENDATION: Split into smaller components per 00-foundations.mdc

❌ ISSUE: No Sentry instrumentation for new API calls
   → RECOMMENDATION: Add error capture per 24-observability_sentry.mdc

✅ GOOD: Plan follows all project standards and rules
```

---

## Validation Output

### A. Summary

```
# Plan Validation Report

**Plan:** 2025-10-20-BS-152-product-catalog-filtering.md
**Validated:** 2025-10-20
**Reviewer:** AI Agent

---

## Overall Assessment: [✅ APPROVED | ⚠️ NEEDS REVISION | ❌ MAJOR ISSUES]

**Score:** 85/100
- Scope & Requirements: ✅ 95%
- Phase Structure: ✅ 90%
- Technical Detail: ⚠️ 75%
- Success Criteria: ✅ 90%
- Dependencies: ✅ 85%
- Edge Cases & Risks: ⚠️ 70%
- Standards Compliance: ✅ 90%
```

### B. Issues Found

```
## Issues Found: 5

### 🔴 Critical (Must Fix):
1. **Missing Error Handling in Phase 3**
   - Location: Phase 3, API Integration
   - Issue: No error handling for API failures
   - Impact: Poor UX, potential crashes
   - Recommendation: Add error states, retry logic, user-friendly messages

### ⚠️ Warnings (Should Fix):
2. **Phase 2 Too Large**
   - Location: Phase 2
   - Issue: Estimated 650 LOC
   - Impact: Hard to review, risky to implement
   - Recommendation: Split into Phase 2A (components) and 2B (integration)

3. **Vague Success Criteria**
   - Location: Phase 1, Manual Verification
   - Issue: "Test that it works" is not specific
   - Impact: Unclear what to test
   - Recommendation: List specific test steps

### ℹ️ Suggestions (Nice to Have):
4. **Performance Optimization**
   - Location: Phase 4
   - Issue: No mention of virtualization for large lists
   - Impact: May be slow with 1000+ products
   - Recommendation: Consider react-window or similar

5. **Accessibility Testing**
   - Location: Testing Strategy
   - Issue: No keyboard navigation testing mentioned
   - Impact: May not be accessible
   - Recommendation: Add accessibility checklist to manual verification
```

### C. Recommendations

```
## Recommendations:

### Before Implementation:
1. ✏️ Fix critical issue #1 (error handling)
2. ✏️ Address warning #2 (split Phase 2)
3. ✏️ Clarify success criteria (warning #3)

### Consider:
4. 💡 Add performance optimization (Phase 4 or separate)
5. 💡 Add accessibility testing checklist

### Good Practices Followed:
✅ Clear "What We're NOT Doing" section
✅ Linear ticket integration
✅ Pause points between phases
✅ Specific file paths with examples
✅ Follows project tech stack
```

### D. Next Steps

```
## Next Steps:

**If APPROVED:**
1. Begin implementation with `/execute-plan-phase [file] 1`
2. Track progress with `/update-linear-status BS-XXX`

**If NEEDS REVISION:**
1. Address critical issues and warnings
2. Update plan file: `.project/plans/2025-10-20-BS-152-product-catalog-filtering.md`
3. Re-validate: `/validate-plan [file]`

**If MAJOR ISSUES:**
1. Revise plan with `/create-implementation-plan` (iterate on existing)
2. Consider breaking into multiple smaller tickets
3. Research further with `/research-feature-patterns`

---

Would you like me to help fix the identified issues?
```

---

## Tips for Best Results

1. **Validate before starting** - Catch issues in planning, not implementation
2. **Fix critical issues first** - Don't proceed with major problems
3. **Warnings are important** - They often become problems later
4. **Re-validate after changes** - Ensure fixes don't introduce new issues
5. **Trust the process** - Good planning prevents costly mistakes

---

## Related Commands

- `/create-implementation-plan` - Create or revise the plan
- `/execute-plan-phase` - Start implementation after validation
- `/research-feature-patterns` - More research if needed
- `/update-linear-status` - Update Linear with validation status

