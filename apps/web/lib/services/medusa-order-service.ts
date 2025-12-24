import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";
import { createClerkClient } from "@clerk/backend";
import { query } from "@/lib/db/postgres-connection";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

/**
 * MedusaOrderService - Manages Medusa orders and products
 *
 * Uses Supabase RPC functions (pattern from MedusaCustomerService) for order/product creation
 * Direct SQL queries for read operations (pattern from MedusaShippingService)
 *
 * ⚠️ IMPORTANT: Shipping method stored as TEXT in metadata, NOT shipping option ID
 * (Medusa shipping profiles are NOT configured - we use Eurosender directly)
 */

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled';

export interface ShippingAddress {
  street: string;
  city: string;
  postal_code: string;
  country: string;
  state?: string;
  address_line2?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
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
    try {
      const supabase = await createServiceClient();

      // 1. Hent sale listing + jersey data + seller info
      const { data: listing, error: listingError } = await supabase
        .from("sale_listings")
        .select("id, jersey_id, price, medusa_product_id, seller_id")
        .eq("id", listingId)
        .single();

      if (listingError || !listing) {
        throw new Error(`Failed to fetch sale listing: ${listingError?.message || "Not found"}`);
      }

      // 2. Ensure Medusa product exists (fallback hvis ikke oprettet ved listing create)
      const productId = await this.ensureMedusaProduct(undefined, listingId);

      // 3. Hent buyer's medusa_customer_id og username fra profiles tabel
      const { data: buyerProfile, error: profileError } = await supabase
        .from("profiles")
        .select("medusa_customer_id, username")
        .eq("id", buyerId)
        .single();

      if (profileError || !buyerProfile) {
        throw new Error(`Failed to fetch buyer profile: ${profileError?.message || "Not found"}`);
      }

      if (!buyerProfile.medusa_customer_id) {
        throw new Error("Buyer does not have a Medusa customer ID. Please sync customer first.");
      }

      // 3b. Hent seller's profile info (username, medusa_customer_id, phone)
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("username, medusa_customer_id, phone")
        .eq("id", listing.seller_id)
        .single();

      // 3c. Hent seller's email fra Clerk
      let sellerEmail: string | null = null;
      try {
        const sellerClerkUser = await clerk.users.getUser(listing.seller_id);
        sellerEmail = sellerClerkUser.emailAddresses[0]?.emailAddress || null;
      } catch {
        // Seller might not have Clerk account - skip
      }

      // 3d. Hent seller's default shipping address
      const { data: sellerAddress } = await supabase
        .from("shipping_addresses")
        .select("street, city, postal_code, country, state")
        .eq("user_id", listing.seller_id)
        .eq("is_default", true)
        .single();

      // 4. Hent buyer email fra Clerk
      const clerkUser = await clerk.users.getUser(buyerId);
      const buyerEmail = clerkUser.emailAddresses[0]?.emailAddress;
      if (!buyerEmail) {
        throw new Error("Buyer email not found in Clerk");
      }

      // 5. Beregn totals
      // NOTE: We pass prices in cents to RPC function, which converts to EUR (major units) for Medusa
      // Medusa Admin expects major units (EUR), not minor units (cents)
      const itemPriceCents = Math.round((listing.price || 0) * 100);
      const subtotal = itemPriceCents;
      const total = subtotal + shippingCost;

      // 6. Kald RPC function create_medusa_order()
      const { data: orderId, error: rpcError } = await (supabase.rpc as unknown as {
        (name: string, args: Record<string, unknown>): Promise<{
          data: string | null;
          error: { code?: string; message: string } | null;
        }>;
      })('create_medusa_order', {
        p_product_id: productId,
        p_customer_id: buyerProfile.medusa_customer_id,
        p_shipping_address: {
          street: shippingAddress.street,
          city: shippingAddress.city,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country,
          state: shippingAddress.state || null,
          address_line2: shippingAddress.address_line2 || null,
          phone: shippingAddress.phone || null, // May not be in ShippingAddress interface
          full_name: `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim() || null,
        },
        p_shipping_method_name: shippingMethodName,
        p_shipping_cost: shippingCost,
        p_subtotal: subtotal,
        p_total: total,
        p_email: buyerEmail,
        p_currency_code: 'EUR',
        p_metadata: {
          listing_id: listingId,
          listing_type: 'sale',
          jersey_id: listing.jersey_id,
          seller_id: listing.seller_id,
          seller_handle: sellerProfile?.username || null,
          seller_customer_id: sellerProfile?.medusa_customer_id || null,
          seller_email: sellerEmail,
          seller_phone: sellerProfile?.phone || null,
          seller_address: sellerAddress || null,
          buyer_id: buyerId,
          buyer_handle: buyerProfile.username || null,
        },
      });

      if (rpcError || !orderId) {
        throw new Error(`Failed to create Medusa order: ${rpcError?.message || "No ID returned"}`);
      }

      // 7. Returner order object
      return {
        id: orderId,
        status: 'pending',
        customer_id: buyerProfile.medusa_customer_id,
        items: [{ product_id: productId, quantity: 1, price: subtotal }],
        shipping_address: shippingAddress,
        shipping_method: shippingMethodName,
        shipping_cost: shippingCost,
        totals: {
          subtotal,
          shipping: shippingCost,
          total,
        },
        metadata: {
          listing_id: listingId,
          listing_type: 'sale',
          jersey_id: listing.jersey_id,
          seller_id: listing.seller_id,
          seller_handle: sellerProfile?.username || null,
          seller_customer_id: sellerProfile?.medusa_customer_id || null,
          seller_email: sellerEmail,
          seller_phone: sellerProfile?.phone || null,
          seller_address: sellerAddress || null,
          buyer_id: buyerId,
          buyer_handle: buyerProfile.username || null,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_order_service", operation: "create_order_from_sale" },
        extra: { listingId, buyerId, errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        `Failed to create order from sale: ${errorMessage}`,
        502
      );
    }
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
    try {
      const supabase = await createServiceClient();

      // 1. Hent auction + jersey data + seller info
      const { data: auction, error: auctionError } = await supabase
        .from("auctions")
        .select("id, jersey_id, winner_id, current_bid, seller_id")
        .eq("id", auctionId)
        .single();

      if (auctionError || !auction) {
        throw new Error(`Failed to fetch auction: ${auctionError?.message || "Not found"}`);
      }

      // Use current_bid as winning bid amount (auction.current_bid is updated when bid is placed)
      const winningBidAmount = auction.current_bid || 0;

      // 2. Ensure Medusa product exists (fallback hvis ikke oprettet ved auction create)
      const productId = await this.ensureMedusaProduct(auction.jersey_id, undefined);

      // 3. Hent buyer's medusa_customer_id og username fra profiles tabel
      const { data: buyerProfile, error: profileError } = await supabase
        .from("profiles")
        .select("medusa_customer_id, username")
        .eq("id", buyerId)
        .single();

      if (profileError || !buyerProfile) {
        throw new Error(`Failed to fetch buyer profile: ${profileError?.message || "Not found"}`);
      }

      if (!buyerProfile.medusa_customer_id) {
        throw new Error("Buyer does not have a Medusa customer ID. Please sync customer first.");
      }

      // 3b. Hent seller's profile info (username, medusa_customer_id, phone)
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("username, medusa_customer_id, phone")
        .eq("id", auction.seller_id)
        .single();

      // 3c. Hent seller's email fra Clerk
      let sellerEmail: string | null = null;
      try {
        const sellerClerkUser = await clerk.users.getUser(auction.seller_id);
        sellerEmail = sellerClerkUser.emailAddresses[0]?.emailAddress || null;
      } catch {
        // Seller might not have Clerk account - skip
      }

      // 3d. Hent seller's default shipping address
      const { data: sellerAddress } = await supabase
        .from("shipping_addresses")
        .select("street, city, postal_code, country, state")
        .eq("user_id", auction.seller_id)
        .eq("is_default", true)
        .single();

      // 4. Hent buyer email fra Clerk
      const clerkUser = await clerk.users.getUser(buyerId);
      const buyerEmail = clerkUser.emailAddresses[0]?.emailAddress;
      if (!buyerEmail) {
        throw new Error("Buyer email not found in Clerk");
      }

      // 5. Beregn totals
      const itemPriceCents = Math.round((winningBidAmount || 0) * 100);
      const subtotal = itemPriceCents;
      const total = subtotal + shippingCost;

      // 6. Kald RPC function create_medusa_order()
      const { data: orderId, error: rpcError } = await (supabase.rpc as unknown as {
        (name: string, args: Record<string, unknown>): Promise<{
          data: string | null;
          error: { code?: string; message: string } | null;
        }>;
      })('create_medusa_order', {
        p_product_id: productId,
        p_customer_id: buyerProfile.medusa_customer_id,
        p_shipping_address: {
          street: shippingAddress.street,
          city: shippingAddress.city,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country,
          state: shippingAddress.state || null,
          address_line2: shippingAddress.address_line2 || null,
          phone: shippingAddress.phone || null,
          full_name: `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim() || null,
        },
        p_shipping_method_name: shippingMethodName,
        p_shipping_cost: shippingCost,
        p_subtotal: subtotal,
        p_total: total,
        p_email: buyerEmail,
        p_currency_code: 'EUR',
        p_metadata: {
          auction_id: auctionId,
          listing_type: 'auction',
          jersey_id: auction.jersey_id,
          seller_id: auction.seller_id,
          seller_handle: sellerProfile?.username || null,
          seller_customer_id: sellerProfile?.medusa_customer_id || null,
          seller_email: sellerEmail,
          seller_phone: sellerProfile?.phone || null,
          seller_address: sellerAddress || null,
          buyer_id: buyerId,
          buyer_handle: buyerProfile.username || null,
          winner_id: auction.winner_id,
        },
      });

      if (rpcError || !orderId) {
        throw new Error(`Failed to create Medusa order: ${rpcError?.message || "No ID returned"}`);
      }

      // 7. Returner order object
      return {
        id: orderId,
        status: 'pending',
        customer_id: buyerProfile.medusa_customer_id,
        items: [{ product_id: productId, quantity: 1, price: subtotal }],
        shipping_address: shippingAddress,
        shipping_method: shippingMethodName,
        shipping_cost: shippingCost,
        totals: {
          subtotal,
          shipping: shippingCost,
          total,
        },
        metadata: {
          auction_id: auctionId,
          listing_type: 'auction',
          jersey_id: auction.jersey_id,
          seller_id: auction.seller_id,
          seller_handle: sellerProfile?.username || null,
          seller_customer_id: sellerProfile?.medusa_customer_id || null,
          seller_email: sellerEmail,
          seller_phone: sellerProfile?.phone || null,
          seller_address: sellerAddress || null,
          buyer_id: buyerId,
          buyer_handle: buyerProfile.username || null,
          winner_id: auction.winner_id,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_order_service", operation: "create_order_from_auction" },
        extra: { auctionId, buyerId, errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        `Failed to create order from auction: ${errorMessage}`,
        502
      );
    }
  }

  /**
   * Get order by ID from Medusa
   * Uses direct SQL queries (pattern from MedusaShippingService)
   */
  async getOrder(orderId: string): Promise<MedusaOrder> {
    try {
      // Get order from medusa.order table
      const orders = await query<{
        id: string;
        status: string;
        customer_id: string;
        currency_code: string;
        email: string;
        shipping_address_id: string;
        metadata: Record<string, unknown>;
        created_at: string;
        updated_at: string;
      }>(
        `
        SELECT 
          id,
          status,
          customer_id,
          currency_code,
          email,
          shipping_address_id,
          metadata,
          created_at,
          updated_at
        FROM medusa.order
        WHERE id = $1
        `,
        [orderId]
      );

      if (!orders || orders.length === 0) {
        throw new ApiError("NOT_FOUND", "Order not found", 404);
      }

      const order = orders[0];

      // Get shipping address
      const addresses = await query<{
        id: string;
        address_1: string;
        address_2: string | null;
        city: string;
        country_code: string;
        province: string | null;
        postal_code: string;
        phone: string | null;
        first_name: string;
        last_name: string;
      }>(
        `
        SELECT 
          id,
          address_1,
          address_2,
          city,
          country_code,
          province,
          postal_code,
          phone,
          first_name,
          last_name
        FROM medusa.order_address
        WHERE id = $1
        `,
        [order.shipping_address_id]
      );

      if (!addresses || addresses.length === 0) {
        throw new ApiError("NOT_FOUND", "Shipping address not found for order", 404);
      }

      const shippingAddress = addresses[0];

      // Get order items and line items
      const orderItems = await query<{
        id: string;
        quantity: number;
        item_id: string;
      }>(
        `
        SELECT 
          oi.id,
          oi.quantity,
          oi.item_id
        FROM medusa.order_item oi
        WHERE oi.order_id = $1
        `,
        [orderId]
      );

      // Get line items for each order item
      const items = await Promise.all(
        (orderItems || []).map(async (item) => {
          const lineItems = await query<{
            id: string;
            product_id: string;
            title: string;
            unit_price: number;
          }>(
            `
            SELECT 
              id,
              product_id,
              title,
              unit_price
            FROM medusa.order_line_item
            WHERE id = $1
            `,
            [item.item_id]
          );

          const lineItem = lineItems && lineItems.length > 0 ? lineItems[0] : null;
          return {
            product_id: lineItem?.product_id || "",
            quantity: Number(item.quantity) || 1,
            price: lineItem?.unit_price || 0,
          };
        })
      );

      // Extract totals from metadata or calculate from items
      const metadata = (order.metadata as Record<string, unknown>) || {};
      const shippingCost = (metadata.shipping_cost as number) || 0;
      const subtotal = items.reduce((sum, item) => sum + item.price, 0);
      const total = subtotal + shippingCost;

      // Build shipping address object
      const shippingAddressObj: ShippingAddress = {
        street: shippingAddress.address_1 || "",
        city: shippingAddress.city || "",
        postal_code: shippingAddress.postal_code || "",
        country: shippingAddress.country_code || "",
        state: shippingAddress.province || undefined,
        address_line2: shippingAddress.address_2 || undefined,
        phone: shippingAddress.phone || undefined,
        first_name: shippingAddress.first_name || "",
        last_name: shippingAddress.last_name || "",
      };

      return {
        id: order.id,
        status: order.status as OrderStatus,
        customer_id: order.customer_id,
        items,
        shipping_address: shippingAddressObj,
        shipping_method: (metadata.shipping_method as string) || undefined,
        shipping_cost: shippingCost,
        totals: {
          subtotal,
          shipping: shippingCost,
          total,
        },
        metadata: metadata as Record<string, unknown>,
        created_at: order.created_at,
        updated_at: order.updated_at,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_order_service", operation: "get_order" },
        extra: { orderId, errorMessage },
      });
      throw error instanceof ApiError
        ? error
        : new ApiError(
            "INTERNAL_ERROR",
            `Failed to get order: ${errorMessage}`,
            500
          );
    }
  }

  /**
   * Status transition validation
   */
  private readonly ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    pending: ["paid", "cancelled"],
    paid: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: ["completed"], // After delivered, can mark as completed
    completed: [], // Terminal state
    cancelled: [], // Terminal state
  };

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): void {
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new ApiError(
        "BAD_REQUEST",
        `Invalid status transition: ${currentStatus} → ${newStatus}. Allowed transitions: ${allowed.join(", ")}`,
        400
      );
    }
  }

  /**
   * Update order status
   * Triggers payout when status = "delivered"
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    try {

      // Get current order status (using raw SQL)
      const currentOrders = await query<{ status: string }>(
        `
        SELECT status
        FROM medusa.order
        WHERE id = $1
        `,
        [orderId]
      );

      if (!currentOrders || currentOrders.length === 0) {
        throw new ApiError("NOT_FOUND", "Order not found", 404);
      }

      const currentStatus = currentOrders[0].status as OrderStatus;

      // Validate status transition
      this.validateStatusTransition(currentStatus, status);

      // Update order status (using raw SQL)
      await query(
        `
        UPDATE medusa.order
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        `,
        [status, orderId]
      );

      // Log status change to Sentry (no PII)
      Sentry.addBreadcrumb({
        category: "order.status_change",
        message: `Order status updated: ${currentStatus} → ${status}`,
        level: "info",
        data: {
          orderIdPrefix: orderId.slice(0, 8),
          fromStatus: currentStatus,
          toStatus: status,
        },
      });

      // Trigger payout if status = "delivered"
      if (status === "delivered") {
        const transaction = await this.getTransactionByOrderId(orderId);
        if (transaction) {
          try {
            const { PayoutService } = await import("./payout-service");
            const payoutService = new PayoutService();
            await payoutService.schedulePayout(transaction.id, "delivered");
          } catch (payoutError) {
            // Log payout error but don't fail order status update
            Sentry.captureException(payoutError, {
              tags: {
                component: "medusa_order_service",
                operation: "trigger_payout",
              },
              extra: {
                orderIdPrefix: orderId.slice(0, 8),
                transactionIdPrefix: transaction.id.slice(0, 8),
              },
            });
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_order_service", operation: "update_order_status" },
        extra: { orderId, status, errorMessage },
      });
      throw error instanceof ApiError
        ? error
        : new ApiError(
            "INTERNAL_ERROR",
            `Failed to update order status: ${errorMessage}`,
            500
          );
    }
  }

  /**
   * Cancel order (sets status to cancelled)
   */
  async cancelOrder(orderId: string): Promise<void> {
    await this.updateOrderStatus(orderId, "cancelled");
  }

  /**
   * Update tracking number in order metadata
   * Also updates shipping_labels table if label exists
   */
  async updateTrackingNumber(
    orderId: string,
    trackingNumber: string,
    shippingProvider: string
  ): Promise<void> {
    try {
      const supabase = await createServiceClient();

      // Get current order metadata (using raw SQL)
      const orders = await query<{ metadata: Record<string, unknown> }>(
        `
        SELECT metadata
        FROM medusa.order
        WHERE id = $1
        `,
        [orderId]
      );

      if (!orders || orders.length === 0) {
        throw new ApiError("NOT_FOUND", "Order not found", 404);
      }

      // Update metadata with tracking info (using raw SQL)
      const currentMetadata = orders[0].metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        tracking_number: trackingNumber,
        shipping_provider: shippingProvider,
        tracking_updated_at: new Date().toISOString(),
      };

      await query(
        `
        UPDATE medusa.order
        SET metadata = $1, updated_at = NOW()
        WHERE id = $2
        `,
        [JSON.stringify(updatedMetadata), orderId]
      );

      // Create fulfillment record in Medusa (marks order as shipped/fulfilled)
      // This removes the "Not fulfilled" status in Medusa Admin
      try {
        await (supabase.rpc as unknown as {
          (name: string, args: Record<string, unknown>): Promise<{
            data: string | null;
            error: { code?: string; message: string } | null;
          }>;
        })('fulfill_medusa_order', {
          p_order_id: orderId,
          p_tracking_number: trackingNumber,
          p_shipping_provider: shippingProvider,
        });
      } catch (fulfillErr) {
        // Log but don't fail - fulfillment is optional for marketplace orders
        Sentry.captureException(fulfillErr, {
          tags: { component: "medusa_order_service", operation: "create_fulfillment" },
          extra: { orderIdPrefix: orderId.slice(0, 8) },
        });
      }

      // Update shipping_labels table if label exists (via transaction lookup)
      const transaction = await this.getTransactionByOrderId(orderId);
      if (transaction) {
        // Check if shipping label exists for this transaction
        const { data: shippingLabel, error: labelError } = await supabase
          .from("shipping_labels")
          .select("id")
          .eq("transaction_id", transaction.id)
          .single();

        if (!labelError && shippingLabel) {
          // Update existing shipping label
          const { error: labelUpdateError } = await supabase
            .from("shipping_labels")
            .update({
              tracking_number: trackingNumber,
              updated_at: new Date().toISOString(),
            })
            .eq("id", shippingLabel.id);

          if (labelUpdateError) {
            // Log error but don't fail (tracking is already in Medusa metadata)
            Sentry.captureException(labelUpdateError, {
              tags: {
                component: "medusa_order_service",
                operation: "update_shipping_label_tracking",
              },
              extra: {
                orderIdPrefix: orderId.slice(0, 8),
                shippingLabelIdPrefix: shippingLabel.id.slice(0, 8),
              },
            });
          }
        }
        // If label doesn't exist, don't create one - just store in Medusa metadata
      }

      // Log tracking update to Sentry (no PII)
      Sentry.addBreadcrumb({
        category: "order.tracking_update",
        message: "Tracking number updated",
        level: "info",
        data: {
          orderIdPrefix: orderId.slice(0, 8),
          shippingProvider,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: {
          component: "medusa_order_service",
          operation: "update_tracking_number",
        },
        extra: { orderId, trackingNumber, shippingProvider, errorMessage },
      });
      throw error instanceof ApiError
        ? error
        : new ApiError(
            "INTERNAL_ERROR",
            `Failed to update tracking number: ${errorMessage}`,
            500
          );
    }
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

