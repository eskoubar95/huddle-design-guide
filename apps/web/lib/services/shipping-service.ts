import {
  MedusaShippingService,
  MedusaRegion,
  MedusaShippingOption,
} from "./medusa-shipping-service";
import {
  EurosenderService,
  EurosenderAddress,
  EurosenderQuoteRequest,
} from "./eurosender-service";
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
  metadata?: {
    /**
     * Eurosender courierId for PUDO point search
     * 
     * When serviceType is "pickup_point" and provider is "eurosender",
     * frontend should use this courierId to search for PUDO points via
     * GET /api/v1/shipping/service-points?courier_id={courierId}&lat={lat}&lng={lng}&country={country}
     */
    courierId?: number;
  };
}

/**
 * ShippingService - Orchestrates shipping calculation
 *
 * Combines Medusa (regions/zones) + Eurosender (dynamic rates) for shipping calculation
 */
export class ShippingService {
  private medusaService: MedusaShippingService;
  private eurosenderService: EurosenderService;

  constructor() {
    this.medusaService = new MedusaShippingService();
    this.eurosenderService = new EurosenderService();
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
      // NOTE: PUDO (pickup_point) is deferred - focusing on home delivery for MVP
      // See: .project/plans/HUD-36/PUDO-API-ISSUE.md
      if (input.serviceType === "pickup_point") {
        // Pickup point: Currently not supported (PUDO API issue)
        // Return empty array - frontend should default to home_delivery
        Sentry.captureMessage(
          "[SHIPPING] Pickup point requested but not yet supported (PUDO API issue)",
          {
            level: "info",
            tags: {
              component: "shipping_service",
              operation: "calculate_shipping",
            },
          }
        );
        return [];
      }

      // Home delivery: Try Eurosender first, fallback to Medusa
      try {
        const eurosenderOptions = await this.calculateEurosenderRates(
          sellerCountry,
          input.shippingAddress,
          weightKg,
          "home_delivery"
        );

        if (eurosenderOptions.length > 0) {
          return eurosenderOptions;
        }
      } catch (error) {
        // Log but continue to fallback
        const errorMessage = error instanceof Error ? error.message : String(error);
        Sentry.captureMessage(
          `[SHIPPING] Eurosender failed for home_delivery, falling back to Medusa: ${errorMessage}`,
          {
            level: "warning",
            tags: {
              component: "shipping_service",
              operation: "calculate_shipping_home_delivery",
            },
            extra: { sellerCountry, buyerCountry: buyerCountry },
          }
        );
        Sentry.captureException(error, {
          tags: {
            component: "shipping_service",
            operation: "calculate_shipping_home_delivery",
          },
          extra: { sellerCountry, buyerCountry: buyerCountry },
        });
      }

      // Fallback to Medusa rates
      return await this.calculateMedusaRates(region.id, "home_delivery");
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
   */
  private async calculateEurosenderRates(
    sellerCountry: string,
    buyerAddress: ShippingCalculationInput["shippingAddress"],
    weightKg: number,
    serviceType: "home_delivery" | "pickup_point"
  ): Promise<ShippingOption[]> {
    try {
      // 1. Build Eurosender addresses
      const pickupAddress = this.mapToEurosenderAddress(
        sellerCountry,
        "Rosenborggade 1", // Default seller address (TODO: get from seller profile)
        "Copenhagen",
        "1130",
        sellerCountry
      );
      const deliveryAddress = this.mapToEurosenderAddress(
        buyerAddress.country,
        buyerAddress.street,
        buyerAddress.city,
        buyerAddress.postal_code,
        buyerAddress.country,
        buyerAddress.state
      );

      // 2. Build parcels (default jersey dimensions)
      const parcels: EurosenderQuoteRequest["parcels"] = {
        packages: [
          {
            parcelId: "A00001",
            quantity: 1,
            width: 30, // cm
            height: 5, // cm
            length: 20, // cm
            weight: weightKg,
            content: "jersey",
            value: 100, // EUR - TODO: get from listing/auction
          },
        ],
      };

      // 3. Get quotes from Eurosender
      const pickupDate = new Date();
      pickupDate.setDate(pickupDate.getDate() + 1); // Tomorrow
      const quoteRequest: EurosenderQuoteRequest = {
        shipment: {
          pickupAddress,
          deliveryAddress,
          pickupDate: pickupDate.toISOString().split("T")[0] + "T00:00:00Z",
        },
        parcels,
        paymentMethod: "credit", // Use prepaid credit on Huddle's Eurosender account
        currencyCode: "EUR",
      };

      const quote = await this.eurosenderService.getQuotes(quoteRequest);

      // 4. Map to ShippingOption format
      const options = quote.options.serviceTypes
        .filter((st) => {
          // Filter by service type preference
          if (serviceType === "pickup_point") {
            // PUDO points available for all service types
            return true;
          }
          // For home delivery, only show primary service types
          return ["flexi", "regular_plus", "express"].includes(st.serviceType);
        })
        .map((st) => ({
          id: `${st.serviceType}-${st.courierId}`, // Unique ID
          name: this.mapServiceTypeName(st.serviceType),
          price: Math.round(st.price.original.gross * 100), // Convert EUR to cents
          estimatedDays: this.parseEstimatedDays(st.edt),
          serviceType,
          provider: "eurosender",
          method: st.serviceType,
          metadata: {
            courierId: st.courierId, // Store for PUDO search
          },
        }))
        .sort((a, b) => a.price - b.price);

      return options;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: {
          component: "shipping_service",
          operation: "calculate_eurosender_rates",
        },
        extra: { errorMessage, sellerCountry, buyerCountry: buyerAddress.country },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to calculate Eurosender shipping rates",
        502
      );
    }
  }

  /**
   * Map Huddle address format to Eurosender address format
   */
  private mapToEurosenderAddress(
    country: string,
    street: string,
    city: string,
    postalCode: string,
    countryCode: string,
    state?: string
  ): EurosenderAddress {
    return {
      country: countryCode.toUpperCase(),
      zip: postalCode,
      city,
      street,
      ...(state && { region: state }), // Include state if provided (required for some countries)
    };
  }

  /**
   * Map Eurosender service type to user-friendly name
   */
  private mapServiceTypeName(serviceType: string): string {
    const nameMap: Record<string, string> = {
      flexi: "Standard Shipping",
      regular_plus: "Priority Shipping",
      express: "Express Shipping",
      selection: "Standard Shipping",
      freight: "Freight Shipping",
      van: "Van Delivery",
      ftl: "FTL Transport",
    };
    return nameMap[serviceType] || serviceType;
  }

  /**
   * Parse estimated delivery time string to number of days
   * Examples: "2-3 days" -> 3, "1 day" -> 1, "2-3 business days" -> 3
   */
  private parseEstimatedDays(edt?: string): number | null {
    if (!edt) {
      return null;
    }

    // Extract numbers from EDT string (e.g., "2-3 days" -> [2, 3])
    const numbers = edt.match(/\d+/g);
    if (!numbers || numbers.length === 0) {
      return null;
    }

    // Return the highest number (worst case)
    const maxDays = Math.max(...numbers.map(Number));
    return maxDays;
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

