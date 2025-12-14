/**
 * Imgproxy utility functions for Edge Functions
 * Used to generate imgproxy URLs for image processing
 */

/**
 * Get imgproxy base URL from environment
 */
function getImgproxyUrl(): string {
  const url = Deno.env.get('IMGPROXY_URL') || Deno.env.get('NEXT_PUBLIC_IMGPROXY_URL')
  if (!url) {
    throw new Error('IMGPROXY_URL or NEXT_PUBLIC_IMGPROXY_URL not set')
  }
  return url
}

/**
 * Build Supabase Storage public URL from storage path
 */
function buildSupabaseStorageUrl(storagePath: string): string {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL not set')
  }
  // Supabase public URL format: {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
  return `${supabaseUrl}/storage/v1/object/public/jersey_images/${storagePath}`
}

/**
 * Build imgproxy transformation path based on variant type
 * 
 * imgproxy parameters:
 * - rs:fit:W:H:ENLARGE - resize to fit within WxH
 * - q:XX - quality (1-100)
 * - f:FORMAT - output format (webp, jpeg, png, etc.)
 */
function buildImgproxyTransform(variant: 'vision' | 'gallery' | 'card'): string {
  switch (variant) {
    case 'vision':
      // Max dimension: 2000x2000, JPEG, quality 80
      return 'rs:fit:2000:2000:0/q:80'
    case 'gallery':
      // Width: 1200, free height, WebP, quality 70
      return 'rs:fit:1200:0:0/q:70/f:webp'
    case 'card':
      // Width: 480, free height, WebP, quality 65
      return 'rs:fit:480:0:0/q:65/f:webp'
    default:
      throw new Error(`Unknown variant: ${variant}`)
  }
}

/**
 * Generate imgproxy URL for a variant (insecure mode)
 * @param storagePath - Storage path (e.g., "jersey-id/filename.jpg")
 * @param variant - Variant type (vision, gallery, card)
 * @returns Full imgproxy URL
 */
export function getImgproxyVariantUrlSync(
  storagePath: string,
  variant: 'vision' | 'gallery' | 'card'
): string {
  if (!storagePath) {
    throw new Error('storagePath is required')
  }

  const imgproxyBaseUrl = getImgproxyUrl()
  const transform = buildImgproxyTransform(variant)
  const originalUrl = buildSupabaseStorageUrl(storagePath)

  // URL-encode the original URL for imgproxy
  const encodedOriginalUrl = encodeURIComponent(originalUrl)

  // Build insecure URL (no signature required)
  const path = `/${transform}/plain/${encodedOriginalUrl}`
  return `${imgproxyBaseUrl}/insecure${path}`
}

/**
 * Download image from imgproxy and return as ArrayBuffer
 */
export async function downloadFromImgproxy(
  imgproxyUrl: string
): Promise<ArrayBuffer> {
  const response = await fetch(imgproxyUrl)

  if (!response.ok) {
    throw new Error(
      `Failed to download from imgproxy: ${response.status} ${response.statusText}`
    )
  }

  return await response.arrayBuffer()
}

