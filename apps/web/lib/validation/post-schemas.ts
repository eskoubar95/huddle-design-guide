import { z } from "zod";

/**
 * Validation schemas for post operations
 * Matches database schema: posts table
 * Note: Either content or jerseyId must be provided (enforced by DB CHECK constraint)
 */
export const postCreateSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(2000),
  jerseyId: z.string().uuid().optional(),
});

export type PostCreateInput = z.infer<typeof postCreateSchema>;

