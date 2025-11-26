# Profile Components Test Guide

## Overview

This guide covers manual testing of all 3 Profile components migrated in Phase 5:
1. EditProfile
2. NavLink
3. SidebarNavLink

**Test URL:** `http://localhost:3000/test-profile`

---

## 1. Import Test

### Checklist:
- [ ] All 3 components can be imported without errors
- [ ] No console errors on page load
- [ ] All components render on the test page

### Expected Result:
- Page loads successfully
- All component status indicators show green
- No TypeScript or runtime errors

---

## 2. EditProfile Test

### Test Cases:

#### 2.1 Dialog Open/Close
- [ ] Click "Open Edit Profile Dialog" → Dialog opens
- [ ] Click Cancel or X button → Dialog closes
- [ ] Dialog has proper focus management
- [ ] Dialog is keyboard accessible (ESC to close)

#### 2.2 Form Fields
- [ ] Username field displays current username
- [ ] Bio field displays current bio
- [ ] Country field displays current country
- [ ] Avatar preview displays (or placeholder if none)

#### 2.3 Username Validation
- [ ] Submit with empty username → Validation error shows
- [ ] Submit with username < 3 chars → Validation error shows
- [ ] Submit with username > 20 chars → Validation error shows
- [ ] Submit with username containing special chars → Validation error shows
- [ ] Submit with valid username → No validation error
- [ ] Error message is announced by screen reader

#### 2.4 Bio Validation
- [ ] Enter bio > 500 chars → Validation error shows
- [ ] Character counter updates correctly (X/500)
- [ ] Submit with valid bio → No validation error
- [ ] Error message is announced by screen reader

#### 2.5 Country Validation
- [ ] Enter country > 50 chars → Validation error shows
- [ ] Submit with valid country → No validation error
- [ ] Error message is announced by screen reader

#### 2.6 Avatar Upload
- [ ] Click "Change Avatar" → File picker opens
- [ ] Select image file → Preview shows
- [ ] Select file > 5MB → Error toast shows
- [ ] Select valid image → Cropper modal opens
- [ ] Adjust zoom → Image zooms correctly
- [ ] Adjust crop position → Crop area moves
- [ ] Click "Confirm" → Cropped image preview shows
- [ ] Click "Cancel" in cropper → Cropper closes, original preview restored

#### 2.7 Avatar Upload Progress
- [ ] Upload avatar → Progress bar shows
- [ ] Progress updates (25%, 50%, 75%, 100%)
- [ ] Progress is announced by screen reader

#### 2.8 Form Submission
- [ ] Submit with valid data → Success toast appears
- [ ] Submit with valid data → Dialog closes
- [ ] Submit with valid data → onUpdate callback fires
- [ ] Submit with network error → Error toast appears
- [ ] Submit with network error → Form data preserved
- [ ] Submit with duplicate username → Error toast shows
- [ ] Submit button disabled during submission

#### 2.9 Error Handling
- [ ] Avatar upload fails → Error toast shows
- [ ] Profile update fails → Error toast shows
- [ ] Form data preserved on error
- [ ] Validation errors clear when field is edited

#### 2.10 Accessibility
- [ ] Tab through form → Focus order is logical
- [ ] Enter key on submit button → Form submits
- [ ] Screen reader announces form labels
- [ ] Validation errors are announced
- [ ] ARIA labels are present
- [ ] Focus states are visible
- [ ] Image upload is keyboard accessible

---

## 3. NavLink Test

### Test Cases:

#### 3.1 Link Navigation
- [ ] Click NavLink → Navigates to correct route
- [ ] Navigation uses Next.js router
- [ ] Browser back button works

#### 3.2 Active State
- [ ] Navigate to "/" → Home NavLink is active (highlighted)
- [ ] Navigate to "/marketplace" → Marketplace NavLink is active
- [ ] Navigate to "/wardrobe" → Wardrobe NavLink is active
- [ ] Navigate to "/community" → Community NavLink is active
- [ ] Navigate to "/profile" → Profile NavLink is active
- [ ] Active state updates when pathname changes

#### 3.3 Styling
- [ ] Active link has activeClassName applied
- [ ] Inactive links have default styling
- [ ] Hover states work
- [ ] Focus states are visible

#### 3.4 Accessibility
- [ ] Tab to NavLink → Focus visible
- [ ] Enter/Space on NavLink → Navigates
- [ ] Screen reader announces active state (aria-current="page")
- [ ] Keyboard navigation works

---

## 4. SidebarNavLink Test

### Test Cases:

#### 4.1 Link Navigation
- [ ] Click SidebarNavLink → Navigates to correct route
- [ ] Navigation uses Next.js router
- [ ] Browser back button works

#### 4.2 Active State
- [ ] Navigate to "/" → Home SidebarNavLink is active
- [ ] Navigate to "/marketplace" → Marketplace SidebarNavLink is active
- [ ] Navigate to "/wardrobe" → Wardrobe SidebarNavLink is active
- [ ] Navigate to "/community" → Community SidebarNavLink is active
- [ ] Navigate to "/profile" → Profile SidebarNavLink is active
- [ ] Active state updates when pathname changes
- [ ] Active link has border-l-2 border-primary

#### 4.3 Badge Display
- [ ] Badge with count < 99 → Shows exact count
- [ ] Badge with count > 99 → Shows "99+"
- [ ] Badge with count = 0 → Badge hidden
- [ ] Badge with undefined → Badge hidden
- [ ] Badge styling is correct

#### 4.4 Styling
- [ ] Active link has bg-secondary and border-l-2
- [ ] Inactive links have muted-foreground
- [ ] Hover states work
- [ ] Focus states are visible (ring-2 ring-primary)

#### 4.5 Accessibility
- [ ] Tab to SidebarNavLink → Focus visible
- [ ] Enter/Space on SidebarNavLink → Navigates
- [ ] Screen reader announces active state (aria-current="page")
- [ ] Screen reader announces badge count (aria-label)
- [ ] Keyboard navigation works
- [ ] Icons are hidden from screen readers (aria-hidden="true")

---

## 5. Integration Tests

### Test Cases:

#### 5.1 EditProfile → Profile Update Flow
- [ ] Open EditProfile dialog
- [ ] Update username
- [ ] Upload new avatar
- [ ] Submit form
- [ ] Profile updates in database
- [ ] Avatar appears in UI
- [ ] Username appears in UI

#### 5.2 NavLink → Navigation Flow
- [ ] Click NavLink to navigate
- [ ] Page loads correctly
- [ ] Active state updates
- [ ] Browser history works

#### 5.3 SidebarNavLink → Sidebar Integration
- [ ] Sidebar uses SidebarNavLink
- [ ] Navigation works from Sidebar
- [ ] Active states work in Sidebar
- [ ] Badge counts display correctly

---

## 6. Performance Tests

### Test Cases:
- [ ] Page load time is acceptable
- [ ] EditProfile dialog opens quickly
- [ ] Avatar upload doesn't block UI
- [ ] Image cropping is smooth
- [ ] Form submission is responsive

---

## 7. Browser Compatibility

### Test Cases:
- [ ] Chrome/Edge: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work
- [ ] Mobile browsers: Responsive design works

---

## Success Criteria

### Automated Verification:
- ✅ All 3 components exist in `apps/web/components/profile/`
- ✅ Type check passes
- ✅ Build succeeds
- ✅ Lint passes

### Manual Verification:
- [ ] All components can be imported correctly
- [ ] EditProfile: Form, validation, avatar upload, error handling work
- [ ] NavLink: Navigation, active state, accessibility work
- [ ] SidebarNavLink: Navigation, active state, badge, accessibility work
- [ ] Accessibility: Keyboard navigation, screen reader support work
- [ ] Performance: No memory leaks, smooth interactions

---

## Reporting

After completing tests, report:
1. All tests passed? (y/n)
2. Issues found? (describe)
3. Performance concerns? (describe)
4. Accessibility issues? (describe)


