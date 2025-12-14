import { BaseRepository, PaginationParams, PaginatedResult } from "./base-repository";
import type { Database } from "@/lib/supabase/types";

type Jersey = Database["public"]["Tables"]["jerseys"]["Row"];
type JerseyInsert = Database["public"]["Tables"]["jerseys"]["Insert"];
type JerseyUpdate = Database["public"]["Tables"]["jerseys"]["Update"];
type JerseyImage = Database["public"]["Tables"]["jersey_images"]["Row"];

export interface JerseyWithRelations extends Jersey {
  jersey_images?: JerseyImage[];
  metadata_club?: { id: string; name: string } | null;
  metadata_season?: { id: string; label: string } | null;
  metadata_player?: { id: string; full_name: string; current_shirt_number?: number | null } | null;
}

/**
 * Repository for jersey data access
 * Handles CRUD operations and cursor-based pagination
 */
export class JerseyRepository extends BaseRepository {
  async findById(id: string): Promise<JerseyWithRelations | null> {
    const supabase = await this.getSupabase();
    
    // Fetch jersey with related data
    const { data: jersey, error: jerseyError } = await supabase
      .from("jerseys")
      .select("*")
      .eq("id", id)
      .single();

    if (jerseyError) {
      if (jerseyError.code === "PGRST116") return null; // Not found
      throw jerseyError;
    }

    if (!jersey) return null;

    // Fetch jersey_images
    const { data: images, error: imagesError } = await supabase
      .from("jersey_images")
      .select("*")
      .eq("jersey_id", id)
      .order("sort_order", { ascending: true });

    if (imagesError) {
      console.error("[JerseyRepository] Error fetching jersey_images:", imagesError);
      // Continue without images - fallback to legacy images array
    }

    // Return jersey with images - metadata will be fetched in service layer if needed
    const result: JerseyWithRelations = { ...jersey, jersey_images: images || [] };

    return result;
  }

  async findMany(
    params: PaginationParams & { ownerId?: string; visibility?: string }
  ): Promise<PaginatedResult<JerseyWithRelations>> {
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
      // If visibility is "all", don't filter by visibility (show all for that owner)
    }

    if (params.cursor) {
      const { id, createdAt } = this.decodeCursor(params.cursor);
      // Cursor pagination: created_at < cursor.createdAt OR (created_at = cursor.createdAt AND id < cursor.id)
      query = query
        .lt("created_at", createdAt)
        .or(`created_at.eq.${createdAt},id.lt.${id}`);
    }

    const { data: jerseys, error } = await query;

    if (error) {
      // Log error for debugging
      console.error("[JerseyRepository] Query error:", error);
      throw error;
    }

    const jerseyItems = jerseys || [];
    const hasMore = jerseyItems.length > params.limit;
    const result = hasMore ? jerseyItems.slice(0, params.limit) : jerseyItems;

    // Fetch jersey_images for all jerseys in batch
    const jerseyIds = result.map((j) => j.id);
    const { data: allImages, error: imagesError } = await supabase
      .from("jersey_images")
      .select("*")
      .in("jersey_id", jerseyIds)
      .order("jersey_id", { ascending: true })
      .order("sort_order", { ascending: true });

    if (imagesError) {
      console.error("[JerseyRepository] Error fetching jersey_images:", imagesError);
      // Continue without images - fallback to legacy images array
    }

    // Group images by jersey_id
    const imagesByJerseyId = new Map<string, JerseyImage[]>();
    if (allImages) {
      for (const image of allImages) {
        const existing = imagesByJerseyId.get(image.jersey_id) || [];
        existing.push(image);
        imagesByJerseyId.set(image.jersey_id, existing);
      }
    }

    // Combine jerseys with their images
    const itemsWithRelations: JerseyWithRelations[] = result.map((jersey) => ({
      ...jersey,
      jersey_images: imagesByJerseyId.get(jersey.id) || [],
    }));

    const nextCursor =
      hasMore && result.length > 0
        ? this.encodeCursor(
            result[result.length - 1].id,
            result[result.length - 1].created_at
          )
        : null;

    return { items: itemsWithRelations, nextCursor };
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

