import { z } from "zod";

/**
 * Validation schemas for jersey operations
 * Matches database schema: jerseys table
 */
export const jerseyCreateSchema = z.object({
  club: z.string().trim().min(1, "Club name is required").max(100),
  season: z.string().trim().min(1, "Season is required").max(20),
  jerseyType: z.enum([
    "Home",
    "Away",
    "Third",
    "Fourth",
    "Special Edition",
    "GK Home",
    "GK Away",
    "GK Third",
  ]),
  playerName: z.string().trim().max(50).optional(),
  playerNumber: z.string().trim().max(3).optional(),
  badges: z.array(z.string()).max(10).optional(),
  conditionRating: z.number().int().min(1).max(10).optional(),
  notes: z.string().trim().max(1000).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  images: z.array(z.string().url()).min(1, "At least one image required").max(5),
  // Optional metadata foreign keys
  clubId: z.string().optional(),
  playerId: z.string().optional(),
  seasonId: z.string().uuid().optional(),
});

/**
 * Partial schema for step-by-step validation (without images requirement)
 * Used during multi-step form to validate fields without requiring images
 */
export const jerseyCreateSchemaWithoutImages = jerseyCreateSchema.omit({ images: true });

export const jerseyUpdateSchema = jerseyCreateSchema.partial().extend({
  // Optional metadata foreign keys
  clubId: z.string().optional(),
  playerId: z.string().optional(),
  seasonId: z.string().uuid().optional(),
  // Status for draft pattern
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export type JerseyCreateInput = z.infer<typeof jerseyCreateSchema>;
export type JerseyUpdateInput = z.infer<typeof jerseyUpdateSchema>;

