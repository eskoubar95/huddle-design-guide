# Phase 9 - Testing (HUD-36 Eurosender Integration)

## Scope
Comprehensive testing of Eurosender integration including quote generation, PUDO point search, order creation, and full integration flows.

## Test Scripts to Create

### 1. `scripts/test-phase9-eurosender-quotes.ts`
**Purpose:** Test Eurosender quote generation

**Tests:**
- Quote generation with various EU country pairs (DK → SE, DK → DE, DK → FR, etc.)
- Different parcel weights (0.5kg, 2kg, 5kg)
- All service types (`flexi`, `regular_plus`, `express`)
- Error handling (invalid addresses, unsupported countries)
- Verify price format (EUR in cents)
- Verify `courierId` present in response

**Requirements:**
- `EUROSENDER_API_KEY` environment variable
- Valid test addresses for EU countries

### 2. `scripts/test-phase9-eurosender-pudo.ts`
**Purpose:** Test PUDO point search

**Tests:**
- Get quote for a route
- Extract `courierId` from quote response
- Search PUDO points with `courierId` + coordinates
- Verify points returned with correct format (name, address, coordinates, opening hours)
- Test caching (points stored in database)
- Test distance calculation
- Error handling (invalid courierId, missing coordinates)

**Requirements:**
- `EUROSENDER_API_KEY` environment variable
- Valid coordinates for EU countries

### 3. `scripts/test-phase9-eurosender-orders.ts`
**Purpose:** Test order creation and label generation

**Tests:**
- Create order from quote
- Verify order response (orderCode, status, labelUrl, trackingNumber)
- Get order details
- Get label URL
- Get tracking information
- Error handling (invalid quote, missing contacts)

**Requirements:**
- `EUROSENDER_API_KEY` environment variable
- Valid quote ID from previous test
- Valid contact information

### 4. `scripts/test-phase9-integration.ts`
**Purpose:** Full integration flow testing

**Tests:**
- Full flow: Quote → Select Service Type → PUDO Search → Order Creation
- Test `ShippingService` orchestration (Eurosender → Medusa fallback)
- Test Medusa fallback when Eurosender fails
- Test free shipping logic (same country + flag enabled)
- Test pickup point flow vs home delivery flow
- Test error propagation and handling

**Requirements:**
- `EUROSENDER_API_KEY` environment variable
- Supabase connection
- Test listing/auction IDs

## Manual Testing Checklist

### Quote Generation
- [ ] DK → SE (Sweden) - Standard route
- [ ] DK → DE (Germany) - Standard route
- [ ] DK → FR (France) - Longer route
- [ ] DK → DK (Same country) - Free shipping test
- [ ] Invalid country code - Error handling
- [ ] Missing address fields - Validation

### PUDO Points
- [ ] Get quote → Extract courierId → Search PUDO points
- [ ] Points returned with correct format
- [ ] Distance calculation accurate
- [ ] Points cached in database
- [ ] Search without courierId - Returns cached only

### Order Creation
- [ ] Create order with home delivery
- [ ] Create order with pickup point (pudoPointCode)
- [ ] Label URL generated
- [ ] Tracking number available
- [ ] Order status correct

### Integration
- [ ] ShippingService returns Eurosender rates
- [ ] Medusa fallback when Eurosender unavailable
- [ ] Free shipping logic works
- [ ] Frontend receives courierId in metadata
- [ ] API endpoints return correct data

## Test Data Requirements

### Test Addresses
```typescript
const testAddresses = {
  pickup: {
    DK: { street: "Rosenborggade 1", city: "Copenhagen", postal_code: "1130", country: "DK" },
    DE: { street: "Hauptstraße 1", city: "Berlin", postal_code: "10115", country: "DE" },
  },
  delivery: {
    SE: { street: "Drottninggatan 1", city: "Stockholm", postal_code: "11151", country: "SE" },
    DE: { street: "Hauptstraße 2", city: "Munich", postal_code: "80331", country: "DE" },
    FR: { street: "Rue de Rivoli 1", city: "Paris", postal_code: "75001", country: "FR" },
  },
};
```

### Test Parcels
```typescript
const testParcels = {
  small: { weight: 0.5, length: 30, width: 20, height: 5 }, // Jersey
  medium: { weight: 2.0, length: 40, width: 30, height: 10 },
  large: { weight: 5.0, length: 50, width: 40, height: 15 },
};
```

## Expected Results

### Quote Generation
- Returns 1-3 service types (`flexi`, `regular_plus`, `express`)
- Prices in EUR (cents)
- `courierId` present in each option
- Estimated delivery time included

### PUDO Points
- Returns 5-20 points within radius
- Points have valid coordinates
- Distance calculated correctly
- Opening hours included
- Points cached in database

### Order Creation
- Order created successfully
- `orderCode` returned
- Label URL available (may be async)
- Tracking number available (may be async)
- Status is "pending" or "booked"

## Error Scenarios to Test

1. **Invalid API Key** - Should return 401
2. **Invalid Address** - Should return 400 with clear error
3. **Unsupported Country** - Should return 400
4. **Invalid courierId** - Should return 400/404
5. **Network Error** - Should fallback to Medusa
6. **Rate Limit** - Should handle gracefully

## Success Criteria

- [ ] All test scripts run without errors
- [ ] Quote generation works for all test routes
- [ ] PUDO points returned and cached correctly
- [ ] Orders can be created and labels retrieved
- [ ] Integration flow works end-to-end
- [ ] Error handling works correctly
- [ ] Medusa fallback functions when Eurosender fails

## Notes

- Use sandbox API key for testing (not production)
- Some operations may be async (label generation, tracking)
- Test with realistic parcel dimensions
- Verify caching reduces API calls
- Check Sentry logs for any errors

