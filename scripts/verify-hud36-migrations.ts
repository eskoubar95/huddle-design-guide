#!/usr/bin/env tsx
/**
 * Script to verify HUD-36 migrations
 * 
 * Verifies that service_points and shipping_labels tables are created correctly
 */

import { query } from '../apps/web/lib/db/postgres-connection';

async function verifyMigrations() {
  console.log('🔍 Verifying HUD-36 migrations...\n');

  try {
    // Check if service_points table exists
    const servicePointsCheck = await query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'service_points'
      ) as exists;
      `
    );

    if (!servicePointsCheck[0]?.exists) {
      console.error('❌ service_points table does not exist');
      process.exit(1);
    }
    console.log('✅ service_points table exists');

    // Check if shipping_labels table exists
    const shippingLabelsCheck = await query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shipping_labels'
      ) as exists;
      `
    );

    if (!shippingLabelsCheck[0]?.exists) {
      console.error('❌ shipping_labels table does not exist');
      process.exit(1);
    }
    console.log('✅ shipping_labels table exists');

    // Check indexes on service_points
    const servicePointsIndexes = await query<{ indexname: string }>(
      `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'service_points' 
      AND schemaname = 'public'
      ORDER BY indexname;
      `
    );

    console.log('\n📊 service_points indexes:');
    servicePointsIndexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

    // Check indexes on shipping_labels
    const shippingLabelsIndexes = await query<{ indexname: string }>(
      `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'shipping_labels' 
      AND schemaname = 'public'
      ORDER BY indexname;
      `
    );

    console.log('\n📊 shipping_labels indexes:');
    shippingLabelsIndexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

    // Check RLS status
    const rlsCheck = await query<{
      tablename: string;
      rowsecurity: boolean;
    }>(
      `
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('service_points', 'shipping_labels')
      ORDER BY tablename;
      `
    );

    console.log('\n🔒 RLS Status:');
    rlsCheck.forEach(table => {
      console.log(`   - ${table.tablename}: ${table.rowsecurity ? '✅ Enabled' : '❌ Disabled'}`);
    });

    // Check constraints
    const constraints = await query<{
      table_name: string;
      constraint_name: string;
      constraint_type: string;
    }>(
      `
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
      AND tc.table_name IN ('service_points', 'shipping_labels')
      ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
      `
    );

    console.log('\n🔗 Constraints:');
    constraints.forEach(constraint => {
      console.log(`   - ${constraint.table_name}.${constraint.constraint_name} (${constraint.constraint_type})`);
    });

    console.log('\n✅ All migrations verified successfully!');
    
    // Close pool manually
    const { getPostgresPool } = await import('../apps/web/lib/db/postgres-connection');
    const pool = getPostgresPool();
    await pool.end();
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyMigrations();

