/**
 * Direct PostgreSQL connection helper for seed scripts and admin operations
 * Bypasses PostgREST and connects directly to Supabase PostgreSQL database
 */

import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

/**
 * Get PostgreSQL connection pool
 * Creates a singleton pool that can be reused across operations
 */
export function getPostgresPool(): Pool {
  if (pool) {
    return pool;
  }

  // Construct connection string from Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  if (!dbPassword) {
    throw new Error(
      'SUPABASE_DB_PASSWORD is required. Get it from Supabase Dashboard → Settings → Database → Connection string'
    );
  }

  // Extract project ref from URL (e.g., https://trbyclravrmmhxplocsr.supabase.co)
  const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
  }

  const projectRef = urlMatch[1];

  // Construct direct PostgreSQL connection string
  // Using pooler connection (port 6543) for better reliability
  // Format: postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres
  // Region: eu-central-2 (from project details)
  const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(
    dbPassword
  )}@aws-1-eu-central-2.pooler.supabase.com:6543/postgres`;

  pool = new Pool({
    connectionString,
    // Connection pool settings
    max: 5, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be established
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  return pool;
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPostgresPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPostgresPool();
  return pool.connect();
}

/**
 * Close the connection pool
 * Call this when done with all database operations (e.g., at end of seed script)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

