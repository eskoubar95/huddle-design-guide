import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { JerseyService } from "@/lib/services/jersey-service";

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params;

    if (req.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    const { userId } = await requireAuth(req);
    const body = await req.json();

    // Validate request body
    if (!Array.isArray(body.imageUrls)) {
      return new Response(
        JSON.stringify({ error: "imageUrls must be an array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify jersey ownership
    const service = new JerseyService();
    const jersey = await service.getJersey(id, userId);

    if (jersey.owner_id !== userId) {
      return new Response(
        JSON.stringify({ error: "You can only update your own jerseys" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update sort_order for each image based on array position
    const supabase = await createServiceClient();
    
    // Fetch existing jersey_images to get IDs
    const { data: existingImages, error: fetchError } = await supabase
      .from("jersey_images")
      .select("id, image_url")
      .eq("jersey_id", id);

    if (fetchError) {
      console.error("[ReorderImages] Failed to fetch existing images:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch existing images" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a map of image_url -> jersey_image id
    const imageUrlToId = new Map<string, string>();
    if (existingImages) {
      for (const img of existingImages) {
        imageUrlToId.set(img.image_url, img.id);
      }
    }

    // Update sort_order for each image based on array position
    for (let i = 0; i < body.imageUrls.length; i++) {
      const imageUrl = body.imageUrls[i];
      const imageId = imageUrlToId.get(imageUrl);

      if (imageId) {
        // Update by ID (more reliable than URL matching)
        const { error } = await supabase
          .from("jersey_images")
          .update({ sort_order: i })
          .eq("id", imageId);

        if (error) {
          console.error(`[ReorderImages] Failed to update sort_order for image ${i}:`, error);
          // Continue with other images even if one fails
        }
      } else {
        // Fallback: try to update by URL (for legacy images or edge cases)
        const { error } = await supabase
          .from("jersey_images")
          .update({ sort_order: i })
          .eq("jersey_id", id)
          .eq("image_url", imageUrl);

        if (error) {
          console.error(`[ReorderImages] Failed to update sort_order for image ${i} (by URL):`, error);
        }
      }
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

