# Phase 9: Testing & Polish - Test Checklist

## Automated Verification ✅

- [x] Type check: `npx tsc --noEmit` - passes
- [x] Build: `npm run build` - succeeds
- [x] Lint: `npm run lint` - warnings only (acceptable)
- [x] Home page imports fixed - komponenter kopieret til `components/home/`

## Manual Verification Required

### 1. Route Testing

Test alle routes:

- [ ] `/` - Home page
  - [ ] Page loads correctly
  - [ ] All home components render (HeroSpotlight, ActivitySnapshot, QuickActions, MarketplaceForYou, CommunityPreview)
  - [ ] RightSidebar visible on desktop
  - [ ] Header navigation works (search, notifications, profile)

- [ ] `/auth` - Auth page
  - [ ] Login form works
  - [ ] Signup form works
  - [ ] Error handling works (duplicate username, email verification)
  - [ ] Redirect after login/signup works

- [ ] `/wardrobe` - Wardrobe page
  - [ ] Jerseys load (or empty state if database not ready)
  - [ ] Filters work (type, season)
  - [ ] Upload jersey button works
  - [ ] Toggle visibility works

- [ ] `/marketplace` - Marketplace page
  - [ ] Sales tab loads
  - [ ] Auctions tab loads
  - [ ] Search works
  - [ ] Filters work (type, season, price range)
  - [ ] Pagination works
  - [ ] Real-time updates work (auctions, bids)

- [ ] `/community` - Community page
  - [ ] Global tab loads posts
  - [ ] Following tab loads posts (if following users)
  - [ ] Create post works
  - [ ] Like/unlike works
  - [ ] Comments work
  - [ ] Real-time updates work

- [ ] `/profile` - Own profile
  - [ ] Profile data loads
  - [ ] Stats display correctly
  - [ ] Edit profile works
  - [ ] Share profile works

- [ ] `/profile/[username]` - User profile
  - [ ] Profile loads for valid username
  - [ ] 404 redirect for invalid username
  - [ ] Jerseys tab works
  - [ ] Activity tab works
  - [ ] Follow/unfollow works
  - [ ] Navigation from profile to jersey detail works

- [ ] `/notifications` - Notifications
  - [ ] Notifications load (or empty state)
  - [ ] Mark as read works
  - [ ] Mark all as read works
  - [ ] Real-time updates work

- [ ] `/settings` - Settings
  - [ ] Settings page loads
  - [ ] Logout works
  - [ ] Navigation works

- [ ] `/jersey/[id]` - Jersey detail
  - [ ] Jersey loads for valid ID
  - [ ] 404 redirect for invalid ID
  - [ ] Image gallery works
  - [ ] Like/save works
  - [ ] List for sale works
  - [ ] Start auction works
  - [ ] Place bid works (if auction active)
  - [ ] Message seller works
  - [ ] Real-time updates work (auctions, bids)

- [ ] `/messages` - Messages list
  - [ ] Conversations load (or empty state)
  - [ ] Search works
  - [ ] Unread count displays
  - [ ] Click conversation navigates to chat
  - [ ] Real-time updates work

- [ ] `/messages/[id]` - Chat
  - [ ] Messages load
  - [ ] Send message works
  - [ ] Image upload works
  - [ ] Reactions work
  - [ ] Typing indicators work
  - [ ] Real-time updates work
  - [ ] Subscription cleanup works (no memory leaks)

- [ ] `/non-existent` - 404 page
  - [ ] 404 page displays
  - [ ] Link to home works

### 2. Navigation Testing

- [ ] Sidebar navigation works (all links)
- [ ] BottomNav navigation works (all links)
- [ ] Browser back/forward buttons work
- [ ] Navigation from pages (buttons, links) works
- [ ] Protected routes redirect correctly when not logged in

### 3. Data Fetching Testing

- [ ] Each page loads data correctly
- [ ] Error states display correctly (PGRST205 errors handled gracefully)
- [ ] Empty states display correctly
- [ ] Loading states display correctly
- [ ] Real-time subscriptions work and cleanup correctly

### 4. Forms Testing

- [ ] Auth forms (login, signup) work
- [ ] Create post form works
- [ ] Edit profile form works
- [ ] Filters work (marketplace, wardrobe)
- [ ] Validation works (error messages display)

### 5. Performance Check

- [ ] Pages load < 2 seconds
- [ ] No unnecessary re-renders (check React DevTools)
- [ ] Images load correctly
- [ ] No memory leaks (subscriptions cleanup correctly)

### 6. Accessibility Check

- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] ARIA labels are correct
- [ ] Screen reader compatibility (if testing with screen reader)

## Cleanup Status

- [x] console.log statements removed (replaced with comments)
- [x] console.warn and console.error kept (for debugging/error handling)
- [x] Home page imports fixed - komponenter kopieret til `components/home/`
- [ ] Test pages in `apps/web/app/test-*/` - **DECISION NEEDED**: Remove or keep?
- [ ] Unused imports - check manually
- [ ] Placeholder code - check manually

## Notes

- Lint warnings are acceptable:
  - React Hook dependency warnings (can cause infinite loops if added)
  - Next.js Image warnings (performance optimization, not critical)
- Database not ready (HUD-14) - all pages handle PGRST205 errors gracefully
- All pages use ProtectedRoute wrapper where needed
- All pages have loading and empty states
- All real-time subscriptions have cleanup functions

## Next Steps After Testing

1. Fix any issues found during testing
2. Remove test pages if not needed
3. Commit Phase 9
4. Update Linear with progress
5. Create PR for HUD-10

