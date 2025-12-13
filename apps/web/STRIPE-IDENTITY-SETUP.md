# Stripe Identity Setup Guide (HUD-41)

This guide explains how to configure Stripe Identity verification for the Huddle marketplace.

## Prerequisites

1. A Stripe account (test mode for development)
2. Stripe API keys
3. ngrok or similar tunnel for local webhook testing

## Step 1: Install Stripe SDK

```bash
cd apps/web
npm install stripe
```

## Step 2: Configure Environment Variables

Add these to your `.env.local`:

```bash
# Stripe API Key (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY

# Stripe Webhook Secret (from https://dashboard.stripe.com/webhooks)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# App URL for verification redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Configure Stripe Webhook

### For Local Development

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/v1/stripe/webhook`
4. Copy the webhook secret that's printed and add to `.env.local`

### For Production

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://yourdomain.com/api/v1/stripe/webhook`
4. Select events to listen to:
   - `identity.verification_session.verified`
   - `identity.verification_session.requires_input`
   - `identity.verification_session.canceled`
5. Copy the webhook signing secret to your production environment variables

## Step 4: Enable Stripe Identity

1. Go to https://dashboard.stripe.com/settings/identity
2. Enable Identity verification for your account
3. Configure document types (defaults work fine)
4. Set up verification session settings

## API Endpoints

### Start Verification Flow
**POST** `/api/v1/profile/identity/start`

Requires authentication. Creates a Stripe Identity verification session.

**Response:**
```json
{
  "status": "session_created",
  "clientSecret": "vs_1abc123...",
  "url": "https://verify.stripe.com/start/vs_1abc123..."
}
```

**Possible statuses:**
- `already_verified` - User is already verified
- `already_pending` - Verification is pending
- `session_created` - New session created

### Webhook Handler
**POST** `/api/v1/stripe/webhook`

Handles Stripe webhook events. Requires valid Stripe signature header.

**Events handled:**
- `identity.verification_session.verified` → Sets profile status to "verified"
- `identity.verification_session.requires_input` → Sets profile status to "rejected"
- `identity.verification_session.canceled` → Sets profile status to "rejected"

### Request Manual Review
**POST** `/api/v1/profile/identity/request-review`

Allows users with rejected verification to request manual review.

**Request body:**
```json
{
  "message": "Optional explanation from user"
}
```

## Database Schema

The following tables support identity verification:

### profiles
- `stripe_identity_verification_status` (TEXT): 'verified', 'pending', 'rejected', or NULL
- `stripe_identity_verification_id` (VARCHAR): Stripe session ID

### identity_verification_review_requests
- `id` (UUID): Primary key
- `user_id` (TEXT): Clerk user ID
- `verification_session_id` (VARCHAR): Stripe session ID
- `status` (TEXT): 'open' or 'closed'
- `message` (TEXT): Optional user message
- `created_at`, `updated_at` (TIMESTAMPTZ)

## Security Notes

1. **No PII in logs**: User IDs are truncated to first 8 characters in all logs
2. **Webhook signature verification**: All webhooks are verified using Stripe's signature
3. **Service role client**: API routes use service client to bypass RLS
4. **Error instrumentation**: All errors are captured in Sentry with context

## Testing

### Local Testing Flow

1. Start your app: `npm run dev`
2. Start Stripe webhook forwarding: `stripe listen --forward-to localhost:3000/api/v1/stripe/webhook`
3. Call the start endpoint with a valid auth token
4. Complete the verification flow in the returned URL
5. Check that webhook events are received and processed
6. Verify profile status updated in database
7. Check notification was created

### Test Events

You can trigger test webhook events:

```bash
stripe trigger identity.verification_session.verified
stripe trigger identity.verification_session.requires_input
```

## Troubleshooting

### Webhook signature verification fails
- Ensure `STRIPE_WEBHOOK_SECRET` matches the one from Stripe CLI or dashboard
- Check that the raw request body is being passed to `stripe.webhooks.constructEvent()`

### Session creation fails
- Verify `STRIPE_SECRET_KEY` is correct
- Check Stripe Identity is enabled for your account
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly

### User ID not found in webhook
- The verification session metadata must include `user_id`
- This is automatically set when creating the session in `/api/v1/profile/identity/start`

## Frontend Integration (Not Included)

The backend APIs are complete. For frontend integration:

1. Create a page at `/seller/verify-identity` (not included in this backend implementation)
2. Use Stripe Identity Elements or redirect to `session.url`
3. Handle return URL with `session_complete=true` query param
4. Poll or refresh profile status after completion

See Stripe documentation: https://stripe.com/docs/identity
