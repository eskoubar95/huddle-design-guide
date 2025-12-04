import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    const { userId } = await requireAuth(req);

    // Get file from FormData
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File size exceeds 5MB limit" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "File must be an image" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Upload to Supabase Storage using service role client (bypasses RLS)
    const supabase = await createServiceClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Convert File to ArrayBuffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("jersey_images")
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Failed to upload image: ${uploadError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("jersey_images")
      .getPublicUrl(filePath);

    return successResponse({ url: publicUrl });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

