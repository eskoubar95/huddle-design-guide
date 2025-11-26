# Community Components Test Guide

## Overview

This guide covers manual testing of all 8 Community components migrated in Phase 4:
1. CreatePost
2. PostComments
3. ActivitySnapshot
4. CommunityPreview
5. HeroSpotlight
6. MarketplaceForYou
7. QuickActions
8. RightSidebar

**Test URL:** `http://localhost:3000/test-community`

---

## 1. Import Test

### Checklist:
- [ ] All 8 components can be imported without errors
- [ ] No console errors on page load
- [ ] All components render on the test page

### Expected Result:
- Page loads successfully
- All component status indicators show green
- No TypeScript or runtime errors

---

## 2. CreatePost Test

### Test Cases:

#### 2.1 Dialog Open/Close
- [ ] Click "Open Create Post Dialog" → Dialog opens
- [ ] Click outside dialog or Cancel → Dialog closes
- [ ] Dialog has proper focus management

#### 2.2 Form Validation
- [ ] Submit with empty form → Validation error shows
- [ ] Enter content > 1000 characters → Validation error shows
- [ ] Enter valid content → No validation error
- [ ] Select jersey → Jersey appears in form
- [ ] Remove jersey → Jersey removed from form

#### 2.3 Jersey Selector
- [ ] Click "Attach Jersey" → Jersey selector opens
- [ ] Select jersey → Jersey selector closes, jersey attached
- [ ] No public jerseys → "No public jerseys found" message shows
- [ ] Jersey images display correctly

#### 2.4 Form Submission
- [ ] Submit with valid data → Success toast appears
- [ ] Submit with valid data → Dialog closes
- [ ] Submit with valid data → Form resets
- [ ] Submit with network error → Error toast appears
- [ ] Submit with network error → Form data preserved

#### 2.5 Accessibility
- [ ] Tab through form → Focus order is logical
- [ ] Enter key on submit button → Form submits
- [ ] Screen reader announces form labels
- [ ] Validation errors are announced
- [ ] ARIA labels are present

---

## 3. PostComments Test

### Test Cases:

#### 3.1 Dialog Open/Close
- [ ] Click "Open Post Comments Dialog" → Dialog opens
- [ ] Comments load (if any exist)
- [ ] Click outside dialog or close → Dialog closes

#### 3.2 Comments Display
- [ ] Comments display with user avatars
- [ ] Comments display with usernames
- [ ] Comments display with timestamps (time ago format)
- [ ] Empty state shows when no comments
- [ ] Loading state shows while fetching

#### 3.3 Comment Submission
- [ ] Enter comment → Submit button enabled
- [ ] Submit empty comment → Validation error shows
- [ ] Submit comment > 500 chars → Validation error shows
- [ ] Submit valid comment → Success toast appears
- [ ] Submit valid comment → Comment appears in list
- [ ] Submit valid comment → Form resets

#### 3.4 Realtime Updates
- [ ] Open comments in two browsers
- [ ] Submit comment in browser 1
- [ ] Comment appears in browser 2 (realtime update)
- [ ] Subscription cleanup works (no memory leaks)

#### 3.5 User Navigation
- [ ] Click user avatar → Navigates to user profile
- [ ] Click username → Navigates to user profile
- [ ] Navigation uses Next.js router

#### 3.6 Accessibility
- [ ] Tab through comments → Focus order is logical
- [ ] Screen reader announces comments
- [ ] ARIA labels are present
- [ ] Keyboard navigation works

---

## 4. ActivitySnapshot Test

### Test Cases:

#### 4.1 Stats Display
- [ ] Jersey count displays correctly
- [ ] For sale count displays correctly
- [ ] Active auctions count displays correctly
- [ ] Follower count displays correctly
- [ ] Stats update when user changes

#### 4.2 Navigation
- [ ] Click Wardrobe card → Navigates to /wardrobe
- [ ] Click For Sale card → Navigates to /marketplace
- [ ] Click Auctions card → Navigates to /marketplace
- [ ] Click Followers card → Navigates to /profile
- [ ] Navigation uses Next.js router

#### 4.3 Visual States
- [ ] Hover effects work
- [ ] Focus states are visible
- [ ] Cards have proper styling

#### 4.4 Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader announces stats
- [ ] ARIA labels are present

---

## 5. CommunityPreview Test

### Test Cases:

#### 5.1 Posts Display
- [ ] Posts load from Supabase
- [ ] Posts display with jersey images (if attached)
- [ ] Posts display with user avatars
- [ ] Posts display with usernames
- [ ] Like counts display (if > 0)
- [ ] Empty state shows when no posts
- [ ] Loading state shows while fetching

#### 5.2 Navigation
- [ ] Click "Open feed" → Navigates to /community
- [ ] Click post card → Navigates to /community
- [ ] Click "Open Community Feed" button → Navigates to /community
- [ ] Navigation uses Next.js router

#### 5.3 Visual States
- [ ] Hover effects work
- [ ] Focus states are visible
- [ ] Placeholder shows when no jersey image

#### 5.4 Error Handling
- [ ] Network error → Error logged, empty state shows
- [ ] Invalid data → Handled gracefully

#### 5.5 Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader announces posts
- [ ] ARIA labels are present

---

## 6. HeroSpotlight Test

### Test Cases:

#### 6.1 Display
- [ ] Hero section displays correctly
- [ ] Featured jersey image displays
- [ ] Price and details display
- [ ] Condition and rarity badges display
- [ ] Feature list displays

#### 6.2 Navigation
- [ ] Click "View Details" → Navigates to /marketplace
- [ ] Click "Save" → Button responds (functionality TBD)
- [ ] Navigation uses Next.js router

#### 6.3 Visual States
- [ ] Hover effects work
- [ ] Focus states are visible
- [ ] Animations work smoothly

#### 6.4 Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader announces content
- [ ] ARIA labels are present

---

## 7. MarketplaceForYou Test

### Test Cases:

#### 7.1 Trending Jerseys
- [ ] Trending jerseys load from Supabase
- [ ] Jersey cards display correctly
- [ ] Scroll area works horizontally
- [ ] Empty state shows when no jerseys
- [ ] Loading state shows while fetching

#### 7.2 Ending Soon Auctions
- [ ] Ending soon auctions load from Supabase
- [ ] Jersey cards display correctly
- [ ] Section only shows if auctions exist
- [ ] Scroll area works horizontally

#### 7.3 Navigation
- [ ] Click "View all" (trending) → Navigates to /marketplace
- [ ] Click "View all" (ending soon) → Navigates to /marketplace
- [ ] Click jersey card → Navigates to jersey detail
- [ ] Navigation uses Next.js router

#### 7.4 Error Handling
- [ ] Network error → Error logged, empty state shows
- [ ] Invalid data → Handled gracefully

#### 7.5 Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader announces jerseys
- [ ] ARIA labels are present
- [ ] Scroll area is keyboard accessible

---

## 8. QuickActions Test

### Test Cases:

#### 8.1 Actions Display
- [ ] All 4 action cards display
- [ ] Icons display correctly
- [ ] Titles and descriptions display

#### 8.2 Navigation
- [ ] Click "Upload Jersey" → Navigates to /wardrobe
- [ ] Click "List For Sale" → Navigates to /wardrobe
- [ ] Click "Start Auction" → Navigates to /wardrobe
- [ ] Click "Find Nearby" → Navigates to /marketplace
- [ ] Navigation uses Next.js router

#### 8.3 Visual States
- [ ] Hover effects work
- [ ] Focus states are visible
- [ ] Animations work smoothly

#### 8.4 Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader announces actions
- [ ] ARIA labels are present

---

## 9. RightSidebar Test

### Test Cases:

#### 9.1 Watchlist
- [ ] Saved jerseys load from Supabase
- [ ] Jersey images display
- [ ] Club and season display
- [ ] Empty state shows when no saved jerseys
- [ ] Loading state shows while fetching
- [ ] Click jersey → Navigates to jersey detail
- [ ] Click "View all" → Navigates to /wardrobe

#### 9.2 Live Auctions
- [ ] Live auctions load from Supabase
- [ ] Auction details display
- [ ] Time remaining displays correctly
- [ ] Empty state shows when no auctions
- [ ] Click auction → Navigates to jersey detail
- [ ] Click "View all" → Navigates to /marketplace

#### 9.3 Community Activity
- [ ] Activity items display
- [ ] User avatars display
- [ ] Activity descriptions display
- [ ] Timestamps display

#### 9.4 Marketplace Metrics
- [ ] Trending metrics display
- [ ] Price drops display

#### 9.5 Huddle News
- [ ] News items display
- [ ] Click news item → Responds (functionality TBD)

#### 9.6 Error Handling
- [ ] Network error → Error logged, empty states show
- [ ] Invalid data → Handled gracefully

#### 9.7 Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader announces content
- [ ] ARIA labels are present
- [ ] Scroll area is keyboard accessible

---

## 10. Integration Tests

### Test Cases:

#### 10.1 CreatePost → PostComments Flow
- [ ] Create post with jersey
- [ ] Post appears in CommunityPreview
- [ ] Open comments for new post
- [ ] Add comment
- [ ] Comment appears in realtime

#### 10.2 ActivitySnapshot → Navigation Flow
- [ ] Click Wardrobe card
- [ ] Navigate to wardrobe page
- [ ] Verify navigation works

#### 10.3 MarketplaceForYou → Jersey Detail Flow
- [ ] Click trending jersey
- [ ] Navigate to jersey detail page
- [ ] Verify navigation works

---

## 11. Performance Tests

### Test Cases:
- [ ] Page load time is acceptable
- [ ] Components render without lag
- [ ] Realtime subscriptions don't cause memory leaks
- [ ] Scroll performance is smooth
- [ ] Image loading is optimized

---

## 12. Browser Compatibility

### Test Cases:
- [ ] Chrome/Edge: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work
- [ ] Mobile browsers: Responsive design works

---

## Success Criteria

### Automated Verification:
- ✅ All 8 components exist in `apps/web/components/community/`
- ✅ Type check passes
- ✅ Build succeeds
- ✅ Lint passes

### Manual Verification:
- [ ] All components can be imported correctly
- [ ] CreatePost: Form, validation, error handling work
- [ ] PostComments: Comments load, realtime updates, subscription cleanup work
- [ ] ActivitySnapshot: Stats display, navigation work
- [ ] CommunityPreview: Posts display, navigation work
- [ ] HeroSpotlight: Display, navigation work
- [ ] MarketplaceForYou: Jerseys display, navigation work
- [ ] QuickActions: Actions display, navigation work
- [ ] RightSidebar: All sections display, navigation work
- [ ] Accessibility: Keyboard navigation, screen reader support work
- [ ] Performance: No memory leaks, smooth scrolling

---

## Reporting

After completing tests, report:
1. All tests passed? (y/n)
2. Issues found? (describe)
3. Performance concerns? (describe)
4. Accessibility issues? (describe)


