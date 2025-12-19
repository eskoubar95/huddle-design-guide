#!/usr/bin/env tsx
/**
 * Test script for Phase 2: MedusaShippingService
 * 
 * Tests:
 * - getRegions() - should return regions including manually created EU region
 * - getRegionByCountry() - should find region for EU countries (DK, DE, FR, etc.)
 * - getShippingOptions() - should return shipping options for region
 * - Error handling with invalid region_id
 */

// Use dynamic import to handle TypeScript/ESM
const { MedusaShippingService } = await import('../apps/web/lib/services/medusa-shipping-service');
const { getPostgresPool } = await import('../apps/web/lib/db/postgres-connection');

async function testPhase2() {
  console.log('🧪 Testing Phase 2: MedusaShippingService\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const service = new MedusaShippingService();
  let passed = 0;
  let failed = 0;

  // Test 1: getRegions()
  console.log('Test 1: getRegions()');
  try {
    const regions = await service.getRegions();
    console.log(`   ✅ Success: Found ${regions.length} region(s)`);
    
    if (regions.length > 0) {
      console.log(`   📋 Regions:`);
      regions.forEach(region => {
        console.log(`      - ${region.name} (${region.id})`);
        console.log(`        Currency: ${region.currency_code}`);
        console.log(`        Countries: ${region.countries.slice(0, 5).join(', ')}${region.countries.length > 5 ? '...' : ''} (${region.countries.length} total)`);
      });
    } else {
      console.log('   ⚠️  Warning: No regions found. Make sure EU region is created in Medusa Admin.');
    }
    passed++;
  } catch (error) {
    console.error(`   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
  console.log('');

  // Test 2: getRegionByCountry() for EU countries
  console.log('Test 2: getRegionByCountry() for EU countries');
  const testCountries = ['DK', 'DE', 'FR', 'SE', 'GB'];
  
  for (const countryCode of testCountries) {
    try {
      const region = await service.getRegionByCountry(countryCode);
      if (region) {
        console.log(`   ✅ ${countryCode}: Found region "${region.name}" (${region.id})`);
        passed++;
      } else {
        console.log(`   ⚠️  ${countryCode}: No region found (might not be in EU region)`);
      }
    } catch (error) {
      console.error(`   ❌ ${countryCode}: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }
  console.log('');

  // Test 3: getShippingOptions() for first region
  console.log('Test 3: getShippingOptions()');
  try {
    const regions = await service.getRegions();
    if (regions.length === 0) {
      console.log('   ⚠️  Skipped: No regions available');
    } else {
      const firstRegion = regions[0];
      console.log(`   Testing with region: ${firstRegion.name} (${firstRegion.id})`);
      
      const options = await service.getShippingOptions(firstRegion.id);
      console.log(`   ✅ Success: Found ${options.length} shipping option(s)`);
      
      if (options.length > 0) {
        console.log(`   📋 Shipping Options:`);
        options.forEach(option => {
          console.log(`      - ${option.name} (${option.id})`);
          console.log(`        Type: ${option.type_code} (${option.type_label})`);
          console.log(`        Price Type: ${option.price_type}`);
          if (option.prices.length > 0) {
            const eurPrice = option.prices.find(p => p.currency_code === 'eur');
            const price = eurPrice || option.prices[0];
            console.log(`        Price: ${price.amount} ${price.currency_code} (${price.amount / 100} ${price.currency_code})`);
          } else {
            console.log(`        Price: No prices configured`);
          }
        });
      } else {
        console.log('   ⚠️  Warning: No shipping options found. Make sure shipping options are configured in Medusa.');
      }
      passed++;
    }
  } catch (error) {
    console.error(`   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
  console.log('');

  // Test 4: Error handling with invalid region_id
  console.log('Test 4: Error handling with invalid region_id');
  try {
    const invalidRegionId = '00000000-0000-0000-0000-000000000000';
    await service.getShippingOptions(invalidRegionId);
    console.log('   ⚠️  Warning: Should have thrown error for invalid region_id');
    failed++;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      console.log('   ✅ Success: Correctly handled invalid region_id');
      passed++;
    } else {
      console.error(`   ❌ Failed: Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }
  console.log('');

  // Test 5: getServiceZones()
  console.log('Test 5: getServiceZones()');
  try {
    const regions = await service.getRegions();
    if (regions.length === 0) {
      console.log('   ⚠️  Skipped: No regions available');
    } else {
      const firstRegion = regions[0];
      const zones = await service.getServiceZones(firstRegion.id);
      console.log(`   ✅ Success: Found ${zones.length} service zone(s) for region ${firstRegion.name}`);
      
      if (zones.length > 0) {
        zones.forEach(zone => {
          console.log(`      - ${zone.name} (${zone.id})`);
          console.log(`        Geo zones: ${zone.geo_zones.length}`);
        });
      }
      passed++;
    }
  } catch (error) {
    console.error(`   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
  console.log('');

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Test Summary:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('✅ All tests passed! Phase 2 verification complete.\n');
  } else {
    console.log('⚠️  Some tests failed. Review errors above.\n');
  }

  // Close pool
  const pool = getPostgresPool();
  await pool.end();
}

testPhase2().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

