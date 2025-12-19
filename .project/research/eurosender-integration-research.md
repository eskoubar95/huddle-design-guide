# Eurosender API Integration - Research Report

**Date:** 2025-01-17  
**Context:** Replacement for Shippo API in HUD-36 shipping calculation service  
**Status:** Research Complete

---

## Executive Summary

Eurosender's Public API provides a viable alternative to Shippo for Huddle's marketplace shipping needs. The API supports quote generation, order creation, label generation, tracking, **AND PUDO (Pick-Up Drop-Off) point search** - all essential features for HUD-36 and HUD-42.

**🎉 CRITICAL FINDING:** Eurosender API **DOES support service points** via `/v1/pudo/list` endpoint! This means we can implement the full service point picker feature (HUD-43) without compromise.

**Key Finding:** Eurosender API can replace Shippo with minimal architectural changes, requires refactoring of `ShippoService` → `EurosenderService`, and **can use Eurosender's PUDO endpoint** instead of direct carrier APIs for service points.

---

## Eurosender API Overview

### Base URLs
- **Sandbox:** `https://sandbox-api.eurosender.com`
- **Production:** `https://api.eurosender.com`
- **OpenAPI Docs:** Available at both endpoints (`/docs.json`)

### Authentication
- **Method:** `x-api-key` header
- **Format:** UUID (e.g., `ce5fe737-00bb-498a-881e-8k453k0b1166`)
- **Obtaining:** User Dashboard → New Order → Public API tab
- **Separate keys:** Sandbox and Production use different API keys

### Currency
- **Only EUR** supported (important for price conversion)

### Date/Time Format
- **RFC 3339** (ISO 8601) standard
- Example: `2024-10-20T00:00:00Z` (date only uses `00:00:00`)

---

## Core API Endpoints

### 1. Quote Generation (Rate Calculation)
**Endpoint:** `POST /v1/quotes`

**Purpose:** Get shipping options and prices (equivalent to Shippo's `createShipment`)

**Request Body:**
```json
{
  "shipment": {
    "pickupAddress": {
      "country": "LU",
      "zip": "1911",
      "city": "Luxembourg",
      "street": "9 Rue du Laboratoire"
    },
    "deliveryAddress": {
      "country": "IT",
      "zip": "33100",
      "city": "Udine",
      "street": "Via Galileo Galilei, 1A",
      "region": "Udine"
    },
    "pickupDate": "2024-10-20"
  },
  "parcels": {
    "packages": [
      {
        "parcelId": "A00001",
        "quantity": 1,
        "width": 14,
        "height": 14,
        "length": 15,
        "weight": 0.5
      }
    ]
  }
}
```

**Response:** Array of quote options with:
- Service type (selection, flexi, regular_plus, express, freight, van, ftl)
- Price (in EUR)
- Estimated delivery time
- Carrier information
- Custom pickup timeframe availability

**Key Difference from Shippo:**
- Shippo returns rates immediately in shipment response
- Eurosender requires separate quote request (two-step process)
- Eurosender quotes include more service type options

### 2. Order Creation
**Endpoint:** `POST /v1/orders`

**Purpose:** Create order and generate label (equivalent to Shippo's transaction purchase)

**Request:** Similar to quote, but includes:
- Selected quote ID
- Payment method (user credit or deferred)
- Pickup timeframe (if custom)

**Response:** Order details with:
- Order ID
- Label URL (if available)
- Tracking number (when ready)
- Status

**Key Difference from Shippo:**
- Shippo: Create shipment → Get rates → Purchase transaction (3 steps)
- Eurosender: Get quote → Create order (2 steps, simpler)

### 3. Order Management
- `GET /v1/orders/{id}` - Get order details
- `GET /v1/orders/{id}/labels` - Get label PDF
- `GET /v1/orders/{id}/documents` - Get related documents
- `POST /v1/orders/{id}/pickup-timeframe` - Set pickup timeframe
- `DELETE /v1/orders/{id}` - Cancel order

### 4. Delivery Status
**Endpoint:** `GET /v1/orders/{id}/delivery-status`

**Purpose:** Real-time tracking (equivalent to Shippo tracking)

**Response:** Delivery status with substatuses (see Appendix 3 in PDF)

### 5. Webhooks
**Available Events:**
- Label Ready
- Tracking Code Ready
- Order Submitted to Courier
- Order Cancelled
- Delivery Status Updates

**Setup:** Via API (see PDF section "Set up webhooks")

---

## Service Types (Shipping Options)

| Service Type | Name | Max Weight | Parcel Types | Description |
|-------------|------|------------|-------------|-------------|
| `selection` | Standard | 30kg | package only | Road service, label brought by driver |
| `flexi` | Standard-Flexi | 30kg | package only | Road service, label generated with order |
| `regular_plus` | Priority | 68kg | package only | Road service, faster delivery |
| `express` | Priority Express | 68kg | package, envelopes | Air + road, fastest available |
| `freight` | Standard Pallet | 1200kg | package, pallets | Groupage service for heavy loads |
| `van` | Van Delivery | - | van only | Van transport service |
| `ftl` | FTL & LTL Transport | - | ftl, ltl | Road freight transport |

**For Huddle Marketplace:**
- **Primary:** `flexi`, `regular_plus`, `express` (package services)
- **Future:** `freight` for bulk orders
- **Not needed:** `van`, `ftl` (B2B services)

---

## Comparison: Shippo vs Eurosender

### ✅ Advantages of Eurosender

1. **Simpler API Flow**
   - Quote → Order (2 steps) vs Shippo's 3-step process
   - Less complexity in orchestration

2. **European Focus**
   - Built for European market
   - Better coverage for EU countries
   - More realistic pricing for EU routes

3. **Unified Service**
   - Single API for all carriers
   - No need to manage multiple carrier accounts
   - Consistent interface

4. **Sandbox Environment**
   - Dedicated testing environment
   - Can set monetary balances for testing
   - Safe for development

### ⚠️ Limitations

1. **EUR Only Currency**
   - All prices in EUR
   - Must convert to display currency (DKK, etc.)
   - Store prices in EUR in database

2. **Less Carrier Flexibility**
   - Shippo: 85+ carriers, choose specific carrier
   - Eurosender: Carrier selected automatically (less control)

3. **No Direct Address Validation**
   - Shippo has dedicated address validation endpoint
   - Eurosender: Validation happens during quote/order (implicit)

2. **EUR Only**
   - All prices in EUR
   - Must convert to display currency (DKK, etc.)
   - Store prices in EUR in database

3. **Less Carrier Flexibility**
   - Shippo: 85+ carriers, choose specific carrier
   - Eurosender: Carrier selected automatically (less control)

4. **No Direct Address Validation**
   - Shippo has dedicated address validation endpoint
   - Eurosender: Validation happens during quote/order (implicit)

---

## Integration Architecture

### Current Architecture (Shippo)

```
ShippingService
  ├── MedusaShippingService (regions, fallback rates)
  ├── ShippoService (rate calculation, label generation)
  └── ServicePointService (pickup points - NOT USED with Eurosender)
```

### Proposed Architecture (Eurosender)

```
ShippingService
  ├── MedusaShippingService (regions, fallback rates) ✅ UNCHANGED
  ├── EurosenderService (rate calculation, label generation, PUDO points) 🔄 REPLACE ShippoService
  └── ServicePointService (pickup points) ✅ UPDATED (use Eurosender PUDO API instead of carrier APIs)
```

---

## Code Changes Required

### 1. Create EurosenderService

**File:** `apps/web/lib/services/eurosender-service.ts`

**Methods:**
- `getQuotes()` - Get shipping quotes (replaces `createShipment`)
- `createOrder()` - Create order and generate label (replaces transaction purchase)
- `getOrderDetails()` - Get order info
- `getLabel()` - Get label PDF
- `getDeliveryStatus()` - Get tracking info
- `cancelOrder()` - Cancel order

**Pattern:** Follow `ShippoService` structure:
- Lazy-initialized API key
- Error handling with `ApiError`
- Sentry logging
- TypeScript interfaces for request/response

### 2. Update ShippingService

**File:** `apps/web/lib/services/shipping-service.ts`

**Changes:**
- Replace `ShippoService` import with `EurosenderService`
- Update `calculateShippoRates()` → `calculateEurosenderRates()`
- Map Eurosender quotes to `ShippingOption` format
- Handle EUR currency conversion
- Remove pickup point logic (deactivate)

### 3. Update Database Schema

**File:** `supabase/migrations/20251217101000_create_shipping_labels.sql`

**Changes:**
- Rename `shippo_label_id` → `eurosender_order_id`
- Rename `shippo_transaction_id` → `eurosender_order_id` (same field)
- Update comments

**Alternative:** Keep column names generic (`external_label_id`, `external_order_id`) for future flexibility

### 4. Update API Endpoints

**Files:**
- `apps/web/app/api/v1/shipping/calculate/route.ts` - No changes (uses `ShippingService`)
- `apps/web/app/api/v1/shipping/service-points/route.ts` - Deactivate or remove
- `apps/web/app/api/v1/shipping/labels/[orderId]/route.ts` - Update to use `EurosenderService`

### 5. Environment Variables

**File:** `apps/web/.env.example`

**Add:**
```bash
# Eurosender API (replaces SHIPPO_API_KEY)
EUROSENDER_API_KEY=your-sandbox-api-key
EUROSENDER_API_URL=https://sandbox-api.eurosender.com  # or https://api.eurosender.com for prod
```

**Update:** `apps/web/README-ENV.md` with Eurosender setup instructions

### 6. Update Documentation

**Files:**
- `.project/marketplace-features-linear-document.md` - Update shipping provider section
- `.project/plans/HUD-36/implementation-plan-2025-12-17-HUD-36.md` - Update Phase 2-3
- `.project/plans/HUD-42/` - Update label generation plan (when created)

---

## Mapping: Shippo → Eurosender

### Rate Calculation Flow

**Shippo:**
```
1. createShipment(addressFrom, addressTo, parcel)
   → Returns: shipment with rates[]
2. User selects rate
3. purchaseTransaction(rateId)
   → Returns: label URL
```

**Eurosender:**
```
1. getQuotes(shipment, parcels)
   → Returns: quotes[] (with prices, service types)
2. User selects quote
3. createOrder(quoteId, ...)
   → Returns: order with label URL (if available)
```

### Data Mapping

| Shippo | Eurosender | Notes |
|--------|-----------|-------|
| `shipment.object_id` | `quote.id` | Quote ID |
| `rate.object_id` | `quote.id` | Same quote ID used for order |
| `rate.amount` | `quote.price` | Both in EUR (minor units) |
| `rate.provider` | `quote.carrier` | Carrier name |
| `rate.servicelevel.name` | `quote.serviceType` | Service type enum |
| `rate.estimated_days` | `quote.estimatedDays` | Delivery estimate |
| `transaction.label_url` | `order.labelUrl` | PDF download URL |
| `transaction.tracking_number` | `order.trackingNumber` | Tracking code |

---

## Implementation Phases

### Phase 1: EurosenderService (2-3 hours)
- Create `EurosenderService` class
- Implement `getQuotes()` method
- Implement `createOrder()` method
- Add error handling and logging
- Write unit tests

### Phase 2: Update ShippingService (1-2 hours)
- Replace `ShippoService` with `EurosenderService`
- Update `calculateShippoRates()` → `calculateEurosenderRates()`
- Map Eurosender quotes to `ShippingOption` format
- Handle EUR currency
- Test with sandbox API

### Phase 3: Database Updates (1 hour)
- Update `shipping_labels` table (rename columns or keep generic)
- Create migration
- Update TypeScript types

### Phase 4: API Endpoints (1 hour)
- Update label generation endpoint
- Deactivate service points endpoint (or return empty)
- Test integration

### Phase 5: Frontend Updates (1 hour)
- Update `ShippingMethodSelector` if needed
- Remove service point picker UI (or hide)
- Test checkout flow

### Phase 6: Documentation (1 hour)
- Update implementation plan
- Update marketplace features doc
- Update README-ENV.md

**Total Estimate:** 7-9 hours

---

## Testing Strategy

### Sandbox Testing

1. **Quote Generation**
   - Test with various EU country pairs
   - Test different parcel weights/sizes
   - Verify all service types return quotes
   - Test error handling (invalid addresses, etc.)

2. **Order Creation**
   - Create order from quote
   - Verify label generation
   - Test pickup timeframe setting
   - Test order cancellation

3. **Integration Testing**
   - Test full flow: Quote → Select → Order → Label
   - Test with `ShippingService` orchestration
   - Test Medusa fallback when Eurosender fails
   - Test free shipping logic

### Production Readiness

1. **API Key Rotation**
   - Separate sandbox and production keys
   - Environment-based URL selection
   - Key rotation strategy

2. **Error Handling**
   - Network failures
   - API rate limits
   - Invalid quotes
   - Order creation failures

3. **Monitoring**
   - Sentry logging for all API calls
   - Track quote success rate
   - Track order creation success rate
   - Monitor label generation time

---

## Risk Assessment

### Low Risk ✅
- **API Stability:** Eurosender is established service
- **Documentation:** Comprehensive API docs and OpenAPI spec
- **Sandbox:** Safe testing environment
- **Integration Complexity:** Simpler than Shippo (2-step vs 3-step)

### Medium Risk ⚠️
- **Currency:** EUR-only may require conversion logic
- **Carrier Selection:** Less control over specific carriers
- **Service Points:** No built-in pickup point locator (user compromise ✅)

### Mitigation
- Implement robust error handling
- Add Medusa fallback for all scenarios
- Monitor API response times
- Set up webhooks for real-time updates
- Document EUR conversion requirements

---

## Recommendations

### Immediate Actions

1. ✅ **Proceed with Eurosender integration**
   - API is suitable for marketplace needs
   - Simpler than Shippo
   - Better EU coverage

2. ✅ **Keep ServicePointService code**
   - Don't delete, just deactivate
   - May need in future if Eurosender adds support
   - Or if switching to direct carrier APIs

3. ✅ **Use generic database columns**
   - `external_order_id` instead of `eurosender_order_id`
   - Allows future provider switching
   - More flexible architecture

4. ✅ **Implement EUR conversion**
   - Store prices in EUR (minor units)
   - Convert to display currency (DKK) in frontend
   - Use Medusa's currency conversion if available

### Future Considerations

1. **Service Points**
   - Monitor Eurosender roadmap for pickup point API
   - Consider direct carrier API integration (DHL, PostNord, etc.)
   - Build custom service point picker if needed

2. **Multi-Currency**
   - Eurosender only supports EUR
   - May need currency conversion service
   - Consider Medusa's currency handling

3. **Carrier Selection**
   - Eurosender selects carrier automatically
   - May need to request specific carriers if business requires
   - Contact Eurosender support for customization

---

## Next Steps

1. **Create Implementation Plan Update**
   - Update HUD-36 plan with Eurosender details
   - Remove Shippo references
   - Update Phase 2-3 with Eurosender integration

2. **Set Up Sandbox Account**
   - Get sandbox API key
   - Test quote generation
   - Verify order creation flow

3. **Begin Implementation**
   - Start with `EurosenderService`
   - Test in sandbox environment
   - Iterate based on API responses

---

## References

- **Eurosender API Docs:** https://sandbox-api.eurosender.com (sandbox) / https://api.eurosender.com (production)
- **OpenAPI Spec:** `/docs.json` at both endpoints
- **User Guide:** `Integrator_guide_v25021 (3).pdf`
- **Public API Page:** https://www.eurosender.com/en/public-api

---

**Research Completed:** 2025-01-17  
**Status:** Ready for Implementation Planning

