# HUD-37 Implementation Summary

**Issue:** HUD-37 - Transaction Fees Calculation & Platform Fee System  
**Status:** ✅ Complete  
**Completion Date:** 2025-12-17  
**Branch:** `feature/huddle-37-transaction-fees`

---

## Quick Reference

### Fee Structure
- **Platform Fee:** 5% (all-in, includes Stripe processing fee)
- **Seller Fee:** 1%
- **Refund Policy:** Only seller fee refundable; platform fee retained

### Money Units Contract
- **Listings/Auctions:** Major units (EUR with 2 decimals)
- **Transactions/Stripe:** Minor units (cents)
- **All `*_amount` fields in `transactions` table:** Cents

---

## Key Components

### 1. Database Schema
- `platform_fees` table with default fees (5% platform, 1% seller)
- Fee fields added to `transactions` table:
  - `item_amount`, `shipping_amount`, `platform_fee_amount`, `seller_fee_amount`, `total_amount`, `seller_payout_amount`

### 2. FeeService
**Location:** `apps/web/lib/services/fee-service.ts`

**Key Methods:**
- `calculatePlatformFeeCents(itemCents, platformPct)` → platform fee in cents
- `calculateSellerFeeCents(itemCents, sellerPct)` → seller fee in cents
- `calculateBuyerTotalCents({ itemCents, shippingCents, platformFeeCents })` → total buyer pays
- `calculateSellerPayoutCents({ itemCents, sellerFeeCents })` → seller receives

**Features:**
- Deterministic rounding (Math.round to nearest cent)
- DB fallback to defaults (5% / 1%) if table empty
- Input validation (rejects negative amounts, invalid percentages)

### 3. UI Components
- **PriceBreakdown** (`apps/web/components/checkout/PriceBreakdown.tsx`): Buyer fee display
- **PayoutBreakdown** (`apps/web/components/seller/PayoutBreakdown.tsx`): Seller fee preview

### 4. Integration Points
- **StripeService:** Uses FeeService for `application_fee_amount`
- **Auction Close:** Creates transactions with fee breakdown
- **PayoutService:** Uses `seller_payout_amount` for transfers
- **Refund Route:** Only refunds `seller_fee_amount`

---

## Key Decisions

### 1. Platform Fee Includes Stripe Processing Fee
- Buyer sees only "Service fee (5%)" - no separate "card fee" line item
- Platform absorbs Stripe processing cost within the 5% fee

### 2. Money Units Consistency
- All `transactions.*_amount` fields stored in cents (minor units)
- Legacy `amount` field = `total_amount` when known, else `item_amount`
- Conversions handled by FeeService

### 3. Refund Policy
- Only `seller_fee_amount` can be refunded
- `platform_fee_amount` is always retained
- Partial refunds clamped to max seller fee

### 4. Auction Transactions
- Initial transaction created at auction close with `item_amount` and fees
- `shipping_amount` and `total_amount` set to NULL until checkout
- Updated when winner completes checkout (HUD-35)

---

## Integration Requirements for HUD-34/HUD-35

### HUD-34: Sale Checkout
**Must:**
1. Use `FeeService` to calculate fees
2. Create transaction with fee breakdown (all in cents)
3. Create Stripe PaymentIntent with:
   - `amount` = total buyer pays (item + shipping + platform fee)
   - `application_fee_amount` = platform fee (5%)
   - `metadata.transaction_id` = transaction ID
4. Store fee breakdown in transaction record

### HUD-35: Auction Winner Checkout
**Must:**
1. Use `FeeService` to calculate fees
2. Update existing transaction (created at auction close):
   - Set `shipping_amount` (cents)
   - Set `total_amount` (cents)
   - Update `amount` (legacy) = `total_amount`
3. Create Stripe PaymentIntent with:
   - `amount` = total buyer pays (item + shipping + platform fee)
   - `application_fee_amount` = platform fee (5%)
   - `metadata.transaction_id` = transaction ID

---

## Testing

### Automated Tests
- ✅ FeeService unit tests (`fee-service.test.ts`)
- ✅ Integration tests (`test-phase3-integration.ts`)
- ✅ Refund edge cases (`test-refund-edge-cases.ts`)

### Manual Test Checklist
See `.project/plans/HUD-37/TEST-VERIFICATION.md` for comprehensive checklist.

**Key Scenarios:**
- ✅ Seller fee preview in listing creation
- ✅ Buyer platform fee display on jersey detail page
- ✅ Auction close transaction creation
- ✅ Refund only seller fee
- ✅ Payout uses seller_payout_amount

---

## Files Changed

### Created
- `apps/web/lib/services/fee-service.ts`
- `apps/web/lib/services/__tests__/fee-service.test.ts`
- `apps/web/components/checkout/PriceBreakdown.tsx`
- `apps/web/components/seller/PayoutBreakdown.tsx`
- `supabase/migrations/20251217161000_create_platform_fees_table.sql`
- `supabase/migrations/20251217161001_seed_platform_fees_defaults.sql`
- `supabase/migrations/20251217161002_add_fee_fields_to_transactions.sql`

### Modified
- `apps/web/lib/services/stripe-service.ts`
- `apps/web/lib/services/payout-service.ts`
- `apps/web/app/api/v1/transactions/[id]/refund/route.ts`
- `supabase/functions/close-auctions/index.ts`
- `apps/web/components/marketplace/CreateSaleListing.tsx`
- `apps/web/components/marketplace/CreateAuction.tsx`
- `apps/web/components/jersey/JerseyMarketplaceInfo.tsx`
- `apps/web/app/api/v1/listings/route.ts` (added jerseyId parameter)
- `apps/web/lib/validation/query-schemas.ts`
- `apps/web/lib/services/listing-service.ts`
- `apps/web/lib/repositories/listing-repository.ts`
- `apps/web/lib/hooks/use-listings.ts`

---

## Known Limitations

1. **Admin Interface:** Fee configuration requires direct DB access (future issue)
2. **Min/Max Caps:** Not implemented (as per requirements)
3. **Auction Bid Fees:** Fees only calculated at settlement, not per bid
4. **Shipping Preview:** Shipping cost not included in initial fee preview (added at checkout)

---

## Next Steps

1. **HUD-34:** Implement sale checkout with fee integration
2. **HUD-35:** Implement auction winner checkout with fee integration
3. **Future:** Admin interface for fee configuration

---

## References

- **Linear:** [HUD-37](https://linear.app/huddle-world/issue/HUD-37)
- **Implementation Plan:** `.project/plans/HUD-37/implementation-plan-2025-12-17-HUD-37.md`
- **Test Verification:** `.project/plans/HUD-37/TEST-VERIFICATION.md`
- **Context:** `.project/plans/HUD-37/CONTEXT.md`

