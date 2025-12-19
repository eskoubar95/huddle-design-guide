# Phase 9 - Eurosender Integration Testing

## Test Scripts

Four comprehensive test scripts for Eurosender integration:

1. **`test-phase9-eurosender-quotes.ts`** - Quote generation testing
2. **`test-phase9-eurosender-pudo.ts`** - PUDO point search testing
3. **`test-phase9-eurosender-orders.ts`** - Order creation & label testing
4. **`test-phase9-integration.ts`** - Full integration flow testing

## Prerequisites

- `EUROSENDER_API_KEY` in `apps/web/.env.local`
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (for PUDO caching tests)
- Eurosender sandbox API key (not production)

## Usage

```bash
# Run individual test scripts
tsx scripts/test-phase9-eurosender-quotes.ts
tsx scripts/test-phase9-eurosender-pudo.ts
tsx scripts/test-phase9-eurosender-orders.ts
tsx scripts/test-phase9-integration.ts

# Or make them executable and run directly
chmod +x scripts/test-phase9-*.ts
./scripts/test-phase9-eurosender-quotes.ts
```

## Test Coverage

### Quote Generation (`test-phase9-eurosender-quotes.ts`)
- ✅ Various EU country pairs (DK → SE, DK → DE, DK → FR)
- ✅ Different parcel weights (0.5kg, 2kg, 5kg)
- ✅ Service types verification (flexi, regular_plus, express)
- ✅ Error handling (invalid addresses)
- ✅ Price format verification (EUR)
- ✅ courierId presence verification

### PUDO Point Search (`test-phase9-eurosender-pudo.ts`)
- ✅ Get quote → Extract courierId → Search PUDO points
- ✅ Point structure verification (name, address, coordinates, opening hours)
- ✅ Caching verification (points stored in database)
- ✅ Distance calculation
- ✅ Error handling (invalid courierId, missing coordinates)
- ✅ Search without courierId (returns cached only)

### Order Creation (`test-phase9-eurosender-orders.ts`)
- ✅ Create order from quote
- ✅ Order response verification (orderCode, status, labelUrl, trackingNumber)
- ✅ Get order details
- ✅ Get label URL
- ✅ Get tracking information
- ✅ Error handling (invalid orderCode)

### Integration Flow (`test-phase9-integration.ts`)
- ✅ Full flow: Quote → Extract courierId → PUDO Search
- ✅ ShippingService orchestration structure
- ✅ courierId in ShippingOption metadata
- ✅ ServicePointService graceful handling
- ✅ Error propagation

## Expected Results

- All scripts should run without fatal errors
- Quote generation returns 1-3 service types
- PUDO points returned with correct format
- Orders can be created and labels retrieved
- Integration flow works end-to-end

## Notes

- Some operations may be async (label generation, tracking)
- Sandbox API may have limitations (fewer points, slower responses)
- Test with realistic parcel dimensions
- Verify caching reduces API calls
- Check Sentry logs for any errors

## Troubleshooting

### "EUROSENDER_API_KEY not found"
- Add `EUROSENDER_API_KEY=your-sandbox-key` to `apps/web/.env.local`

### "No service types returned"
- Check API key is valid
- Verify addresses are correct
- Check Eurosender sandbox status

### "No PUDO points returned"
- May be API limitation (sandbox)
- Try different coordinates
- Verify courierId is valid

### Import errors
- Ensure you're running from project root
- Check `tsconfig.json` paths are correct
- Verify dependencies are installed

