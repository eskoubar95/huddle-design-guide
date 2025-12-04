import { JerseyRepository, type JerseyWithRelations } from "@/lib/repositories/jersey-repository";
import { jerseyCreateSchema, jerseyUpdateSchema } from "@/lib/validation/jersey-schemas";
import { ApiError } from "@/lib/api/errors";
import type { JerseyCreateInput, JerseyUpdateInput } from "@/lib/validation/jersey-schemas";
import { createImageVariants, type ImageVariant } from "@/lib/utils/image";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Jersey DTO with image variants and metadata
 */
export interface JerseyDTO {
	id: string;
	owner_id: string;
	club: string;
	season: string;
	jersey_type: string;
	player_name?: string | null;
	player_number?: string | null;
	competition_badges?: string[] | null;
	condition_rating?: number | null;
	notes?: string | null;
	visibility: string;
	images: string[]; // Legacy array for backward compatibility (uses optimized URLs when available)
	imageVariants: ImageVariant[]; // New structured image data
	created_at: string;
	updated_at: string;
	// Metadata foreign keys
	club_id?: string | null;
	player_id?: string | null;
	season_id?: string | null;
	// Metadata relations (populated if FK's exist)
	metadata?: {
		club?: { id: string; name: string } | null;
		season?: { id: string; label: string } | null;
		player?: { id: string; full_name: string; current_shirt_number?: number | null } | null;
	};
}

/**
 * Service for jersey business logic
 * Handles validation, authorization checks, and coordinates repository calls
 */
export class JerseyService {
  private repository = new JerseyRepository();

  /**
   * Fetch metadata for jersey if FK's exist
   * Note: Metadata fetching is deferred to frontend for performance
   * This method returns undefined - frontend will fetch metadata via API if needed
   */
  private async fetchMetadata(jersey: JerseyWithRelations): Promise<JerseyDTO["metadata"]> {
    // Return undefined - frontend will fetch metadata via API endpoints if needed
    // This avoids blocking server-side requests with metadata queries
    return undefined;
  }

  /**
   * Map repository data to DTO
   */
  private async mapToDTO(jersey: JerseyWithRelations): Promise<JerseyDTO> {
    // Pass jersey_images with id to createImageVariants
    const imageVariants = createImageVariants(
      jersey.jersey_images?.map((img) => ({
        id: img.id,
        image_url: img.image_url,
        image_url_webp: img.image_url_webp,
        sort_order: img.sort_order,
        view_type: img.view_type,
      }))
    );
    
    // Build legacy images array (use optimized URLs when available, fallback to original, then legacy jerseys.images)
    const images: string[] = imageVariants.length > 0
      ? imageVariants.map((v) => v.optimizedUrl)
      : jersey.images || [];

    const metadata = await this.fetchMetadata(jersey);

    return {
      id: jersey.id,
      owner_id: jersey.owner_id,
      club: jersey.club,
      season: jersey.season,
      jersey_type: jersey.jersey_type,
      player_name: jersey.player_name,
      player_number: jersey.player_number,
      competition_badges: jersey.competition_badges,
      condition_rating: jersey.condition_rating,
      notes: jersey.notes,
      visibility: jersey.visibility,
      images,
      imageVariants,
      created_at: jersey.created_at,
      updated_at: jersey.updated_at,
      club_id: jersey.club_id,
      player_id: jersey.player_id,
      season_id: jersey.season_id,
      metadata,
    };
  }

  async getJersey(id: string, userId?: string): Promise<JerseyDTO> {
    const jersey = await this.repository.findById(id);

    if (!jersey) {
      throw new ApiError("NOT_FOUND", "Jersey not found", 404);
    }

    // Check visibility
    if (jersey.visibility === "private" && jersey.owner_id !== userId) {
      throw new ApiError("FORBIDDEN", "You don't have access to this jersey", 403);
    }

    return await this.mapToDTO(jersey);
  }

  async listJerseys(
    params: { limit: number; cursor?: string; ownerId?: string; visibility?: string },
    userId?: string
  ): Promise<{ items: JerseyDTO[]; nextCursor: string | null }> {
    // If requesting all visibility, must be owner
    if (params.visibility === "all") {
      if (!params.ownerId) {
        throw new ApiError("BAD_REQUEST", "ownerId is required when visibility is 'all'", 400);
      }
      if (params.ownerId !== userId) {
        throw new ApiError("FORBIDDEN", "Cannot view all jerseys for other users", 403);
      }
    }

    // If requesting specific owner's jerseys, must be authenticated and be that owner (for private jerseys)
    if (params.ownerId && !userId) {
      // Allow public queries for specific owner, but they'll only see public jerseys
      // This is handled by the repository query (visibility filter)
    }

    const result = await this.repository.findMany(params);
    
    // Map all items to DTOs
    const items = await Promise.all(result.items.map((jersey) => this.mapToDTO(jersey)));

    return { items, nextCursor: result.nextCursor };
  }

  async createJersey(input: JerseyCreateInput, userId: string): Promise<JerseyDTO> {
    const validated = jerseyCreateSchema.parse(input);

    // Transform camelCase to snake_case for database
    const jersey = await this.repository.create({
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
      // Metadata foreign keys (optional)
      club_id: validated.clubId || null,
      player_id: validated.playerId || null,
      season_id: validated.seasonId || null,
    });

    // Fetch created jersey with relations to map to DTO
    const jerseyWithRelations = await this.repository.findById(jersey.id);
    if (!jerseyWithRelations) {
      throw new ApiError("NOT_FOUND", "Created jersey not found", 404);
    }

    return await this.mapToDTO(jerseyWithRelations);
  }

  async updateJersey(id: string, input: JerseyUpdateInput, userId: string): Promise<JerseyDTO> {
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
    // Metadata foreign keys (optional)
    if (validated.clubId !== undefined) updateData.club_id = validated.clubId || null;
    if (validated.playerId !== undefined) updateData.player_id = validated.playerId || null;
    if (validated.seasonId !== undefined) updateData.season_id = validated.seasonId || null;
    // Status for draft pattern
    if (validated.status !== undefined) updateData.status = validated.status;

    await this.repository.update(id, updateData);

    // Fetch updated jersey with relations to map to DTO
    const updatedJersey = await this.repository.findById(id);
    if (!updatedJersey) {
      throw new ApiError("NOT_FOUND", "Updated jersey not found", 404);
    }

    return await this.mapToDTO(updatedJersey);
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

