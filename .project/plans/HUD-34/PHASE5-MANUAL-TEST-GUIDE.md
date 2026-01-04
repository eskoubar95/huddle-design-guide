# Phase 5 Manual Test Guide - HUD-34

**Date:** 2025-01-31  
**Status:** Ready for Manual Testing

---

## Prerequisites

1. ✅ Next.js dev server running: `npm run dev` (from `apps/web`)
2. ✅ Authenticated user with:
   - Complete profile
   - Default shipping address
   - Stripe Connect account (for sellers)
3. ✅ Test sale listing available:
   - Listing ID: `e203ac85-196d-4aa3-9070-caaea6db4040` (or any active listing)
   - Status: `active`

---

## Test 1: Keyboard Accessibility ✅

### A. Shipping Method Tabs Navigation

**Steps:**
1. Navigate to: `http://localhost:3000/checkout/sale/[listingId]`
2. Ensure page loads with shipping address pre-filled
3. **Keyboard Test:**
   - Press `Tab` to focus on first shipping method tab ("Home Delivery")
   - Press `→` or `←` arrow keys to switch between tabs
   - Verify: Focus moves between "Home Delivery" and "Pickup Point" tabs
   - Verify: Screen reader announces: "Home delivery - deliver to your address" and "Pickup point - collect from a nearby location"

**Expected:**
- ✅ Tabs are keyboard accessible
- ✅ Arrow keys navigate between tabs
- ✅ Screen reader announces tab labels correctly
- ✅ Tab selection updates shipping options

**ARIA Verification:**
- Open browser DevTools → Elements
- Check `<TabsList>` has `aria-label="Shipping method selection"`
- Check each `<TabsTrigger>` has descriptive `aria-label`

---

### B. Shipping Options Radio Group

**Steps:**
1. Select "Home Delivery" tab
2. Wait for shipping options to load
3. **Keyboard Test:**
   - Press `Tab` to focus on first shipping option
   - Press `↑` or `↓` arrow keys to navigate between options
   - Press `Space` or `Enter` to select an option
   - Verify: Selected option is highlighted

**Expected:**
- ✅ Radio buttons are keyboard accessible
- ✅ Arrow keys navigate between options
- ✅ Space/Enter selects option
- ✅ Focus indicator visible on active option

**ARIA Verification:**
- Check `<RadioGroup>` has `aria-label="Shipping options"`
- Verify each option has proper `id` and `htmlFor` linking

---

### C. Service Point Picker

**Steps:**
1. Select "Pickup Point" tab
2. Wait for service points to load
3. **Keyboard Test:**
   - Press `Tab` to focus on service point list
   - Press `↑` or `↓` arrow keys to navigate between points
   - Press `Space` or `Enter` to select a point
   - Test "Search in a different area" button with `Tab` and `Enter`

**Expected:**
- ✅ Service points are keyboard accessible
- ✅ Arrow keys navigate between points
- ✅ Search input is keyboard accessible (`Tab` to focus, type, `Enter` to search)

**ARIA Verification:**
- Check `<RadioGroup>` has `aria-label="Pickup point selection"` and `role="radiogroup"`
- Verify search input has `aria-label="Postal code for pickup point search"`

---

## Test 2: Payment Flow & Analytics ✅

### Steps:
1. Complete shipping selection (home delivery or pickup point)
2. Click "Proceed to Payment"
3. **Verify:**
   - Payment Element loads (Stripe form)
   - Loading state shows while checkout initializes
   - Analytics events logged (check browser console or Sentry)

**Analytics Events to Verify:**
Open browser DevTools → Console and check for:
```
✅ checkout_shipping_method_selected
✅ checkout_service_point_selected (if pickup point)
✅ checkout_initiated
```

### Payment Success Flow:
1. Enter test card: `4242 4242 4242 4242`
2. Enter any future expiry date, any CVC, any ZIP
3. Click "Pay"
4. **Verify:**
   - Payment processes successfully
   - Redirect to `/orders/[orderId]`
   - Analytics events:
     - `checkout_payment_success`
     - `checkout_completed`

### Payment Failure Flow:
1. Enter declined card: `4000 0000 0000 0002`
2. Click "Pay"
3. **Verify:**
   - Error message displayed: "Your card was declined."
   - Analytics event: `checkout_payment_failed`
   - User can retry payment

---

## Test 3: Feature Flag (Rollback) ✅

### Steps:
1. **Enable Feature Flag:**
   ```bash
   # In .env.local
   CHECKOUT_SALE_ENABLED=true  # or omit (default true)
   ```
2. Restart dev server: `npm run dev`
3. Navigate to checkout page
4. **Verify:** Checkout works normally

### Disable Feature Flag:
1. **Disable Feature Flag:**
   ```bash
   # In .env.local
   CHECKOUT_SALE_ENABLED=false
   ```
2. Restart dev server
3. Navigate to checkout page and click "Proceed to Payment"
4. **Verify:**
   - Error message: "Checkout is temporarily unavailable. Please try again later."
   - No API calls made (check Network tab)
   - Analytics events NOT triggered

---

## Test 4: Error States ✅

### A. Invalid Shipping Address

**Steps:**
1. Navigate to checkout page
2. Clear shipping address fields
3. Try to select shipping method
4. **Verify:**
   - Message: "Enter shipping address" or "Fill in shipping address"
   - Shipping options do not load
   - "Proceed to Payment" button disabled

---

### B. Network Error

**Steps:**
1. Open DevTools → Network tab
2. Set to "Offline" or block requests to `/api/v1/shipping/calculate`
3. Enter valid shipping address
4. **Verify:**
   - Error message displayed: "Loading Error" or similar
   - Retry button available
   - Error logged to Sentry (no PII)

---

### C. Listing No Longer Available

**Steps:**
1. Open checkout for a listing
2. In Supabase, update listing status to `sold` or `inactive`
3. Refresh checkout page or try to proceed
4. **Verify:**
   - Error message: "This listing is no longer available"
   - Redirect to marketplace after 2 seconds
   - Error logged to Sentry

---

### D. Seller Payment Account Not Ready

**Steps:**
1. Create a listing with a seller who has inactive Stripe account
2. Navigate to checkout for that listing
3. Click "Proceed to Payment"
4. **Verify:**
   - Error: "Seller's payment account is not ready to receive payments."
   - Error logged to Sentry with seller ID prefix (no PII)

---

## Test 5: Sentry Breadcrumbs (No PII) ✅

### Steps:
1. Complete a full checkout flow
2. Check Sentry dashboard (if configured) or browser console
3. **Verify Breadcrumbs Present:**
   - `checkout.validation` - Listing validated
   - `checkout.calculation` - Fees calculated
   - `checkout.medusa` - Medusa order creation
   - `checkout.stripe` - Payment Intent creation
   - `checkout.ui` - User interactions (method selection, address change)

### PII Verification:
- ✅ No full addresses in breadcrumbs (only country code)
- ✅ No full names or emails
- ✅ Only ID prefixes (first 8 chars)
- ✅ No payment card details

**Check breadcrumbs in Sentry or browser console:**
```javascript
// In browser console (if Sentry debug enabled)
// Or check Sentry dashboard
// Verify data objects contain only:
{
  listingIdPrefix: "e203ac85",
  shippingMethod: "home_delivery",
  country: "DK",  // Only country code
  amountCents: 10000,  // No PII
  // NO: street, full_name, email, card details
}
```

---

## Test 6: Loading & Empty States ✅

### A. Service Point Picker Loading

**Steps:**
1. Select "Pickup Point" tab
2. Watch loading state
3. **Verify:**
   - Loading spinner visible
   - Text: "Searching pickup points near [location]..."
   - Skeleton placeholders shown

---

### B. Service Point Picker Empty State

**Steps:**
1. Select "Pickup Point" tab
2. Wait for results
3. If no points found, **Verify:**
   - Empty state: "No pickup points found"
   - Message: "No pickup points available near [location]"
   - "Search in a different area" button available

---

### C. Shipping Options Empty State

**Steps:**
1. Enter incomplete address (missing postal code)
2. **Verify:**
   - Message: "Enter shipping address" or "Fill in shipping address"
   - No shipping options shown

---

## Test Results Checklist

### Accessibility ✅
- [ ] Keyboard navigation works for shipping tabs
- [ ] Keyboard navigation works for shipping options
- [ ] Keyboard navigation works for service point picker
- [ ] Screen reader announces labels correctly
- [ ] All interactive elements have ARIA labels

### Analytics ✅
- [ ] `checkout_shipping_method_selected` event tracked
- [ ] `checkout_service_point_selected` event tracked
- [ ] `checkout_initiated` event tracked
- [ ] `checkout_payment_success` event tracked
- [ ] `checkout_payment_failed` event tracked
- [ ] `checkout_completed` event tracked

### Feature Flag ✅
- [ ] `CHECKOUT_SALE_ENABLED=true` - Checkout works
- [ ] `CHECKOUT_SALE_ENABLED=false` - Maintenance message shown
- [ ] No API calls when flag disabled

### Error Handling ✅
- [ ] Invalid address - friendly error shown
- [ ] Network error - retry option available
- [ ] Listing unavailable - redirect with message
- [ ] Seller account not ready - clear error message
- [ ] All errors logged to Sentry (no PII)

### Sentry Breadcrumbs ✅
- [ ] Validation breadcrumbs present
- [ ] Calculation breadcrumbs present
- [ ] Medusa order breadcrumbs present
- [ ] Stripe Payment Intent breadcrumbs present
- [ ] UI interaction breadcrumbs present
- [ ] No PII in breadcrumbs (only prefixes, country codes)

### Loading & Empty States ✅
- [ ] Service point loading state works
- [ ] Service point empty state works
- [ ] Shipping options empty state works
- [ ] All states are user-friendly

---

## Browser Testing Checklist

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)

Test with screen reader:
- [ ] macOS VoiceOver
- [ ] Windows NVDA/JAWS
- [ ] Browser built-in screen reader

---

## Notes

- **Sentry**: If Sentry DSN not configured, breadcrumbs will only appear in console (dev mode)
- **Analytics**: Currently logs to Sentry breadcrumbs; can be extended to analytics service later
- **Stripe Test Cards**: Use Stripe test cards for payment testing (see Stripe docs)

---

## Issues Found

Document any issues found during testing:

1. **Issue:** [Description]
   - **Severity:** Critical / Warning / Minor
   - **Steps to Reproduce:** [Steps]
   - **Expected:** [Expected behavior]
   - **Actual:** [Actual behavior]

---

## Sign-off

- **Tester:** [Name]
- **Date:** [Date]
- **Status:** ✅ Pass / ⚠️ Pass with Issues / ❌ Fail
- **Notes:** [Additional notes]

