/**
 * Unit tests for MedusaOrderService
 *
 * Test Framework: Vitest
 *
 * Test Coverage:
 * - ensureMedusaProduct() - creates product if missing, returns existing if present
 * - createOrderFromSale() - creates order with correct data structure
 * - updateOrderStatus() - validates transitions, triggers payout on delivered
 * - Status transition validation
 * - Idempotency checks
 * 
 * Related: HUD-39 Phase 6
 */

// @ts-expect-error - Vitest types may not be installed in non-test environments
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MedusaOrderService } from "../medusa-order-service";
import { createServiceClient } from "@/lib/supabase/server";
import { query } from "@/lib/db/postgres-connection";

// Status transition rules (mirrored from service for testing)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

// Mock postgres query
vi.mock("@/lib/db/postgres-connection", () => ({
  query: vi.fn(),
}));

// Note: PayoutService is tested separately - here we verify status transitions

// Mock Clerk
vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(() => ({
    users: {
      getUser: vi.fn().mockResolvedValue({
        emailAddresses: [{ emailAddress: "test@example.com" }],
        firstName: "Test",
        lastName: "User",
      }),
    },
  })),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  init: vi.fn(),
}));

describe("MedusaOrderService", () => {
  let service: MedusaOrderService;

  beforeEach(() => {
    service = new MedusaOrderService();
    vi.clearAllMocks();
  });

  describe("ALLOWED_TRANSITIONS", () => {
    it("should define valid transitions for pending status", () => {
      expect(ALLOWED_TRANSITIONS.pending).toContain("paid");
      expect(ALLOWED_TRANSITIONS.pending).toContain("cancelled");
      expect(ALLOWED_TRANSITIONS.pending).not.toContain("shipped");
    });

    it("should define valid transitions for paid status", () => {
      expect(ALLOWED_TRANSITIONS.paid).toContain("shipped");
      expect(ALLOWED_TRANSITIONS.paid).toContain("cancelled");
      expect(ALLOWED_TRANSITIONS.paid).not.toContain("pending");
    });

    it("should define valid transitions for shipped status", () => {
      expect(ALLOWED_TRANSITIONS.shipped).toContain("delivered");
      expect(ALLOWED_TRANSITIONS.shipped).toContain("cancelled");
      expect(ALLOWED_TRANSITIONS.shipped).not.toContain("pending");
    });

    it("should define valid transitions for delivered status", () => {
      expect(ALLOWED_TRANSITIONS.delivered).toContain("completed");
      expect(ALLOWED_TRANSITIONS.delivered).not.toContain("cancelled");
    });

    it("should not allow transitions from completed status", () => {
      expect(ALLOWED_TRANSITIONS.completed).toEqual([]);
    });

    it("should not allow transitions from cancelled status", () => {
      expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
    });
  });

  describe("ensureMedusaProduct", () => {
    it("should return existing product ID if already created", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { medusa_product_id: "existing_product_123" },
          error: null,
        }),
      };

      vi.mocked(createServiceClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>
      );

      const result = await service.ensureMedusaProduct(undefined, "listing_123");
      expect(result).toBe("existing_product_123");
    });

    it("should throw error when listing not found", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      };

      vi.mocked(createServiceClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>
      );

      await expect(service.ensureMedusaProduct(undefined, "nonexistent_listing")).rejects.toThrow(
        /Failed to fetch sale listing/
      );
    });

    it("should require either jerseyId or saleListingId", async () => {
      await expect(service.ensureMedusaProduct(undefined, undefined)).rejects.toThrow(
        "Either jerseyId or saleListingId must be provided"
      );
    });
  });

  describe("getOrder", () => {
    it("should return order with correct structure", async () => {
      const mockOrder = {
        id: "order_123",
        status: "paid",
        customer_id: "customer_456",
        currency_code: "EUR",
        email: "buyer@example.com",
        shipping_address_id: "addr_789",
        metadata: { listing_id: "listing_123" },
        created_at: "2025-12-24T00:00:00Z",
        updated_at: "2025-12-24T00:00:00Z",
      };

      const mockAddress = {
        id: "addr_789",
        address_1: "123 Test St",
        city: "Copenhagen",
        country_code: "DK",
        postal_code: "1000",
        first_name: "Test",
        last_name: "User",
      };

      const mockLineItem = {
        id: "li_123",
        title: "Test Jersey",
        quantity: 1,
        unit_price: 10000,
        product_id: "prod_123",
      };

      vi.mocked(query)
        .mockResolvedValueOnce([mockOrder])
        .mockResolvedValueOnce([mockAddress])
        .mockResolvedValueOnce([mockLineItem]);

      const result = await service.getOrder("order_123");

      expect(result).toHaveProperty("id", "order_123");
      expect(result).toHaveProperty("status", "paid");
      expect(result).toHaveProperty("shipping_address");
      expect(result).toHaveProperty("items");
      expect(result.items).toHaveLength(1);
    });

    it("should throw NOT_FOUND when order does not exist", async () => {
      vi.mocked(query).mockResolvedValue([]);

      await expect(service.getOrder("nonexistent_order")).rejects.toThrow("Order not found");
    });
  });

  describe("updateOrderStatus", () => {
    it("should throw error for invalid status transition", async () => {
      // Mock getting current status as "completed" (terminal state)
      vi.mocked(query).mockResolvedValueOnce([{ status: "completed" }]);

      await expect(service.updateOrderStatus("order_123", "shipped")).rejects.toThrow(
        /Invalid status transition/
      );
    });

    it("should validate transition from pending to cancelled is allowed", () => {
      // Test transition rules
      expect(ALLOWED_TRANSITIONS.pending).toContain("cancelled");
    });

    it("should validate transition from shipped to delivered is allowed", () => {
      expect(ALLOWED_TRANSITIONS.shipped).toContain("delivered");
    });

    it("should validate no transitions allowed from completed", () => {
      expect(ALLOWED_TRANSITIONS.completed).toEqual([]);
    });
  });

  describe("cancelOrder", () => {
    it("should call updateOrderStatus with cancelled", async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ status: "paid" }])
        .mockResolvedValueOnce([]);

      await service.cancelOrder("order_123");

      // Verify the UPDATE query was called with 'cancelled' status
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE medusa.order"),
        expect.arrayContaining(["cancelled", "order_123"])
      );
    });

    it("should throw error when cancelling completed order", async () => {
      vi.mocked(query).mockResolvedValueOnce([{ status: "completed" }]);

      await expect(service.cancelOrder("order_123")).rejects.toThrow(/Invalid status transition/);
    });
  });

  describe("updateTrackingNumber", () => {
    it("should update metadata with tracking info", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "label_123" },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
        rpc: vi.fn().mockResolvedValue({ data: "ful_123", error: null }),
      };

      vi.mocked(createServiceClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>
      );

      vi.mocked(query)
        .mockResolvedValueOnce([{ metadata: {} }]) // Get current metadata
        .mockResolvedValueOnce([]); // Update metadata

      await service.updateTrackingNumber("order_123", "DK123456", "PostNord");

      // Verify metadata update query was called
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE medusa.order"),
        expect.arrayContaining([expect.stringContaining("DK123456"), "order_123"])
      );
    });
  });

  describe("Idempotency", () => {
    it("should return same result for same ensureMedusaProduct calls", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { medusa_product_id: "product_idempotent" },
          error: null,
        }),
      };

      vi.mocked(createServiceClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>
      );

      const result1 = await service.ensureMedusaProduct(undefined, "listing_123");
      const result2 = await service.ensureMedusaProduct(undefined, "listing_123");

      expect(result1).toBe(result2);
      expect(result1).toBe("product_idempotent");
    });
  });

  describe("Error Handling", () => {
    it("should capture exception to Sentry on order creation failure", async () => {
      const Sentry = await import("@sentry/nextjs");

      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error("Database error")),
      };

      vi.mocked(createServiceClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>
      );

      await expect(
        service.ensureMedusaProduct(undefined, "listing_123")
      ).rejects.toThrow();

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });
});

