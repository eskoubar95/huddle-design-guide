# HUD-42: Service Type Error Analysis

## Seneste Fejl (linje 859-903 i terminal)

```
[EUROSENDER] Creating order: { serviceType: 'flexi', paymentMethod: 'credit', hasPudoPoint: false }
[EUROSENDER] API Error: {
  status: 422,
  statusText: 'Unprocessable Entity',
  endpoint: '/v1/orders',
  errorBody: {
    status: 422,
    violations: [ [Object] ],
    detail: 'selectedServiceTypeId: Selected service type is not available for requested route and/or parcel(s).',
    type: '/validation_errors/service-type-not-available',
    title: 'An error occurred'
  },
  errorMessage: 'Eurosender API error: 422'
}
```

## Problem

**Root Cause:** Vi hardcoder `serviceType: 'flexi'` i `ShippingLabelGenerator.tsx` (linje 137), men "flexi" er ikke tilgængelig for den specifikke rute eller pakke størrelse.

**Hvorfor sker dette:**
- Eurosender API validerer at den valgte service type faktisk er tilgængelig for den specifikke rute
- Ikke alle service types er tilgængelige for alle ruter (f.eks. "flexi" kan være utilgængelig for visse lande)
- Pakke størrelse/type kan også begrænse tilgængelige service types

## Løsning: Quote-First Approach

### Current Flow (FORKERT):
```
1. Hardcode serviceType: 'flexi'
2. POST /v1/orders → ❌ Fejl hvis 'flexi' ikke tilgængelig
```

### Correct Flow (KORREKT):
```
1. POST /v1/quotes → Få tilgængelige service types
2. Vælg første tilgængelige service type (eller billigste)
3. POST /v1/orders med korrekt serviceType → ✅ Success
```

## Implementation Plan

### Option 1: Quote-First (Anbefalet)
**Pros:**
- Validerer at service type er tilgængelig før order creation
- Giver mulighed for at vise priser til brugeren
- Følger Eurosender best practices

**Cons:**
- Ekstra API kald (men nødvendigt for korrekt validering)

**Implementation:**
1. I `ShippingLabelGenerator.tsx`:
   - Først kalde `getQuotes()` med addresses og parcels
   - Vælg første tilgængelig service type fra `response.options.serviceTypes`
   - Brug denne service type + quote ID når man opretter order

2. I `ShippingLabelService.createLabel()`:
   - Hvis `quoteId` er til stede, bruges den
   - Hvis ikke, skal vi kalde `getQuotes()` først

### Option 2: Fallback Service Types
**Pros:**
- Ingen ekstra API kald

**Cons:**
- Kan stadig fejle hvis ingen service types er tilgængelige
- Ikke optimal UX (brugeren ved ikke prisen)

**Implementation:**
- Prøv service types i rækkefølge: `['flexi', 'regular_plus', 'express', 'selection']`
- Hvis alle fejler, kald `getQuotes()` som fallback

## Anbefalet Løsning: Option 1 (Quote-First)

### Code Changes Required:

1. **`ShippingLabelGenerator.tsx`:**
   ```typescript
   // Først hent quotes
   const quotesResponse = await apiRequest('/api/v1/shipping/quotes', {
     method: 'POST',
     body: {
       shipment: {
         pickupAddress: sellerAddress,
         deliveryAddress: defaultAddress,
       },
       parcels: parcels,
       paymentMethod: 'credit',
     },
   });

   // Vælg første tilgængelig service type
   const availableServiceType = quotesResponse.options.serviceTypes[0];
   if (!availableServiceType) {
     throw new Error('No shipping options available for this route');
   }

   // Brug service type fra quote
   const requestBody = {
     ...existingBody,
     serviceType: availableServiceType.serviceType,
     quoteId: availableServiceType.id, // Optional men anbefalet
   };
   ```

2. **`ShippingLabelService.createLabel()`:**
   - Hvis `quoteId` mangler, kalde `getQuotes()` først
   - Eller kræve at `quoteId` altid sendes med

## Eurosender API Best Practice

Ifølge Eurosender API dokumentation:
- **Quote API** (`/v1/quotes`) returnerer kun service types der faktisk er tilgængelige for den specifikke rute
- **Order API** (`/v1/orders`) validerer at `serviceType` matcher en tilgængelig quote option
- **Anbefalet flow:** Altid hent quotes først, brug `quoteId` og `serviceType` fra quote response

## Test Plan

1. **Test med rute hvor "flexi" ikke er tilgængelig:**
   - F.eks. DK → PT (Portugal)
   - Verificer at quote API returnerer alternative service types
   - Verificer at order creation virker med korrekt service type

2. **Test med forskellige pakke størrelser:**
   - Lille pakke (< 2kg) → flexi/regular_plus
   - Stor pakke (> 30kg) → freight
   - Verificer at korrekt service type vælges automatisk

## Next Steps

1. ✅ Analysere fejl (DONE)
2. ✅ Implementere quote-first approach (DONE)
3. ✅ Opdatere `ShippingLabelGenerator` til at hente quotes først (DONE)
4. ⏳ Test med forskellige ruter
5. ✅ Opdatere dokumentation (DONE)

## Implementation Complete

### Changes Made:

1. **New API Endpoint:** `/api/v1/shipping/quotes`
   - Calls Eurosender Quote API
   - Normalizes country codes to uppercase
   - Returns available service types with prices

2. **Updated `ShippingLabelGenerator.tsx`:**
   - Step 1: Calls `/api/v1/shipping/quotes` first
   - Step 2: Selects first available service type from quote response
   - Step 3: Uses selected `serviceType` + `quoteId` when creating order
   - Includes error handling if no quotes available

### Flow:
```
1. User clicks "Generate Shipping Label"
2. Component fetches quotes via POST /api/v1/shipping/quotes
3. Selects first available service type (e.g., "regular_plus" if "flexi" unavailable)
4. Creates order with correct serviceType + quoteId
5. ✅ Success - No more "service type not available" errors
```

