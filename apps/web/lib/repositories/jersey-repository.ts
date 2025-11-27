import { BaseRepository, PaginationParams, PaginatedResult } from "./base-repository";
import type { Database } from "@/lib/supabase/types";

type Jersey = Database["public"]["Tables"]["jerseys"]["Row"];
type JerseyInsert = Database["public"]["Tables"]["jerseys"]["Insert"];
type JerseyUpdate = Database["public"]["Tables"]["jerseys"]["Update"];

/**
 * Repository for jersey data access
 * Handles CRUD operations and cursor-based pagination
 */
export class JerseyRepository extends BaseRepository {
  async findById(id: string): Promise<Jersey | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("jerseys")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return data;
  }

  async findMany(
    params: PaginationParams & { ownerId?: string; visibility?: string }
  ): Promise<PaginatedResult<Jersey>> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from("jerseys")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(params.limit + 1); // Fetch one extra to check if there's more

    if (params.ownerId) {
      query = query.eq("owner_id", params.ownerId);
    }

    if (params.visibility) {
      if (params.visibility !== "all") {
        query = query.eq("visibility", params.visibility);
      }
    }

    if (params.cursor) {
      const { id, createdAt } = this.decodeCursor(params.cursor);
      // Cursor pagination: created_at < cursor.createdAt OR (created_at = cursor.createdAt AND id < cursor.id)
      query = query
        .lt("created_at", createdAt)
        .or(`created_at.eq.${createdAt},id.lt.${id}`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const items = data || [];
    const hasMore = items.length > params.limit;
    const result = hasMore ? items.slice(0, params.limit) : items;

    const nextCursor =
      hasMore && result.length > 0
        ? this.encodeCursor(
            result[result.length - 1].id,
            result[result.length - 1].created_at
          )
        : null;

    return { items: result, nextCursor };
  }

  async create(data: JerseyInsert): Promise<Jersey> {
    const supabase = await this.getSupabase();
    const { data: jersey, error } = await supabase
      .from("jerseys")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return jersey;
  }

  async update(id: string, data: JerseyUpdate): Promise<Jersey> {
    const supabase = await this.getSupabase();
    const { data: jersey, error } = await supabase
      .from("jerseys")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!jersey) throw new Error("Jersey not found");
    return jersey;
  }

  async delete(id: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase.from("jerseys").delete().eq("id", id);

    if (error) throw error;
  }
}

