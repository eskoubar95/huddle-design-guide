import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { ApiError } from "@/lib/api/errors";

/**
 * Catch-all route for undefined API endpoints
 * Returns consistent error format for 404s
 */
export async function GET(req: NextRequest) {
  return handleApiError(
    new ApiError("NOT_FOUND", "Endpoint not found", 404),
    req
  );
}

export async function POST(req: NextRequest) {
  return handleApiError(
    new ApiError("NOT_FOUND", "Endpoint not found", 404),
    req
  );
}

export async function PUT(req: NextRequest) {
  return handleApiError(
    new ApiError("NOT_FOUND", "Endpoint not found", 404),
    req
  );
}

export async function PATCH(req: NextRequest) {
  return handleApiError(
    new ApiError("NOT_FOUND", "Endpoint not found", 404),
    req
  );
}

export async function DELETE(req: NextRequest) {
  return handleApiError(
    new ApiError("NOT_FOUND", "Endpoint not found", 404),
    req
  );
}

