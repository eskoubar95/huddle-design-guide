# Phase 0: Cleanup - Remove Shippo Code

**Status:** Ready to Execute  
**Estimated Time:** 1-2 hours  
**Dependencies:** None

---

## Purpose

Fjern alle Shippo-relaterede filer og referencer før vi implementerer Eurosender integration. Dette sikrer en ren start og undgår forvirring mellem to shipping providers.

---

## Files to Delete

### 1. `apps/web/lib/services/shippo-service.ts`
**Action:** Delete entire file

**Reason:** Replaced by `EurosenderService` (Phase 1)

**Verification:**
```bash
# After deletion, verify no imports reference this file:
grep -r "shippo-service" apps/web
# Should return no results (except in this cleanup doc)
```

---

### 2. `scripts/test-phase3-shippo-service.ts`
**Action:** Delete entire file

**Reason:** No longer needed (will create Eurosender test script in Phase 9)

**Verification:**
```bash
# After deletion:
ls scripts/test-phase3-shippo-service.ts
# Should return "file not found"
```

---

## Files to Update

### 1. `apps/web/lib/services/shipping-service.ts`

**Action:** Remove Shippo imports and method implementations

**Changes:**

```typescript
// REMOVE these imports:
import {
  ShippoService,
  ShippoAddress,
  ShippoParcel,
  ShippoRate,
} from "./shippo-service";

// REMOVE from class:
private shippoService: ShippoService;

// REMOVE from constructor:
this.shippoService = new ShippoService();

// REPLACE calculateShippoRates() method:
// OLD: Full implementation with ShippoService calls
// NEW: Stub that throws "Not implemented - use Eurosender" (temporary)
private async calculateShippoRates(
  sellerCountry: string,
  buyerAddress: ShippingCalculationInput["shippingAddress"],
  weightKg: number,
  serviceType: "home_delivery" | "pickup_point"
): Promise<ShippingOption[]> {
  // TODO: Replace with EurosenderService in Phase 3
  throw new ApiError(
    "NOT_IMPLEMENTED",
    "Shippo integration removed. Eurosender integration in progress.",
    501
  );
}

// UPDATE calculateShipping() method:
// In the home_delivery branch, temporarily return Medusa fallback only:
if (input.serviceType === "pickup_point") {
  // TODO: Implement Eurosender PUDO in Phase 3
  throw new ApiError(
    "NOT_IMPLEMENTED",
    "Pickup point shipping not yet implemented with Eurosender.",
    501
  );
} else {
  // Home delivery: Use Medusa fallback only (temporarily)
  console.log("[SHIPPING] Using Medusa fallback rates (Eurosender integration in progress)");
  return await this.calculateMedusaRates(region.id, "home_delivery");
}
```

**Keep:**
- `calculateShipping()` method signature
- `getShippingZones()` method
- `getShippingMethods()` method
- `calculateMedusaRates()` method
- `getListingDetails()` method
- All interfaces and types

**Verification:**
```bash
# After changes, verify file compiles:
cd apps/web
npm run typecheck
# Should pass (even if methods are stubbed)
```

---

### 2. `apps/web/lib/services/service-point-service.ts`

**Action:** Remove direct carrier API integration methods

**Changes:**

```typescript
// REMOVE these methods:
private async fetchFromCarriers(...) { ... }
private async fetchFromCarrier(carrier, ...) { ... }

// UPDATE searchByCoordinates() method:
async searchByCoordinates(
  params: ServicePointSearchParams
): Promise<ServicePoint[]> {
  try {
    // 1. Check cache first
    const cached = await this.getCachedPoints(...);
    
    if (cached.length >= params.limit) {
      return cached;
    }
    
    // 2. TODO: Implement Eurosender PUDO API in Phase 4
    // For now, return cached points only
    console.log("[SERVICE_POINTS] Returning cached points only (Eurosender PUDO integration in progress)");
    return cached;
  } catch (error) {
    // ... error handling
  }
}

// UPDATE searchByPostalCode() method similarly
```

**Keep:**
- `ServicePoint` interface
- `ServicePointSearchParams` interface
- `searchByCoordinates()` method signature
- `searchByPostalCode()` method signature
- `getCachedPoints()` method
- `cachePoints()` method
- All helper methods (calculateDistance, etc.)

**Verification:**
```bash
# After changes, verify file compiles:
cd apps/web
npm run typecheck
```

---

### 3. `apps/web/components/checkout/ShippingMethodSelector.tsx`

**Action:** Update error messages to remove Shippo references

**Changes:**

```typescript
// FIND and UPDATE:
// OLD:
<li>Shippo API returned no rates (test API key limitation)</li>

// NEW:
<li>Shipping provider returned no rates (check address or try again)</li>

// Also update any console.log or comments mentioning Shippo
```

**Verification:**
```bash
# Search for remaining Shippo references:
grep -i "shippo" apps/web/components/checkout/ShippingMethodSelector.tsx
# Should return no results (or only in comments explaining migration)
```

---

### 4. `apps/web/app/(dashboard)/test/shipping/page.tsx`

**Action:** Update test page instructions

**Changes:**

```typescript
// FIND and UPDATE:
// OLD:
<li>Shippo test API key has limitations (no rates returned)</li>

// NEW:
<li>Eurosender sandbox API key required (add EUROSENDER_API_KEY to .env.local)</li>
```

**Verification:**
```bash
# Search for remaining Shippo references:
grep -i "shippo" apps/web/app/\(dashboard\)/test/shipping/page.tsx
# Should return no results
```

---

### 5. `supabase/migrations/20251217101000_create_shipping_labels.sql`

**Action:** Create NEW migration to rename columns (don't modify existing migration)

**New File:** `supabase/migrations/20251218000000_rename_shipping_labels_columns.sql`

**Content:**

```sql
-- Migration: Rename shipping_labels columns to generic names
-- HUD-36 Phase 0 (Cleanup - Shippo → Eurosender migration)
-- Date: 2025-01-17
--
-- Renames Shippo-specific column names to generic names that support multiple providers.

-- Rename columns
ALTER TABLE public.shipping_labels 
  RENAME COLUMN shippo_label_id TO external_label_id;

ALTER TABLE public.shipping_labels 
  RENAME COLUMN shippo_transaction_id TO external_order_id;

-- Update comments
COMMENT ON TABLE public.shipping_labels IS 'External shipping provider labels (Eurosender, Shippo, or other). Created when seller generates label (HUD-42).';

COMMENT ON COLUMN public.shipping_labels.external_label_id IS 'External shipping provider label ID (Eurosender orderCode, Shippo label ID, or other provider ID)';

COMMENT ON COLUMN public.shipping_labels.external_order_id IS 'External shipping provider order ID (Eurosender orderCode, Shippo transaction ID, or other provider order ID)';

-- Note: Existing data with shippo_* values will remain valid
-- New data will use eurosender_* or other provider formats
```

**Verification:**
```bash
# Verify migration file exists:
ls supabase/migrations/*rename_shipping_labels*.sql
# Should show the new migration file
```

---

### 6. Environment Variables

**Action:** Remove Shippo references from environment files

**Files to Update:**

#### `apps/web/.env.example`

**Changes:**
```bash
# REMOVE:
# SHIPPO_API_KEY=your-shippo-api-key-here

# Will add in Phase 6:
# EUROSENDER_API_KEY=your-eurosender-api-key-here
# EUROSENDER_API_URL=https://sandbox-api.eurosender.com
```

#### `apps/web/README-ENV.md`

**Changes:**
```markdown
# REMOVE entire section:
### `SHIPPO_API_KEY`
- **Type:** String
- **Required:** Yes
- ...
```

**Verification:**
```bash
# Search for remaining SHIPPO references:
grep -i "SHIPPO" apps/web/.env.example apps/web/README-ENV.md
# Should return no results
```

---

## Verification Checklist

After completing all cleanup tasks:

- [ ] `apps/web/lib/services/shippo-service.ts` deleted
- [ ] `scripts/test-phase3-shippo-service.ts` deleted
- [ ] No `ShippoService` imports in codebase
- [ ] No `SHIPPO_API_KEY` references in code/docs
- [ ] `ShippingService` compiles (methods may be stubbed)
- [ ] `ServicePointService` compiles (carrier methods removed)
- [ ] Database migration created for column rename
- [ ] All Shippo references removed from comments/docs
- [ ] TypeScript typecheck passes: `npm run typecheck`
- [ ] No build errors: `npm run build`

**Verification Commands:**

```bash
# Check for remaining Shippo references:
grep -r -i "shippo" apps/web --exclude-dir=node_modules --exclude="*.md"
# Should return minimal results (only in cleanup docs or migration comments)

# Check for ShippoService imports:
grep -r "ShippoService" apps/web
# Should return no results

# Check for SHIPPO_API_KEY:
grep -r "SHIPPO_API_KEY" apps/web
# Should return no results

# Verify TypeScript compiles:
cd apps/web
npm run typecheck
# Should pass

# Verify build works:
npm run build
# Should succeed (even if some features are stubbed)
```

---

## Rollback Plan

If cleanup causes issues, rollback steps:

1. **Restore deleted files from git:**
   ```bash
   git checkout HEAD -- apps/web/lib/services/shippo-service.ts
   git checkout HEAD -- scripts/test-phase3-shippo-service.ts
   ```

2. **Revert code changes:**
   ```bash
   git checkout HEAD -- apps/web/lib/services/shipping-service.ts
   git checkout HEAD -- apps/web/lib/services/service-point-service.ts
   ```

3. **Remove new migration:**
   ```bash
   rm supabase/migrations/20251218000000_rename_shipping_labels_columns.sql
   ```

---

## Next Steps

After Phase 0 cleanup is complete:

1. ✅ Verify all checklist items
2. ✅ Commit cleanup changes
3. → Proceed to **Phase 1: EurosenderService Core**

---

**Estimated Time:** 1-2 hours  
**Status:** Ready to Execute

