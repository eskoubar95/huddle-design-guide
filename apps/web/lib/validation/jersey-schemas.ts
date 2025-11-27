import { z } from "zod";

/**
 * Validation schemas for jersey operations
 * Matches database schema: jerseys table
 */
export const jerseyCreateSchema = z.object({
  club: z.string().trim().min(1, "Club name is required").max(100),
  season: z.string().trim().min(1, "Season is required").max(20),
  jerseyType: z.enum(["Home", "Away", "Third", "Goalkeeper", "Special"]),
  playerName: z.string().trim().max(50).optional(),
  playerNumber: z.string().trim().max(3).optional(),
  badges: z.array(z.string()).max(10).optional(),
  conditionRating: z.number().int().min(1).max(10).optional(),
  notes: z.string().trim().max(1000).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  images: z.array(z.string().url()).min(1, "At least one image required").max(5),
});

export const jerseyUpdateSchema = jerseyCreateSchema.partial();

export type JerseyCreateInput = z.infer<typeof jerseyCreateSchema>;
export type JerseyUpdateInput = z.infer<typeof jerseyUpdateSchema>;

