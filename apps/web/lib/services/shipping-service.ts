import {
  MedusaShippingService,
  MedusaRegion,
  MedusaShippingOption,
} from "./medusa-shipping-service";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

export interface ShippingCalculationInput {
  listingId?: string; // sale_listings.id
  auctionId?: string; // auctions.id
  shippingAddress: {
    street: string;
    city: string;
    postal_code: string;
    country: string; // ISO 2-letter
    state?: string;
  };
  serviceType?: "home_delivery" | "pickup_point";
  servicePointId?: string; // If pickup point selected
}

export interface ShippingOption {
  id: string; // Medusa shipping option ID or Eurosender quote ID
  name: string; // "Standard Shipping", "Priority Express", etc.
  price: number; // in cents (EUR)
  estimatedDays: number | null;
  serviceType: "home_delivery" | "pickup_point";
  provider: string; // "manual" (Medusa) or "eurosender"
  method: string; // "standard", "express", etc.
}

/**
 * ShippingService - Orchestrates shipping calculation
 *
 * Combines Medusa (regions/zones) + Eurosender (dynamic rates) for shipping calculation
 * 
 * Note: Shippo integration removed. Eurosender integration in progress (Phase 1-3).
 */
export class ShippingService {
  private medusaService: MedusaShippingService;

  constructor() {
    this.medusaService = new MedusaShippingService();
  }

  /**
   * Calculate shipping options for a listing/auction
   */
  async calculateShipping(
    input: ShippingCalculationInput
  ): Promise<ShippingOption[]> {
    try {
      // 1. Get listing/auction details (seller location, weight estimate)
      const { sellerCountry, weightKg, shippingFreeInCountry } =
        await this.getListingDetails(input.listingId, input.auctionId);

      // 2. Determine shipping zone (from seller country to buyer country)
      const buyerCountry = input.shippingAddress.country.toUpperCase();
      const region = await this.medusaService.getRegionByCountry(buyerCountry);

      if (!region) {
        throw new ApiError(
          "INVALID_COUNTRY",
          `Shipping not available to ${buyerCountry}`,
          400
        );
      }

      // 3. Check free shipping logic
      if (shippingFreeInCountry && sellerCountry === buyerCountry) {
        // Same country + free shipping enabled → return free option
        return [
          {
            id: "free_shipping",
            name: "Free Shipping",
            price: 0,
            estimatedDays: 3,
            serviceType: input.serviceType || "home_delivery",
            provider: "manual",
            method: "standard",
          },
        ];
      }

      // 4. Get shipping options based on service type
      if (input.serviceType === "pickup_point") {
        // TODO: Implement Eurosender PUDO API in Phase 3
        throw new ApiError(
          "NOT_IMPLEMENTED",
          "Pickup point shipping not yet implemented with Eurosender.",
          501
        );
      } else {
        // Home delivery: Use Medusa fallback only (temporarily)
        // TODO: Implement EurosenderService in Phase 3
        console.log("[SHIPPING] Using Medusa fallback rates (Eurosender integration in progress)");
        return await this.calculateMedusaRates(region.id, "home_delivery");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "shipping_service", operation: "calculate_shipping" },
        extra: { errorMessage, input },
      });

      throw new ApiError(
        "INTERNAL_SERVICE_ERROR",
        "Failed to calculate shipping costs",
        500
      );
    }
  }

  /**
   * Get listing/auction details (seller location, weight)
   */
  private async getListingDetails(
    listingId?: string,
    auctionId?: string
  ): Promise<{
    sellerCountry: string;
    weightKg: number;
    shippingFreeInCountry: boolean;
  }> {
    const supabase = await createServiceClient();

    if (listingId) {
      const { data: listing, error } = await supabase
        .from("sale_listings")
        .select("seller_id, shipping_free_in_country")
        .eq("id", listingId)
        .single();

      if (error || !listing) {
        throw new ApiError("NOT_FOUND", "Listing not found", 404);
      }

      // Get seller country from profile (simplified - assume seller has country in profile)
      // Future: Store seller country in listing or get from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("country")
        .eq("id", listing.seller_id)
        .single();

      return {
        sellerCountry: profile?.country || "DK", // Default to DK
        weightKg: 0.5, // Default weight estimate (future: calculate from jersey type/size)
        shippingFreeInCountry: listing.shipping_free_in_country || false,
      };
    }

    if (auctionId) {
      const { data: auction, error } = await supabase
        .from("auctions")
        .select("seller_id, shipping_free_in_country")
        .eq("id", auctionId)
        .single();

      if (error || !auction) {
        throw new ApiError("NOT_FOUND", "Auction not found", 404);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("country")
        .eq("id", auction.seller_id)
        .single();

      return {
        sellerCountry: profile?.country || "DK",
        weightKg: 0.5,
        shippingFreeInCountry: auction.shipping_free_in_country || false,
      };
    }

    throw new ApiError("BAD_REQUEST", "Either listingId or auctionId required", 400);
  }

  /**
   * Calculate shipping using Eurosender API
   * 
   * TODO: Replace with EurosenderService in Phase 3
   * This method is temporarily stubbed after Shippo removal.
   */
  private async calculateEurosenderRates(
    sellerCountry: string,
    buyerAddress: ShippingCalculationInput["shippingAddress"],
    weightKg: number,
    serviceType: "home_delivery" | "pickup_point"
  ): Promise<ShippingOption[]> {
    // TODO: Implement EurosenderService integration in Phase 3
    throw new ApiError(
      "NOT_IMPLEMENTED",
      "Shippo integration removed. Eurosender integration in progress.",
      501
    );
  }

  /**
   * Calculate shipping using Medusa flat rates (fallback)
   */
  private async calculateMedusaRates(
    regionId: string,
    serviceType: "home_delivery" | "pickup_point"
  ): Promise<ShippingOption[]> {
    const options = await this.medusaService.getShippingOptions(
      regionId,
      serviceType
    );

    return options.map((option) => {
      // Get EUR price (or first price available)
      const eurPrice = option.prices.find((p) => p.currency_code === "eur");
      const price = eurPrice?.amount || option.prices[0]?.amount || 0;

      return {
        id: option.id,
        name: option.name,
        price, // Already in cents
        estimatedDays: option.type_code === "express" ? 1 : 3,
        serviceType,
        provider: "manual",
        method: option.type_code,
      };
    });
  }

  /**
   * Get shipping zones (from Medusa)
   */
  async getShippingZones(): Promise<MedusaRegion[]> {
    return this.medusaService.getRegions();
  }

  /**
   * Get shipping methods for a zone
   */
  async getShippingMethods(
    zoneId: string,
    serviceType?: "home_delivery" | "pickup_point"
  ): Promise<MedusaShippingOption[]> {
    return this.medusaService.getShippingOptions(zoneId, serviceType);
  }
}

