import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth(req);
    const { id: jerseyId } = await params;

    const supabase = await createServiceClient();
    
    // Verify ownership
    const { data: jersey, error: fetchError } = await supabase
      .from("jerseys")
      .select("id, owner_id")
      .eq("id", jerseyId)
      .single();

    if (fetchError || !jersey) {
      return new Response(
        JSON.stringify({ error: "Jersey not found" }),
        { status: 404 }
      );
    }

    // Type assertion needed because Supabase types may not match exactly
    const jerseyData = jersey as { id: string; owner_id: string };

    if (jerseyData.owner_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403 }
      );
    }

    // Note: status column doesn't exist in jerseys table - allowing deletion of any jersey owned by user

    // Delete jersey (CASCADE deletes jersey_images rows)
    const { error: deleteError } = await supabase
      .from("jerseys")
      .delete()
      .eq("id", jerseyId);

    if (deleteError) throw deleteError;

    // Trigger Storage cleanup via Edge Function (async, non-blocking)
    // Note: Storage cleanup handled separately by cleanup-jersey-storage function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && serviceRoleKey) {
      // Call cleanup function asynchronously (don't wait for response)
      fetch(`${supabaseUrl}/functions/v1/cleanup-jersey-storage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ jerseyId }),
      }).catch((err) => {
        // Log but don't fail - cleanup is non-critical
        console.error("Failed to trigger storage cleanup:", err);
      });
    }

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error, req);
  }
}

