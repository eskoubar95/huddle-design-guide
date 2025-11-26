# Layout Components - Manual Test Guide

## Test Side URL
**http://localhost:3000/test-layout**

---

## ✅ Automated Verification (Allerede gennemført)

- [x] Type check: `npx tsc --noEmit` - ✅ Passed
- [x] Build: `npm run build` - ✅ Passed  
- [x] Lint: `npm run lint` - ✅ Passed (0 errors i layout komponenter)

---

## 📋 Manual Verification Checklist

### 1. Import Test

**Test:**
- [ ] Naviger til `/test-layout`
- [ ] Check browser console for errors
- [ ] Alle 3 komponenter skal være synlige

**Expected:**
- ✅ No console errors
- ✅ Sidebar vises på desktop (lg+)
- ✅ BottomNav vises på mobile (lg:hidden)
- ✅ CommandBar er tilgængelig via Cmd/Ctrl+K

---

### 2. Routing Test

#### Sidebar Navigation
- [ ] Click "Home" link → URL ændres til `/`
- [ ] Click "Marketplace" link → URL ændres til `/marketplace`
- [ ] Click "Wardrobe" link → URL ændres til `/wardrobe`
- [ ] Click "Community" link → URL ændres til `/community`
- [ ] Click "Profile" link → URL ændres til `/profile`
- [ ] Click "Messages" link → URL ændres til `/messages`
- [ ] Active state: Current route skal være highlighted (border-l-2 border-primary)

#### BottomNav Navigation
- [ ] Click "Home" link → URL ændres til `/`
- [ ] Click "Shop" link → URL ændres til `/marketplace`
- [ ] Click "Wardrobe" link → URL ændres til `/wardrobe`
- [ ] Click "Community" link → URL ændres til `/community`
- [ ] Click "Messages" link → URL ændres til `/messages`
- [ ] Active state: Current route skal være highlighted (text-foreground)

#### Protected Routes (BottomNav)
- [ ] Uden login: Click "Wardrobe" → Redirect til `/auth`
- [ ] Uden login: Click "Messages" → Redirect til `/auth`
- [ ] Med login: Click "Wardrobe" → Naviger til `/wardrobe`
- [ ] Med login: Click "Messages" → Naviger til `/messages`

---

### 3. Supabase Queries Test

#### Sidebar - Unread Message Count
**Prerequisites:** User skal være authenticated

- [ ] Unread count badge vises ved "Messages" link (hvis unread messages)
- [ ] Badge viser korrekt antal (fx "3" eller "99+")
- [ ] Badge forsvinder når alle messages er læst

**Test Realtime:**
- [ ] Send en message til dig selv fra anden bruger
- [ ] Unread count skal opdatere automatisk (ingen page refresh nødvendig)

#### BottomNav - Unread Message Count
**Prerequisites:** User skal være authenticated

- [ ] Unread count badge vises ved "Messages" icon (hvis unread messages)
- [ ] Badge viser korrekt antal (fx "3" eller "9+")
- [ ] Badge forsvinder når alle messages er læst

**Test Realtime:**
- [ ] Send en message til dig selv fra anden bruger
- [ ] Unread count skal opdatere automatisk (ingen page refresh nødvendig)

#### CommandBar - Search Functionality
**Test:**
- [ ] Press Cmd/Ctrl+K → CommandBar dialog åbner
- [ ] Type "test" → Search results vises (jerseys, users, marketplace)
- [ ] Click på result → Naviger til korrekt side
- [ ] Press Escape → Dialog lukker
- [ ] Search history gemmes i localStorage
- [ ] Trending searches vises (hvis data findes)

**Test Realtime:**
- [ ] Åbn CommandBar
- [ ] Type en search query
- [ ] I anden tab: Opret ny jersey/sale/auction der matcher query
- [ ] Resultat skal opdatere automatisk (ingen page refresh nødvendig)

---

### 4. Error Handling Test

#### Network Errors
- [ ] Disconnect network (airplane mode / disable WiFi)
- [ ] Check console for error messages (should be logged, not thrown)
- [ ] App skal ikke crashe
- [ ] Reconnect network
- [ ] Data skal refresh automatisk (unread counts, search results)

#### Supabase Query Errors
- [ ] Check console for error logging
- [ ] Errors skal logges med `console.error()`
- [ ] Errors skal ikke forhindre app i at fungere

---

### 5. Performance Test

#### Memory Leaks
- [ ] Open React DevTools → Profiler
- [ ] Naviger mellem routes flere gange
- [ ] Check for memory leaks (memory usage skal ikke stige konstant)
- [ ] Unmount komponenter (navigate væk fra test-layout)
- [ ] Check console for cleanup logs (hvis tilføjet)

#### Subscription Cleanup
- [ ] Open React DevTools → Components
- [ ] Inspect Sidebar component
- [ ] Naviger væk fra page med Sidebar
- [ ] Check at Supabase channels er cleaned up (no active subscriptions)
- [ ] Repeat for BottomNav og CommandBar

---

### 6. Accessibility Test

#### Keyboard Navigation
- [ ] Tab gennem Sidebar links → Focus skal være synlig
- [ ] Tab gennem BottomNav links → Focus skal være synlig
- [ ] Tab gennem CommandBar results → Focus skal være synlig
- [ ] Enter/Space på focused link → Naviger til route
- [ ] Escape i CommandBar → Luk dialog

#### Screen Reader
- [ ] Enable screen reader (VoiceOver / NVDA / JAWS)
- [ ] Naviger gennem Sidebar → Screen reader announcer link labels
- [ ] Naviger gennem BottomNav → Screen reader announcer link labels
- [ ] Active state → Screen reader announcer "current page" eller lignende

#### Visual Accessibility
- [ ] Focus states er synlige (outline/border)
- [ ] Active states er tydelige (highlighted link)
- [ ] Badge counts er synlige (tilstrækkelig kontrast)
- [ ] Icons har korrekt sizing (ikke for små)

---

### 7. Responsive Design Test

#### Desktop (lg+)
- [ ] Sidebar vises på venstre side
- [ ] BottomNav er skjult
- [ ] Main content har `lg:pl-64` (padding for sidebar)

#### Mobile (< lg)
- [ ] Sidebar er skjult
- [ ] BottomNav vises fixed i bunden
- [ ] Main content har `pb-20` (padding for bottom nav)

#### Tablet
- [ ] Test mellem breakpoints
- [ ] Layout skifter korrekt ved lg breakpoint

---

## 🐛 Known Issues / Notes

- [ ] List any issues found during testing
- [ ] Note any edge cases discovered

---

## ✅ Test Results Summary

**Date:** _______________

**Tester:** _______________

**Results:**
- [ ] All tests passed
- [ ] Issues found (see notes above)

**Next Steps:**
- [ ] Continue to Phase 2
- [ ] Fix issues before proceeding
- [ ] Update Linear with progress

