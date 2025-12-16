# HUD-38 Webhook Testing Guide

## Prerequisites

- ✅ Stripe CLI installed (`stripe --version`)
- ✅ Dev server running (`npm run dev`)
- ✅ Stripe CLI forwarding active (`stripe listen --forward-to localhost:3000/api/v1/stripe/webhook`)
- ✅ Environment variables configured:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET` (from Stripe CLI output)
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## Test Setup

### 1. Start Stripe CLI Webhook Forwarding

```bash
# In a separate terminal
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
```

**Important:** Copy the webhook signing secret (starts with `whsec_`) and set it in your `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Verify Webhook Endpoint

```bash
# Should return {"error":"Missing signature"} (correct behavior)
curl -X POST http://localhost:3000/api/v1/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'
```

## Test Events

### Test 1: payment_intent.succeeded

**Trigger:**
```bash
stripe trigger payment_intent.succeeded
```

**Expected Behavior:**
1. Stripe CLI shows event being forwarded
2. Webhook handler receives event
3. If `metadata.transaction_id` exists:
   - Updates transaction status to "completed"
   - Updates `stripe_payment_intent_id` column
   - Sets `completed_at` timestamp
4. If `metadata.seller_id` exists:
   - Creates notification for seller
5. Dev server console shows: `[STRIPE] Payment succeeded for transaction...`

**Verification:**
- Check Stripe CLI output for forwarding status
- Check dev server console for processing logs
- Check database for transaction updates (if test transaction exists)

### Test 2: payment_intent.payment_failed

**Trigger:**
```bash
stripe trigger payment_intent.payment_failed
```

**Expected Behavior:**
1. Webhook handler receives event
2. If `metadata.transaction_id` exists:
   - Updates transaction status to "cancelled"
3. If `metadata.buyer_id` exists:
   - Creates notification for buyer
4. Dev server console shows payment failure log

### Test 3: transfer.created

**Trigger:**
```bash
stripe trigger transfer.created
```

**Expected Behavior:**
1. Webhook handler receives event
2. If `metadata.transaction_id` exists:
   - Updates transaction with `stripe_transfer_id`
3. If `metadata.seller_id` exists:
   - Creates notification for seller
4. Dev server console shows transfer log

**Note:** This event may require manual setup or different fixture.

### Test 4: account.updated

**Trigger:**
```bash
stripe trigger account.updated
```

**Expected Behavior:**
1. Webhook handler receives event
2. If `metadata.user_id` exists:
   - Determines account status:
     - "active" if `details_submitted && charges_enabled && payouts_enabled`
     - "restricted" if `requirements.currently_due.length > 0`
     - "pending" otherwise
   - Updates `stripe_accounts` table
   - Updates `payouts_enabled` and `charges_enabled` flags
3. If status becomes "active":
   - Creates notification for user
4. Dev server console shows account update log

## Manual Testing with Real Data

### Create Test Transaction

1. Create a test transaction in database:
```sql
INSERT INTO transactions (id, listing_type, listing_id, seller_id, buyer_id, amount, currency, status)
VALUES (
  'test-txn-123',
  'sale',
  'test-listing-123',
  'test-seller-123',
  'test-buyer-123',
  5000, -- 50.00 EUR in cents
  'EUR',
  'pending'
);
```

2. Trigger payment_intent.succeeded with metadata:
```bash
# Note: This requires custom event creation or Stripe Dashboard
# For now, use stripe trigger and verify handler processes event
```

### Create Test Stripe Account

1. Create a test Stripe account record:
```sql
INSERT INTO stripe_accounts (id, user_id, stripe_account_id, status, payouts_enabled, charges_enabled)
VALUES (
  gen_random_uuid(),
  'test-user-123',
  'acct_test123',
  'pending',
  false,
  false
);
```

2. Trigger account.updated with metadata:
```bash
# Use Stripe Dashboard or custom event
```

## Verification Checklist

### Webhook Handler
- [ ] Events are received (check Stripe CLI output)
- [ ] Signature verification works (invalid signature returns 400)
- [ ] Events are processed (check dev server logs)
- [ ] No errors in console
- [ ] Response is 200 OK

### Database Updates
- [ ] Transactions updated correctly (if metadata present)
- [ ] Stripe accounts updated correctly (if metadata present)
- [ ] Notifications created (if user IDs in metadata)
- [ ] Timestamps updated correctly

### Error Handling
- [ ] Missing signature returns 400
- [ ] Invalid signature returns 400
- [ ] Missing metadata doesn't crash handler
- [ ] Database errors are logged to Sentry
- [ ] User-friendly error messages

## Troubleshooting

### Events Not Received
- Check Stripe CLI is running
- Verify webhook URL is correct
- Check dev server is running on port 3000
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly

### Events Received But Not Processed
- Check dev server console for errors
- Verify metadata exists in event
- Check database connection
- Verify RLS policies allow updates

### Signature Verification Fails
- Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe CLI secret
- Check webhook secret is from correct Stripe account (test vs live)
- Verify request body is not modified

## Next Steps After Testing

1. **Verify all events work correctly**
2. **Test error scenarios** (missing metadata, database errors)
3. **Test with real Stripe Connect accounts** (in test mode)
4. **Document any issues found**
5. **Commit changes** once testing is complete

## Test Results Template

```markdown
## Test Results - [Date]

### payment_intent.succeeded
- [ ] Event received
- [ ] Handler processed
- [ ] Database updated (if test data exists)
- [ ] Notification created (if seller_id in metadata)

### payment_intent.payment_failed
- [ ] Event received
- [ ] Handler processed
- [ ] Database updated
- [ ] Notification created

### transfer.created
- [ ] Event received
- [ ] Handler processed
- [ ] Database updated
- [ ] Notification created

### account.updated
- [ ] Event received
- [ ] Handler processed
- [ ] Database updated
- [ ] Status determined correctly
- [ ] Notification created (if status = active)

### Error Scenarios
- [ ] Invalid signature handled
- [ ] Missing metadata handled gracefully
- [ ] Database errors logged
```

