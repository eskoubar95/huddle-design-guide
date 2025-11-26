# ProtectedRoute Component Test Guide

## Overview

This guide covers manual testing of the ProtectedRoute component migrated in Phase 6.

**Test URL:** `http://localhost:3000/test-protected`

---

## 1. Import Test

### Checklist:
- [ ] ProtectedRoute can be imported without errors
- [ ] No console errors on page load
- [ ] Component renders on the test page

### Expected Result:
- Page loads successfully
- Component status indicator shows green
- No TypeScript or runtime errors

---

## 2. Authentication Test

### Test Cases:

#### 2.1 Authenticated User
- [ ] User is logged in
- [ ] Protected content is visible
- [ ] No redirect occurs
- [ ] User information displays correctly

#### 2.2 Unauthenticated User
- [ ] User is not logged in
- [ ] Redirect to /auth occurs
- [ ] Redirect happens quickly (no flash of content)
- [ ] Browser URL changes to /auth
- [ ] No protected content is visible

#### 2.3 Auth State Change
- [ ] Sign in while on protected page → Content appears
- [ ] Sign out while on protected page → Redirects to /auth
- [ ] Auth state changes are handled correctly

---

## 3. Loading State Test

### Test Cases:

#### 3.1 Initial Load
- [ ] During initial auth check → Spinner shows
- [ ] "Loading..." text displays
- [ ] Spinner animates correctly
- [ ] Loading state is announced to screen readers (aria-live="polite")
- [ ] Spinner has aria-label="Loading"

#### 3.2 Loading Duration
- [ ] Loading state shows for appropriate duration
- [ ] No flickering or multiple renders
- [ ] Smooth transition from loading to content/redirect

---

## 4. Redirect Test

### Test Cases:

#### 4.1 Redirect Behavior
- [ ] Unauthenticated user → Redirects to /auth
- [ ] Redirect uses Next.js router (router.push)
- [ ] Redirect happens in useEffect (not during render)
- [ ] No flash of protected content before redirect

#### 4.2 Redirect Timing
- [ ] Redirect happens quickly after auth check
- [ ] No unnecessary delays
- [ ] Browser history is updated correctly

---

## 5. Error Handling Test

### Test Cases:

#### 5.1 Auth Check Errors
- [ ] Auth check fails → Handled gracefully
- [ ] Error doesn't crash component
- [ ] User sees appropriate feedback (redirect or error message)

#### 5.2 Redirect Errors
- [ ] Redirect fails → Error logged to console
- [ ] Component doesn't crash
- [ ] User sees appropriate feedback

---

## 6. Accessibility Test

### Test Cases:

#### 6.1 Screen Reader Support
- [ ] Loading state is announced (aria-live="polite")
- [ ] Spinner has aria-label="Loading"
- [ ] Redirect is announced (if possible)
- [ ] All interactive elements are accessible

#### 6.2 Keyboard Navigation
- [ ] Tab navigation works
- [ ] Focus management is correct
- [ ] No keyboard traps

#### 6.3 Visual Accessibility
- [ ] Loading spinner is visible
- [ ] Text has sufficient contrast
- [ ] Focus states are visible (if applicable)

---

## 7. Performance Test

### Test Cases:
- [ ] Component renders quickly
- [ ] No unnecessary re-renders
- [ ] Redirect happens quickly
- [ ] No memory leaks (check React DevTools)

---

## 8. Integration Test

### Test Cases:

#### 8.1 With AuthContext
- [ ] Uses migrated AuthContext correctly
- [ ] Auth state updates trigger re-renders
- [ ] Loading state from AuthContext is respected

#### 8.2 With Next.js Router
- [ ] Uses Next.js router correctly
- [ ] Navigation works as expected
- [ ] Browser history is updated correctly

---

## 9. Edge Cases

### Test Cases:

#### 9.1 Rapid Auth Changes
- [ ] Sign in/out rapidly → Component handles correctly
- [ ] No race conditions
- [ ] No duplicate redirects

#### 9.2 Network Issues
- [ ] Slow network → Loading state shows appropriately
- [ ] Network failure → Error handled gracefully

#### 9.3 Multiple Protected Routes
- [ ] Multiple ProtectedRoute components on same page → All work correctly
- [ ] No conflicts or duplicate redirects

---

## Success Criteria

### Automated Verification:
- ✅ ProtectedRoute exists in `apps/web/components/`
- ✅ Type check passes
- ✅ Build succeeds
- ✅ Lint passes

### Manual Verification:
- [ ] ProtectedRoute can be imported correctly
- [ ] Authentication: User authenticated → Children renders
- [ ] Authentication: User not authenticated → Redirects to /auth
- [ ] Loading state: Shows spinner, "Loading..." text
- [ ] Auth state change: Updates correctly
- [ ] Error handling: Auth check fails → Handled gracefully
- [ ] Error handling: Redirect fails → Handled gracefully
- [ ] Accessibility: Loading state announced
- [ ] Accessibility: Redirect announced (if possible)
- [ ] Accessibility: Keyboard navigation works
- [ ] Performance: No memory leaks, quick redirect

---

## Reporting

After completing tests, report:
1. All tests passed? (y/n)
2. Issues found? (describe)
3. Performance concerns? (describe)
4. Accessibility issues? (describe)

---

## Notes

- ProtectedRoute uses client-side redirect (useEffect + router.push)
- Alternative approach: Next.js middleware (server-side) - not implemented in this phase
- Component approach chosen for consistency with legacy app
- Loading state from AuthContext is used to prevent flash of content

