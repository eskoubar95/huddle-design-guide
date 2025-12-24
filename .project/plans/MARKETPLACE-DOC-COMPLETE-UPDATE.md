# Marketplace Project Documentation - Komplet Opdateret Version

**Dokument URL:** https://linear.app/huddle-world/document/marketplace-features-project-documentation-0c1f2cc97585

**Kopier hele indholdet nedenfor og erstat eksisterende dokument i Linear.**

---

## 📋 Overview

Marketplace Features projektet implementerer den komplette e-commerce infrastruktur for Huddle, inkluderet sale listings, auctions, checkout flows, payment integration (Stripe Connect), shipping (Eurosender), og order management (MedusaJS).

---

## 🎯 Project Goals

### Primary Objectives

1. **Complete Checkout Flow** - Fuld checkout flow for både sale listings og auctions
2. **Payment Infrastructure** - Stripe Connect integration for P2P payments
3. **Shipping Integration** - Eurosender integration med service points/pickup points (Vinted-style)
4. **Order Management** - MedusaJS integration for order lifecycle
5. **User Validation** - Profile completeness og Stripe Identity verification

### Key Features

* ✅ Sale Listings (fixed price) - **Basic implementation complete**
* ✅ Auctions with bidding - **Basic implementation complete**
* ✅ User Profile Validation - **Complete** (HUD-41)
* ✅ Stripe Connect Setup - **Complete** (HUD-38)
* ✅ Transaction Fees Calculation - **Complete** (HUD-37)
* ✅ Shipping Calculation Service - **Complete** (HUD-36 - Eurosender)
* 🚧 Checkout flows (sale + auction) - **In Progress**
* 🚧 Shipping label generation - **In Progress** (HUD-42)
* 🚧 Order management (Medusa) - **Planned**
* ❌ Service point picker UI - **Canceled** (HUD-43 - PUDO API issue)

---

## 📊 Issue Status Overview

### Phase 0: Prerequisites (CRITICAL)

* **[HUD-41](https://linear.app/huddle-world/issue/HUD-41/feature-user-profile-validation-and-verification-requirements-for)** User Profile Validation & Verification Requirements ✅ **COMPLETE**
  * Seller: Full profile + Stripe Identity verification + Medusa customer
  * Buyer: Full profile + address + Medusa customer
  * **Status:** Done | **Priority:** High

### Phase 1: Payment Infrastructure

* **[HUD-38](https://linear.app/huddle-world/issue/HUD-38/feature-stripe-connect-setup-and-integration)** Stripe Connect Setup ✅ **COMPLETE**
  * **Status:** Done | **Priority:** Urgent
* **[HUD-37](https://linear.app/huddle-world/issue/HUD-37/feature-transaction-fees-calculation-and-platform-fee-system)** Transaction Fees Calculation ✅ **COMPLETE**
  * **Status:** Done | **Priority:** High

### Phase 2: Shipping Infrastructure

* **[HUD-36](https://linear.app/huddle-world/issue/HUD-36/feature-shipping-calculation-service-and-integration)** Shipping Calculation Service & Integration ✅ **COMPLETE**
  * Eurosender integration, home delivery, cross-border support
  * **Status:** Done | **Priority:** High
  * **Note:** PUDO (pickup points) deferred due to API issues - home delivery working
* **[HUD-43](https://linear.app/huddle-world/issue/HUD-43/feature-service-point-picker-ui-pickup-point-selection-vinted-style)** Service Point Picker UI (Vinted-style) ❌ **CANCELED**
  * Map view, list view, search, filters
  * **Status:** Canceled | **Priority:** High
  * **Reason:** Eurosender PUDO API returns 400 errors - deferred until API is fixed
* **[HUD-42](https://linear.app/huddle-world/issue/HUD-42/feature-shipping-label-generation-integration-eurosender)** Shipping Label Generation Integration (Eurosender) 🚧 **IN PROGRESS**
  * Pay-per-label model (no subscription)
  * **Status:** In Progress | **Priority:** High
  * **Note:** Home delivery labels can be generated now, PUDO deferred

### Phase 3: Order Management

* **[HUD-39](https://linear.app/huddle-world/issue/HUD-39/feature-medusa-order-integration-for-marketplace)** Medusa Order Integration
  * Order creation, lifecycle, fulfillment
  * **Status:** Backlog | **Priority:** High | **Estimate:** 16-20h

### Phase 4: Checkout Flows

* **[HUD-34](https://linear.app/huddle-world/issue/HUD-34/feature-marketplace-checkout-flow-sale-listings)** Marketplace Checkout Flow - Sale Listings
  * Shipping method selection, service point picker (deferred)
  * **Status:** Backlog | **Priority:** High | **Estimate:** 14-18h
* **[HUD-35](https://linear.app/huddle-world/issue/HUD-35/feature-auction-winner-checkout-flow)** Auction Winner Checkout Flow
  * Winner checkout with shipping selection
  * **Status:** Backlog | **Priority:** High | **Estimate:** 12-14h

### Phase 5: Additional Features

* **[HUD-40](https://linear.app/huddle-world/issue/HUD-40/feature-shop-integration-app-can-list-items-on-marketplace)** Shop Integration
  * App can list items on marketplace
  * **Status:** Backlog | **Priority:** Medium | **Estimate:** 12-16h

**Total Estimated Hours Remaining:** ~54-68 timer (reduced from ~146-178h)

---

## 🏗️ Architecture Decisions

### Shipping Provider: **Eurosender** (Updated from Shippo)

**Rationale:**

* ✅ Pay-per-label model (no monthly subscription)
* ✅ Cross-European delivery with realistic prices
* ✅ 85+ carriers (DHL Express, UPS, FedEx, GLS, PostNord, DPD)
* ✅ European market support
* ✅ RESTful API with good documentation
* ✅ PUDO (Pickup Point) API support (currently deferred due to API issues)

**Previous Choice (Shippo):**

* ❌ Rejected - High prices for cross-European delivery, unrealistic pricing

**Alternative Considered:**

* Sendcloud (rejected - subscription-based for unlimited labels)

### Service Point Integration

**Current Status:**

* ⚠️ **PUDO API Deferred** - Eurosender PUDO API returns 400 errors
* ✅ Home delivery fully functional via Eurosender
* ✅ Service point infrastructure exists (database, caching)
* 🔄 PUDO functionality will be revisited when API is fixed

**Carrier APIs (Future):**

* DHL Service Points API
* PostNord Service Points API (Nordic countries)
* GLS ParcelShop API
* DPD Pickup Points API
* Eurosender PUDO API (when fixed)

**Frontend UX Inspiration:**

* Vinted-style service point picker
* Map view (Google Maps/Mapbox) + List view
* Search by address/postal code
* Filter by carrier
* Geolocation auto-detect

### Payment Processing: **Stripe Connect**

**Why:**

* P2P payment processing
* Seller payouts
* Identity verification (Stripe Identity)
* Platform fees handling

### Order Management: **MedusaJS**

**Why:**

* Headless commerce backend
* Order lifecycle management
* Shipping profiles
* Customer management
* Already integrated in codebase

---

## 🔄 Integration Flows

### Checkout Flow (Sale Listing)

```
1. Buyer clicks "Buy Now" on sale listing
   ↓
2. Navigate to /checkout/sale/[listingId]
   ↓
3. Shipping Method Selection:
   - Home Delivery → Shipping address form ✅ (Working)
   - Pickup Point → Service Point Picker ⚠️ (Deferred - PUDO API issue)
   ↓
4. Shipping cost calculated (real-time) ✅ (Eurosender)
   ↓
5. Price breakdown shown:
   - Item price
   - Shipping cost
   - Platform fee
   - Total
   ↓
6. Payment via Stripe Checkout
   ↓
7. Order created in Medusa
   ↓
8. Transaction record created
   ↓
9. Redirect to order confirmation
```

### Checkout Flow (Auction Winner)

```
1. Auction ends → Winner notified
   ↓
2. Winner navigates to /checkout/auction/[auctionId]
   ↓
3. Shipping Method Selection (same as sale) ✅ (Home delivery only for now)
   ↓
4. Payment deadline shown (48h)
   ↓
5. Payment via Stripe Checkout
   ↓
6. Order created → Shipping label can be generated
```

### Shipping Label Generation Flow

```
1. Seller receives order notification
   ↓
2. Seller clicks "Generate Shipping Label"
   ↓
3. Backend:
   - Fetch order details (address or service point)
   - Create Eurosender order
   - Format service point address (if pickup point - deferred)
   - Purchase label via Eurosender
   - Store label URL in database
   ↓
4. Seller receives label PDF
   ↓
5. Seller prints label → Attaches to package
   ↓
6. Seller drops off at post office/service point
```

---

## 📦 Database Schema

### Existing Tables

* `sale_listings` - Sale listings with shipping options
* `auctions` - Auctions with winner tracking
* `bids` - Auction bids
* `transactions` - Transaction records (linked to orders)

### New Tables (Completed)

**Shipping Infrastructure:**

* ✅ `shipping_zones` - Shipping zones (domestic, international, etc.)
* ✅ `shipping_methods` - Shipping methods (standard, express, etc.)
* ✅ `shipping_addresses` - User shipping addresses
* ✅ `service_points` - Cached service points (pickup points)
* ✅ `shipping_labels` - Generated shipping labels (Eurosender)

**Profile & Verification:**

* ✅ `profile_verifications` - Stripe Identity verification status
* ✅ `medusa_customers` - Medusa customer mapping

**Fees:**

* ✅ `platform_fees` - Transaction fee configuration
* ✅ `transaction_fees` - Actual fees per transaction

---

## 🔐 User Validation Requirements

### For Sellers (Required Before Listing)

1. ✅ Fully completed profile
   * Full name
   * Address details
   * Phone number
2. ✅ Stripe Identity verification
   * ID verification via Stripe Identity
   * Verified badge on profile
3. ✅ Medusa customer connected
   * `profiles.medusa_customer_id` populated

### For Buyers (Required Before Purchase)

1. ✅ Fully completed profile
   * Full name
   * Address details
   * Phone number
2. ✅ Medusa customer connected
   * `profiles.medusa_customer_id` populated

### Validation Flow

* Check before: Listing creation, Auction creation, Checkout initiation
* Show clear error messages with links to complete profile/verification
* Onboarding flow guides users through requirements

---

## 🛠️ Technical Stack

### Backend

* **Next.js API Routes** (`apps/web/app/api/v1/`)
* **Supabase** (database, storage, Edge Functions)
* **MedusaJS** (order management)
* **Stripe Connect** (payments, identity verification)
* **Eurosender API** (shipping labels and rates)

### Frontend

* **Next.js 15** (App Router)
* **React 19**
* **TanStack Query** (data fetching)
* **React Hook Form + Zod** (form validation)
* **Google Maps/Mapbox** (service point picker map - deferred)
* **Framer Motion** (animations)

### External Services

* **Eurosender** - Shipping label generation and rate calculation
* **Carrier APIs** - Service point lookup (DHL, PostNord, GLS, DPD - deferred)
* **Stripe** - Payments, Identity verification
* **MedusaJS** - Order management

---

## 📁 Key Files & Directories

### Backend Services

```
apps/web/lib/services/
├── checkout-service.ts          # Checkout orchestration
├── shipping-service.ts          # Shipping calculation ✅ (Eurosender)
├── eurosender-service.ts        # Eurosender API integration ✅
├── service-point-service.ts     # Service point API integration ✅
├── shipping-label-service.ts    # Eurosender label generation (in progress)
├── stripe-service.ts            # Stripe Connect integration ✅
├── fee-service.ts               # Transaction fee calculation ✅
├── medusa-order-service.ts      # Medusa order management
└── profile-validation-service.ts # Profile completeness checks ✅
```

### API Routes

```
apps/web/app/api/v1/
├── checkout/
│   ├── sale/[listingId]/route.ts
│   └── auction/[auctionId]/route.ts
├── shipping/
│   ├── calculate/route.ts ✅
│   ├── service-points/route.ts ✅
│   ├── labels/route.ts ✅
│   └── labels/[orderCode]/route.ts ✅
└── profile/
    └── validate/route.ts ✅
```

### Frontend Components

```
apps/web/components/
├── checkout/
│   ├── CheckoutSummary.tsx
│   ├── PriceBreakdown.tsx
│   ├── ShippingMethodSelector.tsx ✅ (Home delivery only)
│   ├── ShippingAddressForm.tsx
│   ├── ServicePointPicker.tsx      # Deferred (PUDO API issue)
│   ├── ServicePointMap.tsx         # Deferred
│   ├── ServicePointList.tsx        # Deferred
│   ├── ServicePointSearch.tsx      # Deferred
│   └── ServicePointFilters.tsx     # Deferred
└── seller/
    └── ShippingLabelGenerator.tsx   # In progress
```

### Frontend Pages

```
apps/web/app/(dashboard)/
├── checkout/
│   ├── sale/[listingId]/page.tsx
│   └── auction/[auctionId]/page.tsx
├── orders/
│   └── [orderId]/page.tsx
└── profile/
    └── complete/page.tsx
```

### Database Migrations

```
supabase/migrations/
├── ✅ XXXXX_create_shipping_tables.sql
├── ✅ XXXXX_create_service_points.sql
├── ✅ XXXXX_create_shipping_labels.sql
├── ✅ XXXXX_add_profile_verification.sql
└── ✅ XXXXX_add_platform_fees.sql
```

---

## 🚀 Implementation Order (Recommended)

### Phase 0: Foundation ✅ COMPLETE

1. ✅ [HUD-41](https://linear.app/huddle-world/issue/HUD-41/feature-user-profile-validation-and-verification-requirements-for) - User Profile Validation
   * Enables all marketplace operations
   * Blocks sellers/buyers without proper setup

### Phase 1: Payment & Fees ✅ COMPLETE

2. ✅ [HUD-38](https://linear.app/huddle-world/issue/HUD-38/feature-stripe-connect-setup-and-integration) - Stripe Connect Setup
   * Core payment infrastructure
3. ✅ [HUD-37](https://linear.app/huddle-world/issue/HUD-37/feature-transaction-fees-calculation-and-platform-fee-system) - Transaction Fees
   * Platform fee calculation

### Phase 2: Shipping ✅ PARTIALLY COMPLETE

4. ✅ [HUD-36](https://linear.app/huddle-world/issue/HUD-36/feature-shipping-calculation-service-and-integration) - Shipping Calculation Service
   * Backend shipping logic (Eurosender)
   * Home delivery working, PUDO deferred
5. ❌ [HUD-43](https://linear.app/huddle-world/issue/HUD-43/feature-service-point-picker-ui-pickup-point-selection-vinted-style) - Service Point Picker UI
   * **Canceled** - PUDO API issue
6. 🚧 [HUD-42](https://linear.app/huddle-world/issue/HUD-42/feature-shipping-label-generation-integration-eurosender) - Shipping Label Generation
   * Eurosender integration (in progress)
   * Home delivery labels can be generated

### Phase 3: Order Management

7. [HUD-39](https://linear.app/huddle-world/issue/HUD-39/feature-medusa-order-integration-for-marketplace) - Medusa Order Integration
   * Order lifecycle management

### Phase 4: Checkout Flows

8. [HUD-34](https://linear.app/huddle-world/issue/HUD-34/feature-marketplace-checkout-flow-sale-listings) - Sale Checkout Flow
   * Depends on: [HUD-38](https://linear.app/huddle-world/issue/HUD-38/feature-stripe-connect-setup-and-integration), [HUD-36](https://linear.app/huddle-world/issue/HUD-36/feature-shipping-calculation-service-and-integration), [HUD-39](https://linear.app/huddle-world/issue/HUD-39/feature-medusa-order-integration-for-marketplace)
   * Note: Service point picker deferred (home delivery only for now)
9. [HUD-35](https://linear.app/huddle-world/issue/HUD-35/feature-auction-winner-checkout-flow) - Auction Checkout Flow
   * Depends on: [HUD-34](https://linear.app/huddle-world/issue/HUD-34/feature-marketplace-checkout-flow-sale-listings) completion (reuse components)

### Phase 5: Additional

10. [HUD-40](https://linear.app/huddle-world/issue/HUD-40/feature-shop-integration-app-can-list-items-on-marketplace) - Shop Integration
    * Nice-to-have feature

---

## 📝 Important Notes

### Cross-Border Shipping

* Eurosender handles customs documentation automatically
* Different shipping zones for domestic vs international
* Visual indicators ("International Shipping" badge)
* Longer estimated delivery times
* ✅ **Working** - Home delivery rates calculated correctly

### Service Points (Pickup Points)

* ⚠️ **PUDO API Deferred** - Eurosender PUDO API returns 400 errors
* Service point infrastructure exists (database, caching, API endpoints)
* UI components deferred until PUDO API is fixed
* Service point address must be formatted correctly for Eurosender (when implemented)
* Cache service points in database for performance

### Pricing Model

* **Eurosender:** Pay-per-label (no subscription, no free tier)
* **Stripe Connect:** Standard Stripe fees (2.9% + $0.30 per transaction)
* **Platform Fee:** Configurable percentage (stored in `platform_fees` table)

### User Experience

* ✅ Home delivery shipping selection working
* ⚠️ Service point picker deferred (PUDO API issue)
* Real-time shipping cost updates
* Clear visual feedback for selected options
* Mobile-responsive design

---

## 🚢 Shipping Setup Guide

### Eurosender API Configuration

**Environment Variables:**

```bash
# Required for shipping calculation and label generation
EUROSENDER_API_KEY=your-api-key-here
EUROSENDER_API_URL=https://sandbox-api.eurosender.com  # or https://api.eurosender.com for production
```

**Setup Steps:**

1. **Create Eurosender Account:**
   - Go to: https://www.eurosender.com
   - Sign up for account (sandbox available for testing)

2. **Get API Key:**
   - Login to Eurosender Dashboard
   - Navigate to: New Order → Public API tab
   - Copy API key (UUID format: `ce5fe737-00bb-498a-881e-8k453k0b1166`)
   - **Note:** Separate keys for sandbox and production

3. **Configure Environment:**
   - Add `EUROSENDER_API_KEY` to `apps/web/.env.local`
   - Set `EUROSENDER_API_URL` (optional, defaults to sandbox)
   - Restart dev server

4. **Test Integration:**
   - Use test page: `/test/shipping`
   - Verify quote generation works
   - Check console for errors

**API Endpoints Used:**

* `POST /v1/quotes` - Get shipping quotes (rate calculation)
* `POST /v1/orders` - Create order and generate label
* `GET /v1/orders/{orderCode}` - Get order details
* `GET /v1/orders/{orderCode}/labels` - Get label PDF
* `GET /v1/orders/{orderCode}/tracking` - Get tracking info
* `POST /v1/pudo/list` - Search PUDO points (⚠️ Currently broken - returns 400 error)

**Service Types Available:**

* `flexi` - Standard-Flexi (30kg, road service)
* `regular_plus` - Priority (68kg, faster delivery)
* `express` - Priority Express (68kg, air + road, fastest)
* `freight` - Standard Pallet (1200kg, for bulk orders)

**Currency:**

* All prices in **EUR only**
* Must convert to display currency (DKK, etc.) in frontend
* Store prices in EUR in database

**Medusa Fallback:**

* If Eurosender fails or returns no rates, system falls back to Medusa shipping options
* Medusa shipping profiles must be configured in Medusa Admin
* Fallback ensures shipping options always available

**Free Shipping Logic:**

* Domestic shipping (same country) can be free
* Configured per listing/auction
* International shipping always paid by buyer

**PUDO (Pickup Points) Status:**

* ⚠️ **Currently Deferred** - API returns 400 error
* Infrastructure exists (database, caching, API endpoints)
* Will be enabled when Eurosender fixes PUDO API
* See `.project/plans/HUD-36/PUDO-API-ISSUE.md` for details

---

## 🔗 Related Documentation

* `.project/02-PRD.md` - Product Requirements Document
* `.project/04-Database_Schema.md` - Database schema documentation
* `.project/05-API_Design.md` - API design guidelines
* `.project/06-Backend_Guide.md` - Backend development guide
* `.project/07-Frontend_Guide.md` - Frontend development guide
* `.project/plans/HUD-36/IMPLEMENTATION-COMPLETE.md` - HUD-36 completion documentation
* `.project/plans/HUD-36/PUDO-API-ISSUE.md` - PUDO API issue investigation
* `apps/web/README-ENV.md` - Environment variables setup guide

---

## 📊 Progress Tracking

### Completed ✅

* Basic sale listings UI
* Basic auctions UI
* Bidding functionality
* Database schema (core tables)
* **HUD-41:** User Profile Validation ✅
* **HUD-38:** Stripe Connect Setup ✅
* **HUD-37:** Transaction Fees Calculation ✅
* **HUD-36:** Shipping Calculation Service (Eurosender) ✅
  * Home delivery working
  * PUDO deferred (API issue)

### In Progress 🚧

* **HUD-42:** Shipping Label Generation (Eurosender)
  * Home delivery labels can be generated
  * UI integration in progress

### Next Up 📋

* **HUD-39:** Medusa Order Integration
* **HUD-34:** Sale Checkout Flow
* **HUD-35:** Auction Checkout Flow

### Canceled ❌

* **HUD-43:** Service Point Picker UI (PUDO API issue)

---

## 🐛 Known Issues & Blockers

### PUDO API Issue (HUD-43)

* **Status:** Blocking service point picker implementation
* **Issue:** Eurosender PUDO API (`POST /v1/pudo/list`) returns 400 error: `"Extra attributes are not allowed ("0" is unknown)."`
* **Impact:** Service point picker UI cannot be implemented
* **Workaround:** Home delivery only for MVP
* **Next Steps:** Contact Eurosender support for API documentation/clarification
* **Documentation:** See `.project/plans/HUD-36/PUDO-API-ISSUE.md`

---

## 💡 Future Enhancements (Post-MVP)

* International shipping optimization
* Multi-item checkout
* Service point picker (when PUDO API is fixed)
* Advanced shipping options (insurance, signature required)
* Shipping tracking integration
* Seller analytics dashboard

---

**Last Updated:** 2025-01-19  
**Maintained by:** Development Team




