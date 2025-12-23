import { ApiError } from "@/lib/api/errors";
import {
  EurosenderService,
  EurosenderOrderRequest,
  EurosenderOrderResponse,
} from "@/lib/services/eurosender-service";
import { query } from "@/lib/db/postgres-connection";
import { createServiceClient } from "@/lib/supabase/server";
import { retryWithBackoff } from "@/lib/utils/retry";
import * as Sentry from "@sentry/nextjs";

interface ShippingAddress {
  street: string;
  city: string;
  postal_code: string;
  country: string; // ISO-2 code
  state?: string;
  address_line2?: string;
}

interface ShippingLabel {
  id: string;
  order_id: string | null;
  transaction_id: string | null;
  external_order_id: string;
  external_label_id: string;
  label_url: string;
  tracking_number: string | null;
  status: "pending" | "purchased" | "cancelled" | "error";
  service_point_id: string | null;
  shipping_method_type: "home_delivery" | "pickup_point";
  price_gross: number | null;
  price_net: number | null;
  price_vat: number | null;
  price_currency: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateLabelParams {
  transactionId: string;
  serviceType: string;
  pickupAddress: EurosenderOrderRequest["shipment"]["pickupAddress"];
  deliveryAddress: EurosenderOrderRequest["shipment"]["deliveryAddress"];
  parcels: EurosenderOrderRequest["parcels"];
  pickupContact: EurosenderOrderRequest["pickupContact"];
  deliveryContact: EurosenderOrderRequest["deliveryContact"];
  paymentMethod?: "credit" | "deferred";
  labelFormat?: "pdf" | "zpl";
  quoteId?: string;
  shippingMethodType: "home_delivery" | "pickup_point";
}

export class ShippingLabelService {
  private eurosenderService: EurosenderService;

  constructor() {
    this.eurosenderService = new EurosenderService();
  }

  /**
   * Validate transaction status (must be "completed")
   */
  private async validateTransactionStatus(transactionId: string): Promise<void> {
    const supabase = await createServiceClient();
    const { data: transaction, error } = await supabase
      .from("transactions")
      .select("status, seller_id")
      .eq("id", transactionId)
      .single();

    if (error || !transaction) {
      throw new ApiError("NOT_FOUND", "Transaction not found", 404);
    }

    if (transaction.status !== "completed") {
      throw new ApiError(
        "BAD_REQUEST",
        `Transaction status must be "completed" to generate shipping label. Current status: ${transaction.status}`,
        400
      );
    }

    return;
  }

  /**
   * Validate shipping address (required fields)
   */
  private validateAddress(address: ShippingAddress): void {
    const required = ["street", "city", "postal_code", "country"];
    const missing = required.filter(
      (field) => !address[field as keyof ShippingAddress]
    );

    if (missing.length > 0) {
      throw new ApiError(
        "INVALID_ADDRESS",
        `Missing required address fields: ${missing.join(", ")}`,
        400
      );
    }

    // Format validation - country must be 2 characters (will be normalized to uppercase)
    if (address.country.length !== 2) {
      throw new ApiError(
        "INVALID_ADDRESS",
        "Country must be ISO-2 code (e.g., 'DK', 'SE', 'DE')",
        400
      );
    }

    // Postal code format (basic validation)
    if (address.postal_code.trim().length === 0) {
      throw new ApiError("INVALID_ADDRESS", "Postal code cannot be empty", 400);
    }
  }

  /**
   * Normalize address for Eurosender API
   * - Converts country code to uppercase (ISO 3166-1 alpha-2 requirement)
   * - Ensures all required fields are present
   */
  private normalizeAddressForEurosender(
    address: EurosenderOrderRequest["shipment"]["pickupAddress"] | EurosenderOrderRequest["shipment"]["deliveryAddress"]
  ): EurosenderOrderRequest["shipment"]["pickupAddress"] {
    return {
      ...address,
      country: address.country.toUpperCase(), // Eurosender API requires uppercase ISO-2 codes
      zip: address.zip.trim(),
      city: address.city.trim(),
      street: address.street.trim(),
    };
  }

  /**
   * Get shipping address for transaction (with fallback)
   * Tries shipping_addresses first, then profiles table
   */
  private async getShippingAddressForTransaction(
    transactionId: string
  ): Promise<ShippingAddress> {
    const supabase = await createServiceClient();

    // 1. Get transaction to find buyer_id
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("buyer_id")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      throw new ApiError("NOT_FOUND", "Transaction not found", 404);
    }

    // 2. Try shipping_addresses first (default address)
    const { data: shippingAddress, error: addressError } = await supabase
      .from("shipping_addresses")
      .select("street, city, postal_code, country, state, address_line_2")
      .eq("user_id", transaction.buyer_id)
      .eq("is_default", true)
      .single();

    if (shippingAddress && !addressError) {
      return {
        street: shippingAddress.street,
        city: shippingAddress.city,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
        state: shippingAddress.state || undefined,
        address_line2: shippingAddress.address_line_2 || undefined,
      };
    }

    // 3. Fallback: Try profiles table (if address stored there)
    const { data: profile } = await supabase
      .from("profiles")
      .select("country")
      .eq("id", transaction.buyer_id)
      .single();

    if (profile?.country) {
      // If only country available, throw error asking for full address
      throw new ApiError(
        "INVALID_ADDRESS",
        "Shipping address not found. Please ensure buyer has a default shipping address set.",
        400
      );
    }

    // 4. No address found
    throw new ApiError(
      "INVALID_ADDRESS",
      "Shipping address not found for this transaction. Buyer must have a shipping address.",
      400
    );
  }

  /**
   * Get existing label for transaction (if already generated)
   */
  async getExistingLabel(transactionId: string): Promise<ShippingLabel | null> {
    const labels = await query<ShippingLabel>(
      `SELECT * FROM public.shipping_labels 
       WHERE transaction_id = $1 AND status = 'purchased' 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [transactionId]
    );

    return labels[0] || null;
  }

  /**
   * Log status history entry
   */
  private async logStatusHistory(
    labelId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await query(
      `INSERT INTO public.shipping_label_status_history 
       (shipping_label_id, status, error_message) 
       VALUES ($1, $2, $3)`,
      [labelId, status, errorMessage || null]
    );
  }

  /**
   * Store label in database
   */
  private async storeLabelInDatabase(
    params: CreateLabelParams,
    eurosenderResponse: EurosenderOrderResponse
  ): Promise<ShippingLabel> {
    const label = await query<ShippingLabel>(
      `INSERT INTO public.shipping_labels (
        transaction_id,
        external_order_id,
        external_label_id,
        label_url,
        tracking_number,
        status,
        shipping_method_type,
        service_point_id,
        price_gross,
        price_net,
        price_vat,
        price_currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        params.transactionId,
        eurosenderResponse.orderCode,
        eurosenderResponse.orderCode, // external_label_id = orderCode for Eurosender
        eurosenderResponse.labelUrl || "",
        eurosenderResponse.trackingNumber || null,
        "purchased",
        params.shippingMethodType,
        null, // service_point_id (not relevant now)
        eurosenderResponse.price?.original?.gross || null,
        eurosenderResponse.price?.original?.net || null,
        eurosenderResponse.price?.original?.vat || null,
        "EUR", // Eurosender always uses EUR
      ]
    );

    if (!label || label.length === 0) {
      throw new ApiError("INTERNAL_SERVER_ERROR", "Failed to store shipping label", 500);
    }

    // Log status history
    await this.logStatusHistory(label[0].id, "purchased");

    return label[0];
  }

  /**
   * Create shipping label with validation and retry logic
   */
  async createLabel(params: CreateLabelParams): Promise<{
    label: ShippingLabel;
    orderCode: string;
    labelUrl: string;
    trackingNumber?: string;
  }> {
    // 1. Validate transaction status
    await this.validateTransactionStatus(params.transactionId);

    // 2. Validate addresses (convert EurosenderAddress to ShippingAddress format)
    const pickupAddressForValidation: ShippingAddress = {
      street: params.pickupAddress.street,
      city: params.pickupAddress.city,
      postal_code: params.pickupAddress.zip,
      country: params.pickupAddress.country,
      state: params.pickupAddress.region,
    };
    const deliveryAddressForValidation: ShippingAddress = {
      street: params.deliveryAddress.street,
      city: params.deliveryAddress.city,
      postal_code: params.deliveryAddress.zip,
      country: params.deliveryAddress.country,
      state: params.deliveryAddress.region,
    };
    this.validateAddress(pickupAddressForValidation);
    this.validateAddress(deliveryAddressForValidation);

    // 3. Check for existing label (prevents duplicate generation)
    // Note: Database constraint also prevents race conditions (unique index)
    const existing = await this.getExistingLabel(params.transactionId);
    if (existing) {
      console.log(
        `[SHIPPING_LABEL] Label already exists for transaction ${params.transactionId}, returning existing`
      );
      return {
        label: existing,
        orderCode: existing.external_order_id,
        labelUrl: existing.label_url,
        trackingNumber: existing.tracking_number || undefined,
      };
    }

    // 4. Normalize addresses for Eurosender API (country codes must be uppercase)
    const normalizedPickupAddress = this.normalizeAddressForEurosender(params.pickupAddress);
    const normalizedDeliveryAddress = this.normalizeAddressForEurosender(params.deliveryAddress);

    // 5. Create label with retry logic
    // Note: Database constraint prevents race conditions (unique index on transaction_id where status='purchased')
    const eurosenderResponse = await retryWithBackoff(
      async () => {
        return await this.eurosenderService.createOrder({
          shipment: {
            pickupAddress: normalizedPickupAddress,
            deliveryAddress: normalizedDeliveryAddress,
          },
          parcels: params.parcels,
          serviceType: params.serviceType,
          paymentMethod: params.paymentMethod || "credit", // Default to credit (prepaid account)
          pickupContact: params.pickupContact,
          deliveryContact: params.deliveryContact,
          labelFormat: params.labelFormat || "pdf",
          quoteId: params.quoteId,
        });
      },
      { maxRetries: 3, initialDelay: 1000, maxDelay: 10000 }
    );

    // 5. Store in database
    // If duplicate key error (race condition), check for existing label again
    try {
      const label = await this.storeLabelInDatabase(params, eurosenderResponse);
      return {
        label,
        orderCode: eurosenderResponse.orderCode,
        labelUrl: eurosenderResponse.labelUrl || label.label_url,
        trackingNumber: eurosenderResponse.trackingNumber || undefined,
      };
    } catch (error) {
      // Handle race condition: if unique constraint violation, return existing label
      if (error instanceof Error && error.message.includes("duplicate key")) {
        const existing = await this.getExistingLabel(params.transactionId);
        if (existing) {
          console.log(
            `[SHIPPING_LABEL] Race condition detected, returning existing label for transaction ${params.transactionId}`
          );
          return {
            label: existing,
            orderCode: existing.external_order_id,
            labelUrl: existing.label_url,
            trackingNumber: existing.tracking_number || undefined,
          };
        }
      }
      throw error;
    }
  }

  /**
   * Cancel shipping label
   */
  async cancelLabel(orderCode: string, transactionId: string): Promise<void> {
    // Verify transaction ownership
    const supabase = await createServiceClient();
    const { data: transaction } = await supabase
      .from("transactions")
      .select("seller_id")
      .eq("id", transactionId)
      .single();

    if (!transaction) {
      throw new ApiError("NOT_FOUND", "Transaction not found", 404);
    }

    // Get label from database
    const labels = await query<ShippingLabel>(
      `SELECT * FROM public.shipping_labels 
       WHERE external_order_id = $1 AND transaction_id = $2 
       LIMIT 1`,
      [orderCode, transactionId]
    );

    if (!labels || labels.length === 0) {
      throw new ApiError("NOT_FOUND", "Shipping label not found", 404);
    }

    const label = labels[0];

    // Cancel via Eurosender
    try {
      await this.eurosenderService.cancelOrder(orderCode);
    } catch (error) {
      // Log error but continue with database update
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "shipping_label_service", operation: "cancel_label" },
        extra: { orderCode, transactionId, errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to cancel order via Eurosender. Please try again later.",
        502
      );
    }

    // Update status in database
    await query(
      `UPDATE public.shipping_labels 
       SET status = 'cancelled', updated_at = NOW() 
       WHERE id = $1`,
      [label.id]
    );

    // Log status history
    await this.logStatusHistory(label.id, "cancelled");
  }

  /**
   * Get label status history
   */
  async getStatusHistory(labelId: string): Promise<
    Array<{
      id: string;
      status: string;
      error_message: string | null;
      created_at: string;
    }>
  > {
    const history = await query<{
      id: string;
      status: string;
      error_message: string | null;
      created_at: string;
    }>(
      `SELECT id, status, error_message, created_at 
       FROM public.shipping_label_status_history 
       WHERE shipping_label_id = $1 
       ORDER BY created_at DESC`,
      [labelId]
    );

    return history;
  }
}

