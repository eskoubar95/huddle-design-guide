# Marketplace Components - Manual Test Guide

## Test Side URL
**http://localhost:3000/test-marketplace**

---

## ✅ Automated Verification (Allerede gennemført)

- [x] Type check: `npx tsc --noEmit` - ✅ Passed
- [x] Build: `npm run build` - ✅ Passed  
- [x] Lint: `npm run lint` - ✅ Passed (0 errors i Marketplace komponenter)

---

## 📋 Manual Verification Checklist

### 1. Import Test

**Test:**
- [ ] Naviger til `/test-marketplace`
- [ ] Check browser console for errors
- [ ] Alle 4 komponenter skal være synlige

**Expected:**
- ✅ No console errors
- ✅ All 4 components imported successfully
- ✅ CountdownTimer vises med live countdown

---

### 2. CreateSaleListing Test

#### Dialog Open/Close
- [ ] Click "Open Create Sale Listing" → Dialog åbner
- [ ] Click X button → Dialog lukker
- [ ] Click "Cancel" → Dialog lukker
- [ ] Backdrop blur fungerer

#### Form Fields
- [ ] Price field → Required, number input
- [ ] Negotiable switch → Toggle fungerer
- [ ] Shipping options → Switches fungerer
- [ ] Shipping cost payment → Radio buttons fungerer (Buyer/Seller/Free in Country)

#### Validation Test
- [ ] Submit uden price → Error: "Price must be greater than 0"
- [ ] Submit med price = 0 → Error: "Price must be greater than 0"
- [ ] Submit med price = -10 → Error: "Price must be greater than 0"
- [ ] Submit med price = "abc" → Error vises
- [ ] Error messages → Vises inline og i toast
- [ ] Error focus → First error field får focus

#### Submit Test (Med Authentication)
**Prerequisites:** User skal være authenticated

- [ ] Submit med valid data → Listing created
- [ ] Success toast → "Listing Created!"
- [ ] Dialog lukker automatisk
- [ ] Form resets
- [ ] onSuccess callback → Fires (check console)

#### Error Handling Test
- [ ] Jersey already listed → Error: "Already Listed"
- [ ] Network failure → Error message med retry option
- [ ] Form data → Bevares ved fejl (ikke cleared)

#### Accessibility Test
- [ ] Form labels → Tilknyttet inputs (htmlFor/id)
- [ ] Required fields → aria-required="true"
- [ ] Error messages → Annonceres til screen readers (role="alert")
- [ ] Keyboard navigation → Tab gennem alle fields
- [ ] Focus states → Synlige på alle interactive elements
- [ ] Radio buttons → Keyboard accessible (Enter/Space)

---

### 3. CreateAuction Test

#### Dialog Open/Close
- [ ] Click "Open Create Auction" → Dialog åbner
- [ ] Click X button → Dialog lukker
- [ ] Click "Cancel" → Dialog lukker

#### Form Fields
- [ ] Starting Bid field → Required, number input
- [ ] Buy Now Price field → Optional, number input
- [ ] Duration buttons → Select fungerer (24h, 48h, 72h, 7 days)
- [ ] Shipping options → Switches fungerer
- [ ] Shipping cost payment → Radio buttons fungerer

#### Validation Test
- [ ] Submit uden starting bid → Error: "Starting bid must be greater than 0"
- [ ] Submit med starting bid = 0 → Error: "Starting bid must be greater than 0"
- [ ] Submit med starting bid = -10 → Error: "Starting bid must be greater than 0"
- [ ] Buy Now Price < Starting Bid → Should validate (hvis implementeret)
- [ ] Error messages → Vises inline og i toast

#### Submit Test (Med Authentication)
**Prerequisites:** User skal være authenticated

- [ ] Submit med valid data → Auction created
- [ ] Success toast → "Auction Started!"
- [ ] Dialog lukker automatisk
- [ ] Form resets
- [ ] onSuccess callback → Fires (check console)
- [ ] ends_at → Calculated correctly (duration hours added)

#### Error Handling Test
- [ ] Jersey already listed → Error: "Already Listed"
- [ ] Network failure → Error message
- [ ] Form data → Bevares ved fejl

#### Accessibility Test
- [ ] Form labels → Tilknyttet
- [ ] Error messages → Annonceres
- [ ] Keyboard navigation → Fungerer
- [ ] Focus states → Synlige

---

### 4. PlaceBid Test

#### Dialog Open/Close
- [ ] Click "Open Place Bid" → Dialog åbner
- [ ] Click X button → Dialog lukker
- [ ] Click "Cancel" → Dialog lukker

#### Form Fields
- [ ] Current Bid display → Vises korrekt
- [ ] Minimum Bid display → Vises korrekt (currentBid + 1)
- [ ] Bid Amount input → Pre-filled med minimum bid
- [ ] Bid Amount → Updates når currentBid ændres

#### Validation Test
- [ ] Submit med bid < minBid → Error: "Bid must be at least €X.XX"
- [ ] Submit med bid = minBid - 0.01 → Error vises
- [ ] Submit med bid = minBid → Success (hvis valid)
- [ ] Error messages → Vises inline og i toast

#### Auction Status Check
- [ ] Auction ended → Error: "Auction Ended"
- [ ] Auction status → Re-checked before submitting
- [ ] Outbid detection → Error: "Bid Too Low" med updated min bid

#### Submit Test (Med Authentication)
**Prerequisites:** User skal være authenticated

- [ ] Submit med valid bid → Bid placed
- [ ] Success toast → "Bid Placed!"
- [ ] Dialog lukker automatisk
- [ ] onSuccess callback → Fires (check console)

#### Error Handling Test
- [ ] Auction ended → Error: "This auction has ended"
- [ ] Outbid during submission → Error: "Bid Too Low" med updated amount
- [ ] Network failure → Error message
- [ ] Form data → Bevares ved fejl

#### Accessibility Test
- [ ] Form labels → Tilknyttet
- [ ] Error messages → Annonceres
- [ ] Keyboard navigation → Fungerer
- [ ] ARIA live regions → Updates announced (current bid, min bid)

---

### 5. CountdownTimer Test

#### Basic Display
- [ ] Timer vises korrekt
- [ ] Clock icon vises
- [ ] Time format → Correct (fx "1h 30m", "45s")
- [ ] Expired state → Shows "Ended" i muted color

#### Countdown Updates
- [ ] Timer updates every second
- [ ] Format changes → Days → Hours → Minutes → Seconds
- [ ] Expired → Shows "Ended", calls onExpire callback

#### Accessibility Test
- [ ] ARIA live region → role="timer", aria-live="polite"
- [ ] Updates announced → Screen reader announces time changes
- [ ] Expired state → Announced correctly

#### Edge Cases
- [ ] Very long duration (7+ days) → Displays correctly
- [ ] Very short duration (< 1 minute) → Displays seconds
- [ ] Expired auction → Shows "Ended"
- [ ] Invalid date → Handles gracefully

---

### 6. Integration Test

#### CreateSaleListing → Marketplace Flow
- [ ] Create sale listing
- [ ] Verify listing appears in marketplace (hvis list refreshes)
- [ ] Verify jersey shows "For Sale" badge

#### CreateAuction → Marketplace Flow
- [ ] Create auction
- [ ] Verify auction appears in marketplace
- [ ] Verify CountdownTimer shows correct time

#### PlaceBid → Auction Update Flow
- [ ] Place bid on auction
- [ ] Verify bid appears in auction (hvis list refreshes)
- [ ] Verify current bid updates
- [ ] Verify minimum bid updates

---

## 🐛 Known Issues / Notes

- [ ] List any issues found during testing
- [ ] Note any edge cases discovered
- [ ] Note performance observations

---

## ✅ Test Results Summary

**Date:** _______________

**Tester:** _______________

**Results:**
- [ ] All tests passed
- [ ] Issues found (see notes above)

**Next Steps:**
- [ ] Continue to Phase 4
- [ ] Fix issues before proceeding
- [ ] Update Linear with progress

---

## 🔍 Additional Test Scenarios

### Performance Test
- [ ] Multiple rapid form submissions → No duplicate submissions
- [ ] Form submission → Submit button disabled during submission
- [ ] CountdownTimer → No performance issues with multiple timers

### Browser Compatibility
- [ ] Chrome → All features work
- [ ] Firefox → All features work
- [ ] Safari → All features work
- [ ] Mobile browser → Responsive design works

### Edge Cases
- [ ] Very large prices (10000+) → Handles correctly
- [ ] Very small prices (0.01) → Handles correctly
- [ ] Special characters i input → Handles correctly
- [ ] Multiple dialogs open → Only one active at a time


