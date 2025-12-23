#!/usr/bin/env tsx
/**
 * Script to verify HUD-42 Phase 1 migration
 * 
 * Verifies that shipping_label_status_history table and unique constraint are created correctly
 */

import { query } from '../apps/web/lib/db/postgres-connection';

async function verifyMigration() {
  console.log('🔍 Verifying HUD-42 Phase 1 migration...\n');

  try {
    // Check if shipping_label_status_history table exists
    const tableCheck = await query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shipping_label_status_history'
      ) as exists;
      `
    );

    if (!tableCheck[0]?.exists) {
      console.error('❌ shipping_label_status_history table does not exist');
      process.exit(1);
    }
    console.log('✅ shipping_label_status_history table exists');

    // Check if unique constraint exists
    const constraintCheck = await query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = 'shipping_labels_transaction_purchased_unique'
      ) as exists;
      `
    );

    if (!constraintCheck[0]?.exists) {
      console.error('❌ shipping_labels_transaction_purchased_unique constraint does not exist');
      process.exit(1);
    }
    console.log('✅ shipping_labels_transaction_purchased_unique constraint exists');

    // Check table columns
    const columnsCheck = await query<{ column_name: string; data_type: string }>(
      `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'shipping_label_status_history'
      ORDER BY ordinal_position;
      `
    );

    const expectedColumns = ['id', 'shipping_label_id', 'status', 'error_message', 'created_at'];
    const actualColumns = columnsCheck.map(c => c.column_name);

    for (const col of expectedColumns) {
      if (!actualColumns.includes(col)) {
        console.error(`❌ Column '${col}' not found in shipping_label_status_history`);
        process.exit(1);
      }
    }
    console.log('✅ All required columns exist');

    // Check indexes
    const indexesCheck = await query<{ indexname: string }>(
      `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public' 
      AND tablename = 'shipping_label_status_history';
      `
    );

    const expectedIndexes = [
      'idx_shipping_label_status_history_label_id',
      'idx_shipping_label_status_history_created_at'
    ];
    const actualIndexes = indexesCheck.map(i => i.indexname);

    for (const idx of expectedIndexes) {
      if (!actualIndexes.includes(idx)) {
        console.error(`❌ Index '${idx}' not found`);
        process.exit(1);
      }
    }
    console.log('✅ All required indexes exist');

    console.log('\n🎉 Migration verification complete!');
    console.log('\nSummary:');
    console.log('  ✅ shipping_label_status_history table created');
    console.log('  ✅ All columns present');
    console.log('  ✅ All indexes created');
    console.log('  ✅ Race condition constraint (shipping_labels_transaction_purchased_unique) created');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyMigration();

