#!/usr/bin/env tsx
/**
 * Script to run migration: Fix jerseys.owner_id for Clerk authentication
 * 
 * This script runs the migration SQL directly against Supabase database
 * Requires: SUPABASE_DB_PASSWORD in .env.local
 * 
 * Usage:
 *   npx tsx scripts/run-migration-fix-jerseys-owner-id.ts
 */

import { getPostgresPool } from '../apps/web/lib/db/postgres-connection';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  console.log('🚀 Running migration: Fix jerseys.owner_id for Clerk...\n');

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    // Read migration SQL file
    const migrationPath = join(
      process.cwd(),
      'supabase/migrations/20251129200000_fix_jerseys_owner_id_for_clerk.sql'
    );
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute entire migration as one transaction
    console.log('Executing migration SQL...\n');
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Regenerate TypeScript types:');
    console.log('   npx supabase gen types typescript --local > apps/web/lib/supabase/types.ts');
    console.log('2. Test jersey upload again');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

