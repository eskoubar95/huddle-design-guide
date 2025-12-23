# Shipping Label Generation Integration - Eurosender Implementation Plan

**Linear Issue:** [HUD-42](https://linear.app/huddle-world/issue/HUD-42/feature-shipping-label-generation-integration-eurosender)  
**Status:** ✅ Core Implementation Complete | ⏳ Awaiting Production for Label Testing | ⏳ Frontend UI Integration Pending  
**Priority:** High  
**Estimated Time:** 8-10 timer  
**Estimated LOC:** ~600 LOC  
**Last Updated:** 2025-12-20

---

## 🎯 Current Implementation Status (2025-12-19)

### ✅ Completed

**1. Order Creation Flow**
- ✅ Quote-first approach implemented (`/api/v1/shipping/quotes`)
- ✅ Dynamic service type selection from available quotes
- ✅ Order creation via Eurosender API (`POST /api/v1/shipping/labels`)
- ✅ Country code normalization (uppercase ISO 3166-1 alpha-2)
- ✅ Payment method: "credit" (Huddle account credit)
- ✅ `orderContact` field correctly implemented
- ✅ Address normalization for Eurosender API
- ✅ Error handling and retry logic
- ✅ Database storage of order details (`shipping_labels` table)

**2. Order Retrieval & Database Sync**
- ✅ `GET /api/v1/shipping/labels/[orderCode]` endpoint working
- ✅ Order details fetching from Eurosender API
- ✅ Ownership verification (seller/buyer check)
- ✅ **Automatic database sync** - Updates `label_url`, `tracking_number`, `status`, `price_gross`, `price_net`, `price_vat` when order details are fetched
- ✅ Status mapping from Eurosender to database (Confirmed → purchased)
- ✅ Test UI for manual testing (`/seller/test-shipping-label`)

**3. Services**
- ✅ `EurosenderService.createOrder()` - Working
- ✅ `EurosenderService.getQuotes()` - Working with proper mapping
- ✅ `EurosenderService.getOrderDetails()` - Working
- ✅ `ShippingLabelService.createLabel()` - Complete with validation
- ✅ Address normalization helpers
- ✅ Price storage in database (`price_gross`, `price_net`, `price_vat`, `price_currency`)

**4. Frontend**
- ✅ `ShippingLabelGenerator` component with quote-first flow
- ✅ Test page for manual testing
- ✅ Error handling and user feedback

### ⚠️ Known Limitations (Sandbox Mode)

**Label Generation:**
- ⚠️ Labels are NOT generated in Eurosender sandbox mode
- ⚠️ `labelUrl` and `trackingNumber` remain empty/null in sandbox
- ⚠️ Order status: "Confirmed" but label not available
- ✅ Order creation works correctly (tested with orderCode: `311525-25`)

### 🔄 Pending for Production

**1. Label Generation Testing**
- ⏳ Test actual label PDF generation in production
- ⏳ Verify `labelUrl` is populated when label is ready
- ⏳ Verify `trackingNumber` is populated
- ⏳ Test label download functionality

**2. Asynchronous Label Handling**
- ✅ **Database sync implemented** - GET endpoint automatically updates database when label becomes available
- ⏳ Implement polling mechanism for label status (optional - can be done via periodic GET requests)
- ⏳ Or implement webhook handler (if Eurosender supports webhooks - optional)
- ✅ Update database when label becomes available (done via GET endpoint sync)

**3. Production Readiness**
- ⏳ Verify production API credentials
- ⏳ Test with real shipping addresses
- ⏳ Monitor error rates and retry logic
- ⏳ Set up monitoring/alerts for failed label generations

---

## Overview

Implementer shipping label generation via Eurosender API, så sælgere kan generere og printe shipping labels direkte fra Huddle når en order er betalt. Labels kan ikke genereres flere gange, men sælgere skal kunne hente eksisterende labels igen.

**Key Requirements:**
- Validate order status (transaction must be "completed")
- Validate addresses from user profile before generation
- Check for existing labels (no duplicate generation)
- Retry logic for failed API calls
- Status history for audit trail
- Frontend UI for label generation and retrieval

---

## Current State Analysis

### ✅ What Exists

**1. EurosenderService (Complete)**
- Location: `apps/web/lib/services/eurosender-service.ts`
- Methods: `createOrder()`, `getOrderDetails()`, `getLabel()`, `cancelOrder()`, `getTracking()`
- Error handling: ApiError pattern med Sentry logging
- API key management: Lazy-initialized

**2. Database Schema (Complete)**
- Location: `supabase/migrations/20251217101000_create_shipping_labels.sql`
- Tabel: `shipping_labels` med alle nødvendige kolonner
- ✅ Price fields added: `price_gross`, `price_net`, `price_vat`, `price_currency` (migration: `20251220000000_add_price_fields_to_shipping_labels.sql`)
- ✅ Status history table: `shipping_label_status_history` for audit trail
- Indexes: På `order_id`, `transaction_id`, `status`, `price_gross`
- RLS: Enabled (service-role only access)

**3. API Endpoints**
- ✅ `POST /api/v1/shipping/labels` - Komplet med validation, database storage, og price fields
- ✅ `GET /api/v1/shipping/labels/[orderCode]` - Komplet med database sync (status, label_url, tracking_number, price)
- ✅ `POST /api/v1/shipping/quotes` - Quote-first approach for service type selection
- ⏳ `POST /api/v1/shipping/labels/[orderCode]/cancel` - Mangler (optional feature)

**4. Retry Patterns (Available)**
- Location: `supabase/functions/_shared/utils/retry.ts`
- Function: `retryWithBackoff()` med exponential backoff
- Options: `maxRetries` (default: 3), `initialDelay` (default: 1000ms), `maxDelay` (default: 10000ms)

**5. Address Storage**
- Location: `supabase/migrations/20251213171000_create_shipping_addresses.sql`
- Tabel: `shipping_addresses` med user_id, street, city, postal_code, country, etc.
- Support for multiple addresses per user, one default

### ⚠️ What's Missing

**1. ShippingLabelService (Wrapper)**
- Higher-level service der:
  - Validerer order status (transaction.status = "completed")
  - Validerer addresses (fra user profile/shipping_addresses)
  - Håndterer retry logic
  - Gemmer label info i database
  - Returnerer existing label hvis allerede genereret

**2. Status History**
- Ingen tabel for label status changes
- Mangler audit log for generation attempts, status changes, errors

**3. Address Validation (Backend)**
- Google Maps API kun i frontend
- Mangler backend validation af addresses før label generation

**4. Order Validation**
- Mangler check for transaction.status = "completed"
- Mangler check for existing label (no duplicate generation)

**5. Frontend UI**
- Mangler "Generate Shipping Label" button i seller dashboard
- Mangler "Retrieve Label" button
- Mangler label download UI

---

## Desired End State

### Functional Requirements

1. **Label Generation:**
   - Sælger kan generere label når transaction.status = "completed"
   - Address validation før generation
   - Check for existing label (return existing, don't generate new)
   - Retry logic for failed API calls (3 attempts, exponential backoff)
   - Store label info i database efter generation
   - Log status history for alle changes

2. **Label Retrieval:**
   - Sælger kan hente eksisterende label igen
   - Endpoint eksisterer allerede (`GET /api/v1/shipping/labels/[orderCode]`)
   - Frontend UI skal gøre det tydeligt tilgængeligt

3. **Label Cancellation:**
   - Sælger kan annullere label via Eurosender API
   - Update status i database
   - Log status history

4. **Error Handling:**
   - Klare error messages til sælgere
   - Graceful degradation hvis Eurosender API er nede
   - Status history for debugging

### Technical Requirements

- All code follows Huddle patterns (ApiError, Sentry logging, no PII)
- Database operations use direct SQL queries (shipping_labels not in Supabase types)
- Retry logic uses existing `retryWithBackoff` utility
- Address validation checks required fields (street, city, postal_code, country)
- Status history logs all changes (pending → purchased → cancelled/error)

---

## What We're NOT Doing

1. **Service Point Support** - Deferred (not relevant now)
2. **Email Notifications** - Deferred to HUD-44 (Transactional Emails)
3. **Webhook Endpoint** - Optional, not in scope for MVP
4. **Manual Shipment Flow** - Deferred (complex payment flow)
5. **Multiple Label Generation** - Labels kan kun genereres én gang (return existing)
6. **Medusa Order Integration** - Depends on HUD-39 (but we validate transaction status)

---

## Implementation Approach

**Strategy:** Incremental implementation med pause points efter hver fase. Start med foundation (service + database), derefter API endpoints, så frontend.

**Dependencies:**
- ✅ HUD-36: Shipping Calculation Service (complete)
- ⚠️ HUD-39: Medusa Order Integration (for order management, but we can validate transaction status now)
- ❌ HUD-43: Service Point Picker UI (cancelled - not relevant)

**Note:** Vi kan implementere label generation nu baseret på transaction status, selvom HUD-39 ikke er færdig. Når HUD-39 er færdig, kan vi tilføje Medusa order validation.

---

## Rollback Strategy

### Database Changes
- **Migration:** `20251219_create_shipping_label_status_history.sql`
  - **Rollback:** `DROP TABLE IF EXISTS public.shipping_label_status_history;`
  - **Rollback:** `DROP INDEX IF EXISTS shipping_labels_transaction_purchased_unique;`
  - **Reversible:** Yes - table can be dropped without affecting existing labels

### Service Changes
- **ShippingLabelService:** New file, can be removed if needed
- **Rollback:** Delete `apps/web/lib/services/shipping-label-service.ts`
- **Impact:** Label generation will fail, but existing labels remain accessible

### API Endpoints
- **New endpoints:** Can be disabled by removing route files
- **Modified endpoint:** `POST /api/v1/shipping/labels` - Can revert to previous version
- **Rollback:** Remove new route files, restore previous version of modified route

### Frontend Changes
- **ShippingLabelGenerator component:** Can be hidden via feature flag or removed
- **Rollback:** Remove component import and usage from order detail pages
- **Impact:** Sælgere kan ikke generere labels via UI, men kan stadig bruge API direkte

### Feature Flag (Optional)
- **Environment variable:** `ENABLE_SHIPPING_LABEL_GENERATION=false`
- **Usage:** Check in API routes before processing label generation
- **Quick disable:** Set to false to disable feature without code changes

### Data Preservation
- **Existing labels:** Not affected by rollback (stored in `shipping_labels` table)
- **Status history:** Can be preserved or dropped (audit log, not critical for functionality)
- **No data loss:** All existing labels remain accessible

### Rollback Steps
1. **Quick disable:** Set `ENABLE_SHIPPING_LABEL_GENERATION=false` (if implemented)
2. **Remove frontend:** Remove ShippingLabelGenerator component usage
3. **Revert API:** Restore previous version of `POST /api/v1/shipping/labels`
4. **Remove service:** Delete ShippingLabelService (optional, if keeping old endpoint)
5. **Database rollback:** Run rollback migration (if needed)

**Estimated Rollback Time:** 15-30 minutes

---

## Phase 1: Foundation - ShippingLabelService & Status History

### Overview

Opret `ShippingLabelService` wrapper class og `shipping_label_status_history` tabel. Service skal håndtere order validation, address validation, existing label check, retry logic, og database operations.

### Changes Required

#### 1. Create Status History Table Migration

**File:** `supabase/migrations/20251219_create_shipping_label_status_history.sql`

**Changes:** Opret tabel for logging alle label status changes

```sql
-- Migration: Create shipping_label_status_history table
-- HUD-42 Phase 1
-- Date: 2025-12-19
--
-- Creates audit log table for shipping label status changes.
-- Logs all attempts, successes, failures, and status transitions.

CREATE TABLE IF NOT EXISTS public.shipping_label_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_label_id UUID NOT NULL REFERENCES public.shipping_labels(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'purchased', 'cancelled', 'error')),
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipping_label_status_history_label_id 
  ON public.shipping_label_status_history(shipping_label_id);
CREATE INDEX IF NOT EXISTS idx_shipping_label_status_history_created_at 
  ON public.shipping_label_status_history(created_at DESC);

-- Enable RLS (service-role only access)
ALTER TABLE public.shipping_label_status_history ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.shipping_label_status_history IS 'Audit log for shipping label status changes. Tracks all generation attempts, successes, failures, and cancellations.';
COMMENT ON COLUMN public.shipping_label_status_history.error_message IS 'Error message if status is "error", NULL otherwise.';
```

**Rationale:** Audit trail for debugging og compliance. Logs alle status changes med timestamps og error messages.

#### 1b. Add Race Condition Prevention Constraint

**File:** `supabase/migrations/20251219_create_shipping_label_status_history.sql` (add to same migration)

**Changes:** Tilføj unique constraint for at forhindre duplicate labels for samme transaction

```sql
-- Prevent duplicate purchased labels for same transaction (race condition prevention)
-- Only one purchased label per transaction allowed
CREATE UNIQUE INDEX IF NOT EXISTS shipping_labels_transaction_purchased_unique 
  ON public.shipping_labels(transaction_id) 
  WHERE status = 'purchased';

COMMENT ON INDEX shipping_labels_transaction_purchased_unique IS 'Prevents duplicate label generation for same transaction. Ensures only one purchased label per transaction (race condition prevention).';
```

**Rationale:** Forhindrer race conditions hvor to samtidige requests genererer labels for samme transaction. Constraint sikrer at kun én purchased label kan eksistere per transaction.

#### 2. Create ShippingLabelService

**File:** `apps/web/lib/services/shipping-label-service.ts`

**Changes:** Opret service class med alle nødvendige metoder

```typescript
import { ApiError } from "@/lib/api/errors";
import { EurosenderService, EurosenderOrderRequest, EurosenderOrderResponse } from "@/lib/services/eurosender-service";
import { query } from "@/lib/db/postgres-connection";
import { createServiceClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

// Copy retry utility (or import from shared location)
// Note: retry.ts is in supabase/functions/_shared, we need it in apps/web
// Option 1: Copy to apps/web/lib/utils/retry.ts
// Option 2: Import from supabase functions (if accessible)
// For now, we'll create a local copy

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
  } = options;

  let lastError: Error | unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        console.log(`[SHIPPING_LABEL] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

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
    const missing = required.filter((field) => !address[field as keyof ShippingAddress]);

    if (missing.length > 0) {
      throw new ApiError(
        "INVALID_ADDRESS",
        `Missing required address fields: ${missing.join(", ")}`,
        400
      );
    }

    // Format validation
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
    const { data: shippingAddress } = await supabase
      .from("shipping_addresses")
      .select("street, city, postal_code, country, state, address_line2")
      .eq("user_id", transaction.buyer_id)
      .eq("is_default", true)
      .single();

    if (shippingAddress) {
      return {
        street: shippingAddress.street,
        city: shippingAddress.city,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
        state: shippingAddress.state || undefined,
        address_line2: shippingAddress.address_line2 || undefined,
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
        service_point_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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

    // 2. Validate addresses
    this.validateAddress(params.pickupAddress);
    this.validateAddress(params.deliveryAddress);

    // 3. Check for existing label (prevents duplicate generation)
    // Note: Database constraint also prevents race conditions (unique index)
    const existing = await this.getExistingLabel(params.transactionId);
    if (existing) {
      console.log(`[SHIPPING_LABEL] Label already exists for transaction ${params.transactionId}, returning existing`);
      return {
        label: existing,
        orderCode: existing.external_order_id,
        labelUrl: existing.label_url,
        trackingNumber: existing.tracking_number || undefined,
      };
    }

    // 4. Create label with retry logic
    // Note: Database constraint prevents race conditions (unique index on transaction_id where status='purchased')
    const eurosenderResponse = await retryWithBackoff(
      async () => {
        return await this.eurosenderService.createOrder({
          shipment: {
            pickupAddress: params.pickupAddress,
            deliveryAddress: params.deliveryAddress,
          },
          parcels: params.parcels,
          serviceType: params.serviceType,
          paymentMethod: params.paymentMethod || "deferred",
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
          console.log(`[SHIPPING_LABEL] Race condition detected, returning existing label for transaction ${params.transactionId}`);
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

    return {
      label,
      orderCode: eurosenderResponse.orderCode,
      labelUrl: eurosenderResponse.labelUrl || label.label_url,
      trackingNumber: eurosenderResponse.trackingNumber || undefined,
    };
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
  async getStatusHistory(labelId: string): Promise<Array<{
    id: string;
    status: string;
    error_message: string | null;
    created_at: string;
  }>> {
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
```

**Rationale:** Centraliserer al label generation logik med validation, retry, og database operations. Følger eksisterende patterns (ApiError, Sentry, direct SQL queries).

#### 3. Create Retry Utility (if needed)

**File:** `apps/web/lib/utils/retry.ts`

**Changes:** Copy retry utility fra supabase functions til apps/web (hvis ikke tilgængelig)

```typescript
/**
 * Retry utility with exponential backoff for Next.js API routes
 * Copied from supabase/functions/_shared/utils/retry.ts
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
  } = options;

  let lastError: Error | unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        console.log(`[RETRY] Attempt ${attempt + 1}/${maxRetries} failed, retrying after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

**Rationale:** Gør retry logic tilgængelig i Next.js API routes. Kan importeres i ShippingLabelService.

### Success Criteria

#### Automated Verification:
- [ ] Migration runs successfully: `npm run migrate` (or `supabase migration up`)
- [ ] Type check passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] ShippingLabelService compiles without errors

#### Manual Verification:
- [ ] Status history table created in database
- [ ] ShippingLabelService can be instantiated
- [ ] All methods are accessible and typed correctly
- [ ] Retry utility works (test with mock function)

**⚠️ PAUSE HERE** - Verify all above before Phase 2

---

## Phase 2: API Endpoints - Update & Create

### Overview

Opdater `POST /api/v1/shipping/labels` med validation og database storage. Opret `GET /api/v1/shipping/labels/[orderCode]/history` for status history. Opret `POST /api/v1/shipping/labels/[orderCode]/cancel` endpoint.

### Changes Required

#### 1. Update POST /api/v1/shipping/labels

**File:** `apps/web/app/api/v1/shipping/labels/route.ts`

**Changes:** Integrer ShippingLabelService, add validation, existing label check, database storage

```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { ShippingLabelService } from "@/lib/services/shipping-label-service";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

const createLabelSchema = z.object({
  // Transaction ID (required for validation)
  transactionId: z.string().uuid(),
  
  // Quote information (from previous quote request)
  serviceType: z.string(), // e.g., "flexi", "regular_plus", "express"
  quoteId: z.string().optional(), // Optional quote ID reference

  // Addresses
  pickupAddress: z.object({
    country: z.string().length(2),
    zip: z.string().min(1),
    city: z.string().min(1),
    street: z.string().min(1),
    region: z.string().optional(),
  }),
  deliveryAddress: z.object({
    country: z.string().length(2),
    zip: z.string().min(1),
    city: z.string().min(1),
    street: z.string().min(1),
    region: z.string().optional(),
  }),

  // Contacts
  pickupContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    company: z.string().optional(),
  }),
  deliveryContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    company: z.string().optional(),
  }),

  // Parcels
  parcels: z.object({
    packages: z.array(
      z.object({
        parcelId: z.string(),
        quantity: z.number().int().positive(),
        width: z.number().positive(), // cm
        height: z.number().positive(), // cm
        length: z.number().positive(), // cm
        weight: z.number().positive(), // kg
        content: z.string().optional(),
        value: z.number().optional(), // EUR
      })
    ),
  }),

  // Optional fields
  paymentMethod: z.enum(["credit", "deferred"]).default("deferred"),
  labelFormat: z.enum(["pdf", "zpl"]).optional(),
  shippingMethodType: z.enum(["home_delivery", "pickup_point"]).default("home_delivery"),
});

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    const { userId } = await requireAuth(req);

    const body = await req.json();
    const validated = createLabelSchema.parse(body);

    // Verify user is seller (via transaction ownership)
    const supabase = await createServiceClient();
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("seller_id")
      .eq("id", validated.transactionId)
      .single();

    if (txError || !transaction) {
      return Response.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Transaction not found",
          },
        },
        { status: 404 }
      );
    }

    if (transaction.seller_id !== userId) {
      return Response.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Access denied: You must be the seller to create shipping labels",
          },
        },
        { status: 403 }
      );
    }

    // Create label via ShippingLabelService
    const labelService = new ShippingLabelService();
    const result = await labelService.createLabel({
      transactionId: validated.transactionId,
      serviceType: validated.serviceType,
      pickupAddress: validated.pickupAddress,
      deliveryAddress: validated.deliveryAddress,
      parcels: validated.parcels,
      pickupContact: validated.pickupContact,
      deliveryContact: validated.deliveryContact,
      paymentMethod: validated.paymentMethod,
      labelFormat: validated.labelFormat,
      quoteId: validated.quoteId,
      shippingMethodType: validated.shippingMethodType,
    });

    return Response.json({
      orderCode: result.orderCode,
      status: "purchased",
      labelUrl: result.labelUrl,
      trackingNumber: result.trackingNumber,
      alreadyExisted: result.label.id !== undefined, // Indicate if label was already generated
    });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "shipping-labels-api", operation: "create_label" },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);
```

**Rationale:** Bruger ShippingLabelService til al logik. Validerer transaction ownership, håndterer existing labels, og gemmer i database.

#### 2. Create GET /api/v1/shipping/labels/[orderCode]/history

**File:** `apps/web/app/api/v1/shipping/labels/[orderCode]/history/route.ts`

**Changes:** Opret endpoint for status history (bruges af ShippingLabelStatusHistory component)

```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { ShippingLabelService } from "@/lib/services/shipping-label-service";
import { createServiceClient } from "@/lib/supabase/server";
import { query } from "@/lib/db/postgres-connection";
import * as Sentry from "@sentry/nextjs";

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ orderCode: string }> }
) => {
  try {
    if (req.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    const { userId } = await requireAuth(req);
    const { orderCode } = await context.params;

    if (!orderCode) {
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "orderCode parameter is required",
          },
        },
        { status: 400 }
      );
    }

    // Get label from database to find label_id
    const labels = await query<{ id: string; transaction_id: string | null }>(
      `SELECT id, transaction_id FROM public.shipping_labels 
       WHERE external_order_id = $1 LIMIT 1`,
      [orderCode]
    );

    if (!labels || labels.length === 0) {
      return Response.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Shipping label not found",
          },
        },
        { status: 404 }
      );
    }

    const label = labels[0];

    // Verify user is seller or buyer
    if (label.transaction_id) {
      const supabase = await createServiceClient();
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .select("seller_id, buyer_id")
        .eq("id", label.transaction_id)
        .single();

      if (txError || !transaction) {
        return Response.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Transaction not found",
            },
          },
          { status: 404 }
        );
      }

      if (transaction.seller_id !== userId && transaction.buyer_id !== userId) {
        return Response.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Access denied",
            },
          },
          { status: 403 }
        );
      }
    }

    // Get status history
    const labelService = new ShippingLabelService();
    const history = await labelService.getStatusHistory(label.id);

    return Response.json({ history });
  } catch (error) {
    const { orderCode } = await context.params;
    Sentry.captureException(error, {
      extra: { url: req.url, orderCode },
      tags: {
        component: "shipping-labels-api",
        operation: "get_status_history",
      },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
```

**Rationale:** Giver frontend adgang til status history for debugging og audit trail. Validerer ownership før visning.

#### 3. Create POST /api/v1/shipping/labels/[orderCode]/cancel

**File:** `apps/web/app/api/v1/shipping/labels/[orderCode]/cancel/route.ts`

**Changes:** Opret endpoint for label cancellation

```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { ShippingLabelService } from "@/lib/services/shipping-label-service";
import { createServiceClient } from "@/lib/supabase/server";
import { query } from "@/lib/db/postgres-connection";
import * as Sentry from "@sentry/nextjs";

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ orderCode: string }> }
) => {
  try {
    if (req.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    const { userId } = await requireAuth(req);
    const { orderCode } = await context.params;

    if (!orderCode) {
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "orderCode parameter is required",
          },
        },
        { status: 400 }
      );
    }

    // Get label from database to find transaction_id
    const labels = await query<{ transaction_id: string | null }>(
      `SELECT transaction_id FROM public.shipping_labels 
       WHERE external_order_id = $1 LIMIT 1`,
      [orderCode]
    );

    if (!labels || labels.length === 0) {
      return Response.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Shipping label not found",
          },
        },
        { status: 404 }
      );
    }

    const label = labels[0];

    if (!label.transaction_id) {
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Label is not associated with a transaction",
          },
        },
        { status: 400 }
      );
    }

    // Verify user is seller
    const supabase = await createServiceClient();
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("seller_id")
      .eq("id", label.transaction_id)
      .single();

    if (txError || !transaction) {
      return Response.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Transaction not found",
          },
        },
        { status: 404 }
      );
    }

    if (transaction.seller_id !== userId) {
      return Response.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Access denied: You must be the seller to cancel shipping labels",
          },
        },
        { status: 403 }
      );
    }

    // Cancel label via ShippingLabelService
    const labelService = new ShippingLabelService();
    await labelService.cancelLabel(orderCode, label.transaction_id);

    return Response.json({
      success: true,
      message: "Shipping label cancelled successfully",
    });
  } catch (error) {
    const { orderCode } = await context.params;
    Sentry.captureException(error, {
      extra: { url: req.url, orderCode },
      tags: {
        component: "shipping-labels-api",
        operation: "cancel_label",
      },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);
```

**Rationale:** Giver sælgere mulighed for at annullere labels. Validerer ownership og opdaterer både Eurosender og database.

### Success Criteria

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] API routes compile without errors
- [ ] Database migration runs successfully (including unique constraint)

#### Manual Verification:
- [ ] POST /api/v1/shipping/labels validates transaction status
- [ ] POST /api/v1/shipping/labels validates addresses
- [ ] POST /api/v1/shipping/labels returns existing label if already generated
- [ ] POST /api/v1/shipping/labels stores label in database
- [ ] POST /api/v1/shipping/labels/[orderCode]/cancel works correctly
- [ ] GET /api/v1/shipping/labels/[orderCode]/history returns status history
- [ ] Race condition prevented (try generating label twice simultaneously)
- [ ] Error messages are clear and user-friendly
- [ ] Retry logic works for failed API calls

**⚠️ PAUSE HERE** - Verify all above before Phase 3

---

## Phase 3: Frontend Integration

### Overview

Tilføj frontend UI for label generation og retrieval i seller dashboard. "Generate Shipping Label" button, "Retrieve Label" button, label download UI.

### Changes Required

#### 1. Create ShippingLabelGenerator Component

**File:** `apps/web/components/seller/ShippingLabelGenerator.tsx`

**Changes:** Opret React component for label generation UI

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface ShippingLabelGeneratorProps {
  transactionId: string;
  orderCode?: string;
  existingLabelUrl?: string;
  trackingNumber?: string;
  onLabelGenerated?: (labelUrl: string, trackingNumber?: string) => void;
}

export function ShippingLabelGenerator({
  transactionId,
  orderCode,
  existingLabelUrl,
  trackingNumber,
  onLabelGenerated,
}: ShippingLabelGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelUrl, setLabelUrl] = useState<string | undefined>(existingLabelUrl);
  const [tracking, setTracking] = useState<string | undefined>(trackingNumber);
  const { toast } = useToast();

  const handleGenerateLabel = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Fetch transaction details to get order information
      const transactionResponse = await fetch(`/api/v1/transactions/${transactionId}`);
      if (!transactionResponse.ok) {
        throw new Error('Failed to fetch transaction details');
      }
      const transaction = await transactionResponse.json();

      // Fetch buyer's default shipping address
      const addressResponse = await fetch('/api/v1/shipping/addresses');
      if (!addressResponse.ok) {
        throw new Error('Failed to fetch shipping addresses');
      }
      const { addresses } = await addressResponse.json();
      const defaultAddress = addresses?.find((addr: { is_default: boolean }) => addr.is_default) || addresses?.[0];

      if (!defaultAddress) {
        throw new Error('No shipping address found. Please add a shipping address first.');
      }

      // Get seller address (from profile or default)
      // For now, use default seller address (future: get from seller profile)
      const sellerAddress = {
        country: 'DK', // Default - should come from seller profile
        zip: '1130',
        city: 'Copenhagen',
        street: 'Rosenborggade 1',
      };

      // Default parcel dimensions (jersey)
      const parcels = {
        packages: [{
          parcelId: 'A00001',
          quantity: 1,
          width: 30, // cm
          height: 5, // cm
          length: 20, // cm
          weight: 0.5, // kg
          content: 'jersey',
          value: transaction.amount / 100, // Convert from minor units to EUR
        }],
      };

      // Generate label
      const response = await fetch('/api/v1/shipping/labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          serviceType: 'flexi', // Default service type (can be selected by user)
          pickupAddress: sellerAddress,
          deliveryAddress: {
            country: defaultAddress.country,
            zip: defaultAddress.postal_code,
            city: defaultAddress.city,
            street: defaultAddress.street,
            region: defaultAddress.state || undefined,
          },
          parcels,
          pickupContact: {
            name: 'Seller', // Should come from seller profile
            phone: '+4512345678', // Should come from seller profile
            email: 'seller@example.com', // Should come from seller profile
          },
          deliveryContact: {
            name: defaultAddress.full_name,
            phone: defaultAddress.phone,
            email: 'buyer@example.com', // Should come from buyer profile
          },
          paymentMethod: 'deferred',
          labelFormat: 'pdf',
          shippingMethodType: 'home_delivery',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate shipping label');
      }

      const data = await response.json();
      setLabelUrl(data.labelUrl);
      setTracking(data.trackingNumber);

      if (data.alreadyExisted) {
        toast({
          title: 'Label Retrieved',
          description: 'Existing shipping label retrieved successfully.',
        });
      } else {
        toast({
          title: 'Label Generated',
          description: 'Shipping label generated successfully.',
        });
      }

      onLabelGenerated?.(data.labelUrl, data.trackingNumber);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadLabel = () => {
    if (labelUrl) {
      window.open(labelUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Shipping Label
        </CardTitle>
        <CardDescription>
          Generate and download shipping label for this order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {labelUrl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Label Ready</p>
                {tracking && (
                  <p className="text-sm text-muted-foreground">
                    Tracking: {tracking}
                  </p>
                )}
              </div>
              <Button onClick={handleDownloadLabel} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Label
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Print this label and attach it to your package before shipping.
            </p>
          </div>
        ) : (
          <Button
            onClick={handleGenerateLabel}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Label...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Generate Shipping Label
              </>
            )}
          </Button>
        )}

        {orderCode && !labelUrl && (
          <Button
            onClick={async () => {
              // Retrieve existing label
              try {
                const response = await fetch(`/api/v1/shipping/labels/${orderCode}`);
                if (response.ok) {
                  const data = await response.json();
                  setLabelUrl(data.labelUrl);
                  setTracking(data.trackingNumber);
                  toast({
                    title: 'Label Retrieved',
                    description: 'Existing shipping label retrieved successfully.',
                  });
                }
              } catch (err) {
                toast({
                  title: 'Error',
                  description: 'Failed to retrieve label',
                  variant: 'destructive',
                });
              }
            }}
            variant="outline"
            className="w-full"
          >
            Retrieve Existing Label
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

**Rationale:** Giver sælgere en klar UI til at generere og hente labels. Håndterer loading states, errors, og viser tracking info.

#### 2. Integrate in Order Detail Page

**File:** TBD (seller dashboard order detail page)

**Changes:** Tilføj ShippingLabelGenerator component til order detail page

```typescript
// Example integration (actual file path depends on seller dashboard structure)
import { ShippingLabelGenerator } from '@/components/seller/ShippingLabelGenerator';

// In order detail page component:
<ShippingLabelGenerator
  transactionId={order.transaction_id}
  orderCode={order.orderCode}
  existingLabelUrl={order.labelUrl}
  trackingNumber={order.trackingNumber}
  onLabelGenerated={(url, tracking) => {
    // Update order state
  }}
/>
```

**Rationale:** Integrerer label generation i seller dashboard hvor sælgere kan se order details og generere labels.

### Success Criteria

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Component compiles without errors

#### Manual Verification:
- [ ] "Generate Shipping Label" button appears when transaction.status = "completed"
- [ ] Button shows loading state during generation
- [ ] Success message shown when label generated
- [ ] Label download button works correctly
- [ ] Tracking number displayed if available
- [ ] "Retrieve Existing Label" button works
- [ ] Error messages are clear and user-friendly
- [ ] Component is responsive (mobile/tablet/desktop)

**⚠️ PAUSE HERE** - Verify all above before Phase 4

---

## Phase 4: Error Handling & Polish

### Overview

Forbedre error handling, tilføj graceful degradation, og sikre klare error messages. Tilføj status history display (optional).

### Changes Required

#### 1. Enhance Error Handling in ShippingLabelService

**File:** `apps/web/lib/services/shipping-label-service.ts`

**Changes:** Tilføj bedre error handling og logging

```typescript
// In createLabel method, add more specific error handling:

async createLabel(params: CreateLabelParams): Promise<{
  label: ShippingLabel;
  orderCode: string;
  labelUrl: string;
  trackingNumber?: string;
}> {
  try {
    // ... existing validation code ...

    // 4. Create label with retry logic
    const eurosenderResponse = await retryWithBackoff(
      async () => {
        return await this.eurosenderService.createOrder({
          // ... order params ...
        });
      },
      { maxRetries: 3, initialDelay: 1000, maxDelay: 10000 }
    );

    // 5. Store in database
    const label = await this.storeLabelInDatabase(params, eurosenderResponse);

    return {
      label,
      orderCode: eurosenderResponse.orderCode,
      labelUrl: eurosenderResponse.labelUrl || label.label_url,
      trackingNumber: eurosenderResponse.trackingNumber || undefined,
    };
  } catch (error) {
    // Log error with context
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // If transaction exists, log status history with error
    if (params.transactionId) {
      try {
        const labels = await query<ShippingLabel>(
          `SELECT id FROM public.shipping_labels 
           WHERE transaction_id = $1 
           ORDER BY created_at DESC LIMIT 1`,
          [params.transactionId]
        );
        
        if (labels && labels.length > 0) {
          await this.logStatusHistory(labels[0].id, "error", errorMessage);
        } else {
          // Create pending label entry for error logging
          const pendingLabel = await query<ShippingLabel>(
            `INSERT INTO public.shipping_labels (
              transaction_id,
              external_order_id,
              external_label_id,
              label_url,
              status,
              shipping_method_type
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
              params.transactionId,
              "pending",
              "pending",
              "",
              "error",
              params.shippingMethodType,
            ]
          );
          
          if (pendingLabel && pendingLabel.length > 0) {
            await this.logStatusHistory(pendingLabel[0].id, "error", errorMessage);
          }
        }
      } catch (logError) {
        // Don't fail if logging fails
        console.error("[SHIPPING_LABEL] Failed to log error status:", logError);
      }
    }

    Sentry.captureException(error, {
      tags: { component: "shipping_label_service", operation: "create_label" },
      extra: {
        transactionId: params.transactionId,
        errorMessage,
      },
    });

    // Re-throw with user-friendly message
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      "EXTERNAL_SERVICE_ERROR",
      "Failed to generate shipping label. Please try again later.",
      502
    );
  }
}
```

**Rationale:** Bedre error handling med status history logging og user-friendly messages.

#### 2. Add Status History Display (Optional)

**File:** `apps/web/components/seller/ShippingLabelStatusHistory.tsx`

**Changes:** Opret component for at vise status history (optional feature)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface StatusHistoryEntry {
  id: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface ShippingLabelStatusHistoryProps {
  labelId: string;
  orderCode?: string; // Optional: if provided, can fetch history directly
}

export function ShippingLabelStatusHistory({ labelId, orderCode }: ShippingLabelStatusHistoryProps) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!orderCode) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/v1/shipping/labels/${orderCode}/history`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error('Failed to fetch status history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [orderCode]);

  if (loading) {
    return <div>Loading history...</div>;
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Status History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <Badge variant={entry.status === 'purchased' ? 'default' : 'secondary'}>
                  {entry.status}
                </Badge>
                {entry.error_message && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {entry.error_message}
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(entry.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Rationale:** Giver sælgere indsigt i label generation historik (optional feature, kan deferres).

### Success Criteria

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Error messages are clear and actionable
- [ ] Retry logic handles transient failures
- [ ] Status history logs all changes (if implemented)
- [ ] Graceful degradation if Eurosender API is down
- [ ] No PII in error logs
- [ ] Sentry captures errors with proper context

**⚠️ PAUSE HERE** - Verify all above before considering complete

---

## Testing Strategy

### Unit Tests

**Files to Test:**
- `apps/web/lib/services/shipping-label-service.ts`
  - `validateTransactionStatus()` - Test with different transaction statuses
  - `validateAddress()` - Test with valid/invalid addresses
  - `getExistingLabel()` - Test label retrieval
  - `createLabel()` - Test full flow with mocks

**Test Location:** `apps/web/lib/services/__tests__/shipping-label-service.test.ts`

### Integration Tests

**API Endpoints:**
- `POST /api/v1/shipping/labels` - Test with valid/invalid inputs
- `POST /api/v1/shipping/labels/[orderCode]/cancel` - Test cancellation flow

**Test Location:** `apps/web/app/api/v1/shipping/labels/__tests__/`

### Manual Testing Checklist

- [ ] Generate label for completed transaction
- [ ] Attempt to generate label for non-completed transaction (should fail)
- [ ] Generate label with invalid address (should fail with clear error)
- [ ] Generate label when label already exists (should return existing)
- [ ] Retrieve existing label via GET endpoint
- [ ] Cancel label via POST cancel endpoint
- [ ] Verify label stored in database
- [ ] Verify status history logged
- [ ] Test retry logic (simulate API failure)
- [ ] Test error handling (simulate Eurosender API down)

---

## References

- **Linear Issue:** [HUD-42](https://linear.app/huddle-world/issue/HUD-42/feature-shipping-label-generation-integration-eurosender)
- **Research:** `.project/research/HUD-42-shipping-label-generation-research.md`
- **Related Issues:**
  - [HUD-36](https://linear.app/huddle-world/issue/HUD-36) - Shipping Calculation Service (complete)
  - [HUD-39](https://linear.app/huddle-world/issue/HUD-39) - Medusa Order Integration (dependency)
  - [HUD-44](https://linear.app/huddle-world/issue/HUD-44) - Transactional Emails (email notifications deferred)
- **Existing Code:**
  - `apps/web/lib/services/eurosender-service.ts` - EurosenderService
  - `apps/web/app/api/v1/shipping/labels/route.ts` - Existing label endpoint
  - `apps/web/app/api/v1/shipping/labels/[orderCode]/route.ts` - Label retrieval endpoint
  - `supabase/migrations/20251217101000_create_shipping_labels.sql` - Database schema
  - `supabase/functions/_shared/utils/retry.ts` - Retry utility

---

## Notes

- **HUD-39 Dependency:** Vi kan implementere label generation nu baseret på transaction status. Når HUD-39 er færdig, kan vi tilføje Medusa order validation.
- **Service Point:** Ikke relevant nu (deferred)
- **Email Notifications:** Deferred to HUD-44
- **Label Retrieval:** Endpoint eksisterer allerede, skal bare gøres tydeligt tilgængelig i frontend
- **Retry Logic:** Bruger eksisterende `retryWithBackoff` pattern
- **Address Validation:** Validerer fra user profile/shipping_addresses før generation

---

**Plan Complete** ✅  
**Ready for Implementation** (after HUD-39 completion, or can start with transaction validation now)

