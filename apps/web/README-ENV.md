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

