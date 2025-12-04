/**
 * Standalone script to seed metadata
 * 
 * Usage (from apps/web directory):
 *   cd apps/web
 *   npx tsx ../../scripts/seed-metadata.ts
 * 
 * Or add to apps/web/package.json:
 *   "seed-metadata": "tsx ../../scripts/seed-metadata.ts"
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chdir } from 'process';
import { readFileSync } from 'fs';

// Change working directory to apps/web so path aliases work
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const webDir = join(__dirname, '../apps/web');
chdir(webDir);

// Load environment variables from .env.local
try {
  const envFile = readFileSync(join(webDir, '.env.local'), 'utf-8');
  envFile.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
  console.log('[ENV] Loaded environment variables from .env.local');
} catch (error) {
  console.warn('[ENV] Could not load .env.local, using system environment variables');
}

// Dynamic import after changing directory
async function main() {
  // Use absolute path to ensure correct resolution
  const webLibPath = join(webDir, 'lib/services/metadata-seed-service');
  const { MetadataSeedService } = await import(webLibPath);
  const { closePool } = await import(join(webDir, 'lib/db/postgres-connection'));
  
  console.log('Starting metadata seed...');
  const seedService = new MetadataSeedService();
  
  try {
    await seedService.seedAll();
    console.log('Metadata seed completed successfully');
  } finally {
    // Always close the connection pool when done
    await closePool();
    console.log('[DB] Connection pool closed');
  }
  
  process.exit(0);
}

main().catch(async (error) => {
  console.error('Seed failed:', error);
  // Try to close pool even on error
  try {
    const { closePool } = await import(join(webDir, 'lib/db/postgres-connection'));
    await closePool();
  } catch {
    // Ignore errors when closing pool
  }
  process.exit(1);
});

