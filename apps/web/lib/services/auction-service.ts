import { AuctionRepository } from "@/lib/repositories/auction-repository";
import { auctionCreateSchema } from "@/lib/validation/auction-schemas";
import { ApiError } from "@/lib/api/errors";
import type { AuctionCreateInput } from "@/lib/validation/auction-schemas";

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
    return await this.repository.create({
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

