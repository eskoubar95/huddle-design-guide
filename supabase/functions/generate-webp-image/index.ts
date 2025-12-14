// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { ImageMagick, MagickFormat, MagickGeometry } from 'https://esm.sh/@imagemagick/magick-wasm@0.0.20'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateWebPRequest {
  jerseyImageId: string
  imageUrl: string
  storagePath: string
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        console.log(`[GENERATE-WEBP] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

/**
 * Generate WebP version of an image and update jersey_images table
 * Called automatically via database trigger when jersey_image is inserted
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

    const body: GenerateWebPRequest = await req.json()
    const { jerseyImageId, imageUrl, storagePath } = body

    if (!jerseyImageId || !imageUrl || !storagePath) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: jerseyImageId, imageUrl, or storagePath' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[GENERATE-WEBP] Starting WebP generation for jersey_image ${jerseyImageId}`)

    // Check if already WebP
    const isWebP = imageUrl.toLowerCase().endsWith('.webp') || storagePath.toLowerCase().endsWith('.webp')
    if (isWebP) {
      console.log(`[GENERATE-WEBP] Image is already WebP, skipping: ${jerseyImageId}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Image is already WebP' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if WebP already exists in database
    const { data: existingImage, error: fetchError } = await supabase
      .from('jersey_images')
      .select('image_url_webp')
      .eq('id', jerseyImageId)
      .single()

    if (fetchError) {
      console.error(`[GENERATE-WEBP] Error fetching jersey_image:`, fetchError)
      return new Response(
        JSON.stringify({ error: 'Jersey image not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If WebP already exists, skip
    if (existingImage?.image_url_webp) {
      console.log(`[GENERATE-WEBP] WebP already exists for jersey_image ${jerseyImageId}`)
      return new Response(
        JSON.stringify({ success: true, message: 'WebP already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Download original image from storage with retry
    console.log(`[GENERATE-WEBP] Downloading original image from: ${storagePath}`)
    let imageData: Blob | null = null
    
    try {
      imageData = await retryWithBackoff(async () => {
        const { data, error } = await supabase.storage
          .from('jersey_images')
          .download(storagePath)
        
        if (error) {
          throw new Error(`Download failed: ${error.message}`)
        }
        
        if (!data) {
          throw new Error('Download returned no data')
        }
        
        return data
      }, 3, 1000) // 3 retries, starting with 1s delay
    } catch (downloadError) {
      console.error(`[GENERATE-WEBP] Error downloading image after retries:`, downloadError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to download original image',
          details: downloadError instanceof Error ? downloadError.message : String(downloadError)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert to ArrayBuffer
    const arrayBuffer = await imageData.arrayBuffer()

    // Generate WebP version using ImageMagick
    try {
      console.log(`[GENERATE-WEBP] Converting to WebP using ImageMagick...`)
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Process image with ImageMagick
      let webpBuffer: Uint8Array | null = null
      
      await ImageMagick.read(uint8Array, (img) => {
        // Get original dimensions
        const originalWidth = img.width
        const originalHeight = img.height
        
        // Resize image if needed (backup resize in case browser resize failed)
        // Max dimension: 2000px on longest side (preserves aspect ratio)
        // This reduces memory usage and prevents "Memory limit exceeded" errors
        const maxDimension = 2000
        
        if (originalWidth > maxDimension || originalHeight > maxDimension) {
          console.log(`[GENERATE-WEBP] Resizing image from ${originalWidth}x${originalHeight} to max ${maxDimension}px`)
          const scale = Math.min(maxDimension / originalWidth, maxDimension / originalHeight)
          const newWidth = Math.round(originalWidth * scale)
          const newHeight = Math.round(originalHeight * scale)
          
          // Resize using ImageMagick (preserves aspect ratio)
          img.resize(new MagickGeometry(newWidth, newHeight))
          console.log(`[GENERATE-WEBP] Resized to ${newWidth}x${newHeight}`)
        }
        
        // Set WebP quality (70 - reduced from 80 to better match compressed JPEG size)
        img.quality = 70
        
        // Write to WebP format
        img.write(MagickFormat.WebP, (data) => {
          webpBuffer = new Uint8Array(data)
        })
      })
      
      if (!webpBuffer) {
        throw new Error('Failed to generate WebP buffer')
      }
      
      // Create WebP filename (same name, different extension)
      // 🔧 FIX: Håndter også .blob extension (kan opstå hvis browser-image-compression ikke bevarede originalt navn)
      const webpFileName = storagePath.replace(/\.(jpg|jpeg|png|gif|blob)$/i, '.webp')
      
      console.log(`[GENERATE-WEBP] Uploading WebP version to: ${webpFileName}`)
      
      // Upload WebP version with retry
      // 🔧 FIX: Håndter "already exists" som success (idempotent operation)
      // Dette forhindrer 500 fejl hvis triggeren kører flere gange eller WebP filen allerede eksisterer
      try {
        await retryWithBackoff(async () => {
          const { error } = await supabase.storage
            .from('jersey_images')
            .upload(webpFileName, webpBuffer, {
              contentType: 'image/webp',
              upsert: false,
            })
          
          if (error) {
            // If file already exists, treat as success (idempotent operation)
            // This can happen if trigger fires multiple times or previous upload succeeded but DB update failed
            if (error.message?.includes('already exists')) {
              console.log(`[GENERATE-WEBP] WebP file already exists, skipping upload (idempotent)`)
              return // Treat as success, continue to get public URL
            }
            throw new Error(`Upload failed: ${error.message}`)
          }
        }, 3, 1000) // 3 retries, starting with 1s delay
      } catch (webpUploadError) {
        // Only throw if it's not an "already exists" error
        if (webpUploadError instanceof Error && webpUploadError.message?.includes('already exists')) {
          // If it's "already exists" after retries, treat as success
          console.log(`[GENERATE-WEBP] WebP file already exists (after retries), using existing file`)
          // Continue to get public URL and update database
        } else {
          // Real error - return failure
          console.error(`[GENERATE-WEBP] Error uploading WebP after retries:`, webpUploadError)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to upload WebP version',
              details: webpUploadError instanceof Error ? webpUploadError.message : String(webpUploadError)
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Get public URL for WebP
      const { data: { publicUrl: webpPublicUrl } } = supabase.storage
        .from('jersey_images')
        .getPublicUrl(webpFileName)

      console.log(`[GENERATE-WEBP] WebP generated successfully: ${webpPublicUrl}`)

      // Update jersey_images table with WebP URL (with retry)
      try {
        await retryWithBackoff(async () => {
          const { error } = await supabase
            .from('jersey_images')
            .update({ image_url_webp: webpPublicUrl })
            .eq('id', jerseyImageId)
          
          if (error) {
            throw new Error(`Database update failed: ${error.message}`)
          }
        }, 3, 1000) // 3 retries, starting with 1s delay
      } catch (updateError) {
        console.error(`[GENERATE-WEBP] Error updating database after retries:`, updateError)
        // Cleanup uploaded WebP file if DB update fails
        try {
          await supabase.storage
            .from('jersey_images')
            .remove([webpFileName])
          console.log(`[GENERATE-WEBP] Cleaned up WebP file after DB update failure`)
        } catch (cleanupError) {
          console.error(`[GENERATE-WEBP] Error cleaning up WebP file:`, cleanupError)
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update database with WebP URL',
            details: updateError instanceof Error ? updateError.message : String(updateError)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[GENERATE-WEBP] Successfully updated jersey_image ${jerseyImageId} with WebP URL`)

      return new Response(
        JSON.stringify({ 
          success: true,
          jerseyImageId,
          webpUrl: webpPublicUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (webpError) {
      console.error(`[GENERATE-WEBP] Error generating WebP:`, webpError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate WebP version',
          details: webpError instanceof Error ? webpError.message : String(webpError)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('[GENERATE-WEBP] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

