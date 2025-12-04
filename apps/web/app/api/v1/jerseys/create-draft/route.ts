import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);

    const supabase = await createServiceClient();
    
    // Create draft jersey with minimal required data
    // Note: images must be empty array (NOT NULL constraint), jersey_type is required
    const { data: jersey, error } = await supabase
      .from("jerseys")
      .insert({
        owner_id: userId,
        status: "draft",
        club: "",
        season: "",
        jersey_type: "Home", // Default value, will be updated later
        images: [], // Required NOT NULL constraint
      })
      .select("id, status")
      .single();

    if (error) throw error;

    return successResponse({ 
      jerseyId: jersey.id,
      status: jersey.status 
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}

