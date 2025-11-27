import { BaseRepository } from "./base-repository";
import type { Database } from "@/lib/supabase/types";

type Bid = Database["public"]["Tables"]["bids"]["Row"];
type BidInsert = Database["public"]["Tables"]["bids"]["Insert"];

/**
 * Repository for bid data access
 * Handles CRUD operations for bids
 */
export class BidRepository extends BaseRepository {
  async findById(id: string): Promise<Bid | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async findByAuctionId(auctionId: string, limit: number = 20): Promise<Bid[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .eq("auction_id", auctionId)
      .order("amount", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async create(data: BidInsert): Promise<Bid> {
    const supabase = await this.getSupabase();
    const { data: bid, error } = await supabase
      .from("bids")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return bid;
  }
}

