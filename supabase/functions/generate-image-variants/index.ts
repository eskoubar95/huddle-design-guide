// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { retryWithBackoff } from '../_shared/utils/retry.ts'
import { Errors, corsHeaders, handleEdgeFunctionError } from '../_shared/utils/errors.ts'
import { getImgproxyVariantUrlSync, downloadFromImgproxy } from '../_shared/utils/imgproxy.ts'

interface GenerateVariantsRequest {
  jerseyImageId: string
  imageUrl: string
  storagePath: string
}

/**
 * Get variant storage path from original storage path
 * Example: "jersey-id/1234567890-abc123.jpg" -> "jersey-id/1234567890-abc123-vision.jpg"
 */
function getVariantStoragePath(
  originalPath: string,
  variant: 'vision' | 'gallery' | 'card'
): string {
  if (!originalPath) return originalPath

  // Extract base name without extension
  const pathParts = originalPath.split('/')
  const fileName = pathParts[pathParts.length - 1]
  const baseName = fileName.replace(/\.[^.]+$/, '') // Remove extension
  const jerseyId = pathParts[0] // First part is jersey_id

  // Determine extension and suffix based on variant
  const variantConfig = {
    vision: { suffix: '-vision', ext: '.jpg' },    // For AI Vision processing (max 2000x2000, JPEG Q80)
    gallery: { suffix: '-gallery', ext: '.webp' }, // For detail view (1200w, WebP Q70)
    card: { suffix: '-card', ext: '.webp' },       // For thumbnails (480w, WebP Q65)
  }[variant]

  const variantFileName = `${baseName}${variantConfig.suffix}${variantConfig.ext}`
  return `${jerseyId}/${variantFileName}`
}

/**
 * Generate image variants (vision, gallery, card) using imgproxy and store them in Supabase Storage
 * This function:
 * 1. Generates imgproxy URLs for each variant
 * 2. Downloads the transformed images from imgproxy
 * 3. Uploads variants to Supabase Storage
 * 4. Updates database with gallery variant URL for backward compatibility
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body: GenerateVariantsRequest = await req.json()
    const { jerseyImageId, imageUrl, storagePath } = body

    // Validation
    if (!jerseyImageId || !imageUrl || !storagePath) {
      return Errors.MISSING_FIELDS(['jerseyImageId', 'imageUrl', 'storagePath']).toResponse()
    }

    console.log(`[GENERATE-VARIANTS] Generating variants for jersey_image ${jerseyImageId}`)

    // Check if image exists in database
    const { data: existingImage, error: fetchError } = await supabase
      .from('jersey_images')
      .select('storage_path')
      .eq('id', jerseyImageId)
      .single()

    if (fetchError || !existingImage) {
      return Errors.IMAGE_NOT_FOUND.toResponse()
    }

    // Check if already WebP (skip if original is already WebP - variants not needed)
    const isWebP = imageUrl.toLowerCase().endsWith('.webp') || storagePath.toLowerCase().endsWith('.webp')
    if (isWebP) {
      console.log(`[GENERATE-VARIANTS] Image is already WebP, skipping: ${jerseyImageId}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Image is already WebP, variants not needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate imgproxy URLs for all variants
    const variantUrls: Record<string, string> = {}
    const variantStoragePaths: Record<string, string> = {}

    try {
      // Vision variant: max 2000x2000, JPEG, quality 80
      variantUrls.vision = getImgproxyVariantUrlSync(storagePath, 'vision')
      variantStoragePaths.vision = getVariantStoragePath(storagePath, 'vision')
      console.log(`[GENERATE-VARIANTS] Generated vision variant URL: ${variantUrls.vision}`)

      // Gallery variant: width 1200, WebP, quality 70
      variantUrls.gallery = getImgproxyVariantUrlSync(storagePath, 'gallery')
      variantStoragePaths.gallery = getVariantStoragePath(storagePath, 'gallery')
      console.log(`[GENERATE-VARIANTS] Generated gallery variant URL: ${variantUrls.gallery}`)

      // Card variant: width 480, WebP, quality 65
      variantUrls.card = getImgproxyVariantUrlSync(storagePath, 'card')
      variantStoragePaths.card = getVariantStoragePath(storagePath, 'card')
      console.log(`[GENERATE-VARIANTS] Generated card variant URL: ${variantUrls.card}`)
    } catch (error) {
      console.error(`[GENERATE-VARIANTS] Error generating imgproxy URLs:`, error)
      return Errors.PROCESSING_FAILED(
        'generate imgproxy URLs',
        error instanceof Error ? error.message : String(error)
      ).toResponse()
    }

    // Download variants from imgproxy and upload to Storage
    const uploadedVariants: Record<string, string> = {}

    // Process each variant (vision, gallery, card)
    const variantNames: Array<'vision' | 'gallery' | 'card'> = ['vision', 'gallery', 'card']
    
    for (const variantName of variantNames) {
      const imgproxyUrl = variantUrls[variantName]
      const variantStoragePath = variantStoragePaths[variantName]
      
      if (!imgproxyUrl || !variantStoragePath) {
        console.warn(`[GENERATE-VARIANTS] Missing URL or path for ${variantName} variant`)
        continue
      }
      
      try {
        console.log(`[GENERATE-VARIANTS] Downloading ${variantName} variant from imgproxy...`)
        console.log(`[GENERATE-VARIANTS] Uploading ${variantName} variant to Storage: ${variantStoragePath}`)
        
        // Download from imgproxy with retry
        const variantBuffer = await retryWithBackoff(
          async () => downloadFromImgproxy(imgproxyUrl),
          {
            maxRetries: 3,
            initialDelay: 1000,
          }
        )

        // Determine content type based on variant
        const contentType = variantName === 'vision' ? 'image/jpeg' : 'image/webp'

        // Upload to Storage with retry
        await retryWithBackoff(
          async () => {
            const uploadResult = await supabase.storage
              .from('jersey_images')
              .upload(variantStoragePath, variantBuffer, {
                contentType,
                upsert: false,
              })

            // Handle upload result - check if it's an object with error property
            if (uploadResult && uploadResult.error) {
              const uploadError = uploadResult.error
              // If file already exists, treat as success (idempotent operation)
              if (uploadError.message?.includes('already exists')) {
                console.log(`[GENERATE-VARIANTS] ${variantName} variant already exists, skipping upload`)
                return
              }
              throw new Error(`Upload failed: ${uploadError.message || String(uploadError)}`)
            }
          },
          {
            maxRetries: 3,
            initialDelay: 1000,
          }
        )

        // Get public URL for uploaded variant
        const { data: urlData } = supabase.storage
          .from('jersey_images')
          .getPublicUrl(variantStoragePath)

        if (urlData && urlData.publicUrl) {
          uploadedVariants[variantName] = urlData.publicUrl
          console.log(`[GENERATE-VARIANTS] Successfully uploaded ${variantName} variant to Storage: ${variantStoragePath}`)
        } else {
          console.warn(`[GENERATE-VARIANTS] Could not get public URL for ${variantName} variant`)
        }
      } catch (error) {
        console.error(`[GENERATE-VARIANTS] Error processing ${variantName} variant:`, error)
        // Continue with other variants even if one fails
      }
    }

    // Update image_url_webp with gallery variant URL (for backward compatibility)
    if (uploadedVariants.gallery) {
      await retryWithBackoff(
        async () => {
          const { error } = await supabase
            .from('jersey_images')
            .update({ image_url_webp: uploadedVariants.gallery })
            .eq('id', jerseyImageId)

          if (error) {
            throw new Error(`Database update failed: ${error.message}`)
          }
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
        }
      )
      console.log(`[GENERATE-VARIANTS] Updated image_url_webp with gallery variant URL`)
    }

    console.log(`[GENERATE-VARIANTS] Successfully generated all variants for jersey_image ${jerseyImageId}`)

    return new Response(
      JSON.stringify({
        success: true,
        jerseyImageId,
        variantUrls: uploadedVariants,
        variantStoragePaths,
        message: 'Variants generated and stored in Supabase Storage',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return handleEdgeFunctionError(error)
  }
})

