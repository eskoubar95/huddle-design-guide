import { ProfileRepository } from "@/lib/repositories/profile-repository";
import { profileUpdateSchema } from "@/lib/validation/profile-schemas";
import { ApiError } from "@/lib/api/errors";
import type { ProfileUpdateInput } from "@/lib/validation/profile-schemas";

/**
 * Service for profile business logic
 * Handles validation, authorization checks, and coordinates repository calls
 */
export class ProfileService {
  private repository = new ProfileRepository();

  async getProfile(id: string) {
    const profile = await this.repository.findById(id);

    if (!profile) {
      throw new ApiError("NOT_FOUND", "Profile not found", 404);
    }

    return profile;
  }

  async getProfileByUsername(username: string) {
    const profile = await this.repository.findByUsername(username);

    if (!profile) {
      throw new ApiError("NOT_FOUND", "Profile not found", 404);
    }

    return profile;
  }

  async updateProfile(id: string, input: ProfileUpdateInput, userId: string) {
    if (id !== userId) {
      throw new ApiError("FORBIDDEN", "You can only update your own profile", 403);
    }

    const validated = profileUpdateSchema.parse(input);

    // Transform camelCase to snake_case
    const updateData: Record<string, unknown> = {};
    if (validated.username !== undefined) updateData.username = validated.username;
    if (validated.bio !== undefined) updateData.bio = validated.bio;
    if (validated.country !== undefined) updateData.country = validated.country;
    if (validated.avatarUrl !== undefined) updateData.avatar_url = validated.avatarUrl;

    return await this.repository.update(id, updateData);
  }
}

