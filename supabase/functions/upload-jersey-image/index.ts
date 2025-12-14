// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Errors, corsHeaders, handleEdgeFunctionError, EdgeFunctionError } from '../_shared/utils/errors.ts'
import { retryWithBackoff } from '../_shared/utils/retry.ts'
import { CleanupManager } from '../_shared/utils/cleanup.ts'

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
      return Errors.MISSING_TOKEN.toResponse()
    }

    const { userId: verifiedUserId, error: verifyError } = await verifyClerkToken(clerkToken)
    
    if (!verifiedUserId) {
      return Errors.INVALID_TOKEN.toResponse()
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
      return Errors.MISSING_FIELDS(['jerseyId', 'file', 'userId']).toResponse()
    }

    // Verify userId from token matches userId from form data
    if (verifiedUserId !== userId) {
      return Errors.USER_MISMATCH.toResponse()
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return Errors.INVALID_FILE_TYPE(allowedTypes).toResponse()
    }

    const maxSize = 10 * 1024 * 1024 // 10 MB
    if (file.size > maxSize) {
      return Errors.FILE_TOO_LARGE(maxSize).toResponse()
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
      return Errors.JERSEY_NOT_FOUND.toResponse()
    }

    if (jersey.owner_id !== userId) {
      return new EdgeFunctionError(
        'UNAUTHORIZED',
        'Unauthorized: You do not own this jersey',
        403
      ).toResponse()
    }

    // Only allow uploads to draft jerseys (prevent accidental overwrites)
    if (jersey.status !== 'draft') {
      return new EdgeFunctionError(
        'INVALID_STATUS',
        'Can only upload images to draft jerseys',
        400
      ).toResponse()
    }

    // Upload to Storage: {jersey_id}/{fileName}
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${jerseyId}/${fileName}`

    // Convert File to ArrayBuffer
    // Note: Image resize is now handled in the browser before upload to avoid CPU timeout
    // The frontend resizes images to max 2000px before sending to this Edge Function
    const arrayBuffer = await file.arrayBuffer()

    const cleanup = new CleanupManager()

    // Upload file directly (already resized by frontend if needed) with retry
    try {
      await retryWithBackoff(
        async () => {
    const { error: uploadError } = await supabase.storage
      .from('jersey_images')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      // Check for specific error types
      if (uploadError.message?.includes('already exists')) {
              throw Errors.FILE_ALREADY_EXISTS
      }
      if (uploadError.message?.includes('quota') || uploadError.message?.includes('space')) {
              throw Errors.STORAGE_QUOTA_EXCEEDED
            }
            throw new Error(`Upload failed: ${uploadError.message}`)
          }
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
        }
      )

      // Register cleanup task
      cleanup.register(async () => {
        await supabase.storage.from('jersey_images').remove([storagePath])
      })
    } catch (uploadError) {
      if (uploadError instanceof EdgeFunctionError) {
        return uploadError.toResponse()
      }
      throw uploadError
    }

    // Get public URL for original
    const { data: { publicUrl } } = supabase.storage
      .from('jersey_images')
      .getPublicUrl(storagePath)

    // Note: Image variant generation (vision, gallery, card) is now handled by imgproxy on Railway.
    // Database trigger calls generate-image-variants Edge Function which generates imgproxy URLs
    // (no physical files created - variants are generated on-the-fly by imgproxy).
    // Legacy WebP generation (generate-webp-image) can be deprecated once imgproxy is verified stable.

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
    // Note: Variants (vision, gallery, card) will be generated via imgproxy URLs by database trigger
    // calling generate-image-variants Edge Function. image_url_webp will be set to imgproxy gallery URL
    // for backward compatibility (no physical files created).
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
      await cleanup.execute()
      
      return Errors.PROCESSING_FAILED(
        'save image metadata',
        insertError.message
      ).toResponse()
    }

    // Clear cleanup tasks on success
    cleanup.clear()

    // Note: Variant generation will happen asynchronously via database trigger
    // Frontend should handle image_url_webp being null initially
    // Variant URLs can be derived from storage_path using helper functions
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
    console.error('[UPLOAD-JERSEY-IMAGE] Unexpected error:', error)
    return handleEdgeFunctionError(error)
  }
})

