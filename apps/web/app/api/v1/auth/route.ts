import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { auth } from "@clerk/nextjs/server";

const handler = async (req: NextRequest) => {
  try {
    // Note: Clerk håndterer faktisk auth i frontend via ClerkProvider
    // Dette endpoint returnerer info om auth status for consistency
    if (req.method === "POST") {
      const { userId } = await auth();

      if (!userId) {
        return Response.json(
          { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
          { status: 401 }
        );
      }

      return successResponse({ authenticated: true, userId });
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

