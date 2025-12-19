# PUDO API Issue - Investigation Report

**Date:** 2025-01-18  
**Status:** ⚠️ Blocking Issue - PUDO API returns 400 error  
**Priority:** Medium (PUDO points are nice-to-have, not critical for MVP)

---

## Problem

Eurosender PUDO API (`POST /v1/pudo/list`) returns 400 error with message:
```
"Extra attributes are not allowed ("0" is unknown)."
```

This error occurs regardless of request format (array or object).

---

## Investigation

### Attempted Request Formats

1. **Array format** (as per implementation plan):
   ```json
   [{
     "courierId": 2,
     "country": "SE",
     "geolocation": { "latitude": 59.3293, "longitude": 18.0686 },
     "distanceFromLocation": 10,
     "parcels": {
       "parcels": [{ "parcelId": "HuddleJersey", "weight": 0.5, "length": 30, "width": 20, "height": 5 }]
     },
     "filterBySide": "deliverySide",
     "resultsLimit": 20
   }]
   ```
   **Result:** ❌ 400 error - "Extra attributes are not allowed ("0" is unknown)."

2. **Object format** (direct):
   ```json
   {
     "courierId": 2,
     "country": "SE",
     "geolocation": { "latitude": 59.3293, "longitude": 18.0686 },
     "distanceFromLocation": 10,
     "parcels": {
       "parcels": [{ "parcelId": "HuddleJersey", "weight": 0.5, "length": 30, "width": 20, "height": 5 }]
     },
     "filterBySide": "deliverySide",
     "resultsLimit": 20
   }
   ```
   **Result:** ❌ 422 error - "parcels: This value should not be null."

3. **Direct parcels array**:
   ```json
   {
     "parcels": [{ "parcelId": "HuddleJersey", "weight": 0.5, "length": 30, "width": 20, "height": 5 }]
   }
   ```
   **Result:** ❌ 400 error - "Extra attributes are not allowed ("parcels" is unknown)."

---

## Root Cause Analysis

The error message `"Extra attributes are not allowed ("0" is unknown)."` suggests:

1. **API doesn't accept array format** - When sending `[params]`, API sees it as an object with "0" property
2. **API doesn't accept object format** - When sending `params`, API expects different structure
3. **Sandbox limitation** - PUDO API may not be fully functional in sandbox environment
4. **Incorrect endpoint** - `/v1/pudo/list` may require different authentication or format

---

## Possible Solutions

### Option 1: Contact Eurosender Support
- Request official PUDO API documentation
- Ask for example request/response
- Verify if PUDO API is available in sandbox

### Option 2: Check OpenAPI Specification
- Fetch `/docs.json` from sandbox API
- Inspect `/v1/pudo/list` endpoint schema
- Verify exact request format

### Option 3: Test with Production API
- If production API key available, test there
- May reveal if issue is sandbox-specific

### Option 4: Workaround - Defer PUDO Feature
- For MVP, use home delivery only
- Implement PUDO picker later when API issue resolved
- Use cached service points from previous searches (if available)

---

## Impact Assessment

### Current Status
- ✅ Quote generation works
- ✅ Order creation works (tested via quotes)
- ❌ PUDO point search blocked

### Workaround Available
- Service point picker can use cached points from database
- Users can manually enter pickup point code if known
- Home delivery works without PUDO API

### Recommendation
**Defer PUDO feature to post-MVP** - Focus on core shipping calculation and label generation first. PUDO points are enhancement, not critical path.

---

## Next Steps

1. **Immediate:** Document this issue in Linear ticket HUD-36
2. **Short-term:** Contact Eurosender support for PUDO API documentation
3. **Medium-term:** If PUDO API unavailable, implement workaround (cached points only)
4. **Long-term:** Revisit PUDO integration when API issue resolved

---

## Test Results Summary

```
✅ test-phase9-eurosender-quotes.ts - PASSED (5/5)
⚠️  test-phase9-eurosender-pudo.ts - PARTIAL (4/6 - PUDO API 400 error)
⚠️  test-phase9-eurosender-orders.ts - PARTIAL (quoteId undefined - sandbox limitation)
✅ test-phase9-integration.ts - MOSTLY PASSED (5/6 - PUDO search fails)
```

---

## Files Modified

- `apps/web/lib/services/eurosender-service.ts` - Added detailed logging
- `apps/web/lib/services/service-point-service.ts` - Updated PUDO request format
- `scripts/test-phase9-eurosender-pudo.ts` - Test script for PUDO API

---

## Notes

- All other Eurosender API endpoints work correctly
- Issue appears to be specific to PUDO endpoint
- May be sandbox limitation or incorrect request format
- Need official documentation to resolve

