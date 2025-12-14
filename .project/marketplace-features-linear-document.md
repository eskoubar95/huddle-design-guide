# Marketplace Features - Project Documentation

> **Status:** Active Development  
> **Project ID:** Marketplace Features  
> **Created:** 2025-01-13  
> **Last Updated:** 2025-01-13

---

## 📋 Overview

Marketplace Features projektet implementerer den komplette e-commerce infrastruktur for Huddle, inkluderet sale listings, auctions, checkout flows, payment integration (Stripe Connect), shipping (Shippo), og order management (MedusaJS).

---

## 🎯 Project Goals

### Primary Objectives
1. **Complete Checkout Flow** - Fuld checkout flow for både sale listings og auctions
2. **Payment Infrastructure** - Stripe Connect integration for P2P payments
3. **Shipping Integration** - Shippo integration med service points/pickup points (Vinted-style)
4. **Order Management** - MedusaJS integration for order lifecycle
5. **User Validation** - Profile completeness og Stripe Identity verification

### Key Features
- ✅ Sale Listings (fixed price) - **Basic implementation complete**
- ✅ Auctions with bidding - **Basic implementation complete**
- 🚧 Checkout flows (sale + auction) - **In Progress**
- 🚧 Payment processing (Stripe Connect) - **Planned**
- 🚧 Shipping calculation & label generation - **Planned**
- 🚧 Service point picker UI - **Planned**
- 🚧 Order management (Medusa) - **Planned**
- 🚧 User profile validation - **Planned**

---

## 📊 Issue Status Overview

### Phase 0: Prerequisites (CRITICAL)
- **[HUD-41]** User Profile Validation & Verification Requirements ⚠️ **URGENT**
  - Seller: Full profile + Stripe Identity verification + Medusa customer
  - Buyer: Full profile + address + Medusa customer
  - **Status:** Backlog | **Priority:** High | **Estimate:** 12-16h

### Phase 1: Payment Infrastructure
- **[HUD-38]** Stripe Connect Setup
  - **Status:** Backlog | **Priority:** Urgent | **Estimate:** 20-24h
- **[HUD-37]** Transaction Fees Calculation
  - **Status:** Backlog | **Priority:** High | **Estimate:** 6-8h

### Phase 2: Shipping Infrastructure
- **[HUD-36]** Shipping Calculation Service & Integration
  - Service points, cross-border support, shipping methods
  - **Status:** Backlog | **Priority:** High | **Estimate:** 28-32h
- **[HUD-43]** Service Point Picker UI (Vinted-style)
  - Map view, list view, search, filters
  - **Status:** Backlog | **Priority:** High | **Estimate:** 12-16h
- **[HUD-42]** Shipping Label Generation Integration (Shippo)
  - Pay-per-label model (no subscription)
  - **Status:** Backlog | **Priority:** High | **Estimate:** 12-14h

### Phase 3: Order Management
- **[HUD-39]** Medusa Order Integration
  - Order creation, lifecycle, fulfillment
  - **Status:** Backlog | **Priority:** High | **Estimate:** 16-20h

### Phase 4: Checkout Flows
- **[HUD-34]** Marketplace Checkout Flow - Sale Listings
  - Shipping method selection, service point picker
  - **Status:** Backlog | **Priority:** High | **Estimate:** 14-18h
- **[HUD-35]** Auction Winner Checkout Flow
  - Winner checkout with shipping selection
  - **Status:** Backlog | **Priority:** High | **Estimate:** 12-14h

### Phase 5: Additional Features
- **[HUD-40]** Shop Integration
  - App can list items on marketplace
  - **Status:** Backlog | **Priority:** Medium | **Estimate:** 12-16h

**Total Estimated Hours:** ~146-178 timer

---

## 🏗️ Architecture Decisions

### Shipping Provider: **Shippo**
**Rationale:**
- ✅ Pay-per-label model (no monthly subscription)
- ✅ 30 free labels per month included
- ✅ $0.07 per label after free tier
- ✅ 85+ carriers (DHL, UPS, FedEx, etc.)
- ✅ European market support
- ✅ Good API documentation

**Alternative Considered:**
- Sendcloud (rejected - subscription-based for unlimited labels)

### Service Point Integration
**Carrier APIs:**
- DHL Service Points API
- PostNord Service Points API (Nordic countries)
- GLS ParcelShop API
- DPD Pickup Points API

**Frontend UX Inspiration:**
- Vinted-style service point picker
- Map view (Google Maps/Mapbox) + List view
- Search by address/postal code
- Filter by carrier
- Geolocation auto-detect

### Payment Processing: **Stripe Connect**
**Why:**
- P2P payment processing
- Seller payouts
- Identity verification (Stripe Identity)
- Platform fees handling

### Order Management: **MedusaJS**
**Why:**
- Headless commerce backend
- Order lifecycle management
- Shipping profiles
- Customer management
- Already integrated in codebase

---

## 🔄 Integration Flows

### Checkout Flow (Sale Listing)

```
1. Buyer clicks "Buy Now" on sale listing
   ↓
2. Navigate to /checkout/sale/[listingId]
   ↓
3. Shipping Method Selection:
   - Home Delivery → Shipping address form
   - Pickup Point → Service Point Picker (map + list)
   ↓
4. Shipping cost calculated (real-time)
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
3. Shipping Method Selection (same as sale)
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
   - Create Shippo shipment
   - Format service point address (if pickup point)
   - Purchase label via Shippo
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
- `sale_listings` - Sale listings with shipping options
- `auctions` - Auctions with winner tracking
- `bids` - Auction bids
- `transactions` - Transaction records (linked to orders)

### New Tables Needed

**Shipping Infrastructure:**
- `shipping_zones` - Shipping zones (domestic, international, etc.)
- `shipping_methods` - Shipping methods (standard, express, etc.)
- `shipping_addresses` - User shipping addresses
- `service_points` - Cached service points (pickup points)
- `shipping_labels` - Generated shipping labels (Shippo)

**Profile & Verification:**
- `profile_verifications` - Stripe Identity verification status
- `medusa_customers` - Medusa customer mapping

**Fees:**
- `platform_fees` - Transaction fee configuration
- `transaction_fees` - Actual fees per transaction

---

## 🔐 User Validation Requirements

### For Sellers (Required Before Listing)
1. ✅ Fully completed profile
   - Full name
   - Address details
   - Phone number
2. ✅ Stripe Identity verification
   - ID verification via Stripe Identity
   - Verified badge on profile
3. ✅ Medusa customer connected
   - `profiles.medusa_customer_id` populated

### For Buyers (Required Before Purchase)
1. ✅ Fully completed profile
   - Full name
   - Address details
   - Phone number
2. ✅ Medusa customer connected
   - `profiles.medusa_customer_id` populated

### Validation Flow
- Check before: Listing creation, Auction creation, Checkout initiation
- Show clear error messages with links to complete profile/verification
- Onboarding flow guides users through requirements

---

## 🛠️ Technical Stack

### Backend
- **Next.js API Routes** (`apps/web/app/api/v1/`)
- **Supabase** (database, storage, Edge Functions)
- **MedusaJS** (order management)
- **Stripe Connect** (payments, identity verification)
- **Shippo API** (shipping labels)

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TanStack Query** (data fetching)
- **React Hook Form + Zod** (form validation)
- **Google Maps/Mapbox** (service point picker map)
- **Framer Motion** (animations)

### External Services
- **Shippo** - Shipping label generation
- **Carrier APIs** - Service point lookup (DHL, PostNord, GLS, DPD)
- **Stripe** - Payments, Identity verification
- **MedusaJS** - Order management

---

## 📁 Key Files & Directories

### Backend Services
```
apps/web/lib/services/
├── checkout-service.ts          # Checkout orchestration
├── shipping-service.ts          # Shipping calculation
├── service-point-service.ts     # Service point API integration
├── shipping-label-service.ts    # Shippo label generation
├── stripe-service.ts            # Stripe Connect integration
├── fee-service.ts               # Transaction fee calculation
├── medusa-order-service.ts      # Medusa order management
└── profile-validation-service.ts # Profile completeness checks
```

### API Routes
```
apps/web/app/api/v1/
├── checkout/
│   ├── sale/[listingId]/route.ts
│   └── auction/[auctionId]/route.ts
├── shipping/
│   ├── zones/route.ts
│   ├── methods/route.ts
│   ├── calculate/route.ts
│   ├── service-points/route.ts
│   ├── addresses/route.ts
│   └── labels/[orderId]/route.ts
└── profile/
    └── validate/route.ts
```

### Frontend Components
```
apps/web/components/
├── checkout/
│   ├── CheckoutSummary.tsx
│   ├── PriceBreakdown.tsx
│   ├── ShippingMethodTabs.tsx
│   ├── ShippingAddressForm.tsx
│   ├── ServicePointPicker.tsx      # Main picker component
│   ├── ServicePointMap.tsx         # Map view
│   ├── ServicePointList.tsx        # List view
│   ├── ServicePointSearch.tsx      # Search bar
│   └── ServicePointFilters.tsx     # Filter chips
└── seller/
    └── ShippingLabelGenerator.tsx
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
├── XXXXX_create_shipping_tables.sql
├── XXXXX_create_service_points.sql
├── XXXXX_create_shipping_labels.sql
├── XXXXX_add_profile_verification.sql
└── XXXXX_add_platform_fees.sql
```

---

## 🚀 Implementation Order (Recommended)

### Phase 0: Foundation (CRITICAL - DO FIRST)
1. **HUD-41** - User Profile Validation
   - Enables all marketplace operations
   - Blocks sellers/buyers without proper setup

### Phase 1: Payment & Fees
2. **HUD-38** - Stripe Connect Setup
   - Core payment infrastructure
3. **HUD-37** - Transaction Fees
   - Platform fee calculation

### Phase 2: Shipping (Parallel to Phase 3)
4. **HUD-36** - Shipping Calculation Service
   - Backend shipping logic
5. **HUD-43** - Service Point Picker UI
   - Frontend service point selection
   - Can be built in parallel with HUD-36
6. **HUD-42** - Shipping Label Generation
   - Shippo integration

### Phase 3: Order Management
7. **HUD-39** - Medusa Order Integration
   - Order lifecycle management

### Phase 4: Checkout Flows
8. **HUD-34** - Sale Checkout Flow
   - Depends on: HUD-38, HUD-36, HUD-39, HUD-43
9. **HUD-35** - Auction Checkout Flow
   - Depends on: HUD-34 completion (reuse components)

### Phase 5: Additional
10. **HUD-40** - Shop Integration
    - Nice-to-have feature

---

## 📝 Important Notes

### Cross-Border Shipping
- Shippo handles customs documentation automatically
- Different shipping zones for domestic vs international
- Visual indicators ("International Shipping" badge)
- Longer estimated delivery times

### Service Points (Pickup Points)
- Shippo provides data via API
- We build UI for service point selection (HUD-43)
- Service point address must be formatted correctly for Shippo
- Cache service points in database for performance

### Pricing Model
- **Shippo:** 30 free labels/month, then $0.07/label (no subscription)
- **Stripe Connect:** Standard Stripe fees (2.9% + $0.30 per transaction)
- **Platform Fee:** Configurable percentage (stored in `platform_fees` table)

### User Experience
- Vinted-style service point picker (map + list view)
- Real-time shipping cost updates
- Clear visual feedback for selected options
- Mobile-responsive design

---

## 🔗 Related Documentation

- `.project/02-PRD.md` - Product Requirements Document
- `.project/04-Database_Schema.md` - Database schema documentation
- `.project/05-API_Design.md` - API design guidelines
- `.project/06-Backend_Guide.md` - Backend development guide
- `.project/07-Frontend_Guide.md` - Frontend development guide

---

## 📊 Progress Tracking

### Completed ✅
- Basic sale listings UI
- Basic auctions UI
- Bidding functionality
- Database schema (core tables)

### In Progress 🚧
- Planning & architecture

### Next Up 📋
- HUD-41: User Profile Validation (Phase 0 prerequisite)

---

## 🐛 Known Issues & Blockers

- None currently

---

## 💡 Future Enhancements (Post-MVP)

- International shipping optimization
- Multi-item checkout
- Subscription shipping (monthly labels)
- Advanced shipping options (insurance, signature required)
- Shipping tracking integration
- Seller analytics dashboard

---

**Last Updated:** 2025-01-13  
**Maintained by:** Development Team
