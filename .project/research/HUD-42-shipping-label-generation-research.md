# Research: Shipping Label Generation (HUD-42)

**Date:** 2025-12-19  
**Status:** Research Complete  
**Next Step:** Create Implementation Plan (after HUD-39 completion)

---

## 📋 Clarifications from User

### Address Validation
- **Service Point:** Ikke relevant nu (deferred)
- **Backend Address Validator:** Ikke en service der hele tiden validerer
- **Double-check inden label generation:** Valider adresser som brugeren har tilknyttet til sin profil inden label generation
- **Implementation:** Valider adresser fra `shipping_addresses` tabel eller `profiles` tabel inden label generation

### Email Notifications
- **Action:** Opret ny issue for alle transactional emails i Marketplace Features
- **Scope:** Samle alle typer transactional emails vi skal have
- **Implementation:** Defer email service implementation til senere
- **Next Step:** Identificer alle transactional emails (se nedenfor)

### Manual Shipment (Plan B)
- **Status:** Defer til senere
- **Complexity:** Høj - involverer betalingsflow (sælger ligger ud mellem, hvordan sikrer vi sælger får penge)
- **User Flow:** Ikke gennemtænkt endnu
- **Not in scope for HUD-42**

### Label Retrieval
- **Important:** Labels kan IKKE genereres flere gange
- **Requirement:** Sælger skal kunne hente eksisterende label igen
- **Use Case:** Sælger lukker noget ned, tjekker label, men ikke tid til shipment lige nu - skal kunne hente den igen senere
- **Implementation:** `GET /api/v1/shipping/labels/[orderCode]` eksisterer allerede ✅
- **Enhancement:** Sikre at endpoint er tydeligt tilgængelig i seller dashboard

---

## 🔍 Research Findings

### ✅ What Exists

**1. EurosenderService (Complete)**
- Location: `apps/web/lib/services/eurosender-service.ts`
- Methods:
  - `createOrder()` - Opretter order og genererer label
  - `getOrderDetails()` - Henter order detaljer inkl. label URL
  - `getLabel()` - Henter label PDF URL
  - `cancelOrder()` - Annullerer order
  - `getTracking()` - Henter tracking information
- Error handling: ApiError pattern med Sentry logging
- API key management: Lazy-initialized med environment variables

**2. Database Schema (Ready)**
- Location: `supabase/migrations/20251217101000_create_shipping_labels.sql`
- Tabel: `shipping_labels` med kolonner:
  - `id`, `order_id`, `transaction_id`
  - `external_order_id` (Eurosender orderCode)
  - `external_label_id`
  - `label_url`, `tracking_number`
  - `status` (pending, purchased, cancelled, error)
  - `service_point_id`, `shipping_method_type`
  - `created_at`, `updated_at`
- Indexes: På `order_id`, `transaction_id`, `status`
- RLS: Enabled (service-role only access)

**3. API Endpoints (Partially Implemented)**
- `POST /api/v1/shipping/labels` - Opretter label (implementeret, men mangler order validation)
- `GET /api/v1/shipping/labels/[orderCode]` - Henter label (implementeret) ✅
- `POST /api/v1/shipping/labels/[orderCode]/cancel` - Mangler

**4. Retry Patterns (Available)**
- Location: `supabase/functions/_shared/utils/retry.ts`
- Function: `retryWithBackoff()` med exponential backoff
- Options: `maxRetries` (default: 3), `initialDelay` (default: 1000ms), `maxDelay` (default: 10000ms)
- Examples: `TransfermarktClient`, `TransfermarktService`, `generate-webp-image`

**5. Address Validation (Partial)**
- Location: `apps/web/components/ui/address-autocomplete.tsx`
- Google Maps Places API integration (frontend only)
- Used in: `ShippingAddressStep`, profile completion
- Missing: Backend address validation service (for label generation)

### ⚠️ What's Missing

**1. ShippingLabelService (Wrapper)**
- Higher-level service that:
  - Validates order status (must be paid/completed)
  - Validates addresses (from user profile/shipping_addresses)
  - Handles retry logic for label generation
  - Stores label info in database
  - Returns existing label if already generated (no duplicate generation)

**2. Order Integration**
- Dependency: HUD-39 (Medusa Order Integration) - must complete first
- Missing: Link between transactions and Medusa orders
- Missing: Order status validation (must be paid/completed)

**3. Status History**
- No existing table for label status changes
- Missing: Audit log for label generation attempts, status changes, errors

**4. Retry Logic Integration**
- EurosenderService has no retry logic
- Must integrate in label generation flow

**5. Address Validation (Backend)**
- Google Maps API only used in frontend
- Missing: Backend validation of addresses before label generation
- Requirement: Double-check addresses from user profile before label generation

**6. Email Notifications**
- No transactional email service yet
- Action: Create new issue for all transactional emails (see below)

**7. Webhook Endpoint**
- Missing: `/api/v1/webhooks/eurosender` for order status updates

---

## 📧 Transactional Emails - Complete List

**New Issue to Create:** "Transactional Emails for Marketplace Features"

### Order & Payment Emails

1. **Order Confirmation (Buyer)**
   - Trigger: Payment successful, order created
   - Content: Order details, item info, shipping address, total amount
   - Links: View order, track shipment

2. **Order Received (Seller)**
   - Trigger: Payment successful, order created
   - Content: Order details, buyer info, shipping address, amount
   - Action: "Generate Shipping Label" button/link

3. **Payment Failed (Buyer)**
   - Trigger: Payment intent failed
   - Content: Error message, retry payment link
   - Action: Retry payment button

4. **Payment Reminder (Buyer)**
   - Trigger: Auction won, payment not completed within 24h
   - Content: Payment deadline, order details, payment link
   - Action: Complete payment button

### Shipping Emails

5. **Shipping Label Ready (Seller)**
   - Trigger: Label generated successfully (HUD-42)
   - Content: Order code, label download link, tracking number, shipping address
   - Action: Download label button

6. **Order Shipped (Buyer)**
   - Trigger: Label generated by seller
   - Content: Order shipped confirmation, tracking number, estimated delivery
   - Action: Track shipment link

7. **Order Delivered (Buyer)**
   - Trigger: Order status = "delivered" (HUD-39)
   - Content: Delivery confirmation, tracking info
   - Action: Leave review, request refund (if applicable)

8. **Order Delivered (Seller)**
   - Trigger: Order status = "delivered" (HUD-39)
   - Content: Delivery confirmation, payout scheduled
   - Action: View payout details

### Auction Emails

9. **Auction Won (Winner)**
   - Trigger: Auction ended, user is winner
   - Content: Winning bid amount, item details, checkout deadline
   - Action: Complete checkout button

10. **Auction Won (Seller)**
    - Trigger: Auction ended, winner determined
    - Content: Winning bid amount, winner info, next steps
    - Action: View order details

11. **Auction Outbid (Bidder)**
    - Trigger: Someone placed higher bid
    - Content: New highest bid, item details
    - Action: Place new bid button

12. **Auction Ending Soon (Seller)**
    - Trigger: 24h before auction ends
    - Content: Auction ending reminder, current highest bid
    - Action: View auction link

### Refund Emails

13. **Refund Initiated (Buyer)**
    - Trigger: Refund request approved
    - Content: Refund amount, reason, estimated processing time
    - Action: Track refund status

14. **Refund Completed (Buyer)**
    - Trigger: Refund processed
    - Content: Refund amount, refunded to payment method
    - Action: View transaction history

15. **Refund Received (Seller)**
    - Trigger: Refund processed
    - Content: Refund amount deducted from payout, reason
    - Action: View payout details

### Payout Emails

16. **Payout Sent (Seller)**
    - Trigger: Transfer created (Stripe webhook)
    - Content: Payout amount, payout date, transfer ID
    - Action: View payout details
    - Note: Already has in-app notification, needs email

### Identity Verification Emails

17. **Identity Verification Approved (Seller)**
    - Trigger: Stripe Identity verification approved
    - Content: Verification approved, can now list items
    - Action: Create listing button

18. **Identity Verification Rejected (Seller)**
    - Trigger: Stripe Identity verification rejected
    - Content: Rejection reason, how to appeal
    - Action: Request review button

19. **Identity Verification Review Requested (Seller)**
    - Trigger: Review request submitted
    - Content: Review request received, estimated review time
    - Action: View verification status
    - Note: Already has in-app notification, needs email

### Profile Emails

20. **Profile Completion Reminder (User)**
    - Trigger: User tries to list/buy but profile incomplete
    - Content: Missing profile fields, why it's needed
    - Action: Complete profile button

---

## 🏗️ Recommended Architecture

### Service Layer
```
ShippingLabelService (new)
  ├── EurosenderService (existing) ✅
  ├── Retry logic (retryWithBackoff utility) ✅
  ├── Database operations (shipping_labels table) ✅
  ├── Address validation (from user profile) ⚠️
  └── Order validation (wait for HUD-39) ⚠️
```

### Address Validation Flow
```
Before Label Generation:
  1. Get order details (transaction_id)
  2. Get buyer shipping address (from shipping_addresses or profiles)
  3. Validate address fields:
     - street, city, postal_code, country (required)
     - Format validation (country code ISO-2, postal code format)
  4. If invalid → Return error with specific missing fields
  5. If valid → Proceed with label generation
```

### Label Generation Flow
```
1. Seller clicks "Generate Shipping Label"
   ↓
2. Validate order status (transaction.status = "completed")
   ↓
3. Validate addresses (double-check from user profile)
   ↓
4. Check if label already exists:
   - If exists → Return existing label URL (no duplicate generation)
   - If not → Continue
   ↓
5. ShippingLabelService.createLabel():
   - Retry wrapper (3 attempts, exponential backoff)
   - EurosenderService.createOrder()
   - Store in shipping_labels table
   - Log status history
   ↓
6. Return label URL to seller
```

### Label Retrieval Flow
```
1. Seller wants to retrieve existing label
   ↓
2. GET /api/v1/shipping/labels/[orderCode]
   ↓
3. Verify seller owns transaction
   ↓
4. Get label from database (or Eurosender if not in DB)
   ↓
5. Return label URL, tracking number, status
```

---

## 📝 Implementation Phases

### Phase 1: Foundation (~150 LOC)
- Create `ShippingLabelService` class
- Integrate retry logic from `retryWithBackoff`
- Validate order status (transaction must be "completed")
- Validate addresses (from user profile/shipping_addresses)
- Store label in database after generation
- Check for existing label (no duplicate generation)

### Phase 2: API Endpoints (~100 LOC)
- Update `POST /api/v1/shipping/labels` with:
  - Order validation
  - Address validation
  - Existing label check
  - Retry logic
- Create `POST /api/v1/shipping/labels/[orderCode]/cancel`
- Error handling and user feedback

### Phase 3: Status History (~80 LOC)
- Create `shipping_label_status_history` table
- Log all status changes
- API endpoint to get history
- Display in seller dashboard

### Phase 4: Frontend Integration (~120 LOC)
- Seller dashboard - Order detail page
- "Generate Shipping Label" button
- "Retrieve Label" button (if label exists)
- Label download UI
- Status history display

### Phase 5: Error Handling & Resilience (~50 LOC)
- Retry logic for failed label generation
- Graceful degradation if Eurosender API is down
- Clear error messages to sellers
- Status history for debugging

**Total Estimate:** ~500 LOC, 8-10 timer

**Complexity:** Medium  
**Risk:** Medium (depends on HUD-39)  
**Timeline:** After HUD-39 completion

---

## 📁 Files to Create/Modify

### New Files
- `apps/web/lib/services/shipping-label-service.ts` - Main service
- `apps/web/app/api/v1/shipping/labels/[orderCode]/cancel/route.ts` - Cancel endpoint
- `apps/web/components/seller/ShippingLabelGenerator.tsx` - Frontend component
- `supabase/migrations/YYYYMMDD_create_shipping_label_status_history.sql` - Status history table

### Modified Files
- `apps/web/app/api/v1/shipping/labels/route.ts` - Add order validation, address validation, retry logic, existing label check
- `apps/web/lib/services/eurosender-service.ts` - Potentially add retry wrapper (or in ShippingLabelService)
- Order detail pages - Add label generation UI, label retrieval UI

### Dependencies
- ✅ HUD-36: Shipping Calculation Service (complete)
- ⚠️ HUD-39: Medusa Order Integration (must complete first)
- ❌ HUD-43: Service Point Picker UI (cancelled - not relevant)

---

## 🔄 Patterns to Follow

### 1. Retry Logic Pattern
```typescript
import { retryWithBackoff } from '@/supabase/functions/_shared/utils/retry';

// In ShippingLabelService
async createLabel(...) {
  return retryWithBackoff(
    async () => {
      // Check if label already exists
      const existing = await this.getExistingLabel(transactionId);
      if (existing) {
        return existing; // Return existing, don't generate new
      }
      
      const order = await this.eurosenderService.createOrder(...);
      await this.storeLabelInDatabase(...);
      await this.logStatusHistory(...);
      return order;
    },
    { maxRetries: 3, initialDelay: 1000, maxDelay: 10000 }
  );
}
```

### 2. Address Validation Pattern
```typescript
// In ShippingLabelService
async validateAddress(address: ShippingAddress): Promise<void> {
  const required = ['street', 'city', 'postal_code', 'country'];
  const missing = required.filter(field => !address[field]);
  
  if (missing.length > 0) {
    throw new ApiError(
      'INVALID_ADDRESS',
      `Missing required address fields: ${missing.join(', ')}`,
      400
    );
  }
  
  // Format validation
  if (address.country.length !== 2) {
    throw new ApiError('INVALID_ADDRESS', 'Country must be ISO-2 code', 400);
  }
  
  // Additional validations...
}
```

### 3. Existing Label Check Pattern
```typescript
// In ShippingLabelService
async getExistingLabel(transactionId: string): Promise<ShippingLabel | null> {
  const { query } = require('@/lib/db/postgres-connection');
  const labels = await query<ShippingLabel>(
    `SELECT * FROM public.shipping_labels 
     WHERE transaction_id = $1 AND status = 'purchased' 
     LIMIT 1`,
    [transactionId]
  );
  
  return labels[0] || null;
}
```

### 4. Status History Pattern
```typescript
// Log every status change
async logStatusHistory(
  labelId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  const { query } = require('@/lib/db/postgres-connection');
  await query(
    `INSERT INTO public.shipping_label_status_history 
     (shipping_label_id, status, error_message) 
     VALUES ($1, $2, $3)`,
    [labelId, status, errorMessage || null]
  );
}
```

---

## ✅ Next Steps

1. **Create Transactional Emails Issue**
   - Title: "Transactional Emails for Marketplace Features"
   - Include all 20 email types listed above
   - Can be split into smaller issues later

2. **Wait for HUD-39 Completion**
   - HUD-39 (Medusa Order Integration) must complete first
   - Order validation depends on Medusa order status

3. **Create Implementation Plan**
   - Use this research to create detailed plan
   - Include all phases and patterns
   - Ready to implement when HUD-39 is done

4. **Prepare Status History Table**
   - Can create migration now (doesn't depend on HUD-39)
   - Ready for use when label generation is implemented

---

## 📚 Related Documentation

- [HUD-36 Implementation Plan](./HUD-36/eurosender-implementation-plan.md)
- [HUD-36 Complete](./HUD-36/IMPLEMENTATION-COMPLETE.md)
- [Marketplace Documentation](../MARKETPLACE-DOC-COMPLETE-UPDATE.md)
- [Eurosender Service](../apps/web/lib/services/eurosender-service.ts)

---

**Research Complete** ✅  
**Ready for Implementation Plan** (after HUD-39)

