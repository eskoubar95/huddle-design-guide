// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
}

/**
 * Verify Clerk JWT token and extract userId
 * Note: For production, we should verify the JWT signature properly
 * For now, we decode and validate the payload structure
 */
async function verifyClerkToken(token: string): Promise<{ userId: string | null; error?: string }> {
  try {
    const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY')
    if (!clerkSecretKey) {
      const error = 'CLERK_SECRET_KEY not set in Edge Function secrets. Set it via: supabase secrets set CLERK_SECRET_KEY=<your-key>'
      console.error(error)
      return { userId: null, error }
    }

    // Try @clerk/backend first
    try {
      const { verifyToken } = await import('https://esm.sh/@clerk/backend@1.34.0')
      const session = await verifyToken(token, {
        secretKey: clerkSecretKey,
      })
      
      if (session?.sub) {
        return { userId: session.sub }
      }
    } catch (clerkError) {
      console.warn('@clerk/backend verification failed, trying fallback:', clerkError)
    }

    // Fallback: Basic JWT payload extraction (for debugging - should verify signature in production)
    // This is a temporary workaround - proper JWT signature verification should be added
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { userId: null, error: 'Invalid JWT format' }
    }

    try {
      // Decode base64url payload
      const base64Url = parts[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      
      const payload = JSON.parse(jsonPayload)
      
      // Basic validation
      if (!payload.sub) {
        return { userId: null, error: 'Token missing subject (sub) claim' }
      }
      
      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return { userId: null, error: 'Token expired' }
      }
      
      // Verify issuer contains 'clerk'
      if (payload.iss && !payload.iss.includes('clerk')) {
        return { userId: null, error: 'Token issuer is not Clerk' }
      }
      
      return { userId: payload.sub }
    } catch (decodeError) {
      return { userId: null, error: `Failed to decode token: ${decodeError}` }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Token verification failed:', errorMessage)
    return { userId: null, error: `Token verification failed: ${errorMessage}` }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get Clerk token from custom header (Supabase anon key is in Authorization header)
    const clerkToken = req.headers.get('x-clerk-token')
    if (!clerkToken) {
      return new Response(
        JSON.stringify({ error: 'Missing Clerk token in X-Clerk-Token header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId: verifiedUserId, error: verifyError } = await verifyClerkToken(clerkToken)
    
    if (!verifiedUserId) {
      return new Response(
        JSON.stringify({ 
          error: verifyError || 'Invalid or expired token',
          details: verifyError // Include details for debugging
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use FormData for file uploads (not JSON)
    const formData = await req.formData()
    const file = formData.get('file') as File
    const jerseyId = formData.get('jerseyId') as string
    const userId = formData.get('userId') as string
    const sortOrderStr = formData.get('sortOrder') as string | null
    let sortOrder: number | null = null
    if (sortOrderStr) {
      const parsed = parseInt(sortOrderStr, 10)
      if (!isNaN(parsed)) {
        sortOrder = parsed
      }
    }

    // Validate
    if (!jerseyId || !file || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: jerseyId, file, or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify userId from token matches userId from form data
    if (verifiedUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch: token user does not match request user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const maxSize = 10 * 1024 * 1024 // 10 MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: `File too large: ${file.size} bytes. Max: ${maxSize} bytes` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify jersey ownership and draft status
    const { data: jersey, error: jerseyError } = await supabase
      .from('jerseys')
      .select('id, owner_id, status')
      .eq('id', jerseyId)
      .single()

    if (jerseyError || !jersey) {
      return new Response(
        JSON.stringify({ error: 'Jersey not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (jersey.owner_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You do not own this jersey' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only allow uploads to draft jerseys (prevent accidental overwrites)
    if (jersey.status !== 'draft') {
      return new Response(
        JSON.stringify({ error: 'Can only upload images to draft jerseys' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upload to Storage: {jersey_id}/{fileName}
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${jerseyId}/${fileName}`

    // Convert File to ArrayBuffer
    // Note: Image resize is now handled in the browser before upload to avoid CPU timeout
    // The frontend resizes images to max 2000px before sending to this Edge Function
    const arrayBuffer = await file.arrayBuffer()

    // Upload file directly (already resized by frontend if needed)
    const { error: uploadError } = await supabase.storage
      .from('jersey_images')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      // Check for specific error types
      if (uploadError.message?.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'File already exists. Please try again.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (uploadError.message?.includes('quota') || uploadError.message?.includes('space')) {
        return new Response(
          JSON.stringify({ error: 'Storage quota exceeded. Please contact support.' }),
          { status: 507, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw uploadError
    }

    // Get public URL for original
    const { data: { publicUrl } } = supabase.storage
      .from('jersey_images')
      .getPublicUrl(storagePath)

    // Note: WebP generation is now handled by database trigger calling generate-webp-image Edge Function
    // This makes upload faster and more reliable

    // Determine sort_order: use provided value, or count existing images for this jersey
    // IMPORTANT: If sortOrder is provided, use it directly (frontend handles ordering)
    // If not provided, count existing images (for backward compatibility)
    let finalSortOrder = 0
    if (sortOrder !== null && sortOrder !== undefined) {
      // Use provided sortOrder (frontend sends correct order)
      finalSortOrder = sortOrder
    } else {
      // Count existing images to determine sort_order (fallback)
      const { count, error: countError } = await supabase
        .from('jersey_images')
        .select('*', { count: 'exact', head: true })
        .eq('jersey_id', jerseyId)
      
      if (!countError && count !== null) {
        finalSortOrder = count
      }
    }
    
    console.log(`Setting sort_order to ${finalSortOrder} for jersey ${jerseyId} (provided: ${sortOrder})`)

    // Create jersey_images row
    // Note: image_url_webp will be set by database trigger calling generate-webp-image Edge Function
    const insertData = {
      jersey_id: jerseyId,
      image_url: publicUrl, // Always store original URL
      storage_path: storagePath,
      sort_order: finalSortOrder, // First image = 0 (cover), subsequent = 1, 2, 3...
      // image_url_webp will be null initially, trigger will populate it asynchronously
    }
    
    console.log('Inserting jersey_image:', { jersey_id: jerseyId, sort_order: finalSortOrder })
    
    const { error: insertError } = await supabase
      .from('jersey_images')
      .insert(insertData)

    if (insertError) {
      console.error('Database insert error:', insertError)
      // Cleanup uploaded file if DB insert fails
      await supabase.storage
        .from('jersey_images')
        .remove([storagePath])
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save image metadata',
          details: insertError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Note: WebP generation will happen asynchronously via database trigger
    // Frontend should handle image_url_webp being null initially
    return new Response(
      JSON.stringify({ 
        url: publicUrl,
        storagePath,
        jerseyId,
        // optimizedUrl will be available after trigger processes WebP (may be null initially)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

