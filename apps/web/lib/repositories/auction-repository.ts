import { BaseRepository, PaginationParams, PaginatedResult } from "./base-repository";
import type { Database } from "@/lib/supabase/types";

type Auction = Database["public"]["Tables"]["auctions"]["Row"];
type AuctionInsert = Database["public"]["Tables"]["auctions"]["Insert"];
type AuctionUpdate = Database["public"]["Tables"]["auctions"]["Update"];

/**
 * Repository for auction data access
 * Handles CRUD operations and cursor-based pagination
 */
export class AuctionRepository extends BaseRepository {
  async findById(id: string): Promise<Auction | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("auctions")
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
  ): Promise<PaginatedResult<Auction>> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from("auctions")
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

  async create(data: AuctionInsert): Promise<Auction> {
    const supabase = await this.getSupabase();
    const { data: auction, error } = await supabase
      .from("auctions")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return auction;
  }

  async update(id: string, data: AuctionUpdate): Promise<Auction> {
    const supabase = await this.getSupabase();
    const { data: auction, error } = await supabase
      .from("auctions")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!auction) throw new Error("Auction not found");
    return auction;
  }

  async delete(id: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase.from("auctions").delete().eq("id", id);

    if (error) throw error;
  }
}

