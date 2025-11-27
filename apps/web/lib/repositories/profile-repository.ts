import { BaseRepository } from "./base-repository";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/**
 * Repository for profile data access
 * Handles read and update operations for profiles
 */
export class ProfileRepository extends BaseRepository {
  async findById(id: string): Promise<Profile | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async findByUsername(username: string): Promise<Profile | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async update(id: string, data: ProfileUpdate): Promise<Profile> {
    const supabase = await this.getSupabase();
    const { data: profile, error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!profile) throw new Error("Profile not found");
    return profile;
  }
}

