/**
 * Unit tests for FeeService
 *
 * Test Framework: Vitest (when configured)
 * Can also be run manually for verification
 *
 * Test Coverage:
 * - Fee calculation accuracy (5% / 1%)
 * - Rounding behavior
 * - Edge cases (0, negative, boundary values)
 * - Determinism (same input → same output)
 * - Error handling
 */

// Vitest imports (required for test environment)
// @ts-expect-error - Vitest types may not be installed in non-test environments
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeeService } from "../fee-service";
import { createServiceClient } from "@/lib/supabase/server";

// Mock Supabase client
if (typeof vi !== "undefined") {
  vi.mock("@/lib/supabase/server", () => ({
    createServiceClient: vi.fn(),
  }));
}

describe("FeeService", () => {
  let feeService: FeeService;

  beforeEach(() => {
    feeService = new FeeService();
    vi.clearAllMocks();
  });

  describe("calculatePlatformFeeCents", () => {
    it("should calculate 5% platform fee correctly", () => {
      // 100 EUR = 10000 cents, 5% = 500 cents
      const result = feeService.calculatePlatformFeeCents(10000, 5.0);
      expect(result).toBe(500);
    });

    it("should round platform fee to nearest cent", () => {
      // 333 EUR = 33300 cents, 5% = 1665 cents (exact)
      const result = feeService.calculatePlatformFeeCents(33300, 5.0);
      expect(result).toBe(1665);

      // 333.33 EUR = 33333 cents, 5% = 1666.65 cents → rounds to 1667
      const result2 = feeService.calculatePlatformFeeCents(33333, 5.0);
      expect(result2).toBe(1667);
    });

    it("should handle zero item amount", () => {
      const result = feeService.calculatePlatformFeeCents(0, 5.0);
      expect(result).toBe(0);
    });

    it("should throw error for negative item amount", () => {
      expect(() => {
        feeService.calculatePlatformFeeCents(-1000, 5.0);
      }).toThrow("Item amount cannot be negative");
    });

    it("should throw error for negative percentage", () => {
      expect(() => {
        feeService.calculatePlatformFeeCents(10000, -1.0);
      }).toThrow("Platform fee percentage must be between 0 and 100");
    });

    it("should throw error for percentage > 100", () => {
      expect(() => {
        feeService.calculatePlatformFeeCents(10000, 101.0);
      }).toThrow("Platform fee percentage must be between 0 and 100");
    });

    it("should handle 0% fee", () => {
      const result = feeService.calculatePlatformFeeCents(10000, 0.0);
      expect(result).toBe(0);
    });
  });

  describe("calculateSellerFeeCents", () => {
    it("should calculate 1% seller fee correctly", () => {
      // 100 EUR = 10000 cents, 1% = 100 cents
      const result = feeService.calculateSellerFeeCents(10000, 1.0);
      expect(result).toBe(100);
    });

    it("should round seller fee to nearest cent", () => {
      // 333 EUR = 33300 cents, 1% = 333 cents (exact)
      const result = feeService.calculateSellerFeeCents(33300, 1.0);
      expect(result).toBe(333);

      // 333.33 EUR = 33333 cents, 1% = 333.33 cents → rounds to 333
      const result2 = feeService.calculateSellerFeeCents(33333, 1.0);
      expect(result2).toBe(333);
    });

    it("should handle zero item amount", () => {
      const result = feeService.calculateSellerFeeCents(0, 1.0);
      expect(result).toBe(0);
    });

    it("should throw error for negative item amount", () => {
      expect(() => {
        feeService.calculateSellerFeeCents(-1000, 1.0);
      }).toThrow("Item amount cannot be negative");
    });

    it("should throw error for invalid percentage", () => {
      expect(() => {
        feeService.calculateSellerFeeCents(10000, -1.0);
      }).toThrow("Seller fee percentage must be between 0 and 100");
    });
  });

  describe("calculateBuyerTotalCents", () => {
    it("should calculate total correctly", () => {
      // Item: 100 EUR (10000 cents)
      // Shipping: 10 EUR (1000 cents)
      // Platform fee: 5 EUR (500 cents)
      // Total: 115 EUR (11500 cents)
      const result = feeService.calculateBuyerTotalCents({
        itemCents: 10000,
        shippingCents: 1000,
        platformFeeCents: 500,
      });
      expect(result).toBe(11500);
    });

    it("should handle zero shipping", () => {
      const result = feeService.calculateBuyerTotalCents({
        itemCents: 10000,
        shippingCents: 0,
        platformFeeCents: 500,
      });
      expect(result).toBe(10500);
    });

    it("should throw error for negative amounts", () => {
      expect(() => {
        feeService.calculateBuyerTotalCents({
          itemCents: -1000,
          shippingCents: 1000,
          platformFeeCents: 500,
        });
      }).toThrow("All amounts must be non-negative");
    });
  });

  describe("calculateSellerPayoutCents", () => {
    it("should calculate payout correctly", () => {
      // Item: 100 EUR (10000 cents)
      // Seller fee: 1 EUR (100 cents)
      // Payout: 99 EUR (9900 cents)
      const result = feeService.calculateSellerPayoutCents({
        itemCents: 10000,
        sellerFeeCents: 100,
      });
      expect(result).toBe(9900);
    });

    it("should handle zero seller fee", () => {
      const result = feeService.calculateSellerPayoutCents({
        itemCents: 10000,
        sellerFeeCents: 0,
      });
      expect(result).toBe(10000);
    });

    it("should throw error if seller fee exceeds item price", () => {
      expect(() => {
        feeService.calculateSellerPayoutCents({
          itemCents: 10000,
          sellerFeeCents: 15000,
        });
      }).toThrow("Seller fee cannot exceed item price");
    });

    it("should throw error for negative amounts", () => {
      expect(() => {
        feeService.calculateSellerPayoutCents({
          itemCents: -1000,
          sellerFeeCents: 100,
        });
      }).toThrow("All amounts must be non-negative");
    });
  });

  describe("getActiveFeePercentages", () => {
    it("should return defaults when DB query fails", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValue(new Error("DB error")),
      };

      vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>);

      const result = await feeService.getActiveFeePercentages();

      expect(result).toEqual({
        platformPct: 5.0,
        sellerPct: 1.0,
      });
    });

    it("should return defaults when no active fees found", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>);

      const result = await feeService.getActiveFeePercentages();

      expect(result).toEqual({
        platformPct: 5.0,
        sellerPct: 1.0,
      });
    });

    it("should return fees from database when available", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { fee_type: "platform", fee_percentage: 5.5 },
            { fee_type: "seller", fee_percentage: 1.5 },
          ],
          error: null,
        }),
      };

      vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>);

      const result = await feeService.getActiveFeePercentages();

      expect(result).toEqual({
        platformPct: 5.5,
        sellerPct: 1.5,
      });
    });

    it("should fallback to defaults when platform fee missing", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ fee_type: "seller", fee_percentage: 1.5 }],
          error: null,
        }),
      };

      vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>);

      const result = await feeService.getActiveFeePercentages();

      expect(result).toEqual({
        platformPct: 5.0, // Default
        sellerPct: 1.5, // From DB
      });
    });
  });

  describe("buildBreakdownFromMajorUnits", () => {
    it("should build complete breakdown correctly", async () => {
      // Mock getActiveFeePercentages to return defaults
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { fee_type: "platform", fee_percentage: 5.0 },
            { fee_type: "seller", fee_percentage: 1.0 },
          ],
          error: null,
        }),
      };

      vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>);

      const result = await feeService.buildBreakdownFromMajorUnits({
        itemMajor: 100.0,
        shippingMajor: 10.0,
      });

      // Item: 100 EUR = 10000 cents
      expect(result.itemCents).toBe(10000);
      // Shipping: 10 EUR = 1000 cents
      expect(result.shippingCents).toBe(1000);
      // Platform fee: 5% of 10000 = 500 cents
      expect(result.platformFeeCents).toBe(500);
      // Seller fee: 1% of 10000 = 100 cents
      expect(result.sellerFeeCents).toBe(100);
      // Buyer total: 10000 + 1000 + 500 = 11500 cents
      expect(result.buyerTotalCents).toBe(11500);
      // Seller payout: 10000 - 100 = 9900 cents
      expect(result.sellerPayoutCents).toBe(9900);

      // Display values
      expect(result.display.itemMajor).toBe(100.0);
      expect(result.display.shippingMajor).toBe(10.0);
      expect(result.display.platformFeeMajor).toBe(5.0);
      expect(result.display.sellerFeeMajor).toBe(1.0);
      expect(result.display.buyerTotalMajor).toBe(115.0);
      expect(result.display.sellerPayoutMajor).toBe(99.0);
    });

    it("should handle decimal major units correctly", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { fee_type: "platform", fee_percentage: 5.0 },
            { fee_type: "seller", fee_percentage: 1.0 },
          ],
          error: null,
        }),
      };

      vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>);

      const result = await feeService.buildBreakdownFromMajorUnits({
        itemMajor: 99.99,
        shippingMajor: 5.50,
      });

      // 99.99 EUR = 9999 cents (rounded)
      expect(result.itemCents).toBe(9999);
      // 5.50 EUR = 550 cents
      expect(result.shippingCents).toBe(550);
    });
  });

  describe("Determinism", () => {
    it("should return same result for same input", () => {
      const input1 = 10000;
      const input2 = 10000;

      const result1 = feeService.calculatePlatformFeeCents(input1, 5.0);
      const result2 = feeService.calculatePlatformFeeCents(input2, 5.0);

      expect(result1).toBe(result2);
    });

    it("should handle edge case: very small amounts", () => {
      // 1 cent item, 5% fee = 0.05 cents → rounds to 0
      const result = feeService.calculatePlatformFeeCents(1, 5.0);
      expect(result).toBe(0);

      // 2 cents item, 5% fee = 0.1 cents → rounds to 0
      const result2 = feeService.calculatePlatformFeeCents(2, 5.0);
      expect(result2).toBe(0);

      // 3 cents item, 5% fee = 0.15 cents → rounds to 0
      const result3 = feeService.calculatePlatformFeeCents(3, 5.0);
      expect(result3).toBe(0);

      // 4 cents item, 5% fee = 0.2 cents → rounds to 0
      const result4 = feeService.calculatePlatformFeeCents(4, 5.0);
      expect(result4).toBe(0);

      // 5 cents item, 5% fee = 0.25 cents → rounds to 0
      const result5 = feeService.calculatePlatformFeeCents(5, 5.0);
      expect(result5).toBe(0);

      // 20 cents item, 5% fee = 1 cent (exact)
      const result6 = feeService.calculatePlatformFeeCents(20, 5.0);
      expect(result6).toBe(1);
    });
  });
});

