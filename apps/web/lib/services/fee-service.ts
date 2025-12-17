import { createServiceClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

/**
 * FeeService - Single source of truth for fee calculations
 *
 * Responsibilities:
 * - Read active fees from platform_fees table
 * - Calculate platform fee, seller fee, buyer total, seller payout
 * - All amounts in cents (minor units)
 * - Fallback to defaults (5% platform, 1% seller) if DB not seeded
 */
export class FeeService {
  // Default fees (fallback if DB not seeded)
  private static readonly DEFAULT_PLATFORM_FEE_PCT = 5.0; // 5%
  private static readonly DEFAULT_SELLER_FEE_PCT = 1.0; // 1%

  /**
   * Get active fee percentages from database
   * Falls back to defaults if DB query fails or no active fees found
   *
   * @returns Promise with platform and seller fee percentages
   */
  async getActiveFeePercentages(): Promise<{
    platformPct: number;
    sellerPct: number;
  }> {
    try {
      const supabase = await createServiceClient();

      const { data: fees, error } = await supabase
        .from("platform_fees")
        .select("fee_type, fee_percentage")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        Sentry.captureException(error, {
          tags: { component: "fee_service", operation: "get_active_fees" },
        });
        // Fallback to defaults
        return {
          platformPct: FeeService.DEFAULT_PLATFORM_FEE_PCT,
          sellerPct: FeeService.DEFAULT_SELLER_FEE_PCT,
        };
      }

      if (!fees || fees.length === 0) {
        // No active fees in DB, use defaults
        return {
          platformPct: FeeService.DEFAULT_PLATFORM_FEE_PCT,
          sellerPct: FeeService.DEFAULT_SELLER_FEE_PCT,
        };
      }

      // Extract platform and seller fees
      const platformFee = fees.find((f) => f.fee_type === "platform");
      const sellerFee = fees.find((f) => f.fee_type === "seller");

      return {
        platformPct: platformFee?.fee_percentage ?? FeeService.DEFAULT_PLATFORM_FEE_PCT,
        sellerPct: sellerFee?.fee_percentage ?? FeeService.DEFAULT_SELLER_FEE_PCT,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "fee_service", operation: "get_active_fees" },
      });
      // Fallback to defaults on any error
      return {
        platformPct: FeeService.DEFAULT_PLATFORM_FEE_PCT,
        sellerPct: FeeService.DEFAULT_SELLER_FEE_PCT,
      };
    }
  }

  /**
   * Calculate platform fee in cents
   *
   * @param itemCents Item price in cents
   * @param platformPct Platform fee percentage (e.g., 5.0 for 5%)
   * @returns Platform fee in cents (rounded)
   */
  calculatePlatformFeeCents(itemCents: number, platformPct: number): number {
    if (itemCents < 0) {
      throw new Error("Item amount cannot be negative");
    }
    if (platformPct < 0 || platformPct > 100) {
      throw new Error("Platform fee percentage must be between 0 and 100");
    }

    // Calculate fee: itemCents * (platformPct / 100)
    // Round to nearest cent
    return Math.round((itemCents * platformPct) / 100);
  }

  /**
   * Calculate seller fee in cents
   *
   * @param itemCents Item price in cents
   * @param sellerPct Seller fee percentage (e.g., 1.0 for 1%)
   * @returns Seller fee in cents (rounded)
   */
  calculateSellerFeeCents(itemCents: number, sellerPct: number): number {
    if (itemCents < 0) {
      throw new Error("Item amount cannot be negative");
    }
    if (sellerPct < 0 || sellerPct > 100) {
      throw new Error("Seller fee percentage must be between 0 and 100");
    }

    // Calculate fee: itemCents * (sellerPct / 100)
    // Round to nearest cent
    return Math.round((itemCents * sellerPct) / 100);
  }

  /**
   * Calculate total amount buyer pays (in cents)
   *
   * @param params Breakdown components
   * @returns Total amount in cents
   */
  calculateBuyerTotalCents(params: {
    itemCents: number;
    shippingCents: number;
    platformFeeCents: number;
  }): number {
    const { itemCents, shippingCents, platformFeeCents } = params;

    if (itemCents < 0 || shippingCents < 0 || platformFeeCents < 0) {
      throw new Error("All amounts must be non-negative");
    }

    return itemCents + shippingCents + platformFeeCents;
  }

  /**
   * Calculate seller payout amount (in cents)
   * Payout = item price - seller fee
   *
   * @param params Item price and seller fee
   * @returns Seller payout amount in cents
   */
  calculateSellerPayoutCents(params: {
    itemCents: number;
    sellerFeeCents: number;
  }): number {
    const { itemCents, sellerFeeCents } = params;

    if (itemCents < 0 || sellerFeeCents < 0) {
      throw new Error("All amounts must be non-negative");
    }

    if (sellerFeeCents > itemCents) {
      throw new Error("Seller fee cannot exceed item price");
    }

    return itemCents - sellerFeeCents;
  }

  /**
   * Build complete fee breakdown from major units (EUR)
   * Helper method for converting from major to minor units
   *
   * @param params Item and shipping in major units (EUR)
   * @returns Complete breakdown in cents + display values in major units
   */
  async buildBreakdownFromMajorUnits(params: {
    itemMajor: number;
    shippingMajor: number;
  }): Promise<{
    itemCents: number;
    shippingCents: number;
    platformFeeCents: number;
    sellerFeeCents: number;
    buyerTotalCents: number;
    sellerPayoutCents: number;
    // Display values in major units (for UI)
    display: {
      itemMajor: number;
      shippingMajor: number;
      platformFeeMajor: number;
      sellerFeeMajor: number;
      buyerTotalMajor: number;
      sellerPayoutMajor: number;
    };
  }> {
    const { itemMajor, shippingMajor } = params;

    // Convert major units to cents (multiply by 100)
    const itemCents = Math.round(itemMajor * 100);
    const shippingCents = Math.round(shippingMajor * 100);

    // Get active fee percentages
    const { platformPct, sellerPct } = await this.getActiveFeePercentages();

    // Calculate fees in cents
    const platformFeeCents = this.calculatePlatformFeeCents(itemCents, platformPct);
    const sellerFeeCents = this.calculateSellerFeeCents(itemCents, sellerPct);

    // Calculate totals
    const buyerTotalCents = this.calculateBuyerTotalCents({
      itemCents,
      shippingCents,
      platformFeeCents,
    });

    const sellerPayoutCents = this.calculateSellerPayoutCents({
      itemCents,
      sellerFeeCents,
    });

    // Convert back to major units for display (divide by 100)
    return {
      itemCents,
      shippingCents,
      platformFeeCents,
      sellerFeeCents,
      buyerTotalCents,
      sellerPayoutCents,
      display: {
        itemMajor,
        shippingMajor,
        platformFeeMajor: platformFeeCents / 100,
        sellerFeeMajor: sellerFeeCents / 100,
        buyerTotalMajor: buyerTotalCents / 100,
        sellerPayoutMajor: sellerPayoutCents / 100,
      },
    };
  }
}

