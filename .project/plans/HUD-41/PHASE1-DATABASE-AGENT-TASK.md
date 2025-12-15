# PHASE 1: DATABASE AGENT TASK - HUD-41

## Role
You are the **database agent** for HUD-41 User Profile Validation & Verification.

## Supabase Project
**Project ID:** `trbyclravrmmhxplocsr`

## Context
The application uses Clerk authentication (TEXT user IDs), but many database tables still have UUID user_id columns with foreign keys to auth.users (Supabase Auth). This blocks marketplace features and notifications.

## Your Mission
Execute 4 migrations in sequence, then regenerate TypeScript types.

---

## TASK 1.0: Align ALL user_id columns from UUID to TEXT

**Why:** Current DB has UUID user_id columns with FK to auth.users across multiple tables. Clerk uses TEXT IDs. This conversion is critical for all features.

**Scope - Convert these columns from UUID to TEXT:**

### Critical for HUD-41 (marketplace + notifications):
- `public.notifications.user_id`
- `public.sale_listings.seller_id`
- `public.sale_listings.sold_to`
- `public.auctions.seller_id`
- `public.auctions.winner_id`
- `public.bids.bidder_id`
- `public.transactions.seller_id`
- `public.transactions.buyer_id`

### Additional tables (for completeness - prevent future bugs):
- `public.likes.user_id`
- `public.saved_jerseys.user_id`
- `public.follows.follower_id`
- `public.follows.following_id`
- `public.posts.user_id`
- `public.post_likes.user_id`
- `public.comments.user_id`
- `public.search_analytics.user_id`

**Migration file:** `supabase/migrations/20251213165000_align_all_user_ids_for_clerk.sql`

**Pattern for EACH table/column:**
```sql
-- Example for notifications.user_id
-- 1. Drop FK constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- 2. Drop indexes referencing this column (if any)
DROP INDEX IF EXISTS idx_notifications_user_id;

-- 3. Convert column type
ALTER TABLE public.notifications 
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 4. Recreate index (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 5. Add comment
COMMENT ON COLUMN public.notifications.user_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';
```

**CRITICAL SAFETY:**
- Use `IF EXISTS` / `IF NOT EXISTS` for all DROP/CREATE operations
- Wrap entire migration in a transaction if possible
- Add clear comments explaining Clerk migration
- Current data is 0 rows for most tables, so minimal risk

**Success Criteria:**
- All listed columns are TEXT type
- No foreign key constraints to auth.users remain for these columns
- Migration applies without errors

---

## TASK 1.1: Add profile fields + Stripe Identity + computed column

**Migration file:** `supabase/migrations/20251213170000_add_profile_completion_and_identity_fields.sql`

**Add to public.profiles:**
```sql
-- Personal info
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT NULL;

-- Stripe Identity verification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_identity_verification_status TEXT NULL 
  CHECK (stripe_identity_verification_status IN ('pending', 'verified', 'rejected'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_identity_verification_id TEXT NULL;

-- Computed column for profile completeness (profile fields only - cannot check addresses)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN 
  GENERATED ALWAYS AS (
    first_name IS NOT NULL AND 
    last_name IS NOT NULL AND 
    phone IS NOT NULL
  ) STORED;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_status ON public.profiles(stripe_identity_verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_complete ON public.profiles(is_profile_complete);

-- Comments
COMMENT ON COLUMN public.profiles.is_profile_complete IS 'Computed: true if first_name, last_name, phone are all non-null. Does not check shipping_addresses (that is done in service layer).';
COMMENT ON COLUMN public.profiles.stripe_identity_verification_status IS 'Stripe Identity verification status. Updated via webhook when verification completes.';
```

**Success Criteria:**
- All new columns exist with correct types
- Computed column correctly evaluates (test with INSERT)
- Check constraint on status field prevents invalid values

---

## TASK 1.2: Create shipping_addresses table

**Migration file:** `supabase/migrations/20251213171000_create_shipping_addresses.sql`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only ONE default address per user
CREATE UNIQUE INDEX IF NOT EXISTS shipping_addresses_user_default_idx 
  ON public.shipping_addresses(user_id) WHERE is_default = true;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id ON public.shipping_addresses(user_id);

-- Enable RLS (no policies - service-role only access)
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;

-- updated_at trigger (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_shipping_addresses_updated_at 
      BEFORE UPDATE ON public.shipping_addresses 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Comments
COMMENT ON TABLE public.shipping_addresses IS 'User shipping addresses. RLS enabled, no policies - access via service role only (contains PII).';
COMMENT ON INDEX shipping_addresses_user_default_idx IS 'Ensures only one default address per user (partial unique index on is_default=true).';
```

**Success Criteria:**
- Table created successfully
- Unique constraint on default works (only one default per user)
- RLS enabled (no policies)
- Trigger created if update_updated_at_column exists

---

## TASK 1.3: Create identity_verification_review_requests table

**Migration file:** `supabase/migrations/20251213172000_create_identity_verification_review_requests.sql`

**Purpose:** Minimal support table for "Request review" when Stripe Identity verification is rejected.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS public.identity_verification_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  verification_session_id VARCHAR(255) NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_identity_review_requests_user_id ON public.identity_verification_review_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_review_requests_status ON public.identity_verification_review_requests(status);

-- Enable RLS (no policies - service-role only)
ALTER TABLE public.identity_verification_review_requests ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_identity_review_requests_updated_at 
      BEFORE UPDATE ON public.identity_verification_review_requests 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Comments
COMMENT ON TABLE public.identity_verification_review_requests IS 'Minimal support table for tracking "request review" submissions when Stripe Identity verification is rejected. Service-role access only.';
```

**Success Criteria:**
- Table created
- Status check constraint works
- Indexes created
- RLS enabled

---

## TASK 1.4: Regenerate TypeScript types

**Action:** Use Supabase MCP tool `generate_typescript_types`

**Parameters:**
- project_id: `trbyclravrmmhxplocsr`

**Output:** Write to `apps/web/lib/supabase/types.ts`

**Success Criteria:**
- types.ts file updated with all new columns and tables
- No TypeScript compilation errors in apps/web after regeneration

---

## Execution Order
1. Apply migration 1.0 (UUID → TEXT conversion)
2. Apply migration 1.1 (profile fields)
3. Apply migration 1.2 (shipping_addresses)
4. Apply migration 1.3 (review_requests)
5. Regenerate types (task 1.4)

## Error Handling
- If any migration fails, STOP immediately
- Capture full error message
- Attempt rollback if safe
- Document in `database.log`
- Escalate to orchestrator with full context

## Logging
Create detailed log: `.project/plans/HUD-41/agent-logs/database.log`

Include:
- Timestamp for each action
- SQL executed (sanitized, no data)
- Success/failure status
- Verification query results
- Any warnings or concerns

## Human Checkpoint
AFTER all migrations complete successfully, PAUSE and provide:
1. Summary of changes
2. Verification SQL queries human can run in Supabase SQL Editor
3. Any warnings or concerns
4. Request explicit "continue" approval before returning control

---

## Tools Available
- Supabase MCP: `mcp__supabase__apply_migration`, `mcp__supabase__execute_sql`, `mcp__supabase__generate_typescript_types`
- File operations: Write migration files to `supabase/migrations/` before applying
- Verification: Use `execute_sql` to verify schema changes

## Project Directory
Base: `/Users/nicklaseskou/Documents/GitHub/huddle-design-guide`
Migrations: `/Users/nicklaseskou/Documents/GitHub/huddle-design-guide/supabase/migrations/`
Types output: `/Users/nicklaseskou/Documents/GitHub/huddle-design-guide/apps/web/lib/supabase/types.ts`

---

## GO!
Execute all tasks in order. Document everything. Pause for human approval before returning control to orchestrator.
