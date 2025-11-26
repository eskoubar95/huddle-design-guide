import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  // Validate environment variables at runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build time, use placeholder values if env vars are missing
  // This allows CI/CD to build without real Supabase credentials
  const url = supabaseUrl || 'https://placeholder.supabase.co'
  const key = supabaseAnonKey || 'placeholder-key'

  if (!supabaseUrl || !supabaseAnonKey) {
    // Only warn in development, not in production builds
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Missing Supabase environment variables. Using placeholder values. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
      )
    }
  }

  return createBrowserClient<Database>(url, key)
}

