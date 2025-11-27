import { BaseRepository, PaginationParams, PaginatedResult } from "./base-repository";
import type { Database } from "@/lib/supabase/types";

type SaleListing = Database["public"]["Tables"]["sale_listings"]["Row"];
type SaleListingInsert = Database["public"]["Tables"]["sale_listings"]["Insert"];
type SaleListingUpdate = Database["public"]["Tables"]["sale_listings"]["Update"];

/**
 * Repository for sale listing data access
 * Handles CRUD operations and cursor-based pagination
 */
export class ListingRepository extends BaseRepository {
  async findById(id: string): Promise<SaleListing | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("sale_listings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async findMany(
    params: PaginationParams & { status?: string; sellerId?: string }
  ): Promise<PaginatedResult<SaleListing>> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from("sale_listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(params.limit + 1);

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.sellerId) {
      query = query.eq("seller_id", params.sellerId);
    }

    if (params.cursor) {
      const { id, createdAt } = this.decodeCursor(params.cursor);
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
      hasMore && result.length > 0 && result[result.length - 1].created_at
        ? this.encodeCursor(
            result[result.length - 1].id,
            result[result.length - 1].created_at!
          )
        : null;

    return { items: result, nextCursor };
  }

  async create(data: SaleListingInsert): Promise<SaleListing> {
    const supabase = await this.getSupabase();
    const { data: listing, error } = await supabase
      .from("sale_listings")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return listing;
  }

  async update(id: string, data: SaleListingUpdate): Promise<SaleListing> {
    const supabase = await this.getSupabase();
    const { data: listing, error } = await supabase
      .from("sale_listings")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!listing) throw new Error("Listing not found");
    return listing;
  }

  async delete(id: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase
      .from("sale_listings")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}

