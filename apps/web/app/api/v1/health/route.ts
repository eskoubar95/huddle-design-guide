import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Check database connection
    const supabase = await createServiceClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    return Response.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: error ? "unhealthy" : "healthy",
      },
      { status: error ? 503 : 200 }
    );
  } catch {
    return Response.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "unhealthy",
      },
      { status: 503 }
    );
  }
}

