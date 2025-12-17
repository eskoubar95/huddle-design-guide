# Manual OAuth Flow Testing Guide - HUD-38

**Purpose:** Test Stripe Connect Express account onboarding flow end-to-end

## Prerequisites

✅ **Environment Setup:**
- Dev server running: `npm run dev`
- Stripe test mode API keys configured:
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...` (from Stripe CLI)
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- User logged in (Clerk authentication)
- Stripe CLI running (for webhook events): `stripe listen --forward-to localhost:3000/api/v1/stripe/webhook`

## Step-by-Step Testing Process

### Step 1: Navigate to Connect Page

1. **Open browser:** Go to `http://localhost:3000/seller/connect-stripe`
2. **Verify page loads:**
   - ✅ Page renders without errors
   - ✅ "Connect Stripe Account" button is visible
   - ✅ No account status shown (if first time)

**Expected UI:**
```
┌─────────────────────────────────────┐
│  Connect Stripe Account             │
│                                     │
│  Connect your Stripe account to     │
│  receive payouts from sales         │
│                                     │
│  [Connect Stripe Account]           │
└─────────────────────────────────────┘
```

### Step 2: Initiate OAuth Flow

1. **Click "Connect Stripe Account" button**
2. **Verify API call:**
   - Check browser Network tab
   - `POST /api/v1/seller/stripe-account/connect` should return `200 OK`
   - Response should contain: `{ "data": { "url": "https://connect.stripe.com/..." } }`

3. **Verify redirect:**
   - Browser should redirect to Stripe Connect onboarding page
   - URL should be: `https://connect.stripe.com/setup/...`

**What Happens Behind the Scenes:**
1. API creates Stripe Express account (if doesn't exist)
2. API creates account link for onboarding
3. Returns OAuth URL
4. Frontend redirects to Stripe

**Database Check (Optional):**
```sql
-- Check if account was created
SELECT id, user_id, stripe_account_id, status, payouts_enabled, charges_enabled
FROM public.stripe_accounts
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- `status` = `"pending"`
- `payouts_enabled` = `false`
- `charges_enabled` = `false`
- `stripe_account_id` = `acct_...` (Stripe account ID)

### Step 3: Complete Stripe Onboarding

**On Stripe Connect Page:**

1. **Fill in test data:**
   - **Business type:** Individual (for testing)
   - **Country:** Germany (DE) - matches our MVP setup
   - **Email:** Use test email (e.g., `test@example.com`)
   - **Phone:** Use test phone number
   - **Business details:** Fill minimal required fields

2. **Complete onboarding:**
   - Follow Stripe's onboarding flow
   - For test mode, you can skip some verification steps
   - Click "Complete" or "Finish"

**Important:** In Stripe test mode, you can use:
- Test email: `test@example.com`
- Test phone: Any valid format
- Test business details: Minimal required info

### Step 4: Verify Return Flow

**After completing Stripe onboarding:**

1. **Stripe redirects back:**
   - URL: `http://localhost:3000/seller/connect-stripe?success=true`
   - Page should show success message

2. **Verify UI updates:**
   - ✅ Success toast/alert appears
   - ✅ Account status shows "pending" or "active"
   - ✅ Status icon visible (Clock for pending, CheckCircle for active)

**Expected UI (After Return):**
```
┌─────────────────────────────────────┐
│  Connect Stripe Account             │
│                                     │
│  ✅ Account connected successfully! │
│     Your account is being verified. │
│                                     │
│  Status: Pending ⏰                 │
└─────────────────────────────────────┘
```

### Step 5: Verify Database Updates

**Check database after onboarding:**

```sql
-- Check account status
SELECT 
  id,
  user_id,
  stripe_account_id,
  status,
  payouts_enabled,
  charges_enabled,
  created_at,
  updated_at
FROM public.stripe_accounts
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected State (Immediately After Onboarding):**
- `status` = `"pending"` (until webhook updates it)
- `stripe_account_id` = `acct_...` (from Stripe)
- `payouts_enabled` = `false` (initially)
- `charges_enabled` = `false` (initially)

### Step 6: Wait for Webhook Event

**Stripe sends `account.updated` webhook:**

1. **Check Stripe CLI output:**
   - Should show: `account.updated` event forwarded
   - Should show: `200 OK` response from webhook handler

2. **Check dev server logs:**
   - Should show: `[STRIPE] Account ... updated → status: active` (if account is fully verified)
   - Or: `[STRIPE] Account ... updated → status: pending` (if still verifying)

3. **Verify database updated:**
   ```sql
   -- Check account status after webhook
   SELECT status, payouts_enabled, charges_enabled, updated_at
   FROM public.stripe_accounts
   WHERE user_id = '<your-user-id>'
   ORDER BY updated_at DESC
   LIMIT 1;
   ```

**Expected State (After Webhook):**
- `status` = `"active"` (if account fully verified)
- `payouts_enabled` = `true` (if enabled)
- `charges_enabled` = `true` (if enabled)
- `updated_at` = recent timestamp

### Step 7: Verify Account Status in UI

**Refresh `/seller/connect-stripe` page:**

1. **Check status display:**
   - ✅ Status should update to "active" (if webhook processed)
   - ✅ Status icon should show green checkmark
   - ✅ "Connect Stripe Account" button should be hidden (if active)

**Expected UI (Active Account):**
```
┌─────────────────────────────────────┐
│  Connect Stripe Account             │
│                                     │
│  ✅ Your Stripe account is active   │
│     and ready to receive payouts.   │
│                                     │
│  Status: Active ✓                   │
│  Payouts: Enabled                   │
│  Charges: Enabled                   │
└─────────────────────────────────────┘
```

### Step 8: Verify Notification

**Check if notification was created:**

```sql
-- Check for account activation notification
SELECT id, user_id, type, title, message, created_at
FROM public.notifications
WHERE user_id = '<your-user-id>'
  AND type = 'stripe_account_activated'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- `type` = `"stripe_account_activated"`
- `title` = `"Stripe Account Activated"`
- `message` = `"Your Stripe account is now active and ready to receive payouts."`

## Troubleshooting

### Issue: OAuth Redirect Fails

**Symptoms:**
- Button click doesn't redirect
- Error message appears
- Network request fails

**Debug Steps:**
1. Check browser console for errors
2. Check Network tab for API response
3. Verify `STRIPE_SECRET_KEY` is set correctly
4. Check dev server logs for errors
5. Verify user is authenticated (Clerk session)

**Common Causes:**
- Missing environment variable
- Stripe API error (check Sentry)
- Authentication failure

### Issue: Account Not Created in Database

**Symptoms:**
- Redirects to Stripe but no account in database
- Error in API response

**Debug Steps:**
1. Check API response in Network tab
2. Check dev server logs for errors
3. Verify Supabase connection
4. Check RLS policies (should allow INSERT for own user)

**Common Causes:**
- Database connection issue
- RLS policy blocking insert
- Foreign key constraint (user_id not in profiles table)

### Issue: Webhook Not Updating Status

**Symptoms:**
- Account stays "pending" after onboarding
- No webhook events received

**Debug Steps:**
1. Check Stripe CLI is running
2. Check `STRIPE_WEBHOOK_SECRET` matches Stripe CLI secret
3. Check dev server logs for webhook errors
4. Manually trigger webhook: `stripe trigger account.updated`

**Common Causes:**
- Stripe CLI not running
- Wrong webhook secret
- Webhook handler error (check logs)

### Issue: Account Status Stays "Pending"

**Symptoms:**
- Account never becomes "active"
- Webhook received but status not updated

**Debug Steps:**
1. Check Stripe Dashboard → Connect → Accounts
2. Verify account has `charges_enabled` and `payouts_enabled` = true
3. Check webhook handler logs
4. Verify `account.updated` event has correct metadata (`user_id`)

**Common Causes:**
- Account not fully verified in Stripe
- Missing metadata in webhook event
- Database update error (check Sentry)

## Verification Checklist

### Before Testing
- [ ] Dev server running
- [ ] User logged in
- [ ] Stripe CLI running (for webhooks)
- [ ] Environment variables set

### During Testing
- [ ] Page loads without errors
- [ ] "Connect Stripe Account" button works
- [ ] Redirects to Stripe Connect
- [ ] Can complete onboarding
- [ ] Returns to app with `?success=true`
- [ ] Success message displayed

### After Testing
- [ ] Account created in database
- [ ] Account status = "pending" initially
- [ ] Webhook event received (`account.updated`)
- [ ] Account status updated to "active" (if verified)
- [ ] Notification created
- [ ] UI shows correct status

## Test Scenarios

### Scenario 1: First Time Onboarding ✅

**Steps:**
1. Navigate to `/seller/connect-stripe`
2. Click "Connect Stripe Account"
3. Complete Stripe onboarding
4. Return to app
5. Verify account created and status updated

**Expected Result:** Account created, status becomes "active" after webhook

### Scenario 2: Re-connect Existing Account

**Steps:**
1. Navigate to `/seller/connect-stripe` (with existing account)
2. Click "Connect Stripe Account" (if status is not "active")
3. Complete onboarding
4. Verify status updates

**Expected Result:** Existing account used, status updated

### Scenario 3: Account Already Active

**Steps:**
1. Navigate to `/seller/connect-stripe` (with active account)
2. Verify "Connect Stripe Account" button is hidden
3. Verify status shows "active"

**Expected Result:** Button hidden, status displayed correctly

### Scenario 4: Onboarding Incomplete (Refresh Flow)

**Steps:**
1. Start onboarding but don't complete
2. Return to app (or timeout)
3. Click "Connect Stripe Account" again
4. Verify refresh flow works

**Expected Result:** New account link created, can complete onboarding

## Stripe Dashboard Verification

**Check in Stripe Dashboard:**

1. **Go to:** https://dashboard.stripe.com/test/connect/accounts
2. **Find your test account:**
   - Look for account with metadata `user_id` = your Clerk user ID
   - Account type: Express
   - Country: DE (Germany)

3. **Verify account details:**
   - Account ID matches database `stripe_account_id`
   - Status: Active (if fully verified)
   - Capabilities: Card payments, Transfers enabled

4. **Check webhook events:**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Find `account.updated` events
   - Verify events were sent and received

## Test Data Cleanup (Optional)

**After testing, you can clean up:**

```sql
-- Delete test account (if needed)
DELETE FROM public.stripe_accounts
WHERE user_id = '<your-test-user-id>';

-- Delete test notifications
DELETE FROM public.notifications
WHERE user_id = '<your-test-user-id>'
  AND type LIKE 'stripe_%';
```

**Note:** In Stripe test mode, accounts can be left for future testing.

## Next Steps After OAuth Testing

Once OAuth flow is verified:

1. ✅ **Test Payment Intent creation** (requires checkout flow)
2. ✅ **Test Payout scheduling** (requires order management)
3. ✅ **Test Refund flow** (requires completed transaction)
4. ✅ **Integration testing** with HUD-37, HUD-39

---

**Questions or Issues?**
- Check dev server logs
- Check Stripe Dashboard
- Check database directly
- Review webhook handler logs

