# HUD-37 Implementation Context

**Branch:** `feature/huddle-37-transaction-fees`  
**Linear:** [HUD-37](https://linear.app/huddle-world/issue/HUD-37)  
**Plan:** `.project/plans/HUD-37/implementation-plan-2025-12-17-HUD-37.md`

## What We're Building

Implementér transparent fee-system:
- **Platform fee: 5%** (all-in, inkluderer Stripe kortgebyr - ingen ekstra line item)
- **Seller fee: 1%**
- **Refund:** Kun seller fee refunderes; platform fee beholdes

## Critical Decisions

1. **Money units:** Alle `*_amount` felter i `transactions` = **cents (minor units)**
2. **Platform fee er all-in:** Inkluderer Stripe processing fee (ikke ekstra "card fee")
3. **Auction fees:** Beregnes ved settlement/payment (ikke pr. bid)
4. **Checkout initiation:** Implementeres i HUD-34/HUD-35 (ikke HUD-37)

## Current Phase

**Phase 1: Database Schema & Seeding** (start her)
- Create `platform_fees` table
- Seed defaults (5% platform, 1% seller)
- Add fee fields to `transactions` table
- RLS policies

## Key Files

- **Plan:** `.project/plans/HUD-37/implementation-plan-2025-12-17-HUD-37.md`
- **Migrations:** `supabase/migrations/`
- **Service:** `apps/web/lib/services/fee-service.ts` (Phase 2)
- **Integration:** `apps/web/lib/services/stripe-service.ts`, `payout-service.ts`, `close-auctions/index.ts`

## Before Starting

1. ✅ Branch created: `feature/huddle-37-transaction-fees`
2. ✅ Plan committed
3. ⏳ Ready for Phase 1 implementation

**Next:** Start Phase 1 (database migrations)

