# Marketplace Project Documentation - Opdateret Indhold

**Dokument URL:** https://linear.app/huddle-world/document/marketplace-features-project-documentation-0c1f2cc97585

**Dato:** 2025-01-19

---

## 📋 Quick Update Guide

Kopier indholdet nedenfor og opdater dokumentet i Linear.

---

## 🔄 Hovedændringer

1. **Shipping Provider:** Shippo → **Eurosender**
2. **HUD-36:** Backlog → **Done** ✅
3. **HUD-42:** Backlog → **In Progress** 🚧
4. **HUD-43:** Backlog → **Canceled** ❌
5. **Progress Tracking:** Opdateret med completed issues
6. **Known Issues:** PUDO API issue dokumenteret

---

## 📝 Opdateret Sections

### 1. Overview (Første sektion)

**Ændr:**
```
shipping (Shippo)
```

**Til:**
```
shipping (Eurosender)
```

---

### 2. Key Features

**Opdater til:**
```
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
```

---

### 3. Issue Status Overview

**Phase 2: Shipping Infrastructure - Opdater til:**

```
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
```

---

### 4. Architecture Decisions - Shipping Provider

**Erstat hele "Shipping Provider: **Shippo**" sektionen med:**

```
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
```

---

### 5. Service Point Integration

**Opdater til:**

```
**Current Status:**

* ⚠️ **PUDO API Deferred** - Eurosender PUDO API returns 400 errors
* ✅ Home delivery fully functional via Eurosender
* ✅ Service point infrastructure exists (database, caching)
* 🔄 PUDO functionality will be revisited when API is fixed
```

---

### 6. Progress Tracking

**Opdater "Completed ✅" sektionen til:**

```
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
```

**Opdater "In Progress 🚧" sektionen til:**

```
### In Progress 🚧

* **HUD-42:** Shipping Label Generation (Eurosender)
  * Home delivery labels can be generated
  * UI integration in progress
```

**Tilføj "Canceled ❌" sektion:**

```
### Canceled ❌

* **HUD-43:** Service Point Picker UI (PUDO API issue)
```

---

### 7. Known Issues & Blockers

**Tilføj ny sektion:**

```
## 🐛 Known Issues & Blockers

### PUDO API Issue (HUD-43)

* **Status:** Blocking service point picker implementation
* **Issue:** Eurosender PUDO API (`POST /v1/pudo/list`) returns 400 error: `"Extra attributes are not allowed ("0" is unknown)."`
* **Impact:** Service point picker UI cannot be implemented
* **Workaround:** Home delivery only for MVP
* **Next Steps:** Contact Eurosender support for API documentation/clarification
* **Documentation:** See `.project/plans/HUD-36/PUDO-API-ISSUE.md`
```

---

### 8. Implementation Order

**Opdater Phase 2 sektionen til:**

```
### Phase 2: Shipping ✅ PARTIALLY COMPLETE

4. ✅ [HUD-36](https://linear.app/huddle-world/issue/HUD-36/feature-shipping-calculation-service-and-integration) - Shipping Calculation Service
   * Backend shipping logic (Eurosender)
   * Home delivery working, PUDO deferred
5. ❌ [HUD-43](https://linear.app/huddle-world/issue/HUD-43/feature-service-point-picker-ui-pickup-point-selection-vinted-style) - Service Point Picker UI
   * **Canceled** - PUDO API issue
6. 🚧 [HUD-42](https://linear.app/huddle-world/issue/HUD-42/feature-shipping-label-generation-integration-eurosender) - Shipping Label Generation
   * Eurosender integration (in progress)
   * Home delivery labels can be generated
```

---

### 9. Technical Stack

**Opdater External Services til:**

```
* **Eurosender** - Shipping label generation and rate calculation
* **Carrier APIs** - Service point lookup (DHL, PostNord, GLS, DPD - deferred)
* **Stripe** - Payments, Identity verification
* **MedusaJS** - Order management
```

---

### 10. Last Updated

**Opdater til:**

```
**Last Updated:** 2025-01-19  
**Maintained by:** Development Team
```

---

## ✅ Checklist

- [ ] Overview opdateret (Shippo → Eurosender)
- [ ] Key Features opdateret med status
- [ ] Issue Status Overview opdateret
- [ ] Architecture Decisions opdateret
- [ ] Service Point Integration opdateret
- [ ] Progress Tracking opdateret
- [ ] Known Issues sektion tilføjet
- [ ] Implementation Order opdateret
- [ ] Technical Stack opdateret
- [ ] Last Updated dato opdateret

---

**💡 Tip:** Brug "Find & Replace" i Linear editor:
- Find: "Shippo" → Replace: "Eurosender"
- Find: "HUD-36.*Backlog" → Replace: "HUD-36.*Done"
- Find: "HUD-43.*Backlog" → Replace: "HUD-43.*Canceled"




