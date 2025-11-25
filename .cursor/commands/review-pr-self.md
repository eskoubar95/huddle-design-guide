# Review PR Self

**Goal:** Self-review assistant before requesting review from others.

**Context:**
- Catch issues before reviewers do
- Ask critical questions about your changes
- Suggest improvements
- Reduce reviewer burden

---

## Usage

```
/review-pr-self
```

---

## Review Process

### Step 1: Analyze Changes

```
Analyzing your changes...

**Branch:** feature/BS-152-product-catalog
**Files changed:** 12
**Lines changed:** +427 / -89
```

---

### Step 2: Review Each File

For each changed file, I'll analyze and ask critical questions:

```
## Changed Files Review

### 1. lib/stores/filter-store.ts (+142 lines)

**Changes:**
- New Zustand store for filter state
- Actions: setCategory, setPriceRange, setSearchQuery, clearFilters
- DevTools integration

**Questions to Consider:**
- ❓ Is the store properly typed with TypeScript?
- ❓ Should filter state be persisted to localStorage?
- ❓ Are there any edge cases not handled (null values, invalid ranges)?
- ❓ Is clearFilters truly resetting ALL state?

**Code Quality:**
- ✅ Function size OK (< 50 lines each)
- ✅ Type safety good
- ⚠️ Consider adding input validation for price range
- ⚠️ Add JSDoc for complex actions

**Suggestions:**
```typescript
// Consider adding validation
setPriceRange: (min, max) => {
  if (min !== null && max !== null && min > max) {
    throw new Error('Min price cannot exceed max price')
  }
  set({ minPrice: min, maxPrice: max })
}
```

---

### 2. components/filters/FilterSidebar.tsx (+89 lines)

**Changes:**
- New filter sidebar component
- Integrates all filter components
- Responsive design (mobile modal)

**Questions:**
- ❓ Is keyboard navigation implemented?
- ❓ Are ARIA labels present for screen readers?
- ❓ Does mobile modal trap focus correctly?
- ❓ What happens when filters are applied with no results?

**Code Quality:**
- ⚠️ Component is 89 lines - consider splitting
- ✅ Props properly typed
- ❌ Missing accessibility attributes

**Suggestions:**
- Extract mobile modal to separate component
- Add `aria-label` to filter sections
- Implement focus trap for modal
- Add empty state handling

---

### 3. lib/services/products/filter-products.ts (+98 lines)

**Changes:**
- API integration for filtered products
- Cursor pagination handling
- Error handling with Sentry

**Questions:**
- ❓ Are all API errors caught and handled?
- ❓ Is retry logic needed for failed requests?
- ❓ Are loading states managed correctly?
- ❓ Is PII excluded from Sentry logs?

**Code Quality:**
- ✅ Error handling present
- ✅ TypeScript types correct
- ⚠️ Large try-catch block - consider extracting

**Suggestions:**
```typescript
// Extract API call logic
const fetchProducts = async (filters: Filters) => {
  const queryParams = buildQueryParams(filters)
  return api.get('/products', { params: queryParams })
}

// Separate error handling
const handleFilterError = (error: Error) => {
  Sentry.captureException(error, { level: 'error' })
  throw new UserFacingError('Failed to load products')
}
```

---

[Continue for all 12 files...]
```

---

### Step 3: Overall Assessment

```
## Overall Assessment

**Strengths:**
- ✅ Clear separation of concerns (store, UI, API)
- ✅ Follows project patterns (Zustand, MedusaJS integration)
- ✅ Good test coverage (95%)
- ✅ TypeScript types throughout
- ✅ Error handling with Sentry

**Areas to Address Before Review:**
1. **Accessibility:**
   - Add ARIA labels to FilterSidebar
   - Implement keyboard navigation
   - Test with screen reader

2. **Code Organization:**
   - FilterSidebar.tsx is large (89 lines) - split mobile modal
   - Extract validation logic in filter-store.ts

3. **Error Handling:**
   - Add user-friendly error messages
   - Consider retry logic for API failures

4. **Documentation:**
   - Add JSDoc to complex functions
   - Document filter URL parameter format

5. **Edge Cases:**
   - Handle empty search results
   - Validate price range (min < max)
   - Handle category not found

**Nice to Have:**
- Loading skeleton for filter sidebar
- Animation for filter application
- Filter preset saving (future feature)

---

## Priority Issues

### Must Fix (Before Request Review):
1. ❌ Add accessibility attributes (WCAG 2.1 AA)
2. ❌ Validate price range input
3. ❌ Add error messages for failed API calls

### Should Fix (Improves Quality):
4. ⚠️ Split FilterSidebar component
5. ⚠️ Add JSDoc to store actions
6. ⚠️ Extract API error handling

### Optional (Nice Enhancements):
7. 💡 Add loading skeleton
8. 💡 Add filter animations
9. 💡 Optimize re-renders with memo

---

## Recommended Actions

**Immediate (< 30 min):**
```
1. Add ARIA labels:
   /add-documentation components/filters/FilterSidebar.tsx

2. Add input validation:
   [Show specific code changes needed]

3. Improve error messages:
   [Show specific changes]
```

**Before PR (< 1 hour):**
```
4. Run accessibility audit:
   /accessibility-audit components/filters/

5. Add JSDoc:
   /add-documentation lib/stores/filter-store.ts

6. Test edge cases manually
```

**After Initial Review (If Suggested):**
```
7. Refactor large components
8. Add performance optimizations
9. Enhance UX with animations
```

---

## Self-Review Checklist

Use this as final check:

- [ ] **Functionality**
  - [ ] Feature works as expected
  - [ ] All acceptance criteria met
  - [ ] Edge cases handled

- [ ] **Code Quality**
  - [ ] No console.log or debugger
  - [ ] TypeScript types correct
  - [ ] Functions < 50 lines
  - [ ] Components < 200 lines

- [ ] **Testing**
  - [ ] Unit tests added/updated
  - [ ] Integration tests pass
  - [ ] Manual testing completed

- [ ] **Accessibility**
  - [ ] ARIA labels present
  - [ ] Keyboard navigation works
  - [ ] Screen reader tested

- [ ] **Performance**
  - [ ] No unnecessary re-renders
  - [ ] API calls optimized
  - [ ] Images/assets optimized

- [ ] **Security**
  - [ ] Input validation
  - [ ] No PII in logs
  - [ ] No hardcoded secrets

- [ ] **Documentation**
  - [ ] Complex logic commented
  - [ ] README updated if needed
  - [ ] API changes documented

---

Ready for review after addressing these items? (y/n)
```

---

## Tips for Effective Self-Review

### Before Self-Review:
1. **Let it sit** - Review after a break, fresh eyes
2. **Run all checks** - `/prepare-pr` first
3. **Read your own diff** - Pretend you're the reviewer

### During Self-Review:
1. **Be critical** - Question every choice
2. **Check patterns** - Are you following project standards?
3. **Think like user** - Does UX make sense?
4. **Consider maintenance** - Will this be easy to change later?

### After Self-Review:
1. **Fix critical items** - Don't request review with known issues
2. **Document decisions** - Add comments for non-obvious choices
3. **Update PR description** - Note any trade-offs or tech debt

---

## Related Commands

- `/code-review` - Comprehensive automated review
- `/accessibility-audit` - Detailed accessibility check
- `/add-tests-for-changes` - Ensure test coverage
- `/add-documentation` - Generate missing docs

