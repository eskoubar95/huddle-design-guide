import { createServiceClient } from "@/lib/supabase/server";

export interface PaginationParams {
  limit: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Base repository class with shared utilities
 * All repositories extend this to get Supabase client and cursor pagination helpers
 */
export abstract class BaseRepository {
  /**
   * Get Supabase client with service role key
   * This bypasses RLS - we handle authorization in service layer
   */
  protected async getSupabase() {
    return await createServiceClient();
  }

  /**
   * Encode cursor for pagination (id:createdAt -> base64)
   */
  protected encodeCursor(id: string, createdAt: string): string {
    return Buffer.from(`${id}:${createdAt}`).toString("base64");
  }

  /**
   * Decode cursor from pagination (base64 -> id:createdAt)
   */
  protected decodeCursor(cursor: string): { id: string; createdAt: string } {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [id, createdAt] = decoded.split(":");
    return { id, createdAt };
  }
}

