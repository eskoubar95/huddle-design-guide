# HUD-36 - Eurosender Integration Implementation Plan

**Date:** 2025-01-17  
**Status:** Ready for Implementation  
**Replaces:** Shippo API integration

---

## Executive Summary

This plan details the implementation of Eurosender API integration to replace Shippo for HUD-36 shipping calculation service. **Eurosender provides full feature parity including PUDO (service point) support**, making it a complete replacement.

**Key Benefits:**
- ✅ Simpler API (2-step vs 3-step)
- ✅ Better EU coverage and pricing
- ✅ Built-in PUDO point search (no need for direct carrier APIs)
- ✅ Sandbox environment for safe testing

---

## Eurosender API Features Analysis

### ✅ Available Features (We Will Use)

#### 1. Quote Generation (Rate Calculation)
**Endpoint:** `POST /v1/quotes`

**Purpose:** Get shipping options and prices for a shipment

**Request:**
```typescript
{
  shipment: {
    pickupAddress: { country, zip, city, street, region?, regionId?, cityId? },
    deliveryAddress: { country, zip, city, street, region?, regionId?, cityId? },
    pickupDate: "2024-10-20T00:00:00Z" // RFC 3339
  },
  parcels: {
    packages: [{ parcelId, quantity, width, height, length, weight, content, value }],
    // Also supports: envelopes, pallets, vans, ltls, ftls
  },
  paymentMethod: "credit" | "deferred",
  currencyCode: "EUR", // Only EUR supported
  serviceType?: "selection" | "flexi" | "regular_plus" | "express" | "freight" | "van" | "ftl",
  insuranceId?: number
}
```

**Response:**
```typescript
{
  options: {
    serviceTypes: [{
      name: "flexi" | "regular_plus" | "express" | ...,
      price: { original: { gross, net, currencyCode } },
      edt: "2-3 days", // Estimated delivery time
      minPickupDate: "2024-10-20T00:00:00Z",
      courierId: number,
      pickupTimeFrameSelectionPossible: boolean,
      insurances: [{ id, coverage, text, price }],
      addOns: [{ code, price }]
    }],
    paymentMethods: [{ code, paymentDiscount }]
  },
  order: {
    totalPrice: { original: { gross, net } },
    serviceType: string,
    estimatedDeliveryTime: string,
    courierId: number,
    parcels: [{ parcelId }]
  },
  warnings: [{ code, message, parameterPath }]
}
```

**Use Case:** Primary method for shipping rate calculation in `ShippingService.calculateShipping()`

---

#### 2. Order Creation (Label Generation)
**Endpoint:** `POST /v1/orders`

**Purpose:** Create order and generate shipping label

**Request:** Similar to quote, but includes:
- Selected service type from quote
- `pickupContact` and `deliveryContact` (required)
- `labelFormat`: "pdf" | "zpl"
- `paymentMethod`: "credit" | "deferred"
- `independentPickup`: boolean (for custom pickup timeframes)

**Response:**
```typescript
{
  orderCode: "123456-78",
  status: "Pending" | "Order Received" | "Confirmed" | ...,
  labelLink: "https://...", // PDF download URL
  labelFormat: "pdf",
  tracking: { number, url },
  price: { original: { gross, net } },
  parcels: [{ tracking: { number, url } }]
}
```

**Use Case:** HUD-42 - Shipping label generation when seller confirms order

---

#### 3. PUDO Point Search (Service Points) 🎉
**Endpoint:** `POST /v1/pudo/list`

**Purpose:** Search for Pick-Up Drop-Off points near an address

**Request:**
```typescript
[{
  courierId: number, // Required - from quote response
  country: "DK", // ISO 2-letter
  geolocation?: { latitude, longitude },
  address?: { street, zip, city },
  distanceFromLocation: number, // km radius (min 1)
  parcels: {
    parcels: [{ parcelId, weight, length, width, height }]
  },
  filterBySide: "pickupSide" | "deliverySide",
  resultsLimit?: number,
  pickupDate?: "2024-10-20"
}]
```

**Response:**
```typescript
[{
  points: [{
    pudoPointCode: string, // Use this in order creation
    locationName: string,
    street: string,
    zip: string,
    city: string,
    geolocation: { latitude, longitude },
    openingHours: [{ dayNameLong, dayNameShort, times }],
    shippingCutOffTime: string | null,
    features: string[],
    pointEmail: string | null,
    pointPhone: string | null,
    holidayDates: string[]
  }]
}]
```

**Use Case:** HUD-43 - Service point picker UI. Replaces direct carrier API calls (DHL, PostNord, GLS, DPD).

**Important:** Requires `courierId` from quote response. Must get quote first, then search PUDO points for that specific courier.

---

#### 4. Order Management
- `GET /v1/orders/{orderCode}` - Get order details and status
- `GET /v1/orders/{orderCode}/labels` - Get label PDF (if not in order response)
- `GET /v1/orders/{orderCode}/tracking` - Get tracking details
- `GET /v1/orders/{orderCode}/documents/{id}` - Get invoices, POD, etc.
- `DELETE /v1/orders/{orderCode}` - Cancel order

**Use Case:** Order status tracking, label retrieval, order management

---

#### 5. Country/Region/City Data
- `GET /v1/countries` - List supported countries
- `GET /v1/countries/{countryCode}/regions` - Get regions (required for IE, RO, IT, US, CA)
- `GET /v1/countries/{countryCode}/cities` - Get cities (required for IE, RO)

**Use Case:** Address validation and form building (some countries require region/city)

---

#### 6. Pickup Management
- `POST /v1/pickup/{orderCode}` - Schedule pickup (if `independentPickup: true`)
- `GET /v1/pickup/{orderCode}/availability` - Get available pickup time slots

**Use Case:** Custom pickup scheduling (optional feature)

---

#### 7. Webhooks
**Available Events:**
1. `order_label_ready` - Label available
2. `order_submitted_to_courier` - Order booked with carrier
3. `order_tracking_ready` - Tracking code available
4. `order_cancelled` - Order cancelled
5. `delivery_status_updated` - Delivery status changed

**Use Case:** Real-time order updates (future enhancement)

---

### ❌ Features NOT Available

1. **Multi-Currency** - Only EUR supported
2. **Carrier Selection** - Carrier auto-selected (less control than Shippo)
3. **Direct Address Validation** - Validation happens during quote/order (implicit)

---

## Service Types Mapping

| Eurosender Service | Name | Max Weight | Use Case |
|-------------------|------|------------|----------|
| `flexi` | Standard-Flexi | 30kg | **Primary** - Label generated with order |
| `regular_plus` | Priority | 68kg | **Primary** - Faster delivery |
| `express` | Priority Express | 68kg | **Primary** - Fastest available |
| `selection` | Standard | 30kg | Alternative - Label brought by driver |
| `freight` | Standard Pallet | 1200kg | Future - Bulk orders |
| `van` | Van Delivery | - | Not needed - B2B |
| `ftl` | FTL Transport | - | Not needed - B2B |

**For Huddle:** Focus on `flexi`, `regular_plus`, `express` for package shipping.

---

## Implementation Plan

### Phase 0: Cleanup - Remove Shippo Code (1-2 hours)

**Purpose:** Fjern alle Shippo-relaterede filer og referencer før vi implementerer Eurosender.

#### Files to Delete

1. **`apps/web/lib/services/shippo-service.ts`**
   - **Action:** Delete entire file
   - **Reason:** Replaced by `EurosenderService`

2. **`scripts/test-phase3-shippo-service.ts`**
   - **Action:** Delete entire file
   - **Reason:** No longer needed (will create Eurosender test script)

#### Files to Update (Remove Shippo References)

1. **`apps/web/lib/services/shipping-service.ts`**
   - **Action:** Remove Shippo imports and references
   - **Changes:**
     ```typescript
     // REMOVE:
     import { ShippoService, ShippoAddress, ShippoParcel, ShippoRate } from "./shippo-service";
     private shippoService: ShippoService;
     this.shippoService = new ShippoService();
     private async calculateShippoRates(...) { ... }
     
     // KEEP: Method signatures and logic structure (will replace with Eurosender)
     // KEEP: calculateShipping(), getShippingZones(), getShippingMethods()
     ```
   - **Note:** Don't implement Eurosender yet - just remove Shippo code. Implementation happens in Phase 1-3.

2. **`apps/web/lib/services/service-point-service.ts`**
   - **Action:** Remove direct carrier API integration (DHL, PostNord, GLS, DPD)
   - **Changes:**
     ```typescript
     // REMOVE:
     private async fetchFromCarriers(...) { ... }
     private async fetchFromCarrier(carrier, ...) { ... }
     
     // KEEP: ServicePoint interface, searchByCoordinates(), searchByPostalCode(), cache methods
     // NOTE: Will add Eurosender PUDO integration in Phase 4
     ```
   - **Note:** Service will temporarily return cached points only until Phase 4.

3. **`apps/web/components/checkout/ShippingMethodSelector.tsx`**
   - **Action:** Update error messages
   - **Changes:**
     ```typescript
     // UPDATE error messages:
     // OLD: "Shippo API returned no rates (test API key limitation)"
     // NEW: "No shipping rates available. Please check address or try again later."
     ```

4. **`apps/web/app/(dashboard)/test/shipping/page.tsx`**
   - **Action:** Update test page instructions
   - **Changes:**
     ```typescript
     // UPDATE instructions:
     // OLD: "Shippo test API key has limitations"
     // NEW: "Eurosender sandbox API key required"
     ```

5. **`supabase/migrations/20251217101000_create_shipping_labels.sql`**
   - **Action:** Update column names and comments
   - **Changes:**
     ```sql
     -- RENAME columns to generic names:
     ALTER TABLE public.shipping_labels 
       RENAME COLUMN shippo_label_id TO external_label_id;
     ALTER TABLE public.shipping_labels 
       RENAME COLUMN shippo_transaction_id TO external_order_id;
     
     -- UPDATE comments:
     COMMENT ON TABLE public.shipping_labels IS 'External shipping provider labels (Eurosender or other). Created when seller generates label (HUD-42).';
     COMMENT ON COLUMN public.shipping_labels.external_label_id IS 'External shipping provider label ID (Eurosender orderCode or other provider ID)';
     COMMENT ON COLUMN public.shipping_labels.external_order_id IS 'External shipping provider order ID (Eurosender orderCode or other provider order ID)';
     ```
   - **Note:** Create new migration file for this change (don't modify existing migration)

6. **Environment Variables**
   - **Action:** Remove `SHIPPO_API_KEY` from `.env.example` and documentation
   - **Files:**
     - `apps/web/.env.example` - Remove `SHIPPO_API_KEY`
     - `apps/web/README-ENV.md` - Remove Shippo section
   - **Note:** Will add `EUROSENDER_API_KEY` in Phase 6

#### Verification Checklist

After cleanup, verify:
- [ ] `shippo-service.ts` deleted
- [ ] `test-phase3-shippo-service.ts` deleted
- [ ] No `ShippoService` imports in codebase
- [ ] No `SHIPPO_API_KEY` references
- [ ] `ShippingService` compiles (even if methods are stubbed)
- [ ] `ServicePointService` compiles (even if carrier methods removed)
- [ ] Database migration created for column rename
- [ ] All Shippo references removed from comments/docs

**Estimated Time:** 1-2 hours

---

### Phase 1: EurosenderService Core (3-4 hours)

**File:** `apps/web/lib/services/eurosender-service.ts`

**Methods to Implement:**

1. **`getQuotes()`** - Get shipping quotes
   ```typescript
   async getQuotes(params: {
     pickupAddress: EurosenderAddress,
     deliveryAddress: EurosenderAddress,
     parcels: EurosenderParcels,
     paymentMethod?: "credit" | "deferred",
     serviceType?: string,
     pickupDate?: string
   }): Promise<EurosenderQuoteResponse>
   ```

2. **`createOrder()`** - Create order and generate label
   ```typescript
   async createOrder(params: {
     shipment: EurosenderShipment,
     parcels: EurosenderParcels,
     serviceType: string,
     paymentMethod: "credit" | "deferred",
     pickupContact: EurosenderContact,
     deliveryContact: EurosenderContact,
     labelFormat?: "pdf" | "zpl"
   }): Promise<EurosenderOrderResponse>
   ```

3. **`getOrderDetails()`** - Get order info
4. **`getLabel()`** - Get label PDF
5. **`getTracking()`** - Get tracking details
6. **`cancelOrder()`** - Cancel order

**Pattern:** Follow `ShippoService` structure:
- Lazy-initialized API key from `EUROSENDER_API_KEY`
- Base URL from `EUROSENDER_API_URL` (sandbox/production)
- Error handling with `ApiError`
- Sentry logging
- TypeScript interfaces matching OpenAPI schema

---

### Phase 2: PUDO Point Service (2-3 hours)

**File:** `apps/web/lib/services/eurosender-service.ts` (add methods)

**Methods:**

1. **`searchPudoPoints()`** - Search PUDO points
   ```typescript
   async searchPudoPoints(params: {
     courierId: number, // From quote response
     country: string,
     geolocation?: { latitude: number, longitude: number },
     address?: { street?: string, zip?: string, city?: string },
     distanceFromLocation: number, // km
     parcels: { parcels: Array<{ parcelId: string, weight: number, length: number, width: number, height: number }> },
     filterBySide: "pickupSide" | "deliverySide",
     resultsLimit?: number
   }): Promise<EurosenderPudoPointsResponse[]>
   ```

**Integration with ServicePointService:**
- Update `ServicePointService` to use `EurosenderService.searchPudoPoints()` instead of direct carrier APIs
- Cache PUDO points in `service_points` table (same schema)
- Map Eurosender PUDO format to `ServicePoint` interface

**Flow:**
1. Get quote from Eurosender (includes `courierId`)
2. Use `courierId` to search PUDO points
3. Cache points in database
4. Return to frontend

---

### Phase 3: Update ShippingService (2-3 hours)

**File:** `apps/web/lib/services/shipping-service.ts`

**Changes:**

1. **Replace ShippoService with EurosenderService**
   ```typescript
   import { EurosenderService } from "./eurosender-service";
   // Remove: import { ShippoService } from "./shippo-service";
   ```

2. **Update `calculateShippoRates()` → `calculateEurosenderRates()`**
   ```typescript
   private async calculateEurosenderRates(
     sellerCountry: string,
     buyerAddress: ShippingCalculationInput["shippingAddress"],
     weightKg: number,
     serviceType: "home_delivery" | "pickup_point"
   ): Promise<ShippingOption[]> {
     // 1. Build Eurosender addresses
     const pickupAddress = this.mapToEurosenderAddress(sellerCountry, ...);
     const deliveryAddress = this.mapToEurosenderAddress(buyerAddress);
     
     // 2. Build parcels
     const parcels = {
       packages: [{
         parcelId: "A00001",
         quantity: 1,
         width: 30, // cm
         height: 5,
         length: 20,
         weight: weightKg,
         content: "jersey",
         value: 100 // EUR - get from listing/auction
       }]
     };
     
     // 3. Get quotes
     const quote = await this.eurosenderService.getQuotes({
       pickupAddress,
       deliveryAddress,
       parcels,
       paymentMethod: "deferred", // or "credit" if available
       pickupDate: new Date().toISOString().split('T')[0] + 'T00:00:00Z'
     });
     
     // 4. Map to ShippingOption format
     return quote.options.serviceTypes
       .filter(st => {
         // Filter by service type preference
         if (serviceType === "pickup_point") {
           // PUDO points available for all service types
           return true;
         }
         return ["flexi", "regular_plus", "express"].includes(st.name);
       })
       .map(st => ({
         id: `${st.name}-${st.courierId}`, // Unique ID
         name: this.mapServiceTypeName(st.name),
         price: Math.round(st.price.original.gross * 100), // Convert EUR to cents
         estimatedDays: this.parseEstimatedDays(st.edt),
         serviceType,
         provider: "eurosender",
         method: st.name,
         // Store courierId for PUDO search
         metadata: { courierId: st.courierId }
       }))
       .sort((a, b) => a.price - b.price);
   }
   ```

3. **Handle EUR Currency**
   - Store prices in EUR (cents)
   - Convert to display currency in frontend (if needed)
   - Use Medusa's currency conversion if available

4. **Update Free Shipping Logic**
   - Keep existing logic (unchanged)

---

### Phase 4: Update ServicePointService (2-3 hours)

**File:** `apps/web/lib/services/service-point-service.ts`

**Changes:**

1. **Add Eurosender Integration**
   ```typescript
   import { EurosenderService } from "./eurosender-service";
   
   export class ServicePointService {
     private eurosenderService: EurosenderService;
     
     constructor() {
       this.eurosenderService = new EurosenderService();
     }
     
     /**
      * Search service points using Eurosender PUDO API
      * Requires courierId from quote - must get quote first
      */
     async searchByCoordinates(
       params: ServicePointSearchParams & { courierId?: number }
     ): Promise<ServicePoint[]> {
       // If courierId provided, use Eurosender PUDO API
       if (params.courierId) {
         return this.searchEurosenderPudoPoints(params);
       }
       
       // Fallback: Check cache or return empty (no direct carrier APIs)
       return this.getCachedPoints(...);
     }
     
     private async searchEurosenderPudoPoints(
       params: ServicePointSearchParams & { courierId: number }
     ): Promise<ServicePoint[]> {
       const pudoResponse = await this.eurosenderService.searchPudoPoints({
         courierId: params.courierId,
         country: params.country,
         geolocation: { latitude: params.latitude, longitude: params.longitude },
         distanceFromLocation: params.radiusKm,
         parcels: {
           parcels: [{
             parcelId: "A00001",
             weight: 0.5, // Default - should get from quote
             length: 30,
             width: 20,
             height: 5
           }]
         },
         filterBySide: "deliverySide", // or "pickupSide"
         resultsLimit: params.limit
       });
       
       // Map to ServicePoint format
       const points: ServicePoint[] = pudoResponse.flatMap(response =>
         response.points.map(pudo => ({
           id: pudo.pudoPointCode, // Use PUDO code as ID
           provider: "eurosender", // or extract from courierId
           provider_id: pudo.pudoPointCode,
           name: pudo.locationName,
           address: `${pudo.street}, ${pudo.zip} ${pudo.city}`,
           city: pudo.city,
           postal_code: pudo.zip,
           country: params.country,
           latitude: pudo.geolocation.latitude,
           longitude: pudo.geolocation.longitude,
           type: "service_point", // Default
           opening_hours: pudo.openingHours,
           distance_km: null // Calculate if needed
         }))
       );
       
       // Cache points
       await this.cachePoints(points, params.latitude, params.longitude);
       
       return points;
     }
   }
   ```

2. **Update API Endpoint**
   - `GET /api/v1/shipping/service-points` - Add `courierId` parameter
   - Flow: Frontend gets quote first → extracts `courierId` → calls service-points with `courierId`

---

### Phase 5: Database Schema Updates (1 hour)

**File:** `supabase/migrations/20251217101000_create_shipping_labels.sql`

**Changes:**
- Keep generic column names (already done):
  - `shippo_label_id` → Keep as is OR rename to `external_label_id`
  - `shippo_transaction_id` → Keep as is OR rename to `external_order_id`

**Recommendation:** Create new migration to rename columns to generic names:
```sql
-- Migration: Rename shipping_labels columns to generic names
ALTER TABLE public.shipping_labels 
  RENAME COLUMN shippo_label_id TO external_label_id;
ALTER TABLE public.shipping_labels 
  RENAME COLUMN shippo_transaction_id TO external_order_id;

COMMENT ON COLUMN public.shipping_labels.external_label_id IS 'External shipping provider label ID (Eurosender orderCode or Shippo label ID)';
COMMENT ON COLUMN public.shipping_labels.external_order_id IS 'External shipping provider order ID (Eurosender orderCode or Shippo transaction ID)';
```

**Alternative:** Keep `shippo_*` names and add new `eurosender_*` columns (less clean)

---

### Phase 6: Environment Variables (30 min)

**File:** `apps/web/.env.example`

**Add:**
```bash
# Eurosender API
EUROSENDER_API_KEY=your-sandbox-api-key-here
EUROSENDER_API_URL=https://sandbox-api.eurosender.com  # or https://api.eurosender.com for production
```

**File:** `apps/web/README-ENV.md`

**Add section:**
```markdown
### `EUROSENDER_API_KEY`
- **Type:** String
- **Required:** Yes (for shipping calculation)
- **Description:** Eurosender API key for shipping quotes and label generation
- **Security:** ⚠️ Server-side only, never commit to git
- **Where to find:** Eurosender Dashboard → New Order → Public API tab

### `EUROSENDER_API_URL`
- **Type:** String
- **Required:** No (defaults to sandbox)
- **Description:** Eurosender API base URL
- **Options:** 
  - `https://sandbox-api.eurosender.com` (testing)
  - `https://api.eurosender.com` (production)
```

---

### Phase 7: API Endpoints Updates (1-2 hours)

**Files to Update:**

1. **`apps/web/app/api/v1/shipping/calculate/route.ts`**
   - No changes needed (uses `ShippingService` which handles Eurosender internally)

2. **`apps/web/app/api/v1/shipping/service-points/route.ts`**
   - Add `courierId` query parameter (optional)
   - Update to use `ServicePointService` with Eurosender integration
   - Document that `courierId` should come from quote response

3. **`apps/web/app/api/v1/shipping/labels/[orderId]/route.ts`** (HUD-42)
   - Update to use `EurosenderService.getLabel()` or `getOrderDetails()`

---

### Phase 8: Frontend Updates (1-2 hours)

**Files to Update:**

1. **`apps/web/components/checkout/ShippingMethodSelector.tsx`**
   - No changes needed (uses API endpoint)

2. **Service Point Picker (HUD-43 - future)**
   - Update to get quote first → extract `courierId` → search PUDO points
   - Flow:
     ```
     1. User enters address
     2. Get quote from /api/v1/shipping/calculate
     3. Extract courierId from selected shipping option metadata
     4. Call /api/v1/shipping/service-points?courierId=xxx&lat=xxx&lng=xxx
     5. Display PUDO points on map/list
     ```

---

### Phase 9: Testing (2-3 hours)

**Status:** ✅ Complete - All test scripts created

**Test Scripts Created:**

1. **✅ `scripts/test-phase9-eurosender-quotes.ts`**
   - Test quote generation with various EU country pairs (DK → SE, DK → DE, DK → FR)
   - Test different parcel weights (0.5kg, 2kg, 5kg)
   - Verify all service types (`flexi`, `regular_plus`, `express`)
   - Test error handling (invalid addresses, unsupported countries)
   - Verify `courierId` present in response
   - Verify price format (EUR)

2. **✅ `scripts/test-phase9-eurosender-pudo.ts`**
   - Get quote → Extract `courierId` → Search PUDO points
   - Verify points returned with correct format (name, address, coordinates, opening hours)
   - Test caching (points stored in database)
   - Test distance calculation
   - Error handling (invalid courierId, missing coordinates)
   - Test search without courierId (returns cached only)

3. **✅ `scripts/test-phase9-eurosender-orders.ts`**
   - Create order from quote
   - Verify order response (orderCode, status, labelUrl, trackingNumber)
   - Get order details
   - Get label URL
   - Get tracking information
   - Error handling (invalid orderCode)

4. **✅ `scripts/test-phase9-integration.ts`**
   - Full flow: Quote → Extract courierId → PUDO Search
   - Test `ShippingService` orchestration structure
   - Verify courierId in ShippingOption metadata
   - Test ServicePointService graceful handling
   - Error propagation testing

**Cleanup:**
- ✅ Deleted `scripts/test-phase4-shipping-service.ts` (Shippo references)

**Usage:**
```bash
# Run individual test scripts
tsx scripts/test-phase9-eurosender-quotes.ts
tsx scripts/test-phase9-eurosender-pudo.ts
tsx scripts/test-phase9-eurosender-orders.ts
tsx scripts/test-phase9-integration.ts
```

**See:** `.project/plans/HUD-36/PHASE9-TESTING.md` for detailed test plan

---

### Phase 10: Documentation (1 hour)

**Files to Update:**

1. **`.project/marketplace-features-linear-document.md`**
   - Update shipping provider section (Shippo → Eurosender)
   - Update service point integration (carrier APIs → Eurosender PUDO)

2. **`.project/plans/HUD-36/implementation-plan-2025-12-17-HUD-36.md`**
   - Add note about Eurosender migration
   - Update Phase 2-3 with Eurosender details

3. **`.project/plans/HUD-42/`** (when created)
   - Update label generation to use Eurosender

---

## Implementation Summary

### Total Estimate: 16-22 hours (inkl. cleanup)

| Phase | Task | Hours | Dependencies |
|-------|------|-------|---------------|
| 0 | **Cleanup - Remove Shippo** | **1-2** | **None** |
| 1 | EurosenderService Core | 3-4 | Phase 0 |
| 2 | PUDO Point Service | 2-3 | Phase 1 |
| 3 | Update ShippingService | 2-3 | Phase 1 |
| 4 | Update ServicePointService | 2-3 | Phase 2 |
| 5 | Database Schema | 1 | Phase 0 |
| 6 | Environment Variables | 0.5 | None |
| 7 | API Endpoints | 1-2 | Phase 3, 4 |
| 8 | Frontend Updates | 1-2 | Phase 7 |
| 9 | Testing | 2-3 | All phases |
| 10 | Documentation | 1 | All phases |

---

## Key Decisions

### 1. PUDO Point Integration Strategy

**Decision:** Use Eurosender PUDO API instead of direct carrier APIs

**Rationale:**
- Simpler integration (one API instead of 4+)
- Consistent data format
- No need to manage multiple carrier API keys
- Eurosender handles carrier selection

**Trade-off:**
- Requires `courierId` from quote (two-step process)
- Less control over specific carriers
- May not have all carriers that direct APIs provide

### 2. Currency Handling

**Decision:** Store prices in EUR (cents), convert in frontend if needed

**Rationale:**
- Eurosender only supports EUR
- Medusa uses EUR as base currency
- Frontend can convert for display

### 3. Service Type Selection

**Decision:** Focus on `flexi`, `regular_plus`, `express` for marketplace

**Rationale:**
- These are package services (suitable for jerseys)
- `flexi` generates label with order (best UX)
- `regular_plus` and `express` provide speed options

---

## Migration Strategy

### From Shippo to Eurosender

1. **Keep ShippoService code** (don't delete)
   - Comment out or feature-flag
   - Allows rollback if needed

2. **Gradual Migration**
   - Deploy EurosenderService alongside ShippoService
   - Feature flag to switch between providers
   - Test in production with small percentage
   - Full switch after validation

3. **Data Migration**
   - Existing `shipping_labels` with `shippo_*` IDs remain
   - New labels use `eurosender_*` format
   - Update queries to handle both formats

---

## Risk Mitigation

### Low Risk ✅
- API stability (established service)
- Comprehensive documentation
- Sandbox environment

### Medium Risk ⚠️
- **PUDO Point Dependency:** Requires quote first (two-step)
  - **Mitigation:** Cache quotes, pre-fetch common routes
- **EUR Only:** Currency conversion needed
  - **Mitigation:** Use Medusa currency conversion
- **Carrier Selection:** Less control
  - **Mitigation:** Acceptable trade-off for simplicity

---

## Next Steps

1. ✅ **Review and approve this plan**
2. **Set up sandbox account**
   - Get API key from Eurosender dashboard
   - Test quote generation manually
3. **Begin Phase 1 implementation**
   - Create `EurosenderService` class
   - Implement `getQuotes()` method
   - Test with sandbox

---

## References

- **Eurosender API Docs:** https://integrators.eurosender.com/apis
- **OpenAPI Spec:** `/docs.json` at sandbox/production endpoints
- **User Guide:** `Integrator_guide_v25021 (3).pdf`
- **Sandbox:** https://sandbox-api.eurosender.com
- **Production:** https://api.eurosender.com

---

**Plan Created:** 2025-01-17  
**Status:** Ready for Implementation  
**Estimated Completion:** 15-20 hours

