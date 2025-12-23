import { AuctionRepository } from "@/lib/repositories/auction-repository";
import { auctionCreateSchema } from "@/lib/validation/auction-schemas";
import { ApiError } from "@/lib/api/errors";
import type { AuctionCreateInput } from "@/lib/validation/auction-schemas";
import { MedusaOrderService } from "./medusa-order-service";
import * as Sentry from "@sentry/nextjs";

/**
 * Service for auction business logic
 * Handles validation, authorization checks, and coordinates repository calls
 */
export class AuctionService {
  private repository = new AuctionRepository();

  async getAuction(id: string) {
    const auction = await this.repository.findById(id);

    if (!auction) {
      throw new ApiError("NOT_FOUND", "Auction not found", 404);
    }

    return auction;
  }

  async listAuctions(params: {
    limit: number;
    cursor?: string;
    status?: string;
    sellerId?: string;
  }) {
    return await this.repository.findMany(params);
  }

  async createAuction(input: AuctionCreateInput, sellerId: string) {
    const validated = auctionCreateSchema.parse(input);

    // Calculate ends_at based on durationHours
    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + validated.durationHours);

    // Transform camelCase to snake_case and shipping object to flat fields
    const auction = await this.repository.create({
      jersey_id: validated.jerseyId,
      starting_bid: parseFloat(validated.startingBid),
      buy_now_price: validated.buyNowPrice ? parseFloat(validated.buyNowPrice) : null,
      currency: validated.currency,
      duration_hours: validated.durationHours,
      shipping_worldwide: validated.shipping.worldwide,
      shipping_local_only: validated.shipping.localOnly,
      shipping_cost_buyer: validated.shipping.costBuyer,
      shipping_cost_seller: validated.shipping.costSeller,
      shipping_free_in_country: validated.shipping.freeInCountry,
      seller_id: sellerId,
      status: "active",
      ends_at: endsAt.toISOString(),
    });

    // Create Medusa product asynchronously (non-blocking)
    // Product creation should not fail auction creation
    const medusaOrderService = new MedusaOrderService();
    medusaOrderService
      .ensureMedusaProduct(validated.jerseyId)
      .then((productId) => {
        // Product created successfully - ensureMedusaProduct already updates jerseys.medusa_product_id
        console.log(`[AUCTION-SERVICE] Medusa product created for jersey ${validated.jerseyId}: ${productId}`);
      })
      .catch((error) => {
        // Log error but don't throw - auction creation succeeded
        const errorMessage = error instanceof Error ? error.message : String(error);
        Sentry.captureException(error, {
          tags: {
            component: "auction_service",
            operation: "create_medusa_product_async",
          },
          extra: {
            auctionId: auction.id,
            jerseyId: validated.jerseyId,
            errorMessage,
          },
        });
        console.error(
          `[AUCTION-SERVICE] Failed to create Medusa product for jersey ${validated.jerseyId}:`,
          errorMessage
        );
      });

    return auction;
  }

  async updateAuction(id: string, data: Partial<AuctionCreateInput>, sellerId: string) {
    const auction = await this.repository.findById(id);

    if (!auction) {
      throw new ApiError("NOT_FOUND", "Auction not found", 404);
    }

    if (auction.seller_id !== sellerId) {
      throw new ApiError("FORBIDDEN", "You can only update your own auctions", 403);
    }

    if (auction.status !== "active") {
      throw new ApiError("BAD_REQUEST", "Can only update active auctions", 400);
    }

    const updateData: Record<string, unknown> = {};
    if (data.buyNowPrice !== undefined) {
      updateData.buy_now_price = parseFloat(data.buyNowPrice);
    }
    if (data.shipping !== undefined) {
      updateData.shipping_worldwide = data.shipping.worldwide;
      updateData.shipping_local_only = data.shipping.localOnly;
      updateData.shipping_cost_buyer = data.shipping.costBuyer;
      updateData.shipping_cost_seller = data.shipping.costSeller;
      updateData.shipping_free_in_country = data.shipping.freeInCountry;
    }

    return await this.repository.update(id, updateData);
  }

  async deleteAuction(id: string, sellerId: string) {
    const auction = await this.repository.findById(id);

    if (!auction) {
      throw new ApiError("NOT_FOUND", "Auction not found", 404);
    }

    if (auction.seller_id !== sellerId) {
      throw new ApiError("FORBIDDEN", "You can only delete your own auctions", 403);
    }

    await this.repository.delete(id);
  }
}

