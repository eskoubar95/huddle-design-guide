import { BaseRepository, PaginationParams, PaginatedResult } from "./base-repository";
import type { Database } from "@/lib/supabase/types";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
type PostUpdate = Database["public"]["Tables"]["posts"]["Update"];

/**
 * Repository for post data access
 * Handles CRUD operations and cursor-based pagination
 */
export class PostRepository extends BaseRepository {
  async findById(id: string): Promise<Post | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("posts")
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
    params: PaginationParams & { userId?: string; jerseyId?: string }
  ): Promise<PaginatedResult<Post>> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(params.limit + 1);

    if (params.userId) {
      query = query.eq("user_id", params.userId);
    }

    if (params.jerseyId) {
      query = query.eq("jersey_id", params.jerseyId);
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
      hasMore && result.length > 0
        ? this.encodeCursor(
            result[result.length - 1].id,
            result[result.length - 1].created_at
          )
        : null;

    return { items: result, nextCursor };
  }

  async create(data: PostInsert): Promise<Post> {
    const supabase = await this.getSupabase();
    const { data: post, error } = await supabase
      .from("posts")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return post;
  }

  async update(id: string, data: PostUpdate): Promise<Post> {
    const supabase = await this.getSupabase();
    const { data: post, error } = await supabase
      .from("posts")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!post) throw new Error("Post not found");
    return post;
  }

  async delete(id: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) throw error;
  }
}

