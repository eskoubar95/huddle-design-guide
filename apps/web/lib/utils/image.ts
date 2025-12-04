/**
 * Image utility functions for jersey image handling
 */

/**
 * Derive WebP URL from original image URL
 * Replaces file extension with .webp
 */
export function getWebPUrl(originalUrl: string): string {
	if (!originalUrl) return originalUrl;
	
	// If already webp, return as-is
	if (originalUrl.toLowerCase().endsWith('.webp')) {
		return originalUrl;
	}
	
	// Replace extension with .webp
	return originalUrl.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
}

/**
 * Get primary (optimized) and fallback (original) URLs for an image
 */
export function getImageUrls(originalUrl: string): { primary: string; fallback: string } {
	const webpUrl = getWebPUrl(originalUrl);
	return {
		primary: webpUrl,
		fallback: originalUrl,
	};
}

/**
 * Image variant with optimized and original URLs
 */
export interface ImageVariant {
	id?: string; // jersey_image id from database
	originalUrl: string;
	optimizedUrl: string;
	sortOrder: number;
	viewType: string | null;
}

/**
 * Create image variants from jersey_images data
 */
export function createImageVariants(
	images: Array<{
		id?: string;
		image_url: string;
		image_url_webp?: string | null;
		sort_order: number;
		view_type: string | null;
	}> | undefined
): ImageVariant[] {
	if (!images || images.length === 0) {
		return [];
	}
	
	return images
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((img) => ({
			id: img.id,
			originalUrl: img.image_url,
			// Use stored WebP URL if available, otherwise generate from original URL
			optimizedUrl: img.image_url_webp || getWebPUrl(img.image_url),
			sortOrder: img.sort_order,
			viewType: img.view_type,
		}));
}

