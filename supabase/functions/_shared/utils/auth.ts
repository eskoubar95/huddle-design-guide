/**
 * Shared authentication utilities for Supabase Edge Functions
 * 
 * Provides consistent token verification and error handling across all edge functions
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
}

/**
 * Verify Clerk JWT token and extract userId
 * Uses @clerk/backend for proper signature verification
 */
export async function verifyClerkToken(token: string): Promise<{ userId: string | null; error?: string }> {
  try {
    const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY')
    if (!clerkSecretKey) {
      const error = 'CLERK_SECRET_KEY not set in Edge Function secrets. Set it via: supabase secrets set CLERK_SECRET_KEY=<your-key>'
      console.error('[AUTH]', error)
      return { userId: null, error }
    }

    // Use @clerk/backend for proper JWT signature verification
    try {
      const { verifyToken } = await import('https://esm.sh/@clerk/backend@1.34.0')
      const session = await verifyToken(token, {
        secretKey: clerkSecretKey,
      })
      
      if (session?.sub) {
        // Log successful verification (no PII - only userId prefix)
        console.log('[AUTH] Token verified, userId prefix:', session.sub.slice(0, 8))
        return { userId: session.sub }
      }
    } catch (clerkError) {
      const errorMessage = clerkError instanceof Error ? clerkError.message : String(clerkError)
      console.warn('[AUTH] @clerk/backend verification failed:', errorMessage)
      
      // Check if it's an expiration error
      const isExpired = errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('exp')
      return { 
        userId: null, 
        error: isExpired ? 'Token expired' : `Token verification failed: ${errorMessage}` 
      }
    }

    return { userId: null, error: 'Token verification failed' }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[AUTH] Token verification error:', errorMessage)
    return { userId: null, error: `Token verification failed: ${errorMessage}` }
  }
}

/**
 * Create a standardized 401 Unauthorized response
 * Includes WWW-Authenticate header for proper HTTP auth handling
 */
export function createUnauthorizedResponse(error?: string): Response {
  return new Response(
    JSON.stringify({ 
      error: error || 'Unauthorized',
      code: 'UNAUTHORIZED',
    }),
    { 
      status: 401, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="edge-function", error="invalid_token"',
      } 
    }
  )
}

/**
 * Extract and verify Clerk token from request headers
 * Returns userId if valid, or null with error message
 */
export async function getAuthenticatedUserId(req: Request): Promise<{ userId: string | null; error?: string }> {
  // Get Clerk token from custom header (Supabase anon key is in Authorization header)
  const clerkToken = req.headers.get('x-clerk-token')
  
  if (!clerkToken) {
    return { userId: null, error: 'Missing Clerk token in X-Clerk-Token header' }
  }

  return await verifyClerkToken(clerkToken)
}

/**
 * Require authentication for edge function
 * Returns userId or throws error response
 */
export async function requireAuth(req: Request): Promise<string> {
  const { userId, error } = await getAuthenticatedUserId(req)
  
  if (!userId) {
    throw createUnauthorizedResponse(error)
  }
  
  return userId
}

