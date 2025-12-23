import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

/**
 * MedusaOrderService - Manages Medusa orders and products
 *
 * Uses Supabase RPC functions (pattern from MedusaCustomerService) for order/product creation
 * Direct SQL queries for read operations (pattern from MedusaShippingService)
 *
 * ⚠️ IMPORTANT: Shipping method stored as TEXT in metadata, NOT shipping option ID
 * (Medusa shipping profiles are NOT configured - we use Eurosender directly)
 */

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';

export interface ShippingAddress {
  street: string;
  city: string;
  postal_code: string;
  country: string;
  state?: string;
  address_line2?: string;
}

export interface MedusaOrder {
  id: string;
  status: OrderStatus;
  customer_id: string;
  items: Array<{ product_id: string; quantity: number; price: number }>;
  shipping_address: ShippingAddress;
  shipping_method?: string; // Text, e.g. "Eurosender Standard"
  shipping_cost?: number; // In cents
  totals: { subtotal: number; shipping: number; total: number };
  metadata?: Record<string, unknown>; // For tracking number, shipping provider, etc.
  created_at: string;
  updated_at: string;
}

export class MedusaOrderService {
  /**
   * Ensure Medusa product exists for jersey or sale listing
   * Creates product if missing, returns existing if present
   * Idempotent operation
   */
  async ensureMedusaProduct(
    jerseyId?: string,
    saleListingId?: string
  ): Promise<string> { // Returns TEXT ID (Medusa v2 format: prod_xxx)
    try {
      const supabase = await createServiceClient();

      // Check if product already exists
      if (jerseyId) {
        const { data: jersey, error: jerseyError } = await supabase
          .from("jerseys")
          .select("medusa_product_id, club, season, jersey_type, player_name, condition_rating")
          .eq("id", jerseyId)
          .single();

        if (jerseyError) {
          throw new Error(`Failed to fetch jersey: ${jerseyError.message}`);
        }

        // Return existing product ID if present
        if (jersey.medusa_product_id) {
          return jersey.medusa_product_id;
        }

        // Create product if missing
        if (jersey) {
          // For jersey-only (auction case), we need a reference price
          // Use 0 as placeholder - actual price will be set when order is created from auction
          const { data: productId, error: rpcError } = await (supabase.rpc as unknown as {
            (name: string, args: Record<string, unknown>): Promise<{
              data: string | null;
              error: { code?: string; message: string } | null;
            }>;
          })('create_medusa_product', {
            p_price_cents: 0, // Placeholder - actual price set when order created from auction
            p_title: `${jersey.club} ${jersey.season}${jersey.player_name ? ` - ${jersey.player_name}` : ''}`,
            p_jersey_id: jerseyId,
            p_currency: 'eur',
            p_description: `Jersey: ${jersey.club}, Season: ${jersey.season}, Type: ${jersey.jersey_type}, Condition: ${jersey.condition_rating}`,
          });

          if (rpcError || !productId) {
            throw new Error(`Failed to create Medusa product: ${rpcError?.message || 'No ID returned'}`);
          }

          // Update jersey with product ID
          const { error: updateError } = await supabase
            .from("jerseys")
            .update({ medusa_product_id: productId })
            .eq("id", jerseyId);

          if (updateError) {
            throw new Error(`Failed to update jersey with product ID: ${updateError.message}`);
          }

          return productId;
        }
      }

      if (saleListingId) {
        const { data: listing, error: listingError } = await supabase
          .from("sale_listings")
          .select("medusa_product_id, jersey_id, price")
          .eq("id", saleListingId)
          .single();

        if (listingError) {
          throw new Error(`Failed to fetch sale listing: ${listingError.message}`);
        }

        // Return existing product ID if present
        if (listing.medusa_product_id) {
          return listing.medusa_product_id;
        }

        // Get jersey data for product creation
        if (listing.jersey_id) {
          const { data: jersey, error: jerseyError } = await supabase
            .from("jerseys")
            .select("club, season, jersey_type, player_name, condition_rating")
            .eq("id", listing.jersey_id)
            .single();

          if (jerseyError) {
            throw new Error(`Failed to fetch jersey: ${jerseyError.message}`);
          }

          if (jersey) {
            // Convert price from DECIMAL to cents (integer)
            const priceCents = Math.round((listing.price || 0) * 100);

            // Create product via RPC
            const { data: productId, error: rpcError } = await (supabase.rpc as unknown as {
              (name: string, args: Record<string, unknown>): Promise<{
                data: string | null;
                error: { code?: string; message: string } | null;
              }>;
            })('create_medusa_product', {
              p_price_cents: priceCents,
              p_title: `${jersey.club} ${jersey.season}${jersey.player_name ? ` - ${jersey.player_name}` : ''}`,
              p_sale_listing_id: saleListingId,
              p_currency: 'eur',
              p_description: `Jersey: ${jersey.club}, Season: ${jersey.season}, Type: ${jersey.jersey_type}, Condition: ${jersey.condition_rating}`,
            });

            if (rpcError || !productId) {
              throw new Error(`Failed to create Medusa product: ${rpcError?.message || 'No ID returned'}`);
            }

            // Update sale_listing with product ID
            const { error: updateError } = await supabase
              .from("sale_listings")
              .update({ medusa_product_id: productId })
              .eq("id", saleListingId);

            if (updateError) {
              throw new Error(`Failed to update sale listing with product ID: ${updateError.message}`);
            }

            return productId;
          }
        }
      }

      throw new Error("Either jerseyId or saleListingId must be provided");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_order_service", operation: "ensure_medusa_product" },
        extra: { jerseyId, saleListingId, errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        `Failed to ensure Medusa product: ${errorMessage}`,
        502
      );
    }
  }

  /**
   * Create order from sale listing
   * Shipping method is TEXT (e.g. "Eurosender Standard"), NOT shipping option ID
   */
  async createOrderFromSale(
    listingId: string,
    buyerId: string,
    shippingAddress: ShippingAddress,
    shippingMethodName: string,
    shippingCost: number // In cents
  ): Promise<MedusaOrder> {
    // TODO: Implement in Phase 3
    throw new Error("Not implemented yet - Phase 3");
  }

  /**
   * Create order from auction
   * Shipping method is TEXT (e.g. "Eurosender Standard"), NOT shipping option ID
   */
  async createOrderFromAuction(
    auctionId: string,
    buyerId: string,
    shippingAddress: ShippingAddress,
    shippingMethodName: string,
    shippingCost: number // In cents
  ): Promise<MedusaOrder> {
    // TODO: Implement in Phase 3
    throw new Error("Not implemented yet - Phase 3");
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<MedusaOrder> {
    // TODO: Implement in Phase 4
    throw new Error("Not implemented yet - Phase 4");
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    // TODO: Implement in Phase 4
    throw new Error("Not implemented yet - Phase 4");
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<void> {
    // TODO: Implement in Phase 4
    throw new Error("Not implemented yet - Phase 4");
  }

  /**
   * Update tracking number in order metadata
   */
  async updateTrackingNumber(
    orderId: string,
    trackingNumber: string,
    shippingProvider: string
  ): Promise<void> {
    // TODO: Implement in Phase 4
    throw new Error("Not implemented yet - Phase 4");
  }

  /**
   * Get transaction by Medusa order ID (helper for payout integration)
   */
  private async getTransactionByOrderId(orderId: string): Promise<{ id: string } | null> {
    try {
      const supabase = await createServiceClient();
      const { data: transaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('medusa_order_id', orderId)
        .single();
      return transaction || null;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "medusa_order_service", operation: "get_transaction_by_order_id" },
        extra: { orderId },
      });
      return null;
    }
  }
}

