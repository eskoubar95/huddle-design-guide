# Database Agent Task Specification - HUD-41 Phase 1

## Context
You are the database agent for HUD-41. Your task is to implement all database schema changes required for user profile validation and verification features.

## Supabase Project
**Project ID:** trbyclravrmmhxplocsr

## Current Database State (verified)
- `profiles` table exists with: id (TEXT), username, avatar_url, bio, country, medusa_customer_id
- Missing columns: first_name, last_name, phone, stripe_identity_verification_status, stripe_identity_verification_id, is_profile_complete
- Marketplace tables (sale_listings, auctions, bids, transactions, notifications) have UUID user_id columns - need TEXT conversion
- `shipping_addresses` table does NOT exist
- `identity_verification_review_requests` table does NOT exist

## Your Tasks (Execute in Order)

### Task 1.0: Align marketplace user_id columns (UUID → TEXT for Clerk)
**Migration file:** `supabase/migrations/20251213165000_align_marketplace_user_ids_for_clerk.sql`

**Scope:**
Convert these columns from UUID to TEXT for Clerk compatibility:
- `public.notifications.user_id`
- `public.sale_listings.seller_id`
- `public.sale_listings.sold_to`
- `public.auctions.seller_id`
- `public.auctions.winner_id`
- `public.bids.bidder_id`
- `public.transactions.seller_id`
- `public.transactions.buyer_id`

**DDL Pattern:**
1. Drop FK constraints to auth.users
2. Drop indexes/policies referencing the columns
3. `ALTER TABLE ... ALTER COLUMN ... TYPE TEXT USING ...::text`
4. Recreate indexes
5. (Optional) Recreate policies for documentation

**Success criteria:**
- All columns show TEXT type in information_schema.columns
- No FK constraints to auth.users remain
- Zero errors during migration

### Task 1.1: Add profile fields + Stripe Identity fields + computed column
**Migration file:** `supabase/migrations/20251213170000_add_profile_completion_and_identity_fields.sql`

**Add to profiles table:**
- `first_name TEXT NULL`
- `last_name TEXT NULL`
- `phone TEXT NULL`
- `stripe_identity_verification_status TEXT NULL CHECK (stripe_identity_verification_status IN ('pending', 'verified', 'rejected'))`
- `stripe_identity_verification_id TEXT NULL`
- `is_profile_complete BOOLEAN GENERATED ALWAYS AS (first_name IS NOT NULL AND last_name IS NOT NULL AND phone IS NOT NULL) STORED`

**Add indexes:**
- Index on stripe_identity_verification_status
- Index on is_profile_complete

**Success criteria:**
- All columns exist with correct types
- Computed column correctly reflects profile completeness
- Check constraint works on status field

### Task 1.2: Create shipping_addresses table
**Migration file:** `supabase/migrations/20251213171000_create_shipping_addresses.sql`

**Schema:**
```sql
CREATE TABLE public.shipping_addresses (
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
```

**Constraints:**
- Partial unique index: `CREATE UNIQUE INDEX shipping_addresses_user_default_idx ON public.shipping_addresses(user_id) WHERE is_default = true;`

**RLS:**
- Enable RLS
- NO policies (default-deny, service-role only access)

**Triggers:**
- `updated_at` trigger (reuse existing pattern if available)

**Success criteria:**
- Table exists with correct schema
- Unique default constraint works (only one default per user)
- RLS enabled, no policies

### Task 1.3: Create identity_verification_review_requests table
**Migration file:** `supabase/migrations/20251213172000_create_identity_verification_review_requests.sql`

**Schema:**
```sql
CREATE TABLE public.identity_verification_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  verification_session_id VARCHAR(255) NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- Index on user_id
- Index on status

**RLS:**
- Enable RLS
- NO policies (service-role only)

**Success criteria:**
- Table exists with correct schema
- Check constraint on status works
- RLS enabled

### Task 1.4: Regenerate TypeScript types
**Output file:** `apps/web/lib/supabase/types.ts`

Use Supabase MCP `generate_typescript_types` tool with project_id `trbyclravrmmhxplocsr`.

**Success criteria:**
- types.ts updated with all new columns and tables
- No TypeScript compilation errors in apps/web

## Migration Safety
- Use `IF NOT EXISTS` where appropriate
- Add comments explaining each change
- Test rollback capability
- Use transactions where possible

## Error Handling
- If migration fails, capture full error
- Attempt rollback if safe
- Document in database.log
- Escalate to orchestrator with full context

## Output Requirements
Create detailed log: `.project/plans/HUD-41/agent-logs/database.log`

Log format:
```
[TIMESTAMP ACTION] Description
```

Include:
- Each migration execution attempt
- SQL verification queries and results
- Any errors encountered
- Type generation output
- Success/failure status for each task

## Human Checkpoint
AFTER all migrations complete, PAUSE and request human verification before returning control to orchestrator.

Provide:
- Summary of all changes
- Verification SQL queries human can run
- Any warnings or concerns
- Request explicit "continue" approval
