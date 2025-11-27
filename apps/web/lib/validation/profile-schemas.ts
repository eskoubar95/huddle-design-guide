import { z } from "zod";

/**
 * Validation schemas for profile operations
 * Matches database schema: profiles table
 */
export const profileUpdateSchema = z.object({
  username: z.string().trim().min(1).max(50).optional(),
  bio: z.string().trim().max(500).optional(),
  country: z.string().length(2).optional(), // ISO country code
  avatarUrl: z.string().url().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

