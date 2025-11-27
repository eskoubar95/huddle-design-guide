import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";

/**
 * Test endpoint for requireAuth() helper
 * Only available in development
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 }
    );
  }

  try {
    const auth = await requireAuth(req);
    return successResponse({
      authenticated: true,
      userId: auth.userId,
      profileId: auth.profileId,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}

