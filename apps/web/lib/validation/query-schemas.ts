import { z } from "zod";

/**
 * Validation schemas for query parameters (pagination, filters)
 * Used across multiple API endpoints
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const jerseyListQuerySchema = paginationSchema.extend({
  ownerId: z.string().optional(), // Changed from .uuid() to allow Clerk user IDs (TEXT)
  visibility: z.enum(["public", "private", "all"]).optional(),
  club: z.string().optional(),
  season: z.string().optional(),
});

export const listingListQuerySchema = paginationSchema.extend({
  status: z.enum(["active", "sold", "cancelled"]).optional(),
  jerseyId: z.string().uuid().optional(), // Filter by specific jersey
  club: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  country: z.string().optional(),
  sort: z.enum(["createdAt_desc", "price_asc", "price_desc"]).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type JerseyListQuery = z.infer<typeof jerseyListQuerySchema>;
export type ListingListQuery = z.infer<typeof listingListQuerySchema>;

