/**
 * Database connection utilities
 * Helper functions for establishing PostgreSQL connections in edge functions
 * Uses Supabase pooler for better reliability
 */

/**
 * Get PostgreSQL connection string from environment variables
 * Extracts project ref from SUPABASE_URL and builds pooler connection string
 * 
 * @returns PostgreSQL connection string for pooler
 * @throws Error if SUPABASE_URL or DB_PASSWORD is missing
 */
export function getPostgresConnectionString(): string {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const dbPassword = Deno.env.get('DB_PASSWORD')
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is required')
  }
  
  if (!dbPassword) {
    throw new Error('DB_PASSWORD is required. Set it in Supabase Dashboard → Edge Functions → Secrets')
  }
  
  // Extract project ref from URL
  // Format: https://PROJECT_REF.supabase.co
  const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
  if (!urlMatch) {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`)
  }
  
  const projectRef = urlMatch[1]
  
  // Use pooler connection (port 6543) for better reliability
  // Format: postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres
  return `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-1-eu-central-2.pooler.supabase.com:6543/postgres`
}

