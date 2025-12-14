# Plan Validation Report - HUD-30

**Plan:** `.project/plans/HUD-30/implementation-plan-2025-11-30-HUD-30.md`  
**Validated:** 2025-11-30  
**Reviewer:** AI Agent  
**Linear Issue:** [HUD-30](https://linear.app/huddle-world/issue/HUD-30)

---

## Overall Assessment: ⚠️ NEEDS REVISION

**Score:** 78/100
- Scope & Requirements: ✅ 95%
- Phase Structure: ⚠️ 75%
- Technical Detail: ✅ 90%
- Success Criteria: ⚠️ 70%
- Dependencies: ⚠️ 70%
- Edge Cases & Risks: ⚠️ 75%
- Standards Compliance: ⚠️ 80%

---

## 1. Scope & Requirements ✅

### Checks:

#### A. Clear Overview ✅
- ✅ Overview section present and clear
- ✅ Problem statement articulated ("Brugere skal manuelt udfylde metadata i 3 steps")
- ✅ Solution approach described (AI Vision automation)
- ✅ Value/benefit explained (springe step 2 og 3 over)

#### B. Linear Issue Integration ✅
- ✅ Linear issue referenced (HUD-30)
- ✅ Issue status shown (Backlog)
- ✅ Priority indicated (High)
- ✅ Research document linked

#### C. Acceptance Criteria ✅
- ✅ Acceptance criteria listed per phase
- ✅ Criteria map to phases (Phase 0-4)
- ✅ All AC covered by plan
- ✅ AC are testable/measurable

#### D. "What We're NOT Doing" ✅
- ✅ Out-of-scope section present
- ✅ 9 specific items listed
- ✅ Items are specific (not vague)
- ✅ Prevents common scope creep

**Verdict:** Excellent scope definition. Clear boundaries prevent feature creep.

---

## 2. Phase Structure ⚠️

### Issues Found:

#### A. Phase 0 Too Large ⚠️
- **Location:** Phase 0: Strukturelle Ændringer
- **Issue:** 8 files to create/modify, estimated 8-10 hours, ~400+ LOC
- **Impact:** Hard to review, risky to implement all at once, difficult to test incrementally
- **Recommendation:** Split Phase 0 into two sub-phases:
  - **Phase 0A:** Database migrations + cleanup function (4-5 timer)
  - **Phase 0B:** Edge Functions + API endpoints + frontend changes (4-5 timer)

#### B. Logical Phasing ✅
- ✅ Phases in dependency order (0 → 1 → 2 → 3 → 4)
- ✅ Each phase builds on previous
- ✅ No circular dependencies
- ✅ Clear progression (foundation → features → polish)

#### C. Pause Points ✅
- ✅ Each phase has "⚠️ PAUSE HERE"
- ✅ Pause points after manual verification
- ✅ Clear approval process implied

#### D. Phase Completeness ✅
- ✅ Each phase has Overview
- ✅ Each phase lists Changes Required
- ✅ Each phase has Success Criteria
- ✅ Phases cover all requirements

**Verdict:** Phasing is logical, but Phase 0 is too large. Should be split.

---

## 3. Technical Detail ✅

### Checks:

#### A. File Paths ✅
- ✅ Specific file paths provided (e.g., `supabase/migrations/20251130_create_jersey_images_table.sql`)
- ✅ Paths follow project structure
- ✅ New files clearly marked
- ✅ Modified files specified

#### B. Code Examples ✅
- ✅ Code snippets for complex changes (SQL migrations, TypeScript Edge Functions)
- ✅ Language specified (```sql, ```typescript)
- ✅ Snippets are realistic/compilable
- ✅ Key patterns demonstrated

#### C. Existing Pattern References ✅
- ✅ References to similar code (`match-jersey-metadata` pattern)
- ✅ Pattern to follow specified
- ⚠️ **Missing:** Specific file:line references (could be improved)

#### D. Technology Choices ✅
- ✅ Tech choices justified (Edge Functions over API routes)
- ✅ Aligns with tech stack (Supabase, Next.js)
- ✅ No unnecessary dependencies
- ✅ Follows project standards

**Minor Issue:**
- Edge Function upload pattern: File upload via Edge Function med `req.json()` virker ikke for multipart/form-data. Skal bruge `req.formData()` i stedet.

**Verdict:** Excellent technical detail. One minor fix needed for Edge Function upload pattern.

---

## 4. Success Criteria ⚠️

### Issues Found:

#### A. Automated vs Manual Separation ✅
- ✅ "Automated Verification" section present
- ✅ "Manual Verification" section present
- ✅ Clear distinction between them

#### B. Automated Criteria Runnable ✅
- ✅ Specific commands listed (`supabase migration up`, `npm run type-check`)
- ✅ Commands are valid
- ✅ Commands will actually verify changes

#### C. Manual Criteria Specific ⚠️
- ⚠️ **Issue:** Some criteria are vague
  - "Upload flow opretter draft jersey" - what specific steps to verify?
  - "Cleanup sletter draft og images" - how to verify?
  - "Vision analysis works on test images" - what defines "works"?
- **Recommendation:** Add more specific test steps:
  ```markdown
  - [ ] Open upload modal → verify draft jersey created in DB (status='draft')
  - [ ] Upload 3 images → verify images in Storage folder `{jersey_id}/`
  - [ ] Close modal without submit → verify draft jersey deleted from DB
  - [ ] Verify Storage folder deleted via cleanup-jersey-storage Edge Function
  ```

#### D. Completeness ⚠️
- ✅ Covers functional requirements
- ⚠️ **Missing:** Performance criteria (Vision analysis should complete in <10s)
- ⚠️ **Missing:** Accessibility criteria (if UI changes affect keyboard navigation)
- ✅ Includes security checks (ownership verification)

**Verdict:** Success criteria are good but could be more specific. Add performance and accessibility checks.

---

## 5. Dependencies ⚠️

### Issues Found:

#### A. Internal Dependencies ✅
- ✅ Dependencies between phases identified
- ✅ No missing prerequisites
- ✅ Order accounts for dependencies
- ✅ Circular dependencies avoided

#### B. External Dependencies ⚠️
- ✅ Required packages noted (pgvector)
- ✅ API dependencies noted (OpenAI API key)
- ⚠️ **Missing:** Cron job setup details
  - Plan mentions "Cron job setup (via Supabase cron eller pg_cron)" but no specific migration
  - Missing: How to schedule `cleanup_abandoned_drafts()` function
- **Recommendation:** Add Phase 0 migration for cron job:
  ```sql
  -- Schedule cleanup job to run daily at 2 AM
  SELECT cron.schedule(
    'cleanup-abandoned-drafts',
    '0 2 * * *', -- Daily at 2 AM
    $$ SELECT cleanup_abandoned_drafts(); $$
  );
  ```

#### C. Integration Points ✅
- ✅ Supabase queries documented
- ✅ Edge Functions integration clear
- ✅ Metadata matching service integration noted

**Verdict:** Good dependency coverage, but missing cron job setup details.

---

## 6. Edge Cases & Risks ⚠️

### Issues Found:

#### A. Error Handling ⚠️
- ✅ Error scenarios considered (API failures, invalid images)
- ✅ User-facing error messages planned (in Phase 3)
- ⚠️ **Missing:** Specific error handling for:
  - **Edge Function upload:** What if File object is invalid? What if Storage is full?
  - **Draft creation:** What if user creates multiple drafts simultaneously?
  - **Vision analysis timeout:** What if Vision API takes >30s?
- **Recommendation:** Add error handling section to each phase

#### B. Edge Cases ⚠️
- ✅ Empty states handled (empty image array validation)
- ✅ Large data sets considered (template matching)
- ⚠️ **Missing:**
  - **Concurrent uploads:** What if user uploads same jersey twice simultaneously?
  - **Network failures:** What if draft created but upload fails mid-way?
  - **Partial cleanup:** What if jersey deleted but Storage cleanup fails?
  - **Template matching edge case:** What if similarity is exactly 0.85?
- **Recommendation:** Add edge case section to Phase 0 and Phase 2

#### C. Performance ✅
- ✅ Performance implications considered (Vision analysis 5-10s)
- ✅ Optimization strategy present (template matching, async execution)
- ✅ Loading states planned

#### D. Security & Privacy ✅
- ✅ Input validation planned (file size, type checks)
- ✅ Auth/authorization checks specified (ownership verification)
- ✅ No PII in Vision results (structured metadata only)

#### E. Rollback Strategy ⚠️
- ✅ Rollback plan mentioned (revert migrations)
- ⚠️ **Missing:** Specific rollback steps
  - How to rollback if Phase 0 breaks existing uploads?
  - How to migrate existing `jerseys.images` data?
  - What if pgvector extension fails to enable?
- **Recommendation:** Add rollback section with specific steps

**Verdict:** Good risk assessment, but missing specific edge cases and rollback steps.

---

## 7. Standards Compliance ⚠️

### Issues Found:

#### A. Coding Standards ✅
- ✅ Follows project structure (small files, domain-first organization)
- ✅ Edge Functions follow existing patterns
- ✅ SQL migrations follow naming conventions

#### B. Security Standards ⚠️
- ✅ No secrets in code (OpenAI API key in env)
- ✅ Input validation planned
- ⚠️ **Missing:** Secret management details
  - Where is OpenAI API key stored? (Supabase Edge Function secrets - mentioned but not detailed)
  - How to set secrets? (should reference Supabase Dashboard or CLI)
- **Recommendation:** Add setup section for environment variables

#### C. Observability ⚠️
- ⚠️ **Missing:** Sentry instrumentation
  - Plan doesn't mention error capture for Edge Functions
  - No performance monitoring for Vision analysis
  - No structured logging mentioned
- **Recommendation:** Add to Phase 2:
  ```typescript
  // Add Sentry error capture
  import * as Sentry from "https://deno.land/x/sentry/index.js";
  
  try {
    // Vision analysis logic
  } catch (error) {
    Sentry.captureException(error, {
      tags: { function: 'analyze-jersey-vision', jerseyId },
      extra: { userId, imageCount }
    });
    throw error;
  }
  ```

#### D. Testing Standards ⚠️
- ✅ Testing strategy section present
- ⚠️ **Missing:** Specific test file locations
  - Where are unit tests? (`__tests__/` or co-located?)
  - Integration test structure?
- **Recommendation:** Specify test file locations per phase

**Verdict:** Good standards alignment, but missing Sentry instrumentation and secret management details.

---

## Issues Found: 8

### 🔴 Critical (Must Fix):

1. **Phase 0 Too Large**
   - **Location:** Phase 0: Strukturelle Ændringer
   - **Issue:** 8 files, 8-10 hours, ~400+ LOC - too risky to implement all at once
   - **Impact:** Hard to review, difficult to test incrementally, high risk of breaking existing flow
   - **Recommendation:** Split into Phase 0A (migrations) and Phase 0B (functions + frontend)

2. **Missing Cron Job Setup**
   - **Location:** Phase 0, Cleanup Function
   - **Issue:** Cleanup function created but no cron job scheduled
   - **Impact:** Abandoned drafts won't be cleaned up automatically
   - **Recommendation:** Add migration to schedule cron job calling `cleanup_abandoned_drafts()`

### ⚠️ Warnings (Should Fix):

3. **Vague Success Criteria**
   - **Location:** Multiple phases, Manual Verification sections
   - **Issue:** Some criteria like "works correctly" are not specific enough
   - **Impact:** Unclear what to test
   - **Recommendation:** Add specific test steps with expected outcomes

4. **Edge Function Upload Pattern Issue**
   - **Location:** Phase 0, `upload-jersey-image` Edge Function
   - **Issue:** Uses `req.json()` for file upload, should use `req.formData()` for multipart/form-data
   - **Impact:** File upload won't work correctly
   - **Recommendation:** Update Edge Function to handle FormData properly

5. **Missing Error Handling Details**
   - **Location:** Phase 0-2
   - **Issue:** Error scenarios mentioned but not detailed (network failures, timeouts, concurrent uploads)
   - **Impact:** Unclear how to handle edge cases during implementation
   - **Recommendation:** Add error handling section to each phase

6. **Missing Sentry Instrumentation**
   - **Location:** Phase 2, Vision Edge Function
   - **Issue:** No error capture or performance monitoring mentioned
   - **Impact:** Errors won't be tracked, performance issues won't be visible
   - **Recommendation:** Add Sentry setup per `.cursor/rules/24-observability_sentry.mdc`

7. **Missing Secret Management Details**
   - **Location:** Dependencies section
   - **Issue:** OpenAI API key mentioned but no setup instructions
   - **Impact:** Unclear how to configure secrets
   - **Recommendation:** Add setup section: "Set in Supabase Dashboard → Edge Functions → Secrets"

8. **Missing Rollback Steps**
   - **Location:** Risk Assessment
   - **Issue:** Rollback mentioned but no specific steps
   - **Impact:** Unclear how to recover if Phase 0 breaks existing uploads
   - **Recommendation:** Add detailed rollback section with step-by-step instructions

### ℹ️ Suggestions (Nice to Have):

9. **Add Performance Targets**
   - **Location:** Phase 2, Success Criteria
   - **Issue:** No specific performance targets (e.g., Vision analysis <10s)
   - **Recommendation:** Add performance criteria to manual verification

10. **Add Test File Locations**
    - **Location:** Testing Strategy
    - **Issue:** Testing strategy mentions tests but not where to put them
    - **Recommendation:** Specify test file locations (co-located or `__tests__/`)

---

## Recommendations:

### Before Implementation:
1. ✏️ **Split Phase 0** into Phase 0A (migrations) and Phase 0B (functions + frontend)
2. ✏️ **Add cron job migration** for automatic cleanup
3. ✏️ **Fix Edge Function upload pattern** (use FormData, not JSON)
4. ✏️ **Add Sentry instrumentation** for error tracking

### During Implementation:
5. 💡 **Add specific test steps** to success criteria
6. 💡 **Document error handling** for each phase
7. 💡 **Add secret setup instructions** (OpenAI API key configuration)

### Good Practices Followed:
✅ Clear "What We're NOT Doing" section  
✅ Linear ticket integration  
✅ Pause points between phases  
✅ Specific file paths with code examples  
✅ Follows project tech stack  
✅ Comprehensive risk assessment  

---

## Next Steps:

**If APPROVED (with fixes):**
1. ✏️ Address critical issues #1 and #2 (split Phase 0, add cron job)
2. ✏️ Fix warnings #3-8 (success criteria, error handling, Sentry, secrets)
3. Update plan file: `.project/plans/HUD-30/implementation-plan-2025-11-30-HUD-30.md`
4. Re-validate: `/validate-plan .project/plans/HUD-30/implementation-plan-2025-11-30-HUD-30.md`

**If READY NOW:**
1. Begin implementation with Phase 0A (database migrations only)
2. Test thoroughly before Phase 0B
3. Track progress with `/update-linear-status HUD-30`

---

## Detailed Fix Recommendations:

### Fix #1: Split Phase 0

**Current:** One large Phase 0 (8 files, 8-10 hours)

**Recommended:**
- **Phase 0A: Database Foundation** (4-5 timer)
  - Create `jersey_images` table migration
  - Add Vision columns to `jerseys`
  - Create cleanup function
  - Add cron job migration
  - **PAUSE** - Test migrations

- **Phase 0B: Upload Flow Changes** (4-5 timer)
  - Create draft/cancel API endpoints
  - Create upload Edge Function
  - Create cleanup Edge Function
  - Update UploadJersey component
  - **PAUSE** - Test full flow

### Fix #2: Add Cron Job Migration

**File:** `supabase/migrations/20251130_schedule_cleanup_job.sql`

```sql
-- Schedule cleanup job for abandoned drafts
-- Runs daily at 2 AM UTC
SELECT cron.schedule(
  'cleanup-abandoned-drafts',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT cleanup_abandoned_drafts();
  $$
);

-- Comment
COMMENT ON FUNCTION cleanup_abandoned_drafts() IS 'Scheduled via pg_cron to run daily at 2 AM UTC. Cleans up draft jerseys older than 24 hours.';
```

### Fix #3: Fix Edge Function Upload Pattern

**Current:** Uses `req.json()` which doesn't work for multipart/form-data

**Fix:** Update `upload-jersey-image/index.ts`:

```typescript
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use formData() for file uploads, not json()
    const formData = await req.formData()
    const file = formData.get('file') as File
    const jerseyId = formData.get('jerseyId') as string
    const userId = formData.get('userId') as string
    
    // Rest of implementation...
  }
})
```

### Fix #4: Add Sentry Instrumentation

**Add to Phase 2:**
- Import Sentry in Edge Function
- Capture exceptions with context
- Track performance metrics for Vision analysis

---

Would you like me to help fix these issues in the plan?

