import { ListingRepository } from "@/lib/repositories/listing-repository";
import { saleListingCreateSchema, saleListingUpdateSchema } from "@/lib/validation/listing-schemas";
import { ApiError } from "@/lib/api/errors";
import type { SaleListingCreateInput, SaleListingUpdateInput } from "@/lib/validation/listing-schemas";

/**
 * Service for sale listing business logic
 * Handles validation, authorization checks, and coordinates repository calls
 */
export class ListingService {
  private repository = new ListingRepository();

  async getListing(id: string) {
    const listing = await this.repository.findById(id);

    if (!listing) {
      throw new ApiError("NOT_FOUND", "Listing not found", 404);
    }

    return listing;
  }

  async listListings(params: {
    limit: number;
    cursor?: string;
    status?: string;
    sellerId?: string;
  }) {
    return await this.repository.findMany(params);
  }

  async createListing(input: SaleListingCreateInput, sellerId: string) {
    const validated = saleListingCreateSchema.parse(input);

    // Transform camelCase to snake_case and shipping object to flat fields
    return await this.repository.create({
      jersey_id: validated.jerseyId,
      price: parseFloat(validated.price),
      currency: validated.currency,
      negotiable: validated.negotiable,
      shipping_worldwide: validated.shipping.worldwide,
      shipping_local_only: validated.shipping.localOnly,
      shipping_cost_buyer: validated.shipping.costBuyer,
      shipping_cost_seller: validated.shipping.costSeller,
      shipping_free_in_country: validated.shipping.freeInCountry,
      seller_id: sellerId,
      status: "active",
    });
  }

  async updateListing(id: string, input: SaleListingUpdateInput, sellerId: string) {
    const listing = await this.repository.findById(id);

    if (!listing) {
      throw new ApiError("NOT_FOUND", "Listing not found", 404);
    }

    if (listing.seller_id !== sellerId) {
      throw new ApiError("FORBIDDEN", "You can only update your own listings", 403);
    }

    const validated = saleListingUpdateSchema.parse(input);

    // Transform camelCase to snake_case
    const updateData: Record<string, unknown> = {};
    if (validated.jerseyId !== undefined) updateData.jersey_id = validated.jerseyId;
    if (validated.price !== undefined) updateData.price = parseFloat(validated.price);
    if (validated.currency !== undefined) updateData.currency = validated.currency;
    if (validated.negotiable !== undefined) updateData.negotiable = validated.negotiable;
    if (validated.shipping !== undefined) {
      updateData.shipping_worldwide = validated.shipping.worldwide;
      updateData.shipping_local_only = validated.shipping.localOnly;
      updateData.shipping_cost_buyer = validated.shipping.costBuyer;
      updateData.shipping_cost_seller = validated.shipping.costSeller;
      updateData.shipping_free_in_country = validated.shipping.freeInCountry;
    }

    return await this.repository.update(id, updateData);
  }

  async deleteListing(id: string, sellerId: string) {
    const listing = await this.repository.findById(id);

    if (!listing) {
      throw new ApiError("NOT_FOUND", "Listing not found", 404);
    }

    if (listing.seller_id !== sellerId) {
      throw new ApiError("FORBIDDEN", "You can only delete your own listings", 403);
    }

    await this.repository.delete(id);
  }
}

