# Environment Variables Setup

## Quick Start

1. **Copy the example file:**
   ```bash
   cd apps/web
   cp .env.example .env.local
   ```

2. **Get your Supabase credentials:**
   - Go to your Supabase project: https://app.supabase.com
   - Navigate to: Settings → API
   - Copy the following:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Fill in `.env.local`:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Restart your dev server:**
   ```bash
   npm run dev
   ```

## Required Variables

### `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Type:** String
- **Required:** Yes
- **Description:** Clerk publishable key for client-side authentication
- **Example:** `pk_test_...`
- **Security:** Safe for client-side (public key)
- **Where to find:** Clerk Dashboard → API Keys → Publishable key

### `CLERK_SECRET_KEY`
- **Type:** String
- **Required:** Yes (server-side only)
- **Description:** Clerk secret key for server-side token verification
- **Example:** `sk_test_...`
- **Security:** ⚠️ Server-side only, never expose to client or commit to git
- **Where to find:** Clerk Dashboard → API Keys → Secret key

### `NEXT_PUBLIC_SUPABASE_URL`
- **Type:** String
- **Required:** Yes
- **Description:** Your Supabase project URL
- **Example:** `https://abcdefghijklmnop.supabase.co`
- **Where to find:** Supabase Dashboard → Settings → API → Project URL

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Type:** String
- **Required:** Yes
- **Description:** Your Supabase anonymous/public key (safe for client-side, respects RLS)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find:** Supabase Dashboard → Settings → API → Project API keys → anon/public

## Optional Variables

### `SUPABASE_SERVICE_ROLE_KEY`
- **Type:** String
- **Required:** No (only for server-side admin operations)
- **Description:** Service role key that bypasses RLS (NEVER expose to client)
- **Security:** ⚠️ Server-side only, never commit to git
- **Where to find:** Supabase Dashboard → Settings → API → Project API keys → service_role

### `NEXT_PUBLIC_SITE_URL`
- **Type:** String
- **Required:** No
- **Description:** Your app's public URL (for emails, webhooks, etc.)
- **Example:** `http://localhost:3000` (dev) or `https://huddle.design` (prod)

### `MEDUSA_API_URL`
- **Type:** String
- **Required:** No (defaults to `http://localhost:9000`)
- **Description:** Medusa backend API URL
- **Example:** `http://localhost:9000` (dev) or `https://medusa.huddle.design` (prod)

### `MEDUSA_ADMIN_TOKEN`
- **Type:** String
- **Required:** No (optional - kun til customer update operations)
- **Description:** Medusa **Secret API key** for Admin API authentication (NOT publishable key)
- **Note:** Customer creation bruger Supabase database function i stedet for Medusa API (se `create_medusa_customer` function)
- **Security:** ⚠️ Server-side only, never commit to git
- **Where to find:** Medusa Admin Dashboard → Settings → Developer → Secret API Keys
- **Note:** Use **Secret API key** (not Publishable key). Secret keys are for Admin API, publishable keys are for Store API.

### `EUROSENDER_API_KEY`
- **Type:** String
- **Required:** Yes (for shipping calculation and label generation - HUD-36)
- **Description:** Eurosender API key for shipping quotes, PUDO point search, and label generation
- **Example:** `ce5fe737-00bb-498a-881e-8k453k0b1166`
- **Security:** ⚠️ Server-side only, never commit to git
- **Where to find:** Eurosender Dashboard → New Order → Public API tab
- **Note:** Separate keys for sandbox and production environments

### `EUROSENDER_API_URL`
- **Type:** String
- **Required:** No (defaults to `https://sandbox-api.eurosender.com`)
- **Description:** Eurosender API base URL
- **Options:**
  - `https://sandbox-api.eurosender.com` (testing/sandbox - default)
  - `https://api.eurosender.com` (production)
- **Note:** Only set this if you need to override the default sandbox URL

### `NEXT_PUBLIC_FEATURED_AUCTION_ID`
- **Type:** String
- **Required:** No
- **Description:** ID of featured auction to display in hero carousel
- **Example:** `auction-abc123`
- **Note:** If not set, featured auction slide will not appear

## Environment Files

- **`.env.example`** - Template file (committed to git)
- **`.env.local`** - Your local variables (git-ignored, never commit)
- **`.env.production`** - Production variables (if needed, git-ignored)

## Security Notes

⚠️ **Never commit `.env.local` or any file containing actual secrets!**

- `.env.local` is automatically git-ignored
- Use `.env.example` as a template
- Never share your `SUPABASE_SERVICE_ROLE_KEY` publicly
- The `NEXT_PUBLIC_*` prefix means the variable is exposed to the browser (safe for anon key, not for service role)

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists in `apps/web/` directory
- Check that variable names are exactly: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart your dev server after adding variables

### Variables not loading
- Next.js only loads `.env.local` in development
- For production, set variables in your hosting platform (Vercel, etc.)
- Make sure variable names start with `NEXT_PUBLIC_` for client-side access

### RLS errors
- Make sure you're using `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not service role key)
- Check that RLS policies are set up in Supabase
- Verify your user is authenticated if accessing protected data

## Migration from Vite App

If you're migrating from the Vite app (`src/`), note the variable name changes:

| Vite (old) | Next.js (new) |
|------------|---------------|
| `VITE_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |


