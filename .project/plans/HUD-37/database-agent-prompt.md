# Database Agent - Phase 1: Database Schema & Seeding

## Your Role
You are the database specialist agent responsible for implementing the database schema changes for HUD-37 (Transaction Fees Calculation & Platform Fee System).

## Context
This is a marketplace feature that requires transparent fee calculation. You need to:
1. Create a configuration table for platform fees
2. Add fee breakdown fields to the transactions table
3. Set up proper RLS policies

## Your Tasks

### Task 1.1: Create platform_fees table migration
**File:** Create a new file with timestamp: `supabase/migrations/YYYYMMDDHHMMSS_create_platform_fees_table.sql`

**Requirements:**
- Table: `platform_fees`
- Columns:
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `fee_type` TEXT NOT NULL (CHECK: must be 'platform' or 'seller')
  - `fee_percentage` NUMERIC(5,2) NOT NULL (e.g., 5.00 for 5%)
  - `min_fee` NUMERIC(10,2) NULL (no caps, keep NULL)
  - `max_fee` NUMERIC(10,2) NULL (no caps, keep NULL)
  - `is_active` BOOLEAN NOT NULL DEFAULT true
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- Add unique constraint on `fee_type` WHERE `is_active = true` (only one active fee per type)
- Add trigger for `updated_at` auto-update

### Task 1.2: Seed default fees migration
**File:** Create a new file with timestamp: `supabase/migrations/YYYYMMDDHHMMSS_seed_platform_fees_defaults.sql`

**Requirements:**
- Insert two rows:
  1. Platform fee: `fee_type='platform'`, `fee_percentage=5.00`, `is_active=true`
  2. Seller fee: `fee_type='seller'`, `fee_percentage=1.00`, `is_active=true`
- Leave `min_fee` and `max_fee` as NULL (no caps)

### Task 1.3: Add fee fields to transactions table migration
**File:** Create a new file with timestamp: `supabase/migrations/YYYYMMDDHHMMSS_add_fee_fields_to_transactions.sql`

**Requirements:**
- Add columns to `transactions` table:
  - `item_amount` NUMERIC(10,2) NULL - item price in cents (yes, NUMERIC stores cents as decimal)
  - `shipping_amount` NUMERIC(10,2) NULL - shipping cost in cents
  - `platform_fee_amount` NUMERIC(10,2) NULL - platform fee in cents
  - `seller_fee_amount` NUMERIC(10,2) NULL - seller fee in cents
  - `total_amount` NUMERIC(10,2) NULL - total buyer pays in cents
  - `seller_payout_amount` NUMERIC(10,2) NULL - seller receives in cents
- All fields nullable (auctions may not have shipping/total until checkout)
- Add comments documenting that these are in cents (minor units)

### Task 1.4: RLS policies for platform_fees
**File:** Include in the `create_platform_fees_table.sql` migration

**Requirements:**
- Enable RLS on `platform_fees`
- Policy: Allow SELECT for authenticated users
- Policy: Allow SELECT for anon users (fees should be public)
- NO insert/update/delete policies (only service role via migrations)

## Critical Constraints

1. **Money Units:** All `*_amount` fields in transactions store cents as NUMERIC (e.g., 1050 means €10.50)
2. **Migration Naming:** Use format `YYYYMMDDHHMMSS_description.sql` where timestamp is current UTC time
3. **Idempotency:** Migrations should be idempotent where possible (use IF NOT EXISTS, etc.)
4. **Rollback:** Consider what would be needed to rollback each migration

## Success Criteria

After you complete your tasks:
- [ ] Three migration files created in `supabase/migrations/` directory
- [ ] Migrations use proper timestamps and naming
- [ ] SQL syntax is valid PostgreSQL
- [ ] RLS policies are configured correctly
- [ ] Comments document the money units contract (cents)

## Output Format

1. Create all three migration files
2. Log your actions to: `/Users/nicklaseskou/Documents/GitHub/huddle-design-guide/.project/plans/HUD-37/agent-logs/database.log`
3. Report completion with:
   - List of files created
   - Any issues or warnings
   - Recommendations for manual verification

## Important Notes

- DO NOT apply the migrations yourself (human will verify first)
- DO NOT modify any other database tables
- DO NOT create seed data beyond the two default fee rows
- FOLLOW the existing migration patterns in `supabase/migrations/` directory

## Reference Files

Check these files to understand existing patterns:
- `supabase/migrations/` - existing migration patterns
- `.project/plans/HUD-37/implementation-plan-2025-12-17-HUD-37.md` - full context

## Start Now

Create the three migration files following the requirements above. Log all your actions and report completion.
