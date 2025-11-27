import { JerseyRepository } from "@/lib/repositories/jersey-repository";
import { jerseyCreateSchema, jerseyUpdateSchema } from "@/lib/validation/jersey-schemas";
import { ApiError } from "@/lib/api/errors";
import type { JerseyCreateInput, JerseyUpdateInput } from "@/lib/validation/jersey-schemas";

/**
 * Service for jersey business logic
 * Handles validation, authorization checks, and coordinates repository calls
 */
export class JerseyService {
  private repository = new JerseyRepository();

  async getJersey(id: string, userId?: string) {
    const jersey = await this.repository.findById(id);

    if (!jersey) {
      throw new ApiError("NOT_FOUND", "Jersey not found", 404);
    }

    // Check visibility
    if (jersey.visibility === "private" && jersey.owner_id !== userId) {
      throw new ApiError("FORBIDDEN", "You don't have access to this jersey", 403);
    }

    return jersey;
  }

  async listJerseys(
    params: { limit: number; cursor?: string; ownerId?: string; visibility?: string },
    userId?: string
  ) {
    // If requesting all visibility, must be owner
    if (params.visibility === "all" && params.ownerId !== userId) {
      throw new ApiError("FORBIDDEN", "Cannot view all jerseys for other users", 403);
    }

    return await this.repository.findMany(params);
  }

  async createJersey(input: JerseyCreateInput, userId: string) {
    const validated = jerseyCreateSchema.parse(input);

    // Transform camelCase to snake_case for database
    return await this.repository.create({
      club: validated.club,
      season: validated.season,
      jersey_type: validated.jerseyType,
      player_name: validated.playerName || null,
      player_number: validated.playerNumber || null,
      competition_badges: validated.badges || null,
      condition_rating: validated.conditionRating || null,
      notes: validated.notes || null,
      visibility: validated.visibility,
      images: validated.images,
      owner_id: userId,
    });
  }

  async updateJersey(id: string, input: JerseyUpdateInput, userId: string) {
    const jersey = await this.repository.findById(id);

    if (!jersey) {
      throw new ApiError("NOT_FOUND", "Jersey not found", 404);
    }

    if (jersey.owner_id !== userId) {
      throw new ApiError("FORBIDDEN", "You can only update your own jerseys", 403);
    }

    const validated = jerseyUpdateSchema.parse(input);

    // Transform camelCase to snake_case for database
    const updateData: Record<string, unknown> = {};
    if (validated.club !== undefined) updateData.club = validated.club;
    if (validated.season !== undefined) updateData.season = validated.season;
    if (validated.jerseyType !== undefined) updateData.jersey_type = validated.jerseyType;
    if (validated.playerName !== undefined) updateData.player_name = validated.playerName;
    if (validated.playerNumber !== undefined) updateData.player_number = validated.playerNumber;
    if (validated.badges !== undefined) updateData.competition_badges = validated.badges;
    if (validated.conditionRating !== undefined) updateData.condition_rating = validated.conditionRating;
    if (validated.notes !== undefined) updateData.notes = validated.notes;
    if (validated.visibility !== undefined) updateData.visibility = validated.visibility;
    if (validated.images !== undefined) updateData.images = validated.images;

    return await this.repository.update(id, updateData);
  }

  async deleteJersey(id: string, userId: string) {
    const jersey = await this.repository.findById(id);

    if (!jersey) {
      throw new ApiError("NOT_FOUND", "Jersey not found", 404);
    }

    if (jersey.owner_id !== userId) {
      throw new ApiError("FORBIDDEN", "You can only delete your own jerseys", 403);
    }

    await this.repository.delete(id);
  }
}

