import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

// Lazy-initialize Eurosender API key
let eurosenderApiKey: string | null = null;
let eurosenderBaseUrl: string | null = null;

function getEurosenderApiKey(): string {
  if (!eurosenderApiKey) {
    const key = process.env.EUROSENDER_API_KEY;
    if (!key) {
      throw new Error("EUROSENDER_API_KEY is not configured");
    }
    eurosenderApiKey = key;
  }
  return eurosenderApiKey;
}

function getEurosenderBaseUrl(): string {
  if (!eurosenderBaseUrl) {
    const url =
      process.env.EUROSENDER_API_URL || "https://sandbox-api.eurosender.com";
    eurosenderBaseUrl = url;
  }
  return eurosenderBaseUrl;
}

// Eurosender API Types (based on OpenAPI schema)

export interface EurosenderAddress {
  country: string; // ISO 2-letter country code
  zip: string; // Postal code
  city: string;
  street: string;
  region?: string; // Required for IE, RO, IT, US, CA
  regionId?: number; // Alternative to region name
  cityId?: number; // Required for IE, RO
}

export interface EurosenderContact {
  name: string;
  phone: string;
  email: string;
  company?: string;
}

export interface EurosenderParcel {
  parcelId: string; // e.g., "A00001"
  quantity: number;
  width: number; // cm
  height: number; // cm
  length: number; // cm
  weight: number; // kg
  content?: string; // e.g., "jersey"
  value?: number; // EUR value
}

export interface EurosenderParcels {
  packages?: EurosenderParcel[];
  envelopes?: Array<{
    envelopeId: string;
    quantity: number;
    weight: number;
  }>;
  pallets?: Array<{
    palletId: string;
    quantity: number;
    weight: number;
    width: number;
    height: number;
    length: number;
  }>;
  vans?: Array<{
    vanId: string;
    quantity: number;
  }>;
  ltls?: Array<{
    ltlId: string;
    quantity: number;
    weight: number;
  }>;
  ftls?: Array<{
    ftlId: string;
    quantity: number;
  }>;
}

export interface EurosenderQuoteRequest {
  shipment: {
    pickupAddress: EurosenderAddress;
    deliveryAddress: EurosenderAddress;
    pickupDate?: string; // RFC 3339 format: "2024-10-20T00:00:00Z"
  };
  parcels: EurosenderParcels;
  paymentMethod?: "credit" | "deferred";
  currencyCode?: string; // Default: "EUR" (only EUR supported)
  serviceType?: "selection" | "flexi" | "regular_plus" | "express" | "freight" | "van" | "ftl";
  insuranceId?: number;
}

export interface EurosenderQuoteOption {
  id: string; // Quote ID (use this for order creation)
  serviceType: string; // "flexi", "regular_plus", "express", etc.
  courierId: number; // Use this for PUDO point search
  price: {
    original: {
      gross: number; // EUR price (e.g., 10.50)
      net: number;
      vat: number;
    };
  };
  edt?: string; // Estimated delivery time (e.g., "2-3 days")
  carrier?: {
    name: string;
    code: string;
  };
  customPickupTimeframeAvailable?: boolean;
}

export interface EurosenderQuoteResponse {
  options: {
    serviceTypes: EurosenderQuoteOption[];
  };
}

export interface EurosenderOrderRequest {
  shipment: {
    pickupAddress: EurosenderAddress;
    deliveryAddress: EurosenderAddress;
    pickupDate?: string; // RFC 3339 format
    pickupTimeframe?: {
      from: string; // RFC 3339 format
      to: string; // RFC 3339 format
    };
  };
  parcels: EurosenderParcels;
  serviceType: string; // From quote
  paymentMethod: "credit" | "deferred";
  pickupContact: EurosenderContact;
  deliveryContact: EurosenderContact;
  labelFormat?: "pdf" | "zpl"; // Default: "pdf"
  quoteId?: string; // Optional: reference to quote
  insuranceId?: number;
  pudoPointCode?: string; // For pickup point delivery
}

export interface EurosenderOrderResponse {
  orderCode: string; // Use this as external_order_id
  status: string;
  labelUrl?: string; // PDF download URL (if available immediately)
  trackingNumber?: string; // Carrier tracking number (if available)
  price: {
    original: {
      gross: number; // EUR
      net: number;
      vat: number;
    };
  };
  courierId?: number;
  serviceType?: string;
}

export interface EurosenderOrderDetails {
  orderCode: string;
  status: string;
  labelUrl?: string;
  trackingNumber?: string;
  price: {
    original: {
      gross: number;
      net: number;
      vat: number;
    };
  };
  courierId?: number;
  serviceType?: string;
  pickupAddress?: EurosenderAddress;
  deliveryAddress?: EurosenderAddress;
  createdAt?: string;
  updatedAt?: string;
}

export interface EurosenderTrackingResponse {
  orderCode: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  events?: Array<{
    date: string;
    status: string;
    location?: string;
    description?: string;
  }>;
}

export interface EurosenderPudoPoint {
  pudoPointCode: string; // Use this in order creation
  locationName: string;
  street: string;
  zip: string;
  city: string;
  geolocation: { latitude: number; longitude: number };
  openingHours: Array<{
    dayNameLong: string;
    dayNameShort: string;
    times: Array<{ from: string; to: string }>;
  }>;
  shippingCutOffTime: string | null;
  features: string[];
  pointEmail: string | null;
  pointPhone: string | null;
  holidayDates: string[];
}

export interface EurosenderPudoPointsRequest {
  courierId: number; // Required - from quote response
  country: string; // ISO 2-letter
  geolocation?: { latitude: number; longitude: number };
  address?: { street?: string; zip?: string; city?: string };
  distanceFromLocation: number; // km radius (min 1)
  // Parcels structure: Nested object with parcels array (as per implementation plan)
  parcels: {
    parcels: Array<{
      parcelId: string;
      weight: number; // kg
      length: number; // cm
      width: number; // cm
      height: number; // cm
    }>;
  };
  filterBySide: "pickupSide" | "deliverySide";
  resultsLimit?: number;
  pickupDate?: string; // YYYY-MM-DD
}

export interface EurosenderPudoPointsResponse {
  points: EurosenderPudoPoint[];
}

/**
 * EurosenderService - Handles Eurosender API integration
 *
 * Reusable service for HUD-36 (rate calculation) and HUD-42 (label generation)
 *
 * API Documentation: https://integrators.eurosender.com/apis
 * Base URLs:
 * - Sandbox: https://sandbox-api.eurosender.com
 * - Production: https://api.eurosender.com
 */
export class EurosenderService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = getEurosenderApiKey();
    this.baseUrl = getEurosenderBaseUrl();
  }

  /**
   * Make authenticated request to Eurosender API
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "DELETE";
      body?: unknown;
    } = {}
  ): Promise<T> {
    const { method = "GET", body } = options;

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: HeadersInit = {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      };

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : `Eurosender API error: ${response.status}`;

        // Log detailed error for debugging
        console.error("[EUROSENDER] API Error:", {
          status: response.status,
          statusText: response.statusText,
          endpoint,
          errorBody: error,
          errorMessage,
        });

        // Map HTTP status codes to ApiError codes
        if (response.status === 400) {
          throw new ApiError("BAD_REQUEST", errorMessage, 400, error);
        }
        if (response.status === 401) {
          throw new ApiError(
            "UNAUTHORIZED",
            "Invalid Eurosender API key",
            401
          );
        }
        if (response.status === 404) {
          throw new ApiError("NOT_FOUND", errorMessage, 404);
        }
        if (response.status === 429) {
          throw new ApiError(
            "RATE_LIMIT",
            "Eurosender API rate limit exceeded. Please try again later.",
            429
          );
        }

        throw new ApiError(
          "EXTERNAL_SERVICE_ERROR",
          errorMessage,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "eurosender_service", operation: endpoint },
        extra: { errorMessage, method, endpoint },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to communicate with Eurosender API. Please try again later.",
        502
      );
    }
  }

  /**
   * Get shipping quotes (rate calculation)
   *
   * @param params Quote request parameters
   * @returns Quote response with available service types and prices
   */
  async getQuotes(
    params: EurosenderQuoteRequest
  ): Promise<EurosenderQuoteResponse> {
    try {
      console.log("[EUROSENDER] Getting quotes:", {
        from: `${params.shipment.pickupAddress.city}, ${params.shipment.pickupAddress.country}`,
        to: `${params.shipment.deliveryAddress.city}, ${params.shipment.deliveryAddress.country}`,
        serviceType: params.serviceType || "all",
      });

      // Eurosender API returns a different structure than our interface
      // API returns: { name: "selection", courierId: 3, ... }
      // We need: { serviceType: "selection", id: "...", courierId: 3, ... }
      interface RawServiceType {
        name: string;
        serviceSubtype?: string;
        courierId: number;
        price: {
          original: {
            currencyCode: string;
            gross: number;
            net: number;
          };
        };
        edt?: string;
        minPickupDate?: string;
        insurances?: Array<{ id: number; coverage: number; text: string; price: { original: { gross: number; net: number } } }>;
        pickupExcludedDates?: string[];
        addOns?: unknown[];
        isCallRequired?: boolean;
        isLabelRequired?: boolean;
      }

      const rawResponse = await this.request<{ options: { serviceTypes: RawServiceType[] } }>(
        "/v1/quotes",
        {
          method: "POST",
          body: params,
        }
      );

      // Map the raw response to our expected interface
      const mappedServiceTypes: EurosenderQuoteOption[] = (rawResponse.options?.serviceTypes || []).map((st, index) => ({
        id: `quote-${st.name}-${st.courierId}-${index}`, // Generate unique ID
        serviceType: st.name, // Map 'name' to 'serviceType'
        courierId: st.courierId,
        price: {
          original: {
            gross: st.price.original.gross,
            net: st.price.original.net,
            vat: st.price.original.gross - st.price.original.net,
          },
        },
        edt: st.edt,
      }));

      console.log("[EUROSENDER] Quotes received:", {
        count: mappedServiceTypes.length,
        serviceTypes: mappedServiceTypes.map((st) => st.serviceType),
        firstOption: mappedServiceTypes[0] ? { 
          id: mappedServiceTypes[0].id,
          serviceType: mappedServiceTypes[0].serviceType,
          price: mappedServiceTypes[0].price.original.gross 
        } : null,
      });

      // Validate response has options
      if (mappedServiceTypes.length === 0) {
        throw new ApiError(
          "NO_SHIPPING_RATES",
          "No shipping quotes available for this address",
          404
        );
      }

      const response: EurosenderQuoteResponse = {
        options: {
          serviceTypes: mappedServiceTypes,
        },
      };

      return response;
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "eurosender_service", operation: "get_quotes" },
        extra: { errorMessage },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to get shipping quotes. Please try again later.",
        502
      );
    }
  }

  /**
   * Create order and generate label
   *
   * @param params Order creation parameters
   * @returns Order response with orderCode, labelUrl, trackingNumber
   */
  async createOrder(
    params: EurosenderOrderRequest
  ): Promise<EurosenderOrderResponse> {
    try {
      console.log("[EUROSENDER] Creating order:", {
        serviceType: params.serviceType,
        paymentMethod: params.paymentMethod,
        hasPudoPoint: !!params.pudoPointCode,
      });

      // Eurosender API requires orderContact (use pickupContact as orderContact)
      // pickupContact, deliveryContact and quoteId are removed from top level
      // quoteId is not a valid Eurosender API field - it's only used internally
      const { pickupContact, deliveryContact, quoteId, ...requestBody } = params;
      
      // Validate pickupContact exists and has required fields (needed for orderContact)
      if (!pickupContact) {
        throw new ApiError(
          "BAD_REQUEST",
          "pickupContact is required for order creation. Please provide contact information for the pickup address.",
          400
        );
      }

      if (!pickupContact.name || !pickupContact.phone || !pickupContact.email) {
        throw new ApiError(
          "BAD_REQUEST",
          "pickupContact must include name, phone, and email fields.",
          400
        );
      }
      
      // Add orderContact (required by API) - use pickupContact as orderContact
      const requestBodyWithOrderContact = {
        ...requestBody,
        orderContact: {
          name: pickupContact.name.trim(),
          phone: pickupContact.phone.trim(),
          email: pickupContact.email.trim(),
        },
      };

      const response = await this.request<EurosenderOrderResponse>(
        "/v1/orders",
        {
          method: "POST",
          body: requestBodyWithOrderContact,
        }
      );

      console.log("[EUROSENDER] Order created:", {
        orderCode: response.orderCode,
        status: response.status,
        hasLabel: !!response.labelUrl,
        hasTracking: !!response.trackingNumber,
      });

      return response;
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "eurosender_service", operation: "create_order" },
        extra: { errorMessage },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to create shipping order. Please try again later.",
        502
      );
    }
  }

  /**
   * Get order details
   *
   * @param orderCode Eurosender order code
   * @returns Order details including status, label URL, tracking
   */
  async getOrderDetails(
    orderCode: string
  ): Promise<EurosenderOrderDetails> {
    try {
      console.log("[EUROSENDER] Getting order details:", { orderCode });
      
      const response = await this.request<EurosenderOrderDetails>(
        `/v1/orders/${orderCode}`,
        {
          method: "GET",
        }
      );

      console.log("[EUROSENDER] Order details received:", {
        orderCode: response.orderCode,
        status: response.status,
        hasLabelUrl: !!response.labelUrl,
        hasTrackingNumber: !!response.trackingNumber,
        labelUrl: response.labelUrl || "Not available",
        trackingNumber: response.trackingNumber || "Not available",
        serviceType: response.serviceType,
        courierId: response.courierId,
      });

      return response;
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: {
          component: "eurosender_service",
          operation: "get_order_details",
        },
        extra: { errorMessage, orderCode },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to get order details. Please try again later.",
        502
      );
    }
  }

  /**
   * Get label PDF URL
   *
   * @param orderCode Eurosender order code
   * @returns Label URL (if available)
   */
  async getLabel(orderCode: string): Promise<{ labelUrl: string }> {
    try {
      const response = await this.request<{ labelUrl: string }>(
        `/v1/orders/${orderCode}/labels`,
        {
          method: "GET",
        }
      );

      return response;
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "eurosender_service", operation: "get_label" },
        extra: { errorMessage, orderCode },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to get shipping label. Please try again later.",
        502
      );
    }
  }

  /**
   * Get tracking details
   *
   * @param orderCode Eurosender order code
   * @returns Tracking information
   */
  async getTracking(
    orderCode: string
  ): Promise<EurosenderTrackingResponse> {
    try {
      const response = await this.request<EurosenderTrackingResponse>(
        `/v1/orders/${orderCode}/tracking`,
        {
          method: "GET",
        }
      );

      return response;
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "eurosender_service", operation: "get_tracking" },
        extra: { errorMessage, orderCode },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to get tracking information. Please try again later.",
        502
      );
    }
  }

  /**
   * Cancel order
   *
   * @param orderCode Eurosender order code
   * @returns Cancellation confirmation
   */
  async cancelOrder(orderCode: string): Promise<{ success: boolean }> {
    try {
      const response = await this.request<{ success: boolean }>(
        `/v1/orders/${orderCode}`,
        {
          method: "DELETE",
        }
      );

      return response;
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "eurosender_service", operation: "cancel_order" },
        extra: { errorMessage, orderCode },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to cancel order. Please try again later.",
        502
      );
    }
  }

  /**
   * Search for PUDO (Pick-Up Drop-Off) points
   *
   * @param params PUDO search parameters (requires courierId from quote)
   * @returns PUDO point response with points array
   */
  async searchPudoPoints(
    params: EurosenderPudoPointsRequest
  ): Promise<EurosenderPudoPointsResponse> {
    try {
      // Eurosender PUDO API expects an array of requests (one per courier)
      // Each request in the array is an object with the PUDO search parameters
      // The API returns an array of responses (one per request)
      const requestBody = [params];
      
      console.log("[EUROSENDER] PUDO request body (array):", JSON.stringify(requestBody, null, 2));
      
      const responses = await this.request<EurosenderPudoPointsResponse[]>(
        "/v1/pudo/list",
        {
          method: "POST",
          body: requestBody, // Array of requests
        }
      );

      console.log("[EUROSENDER] PUDO response:", {
        responsesCount: responses?.length || 0,
        firstResponsePoints: responses?.[0]?.points?.length || 0,
      });

      // Return first response (or empty points if no responses)
      return responses?.[0] || { points: [] };
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "eurosender_service", operation: "search_pudo_points" },
        extra: { errorMessage, courierId: params.courierId, country: params.country },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to search PUDO points. Please try again later.",
        502
      );
    }
  }
}

