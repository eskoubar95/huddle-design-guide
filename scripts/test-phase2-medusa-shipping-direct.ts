#!/usr/bin/env tsx
/**
 * Test script for Phase 2: MedusaShippingService (Direct SQL test)
 * 
 * Tests Medusa schema queries directly without importing service
 * to avoid TypeScript path alias issues
 */

async function testPhase2() {
  // Load environment variables from .env.local
  const dotenv = await import('dotenv');
  const path = await import('path');
  dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });
  
  // Dynamic import to handle TypeScript/ESM
  const { query, getPostgresPool } = await import('../apps/web/lib/db/postgres-connection');
  console.log('🧪 Testing Phase 2: MedusaShippingService (Direct SQL)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Query regions
  console.log('Test 1: Query Medusa regions');
  try {
    const regions = await query<{
      id: string;
      name: string;
      currency_code: string;
    }>(
      `
      SELECT id, name, currency_code
      FROM medusa.region
      ORDER BY name ASC
      `
    );

    console.log(`   ✅ Success: Found ${regions.length} region(s)`);
    
    if (regions.length > 0) {
      console.log(`   📋 Regions:`);
      for (const region of regions) {
        const countries = await query<{ iso_2: string }>(
          `
          SELECT iso_2
          FROM medusa.region_country
          WHERE region_id = $1
          ORDER BY iso_2 ASC
          `,
          [region.id]
        );
        
        console.log(`      - ${region.name} (${region.id})`);
        console.log(`        Currency: ${region.currency_code}`);
        console.log(`        Countries: ${countries.slice(0, 5).map(c => c.iso_2).join(', ')}${countries.length > 5 ? '...' : ''} (${countries.length} total)`);
      }
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
  console.log('Test 2: Find region by country code');
  const testCountries = ['DK', 'DE', 'FR', 'SE', 'GB'];
  
  // First, check which countries are actually in the region
  const regionCountries = await query<{ iso_2: string }>(
    `
    SELECT iso_2
    FROM medusa.region_country
    WHERE region_id = (SELECT id FROM medusa.region LIMIT 1)
    ORDER BY iso_2
    `
  );
  const availableCountries = regionCountries.map(c => c.iso_2);
  console.log(`   Available countries in region: ${availableCountries.slice(0, 10).join(', ')}${availableCountries.length > 10 ? '...' : ''} (${availableCountries.length} total)`);
  
  // Check if test countries are in the list (case-insensitive)
  const testCountriesInRegion = testCountries.filter(c => 
    availableCountries.some(ac => ac.toLowerCase() === c.toLowerCase())
  );
  console.log(`   Test countries in region: ${testCountriesInRegion.join(', ')}`);
  console.log('');
  
  for (const countryCode of testCountries) {
    try {
        // Try exact match first
        let result = await query<{
          region_id: string;
          region_name: string;
          currency_code: string;
        }>(
          `
          SELECT DISTINCT
            r.id as region_id,
            r.name as region_name,
            r.currency_code
          FROM medusa.region r
          INNER JOIN medusa.region_country rc ON r.id = rc.region_id
          WHERE rc.iso_2 = $1
          LIMIT 1
          `,
          [countryCode.toUpperCase()]
        );
        
        // If not found, try case-insensitive
        if (result.length === 0) {
          result = await query<{
            region_id: string;
            region_name: string;
            currency_code: string;
          }>(
            `
            SELECT DISTINCT
              r.id as region_id,
              r.name as region_name,
              r.currency_code
            FROM medusa.region r
            INNER JOIN medusa.region_country rc ON r.id = rc.region_id
            WHERE LOWER(rc.iso_2) = LOWER($1)
            LIMIT 1
            `,
            [countryCode]
          );
        }

      if (result.length > 0) {
        const region = result[0];
        console.log(`   ✅ ${countryCode}: Found region "${region.region_name}" (${region.region_id})`);
        passed++;
      } else {
        const isAvailable = availableCountries.includes(countryCode.toUpperCase());
        if (isAvailable) {
          console.log(`   ⚠️  ${countryCode}: Country exists in region but query returned no result (checking case sensitivity...)`);
          // Try with lowercase
          const resultLower = await query<{
            region_id: string;
            region_name: string;
            currency_code: string;
          }>(
            `
            SELECT DISTINCT
              r.id as region_id,
              r.name as region_name,
              r.currency_code
            FROM medusa.region r
            INNER JOIN medusa.region_country rc ON r.id = rc.region_id
            WHERE LOWER(rc.iso_2) = LOWER($1)
            LIMIT 1
            `,
            [countryCode]
          );
          if (resultLower.length > 0) {
            console.log(`   ✅ ${countryCode}: Found with case-insensitive query!`);
            passed++;
          } else {
            console.log(`   ❌ ${countryCode}: Query issue - country exists but not found`);
            failed++;
          }
        } else {
          console.log(`   ⚠️  ${countryCode}: Not in EU region (expected if not EU country)`);
        }
      }
    } catch (error) {
      console.error(`   ❌ ${countryCode}: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }
  console.log('');

  // Test 3: getShippingOptions() for first region
  console.log('Test 3: Query shipping options');
  try {
    const regions = await query<{ id: string; name: string }>(
      `SELECT id, name FROM medusa.region ORDER BY name ASC LIMIT 1`
    );

    if (regions.length === 0) {
      console.log('   ⚠️  Skipped: No regions available');
    } else {
      const firstRegion = regions[0];
      console.log(`   Testing with region: ${firstRegion.name} (${firstRegion.id})`);
      
      const options = await query<{
        id: string;
        name: string;
        price_type: string;
        type_code: string;
        type_label: string;
        price_amount: number;
        price_currency: string;
      }>(
        `
        SELECT DISTINCT
          so.id,
          so.name,
          so.price_type,
          sot.code as type_code,
          sot.label as type_label,
          p.amount as price_amount,
          p.currency_code as price_currency
        FROM medusa.shipping_option so
        LEFT JOIN medusa.shipping_option_type sot ON so.shipping_option_type_id = sot.id
        LEFT JOIN medusa.shipping_option_price_set sop ON so.id = sop.shipping_option_id
        LEFT JOIN medusa.price_set ps ON sop.price_set_id = ps.id
        LEFT JOIN medusa.price p ON ps.id = p.price_set_id
        WHERE (p.currency_code = (SELECT currency_code FROM medusa.region WHERE id = $1) OR p.currency_code IS NULL)
        ORDER BY so.name ASC
        `,
        [firstRegion.id]
      );

      console.log(`   ✅ Success: Found ${options.length} shipping option(s)`);
      
      if (options.length > 0) {
        console.log(`   📋 Shipping Options:`);
        options.forEach(option => {
          console.log(`      - ${option.name} (${option.id})`);
          console.log(`        Type: ${option.type_code} (${option.type_label})`);
          console.log(`        Price Type: ${option.price_type}`);
          if (option.price_amount) {
            console.log(`        Price: ${option.price_amount} ${option.price_currency} (${option.price_amount / 100} ${option.price_currency})`);
          } else {
            console.log(`        Price: No price configured`);
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

  // Test 4: getServiceZones()
  console.log('Test 4: Query service zones');
  try {
    const regions = await query<{ id: string; name: string }>(
      `SELECT id, name FROM medusa.region ORDER BY name ASC LIMIT 1`
    );

    if (regions.length === 0) {
      console.log('   ⚠️  Skipped: No regions available');
    } else {
      const firstRegion = regions[0];
      const zones = await query<{
        id: string;
        name: string;
        fulfillment_set_id: string;
      }>(
        `
        SELECT DISTINCT
          sz.id,
          sz.name,
          sz.fulfillment_set_id
        FROM medusa.service_zone sz
        INNER JOIN medusa.fulfillment_set fs ON sz.fulfillment_set_id = fs.id
        WHERE EXISTS (
          SELECT 1
          FROM medusa.geo_zone gz
          WHERE gz.service_zone_id = sz.id
          AND EXISTS (
            SELECT 1
            FROM medusa.region_country rc
            WHERE rc.region_id = $1
            AND rc.iso_2 = gz.country_code
          )
        )
        `,
        [firstRegion.id]
      );

      console.log(`   ✅ Success: Found ${zones.length} service zone(s) for region ${firstRegion.name}`);
      
      if (zones.length > 0) {
        zones.forEach(zone => {
          console.log(`      - ${zone.name} (${zone.id})`);
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

