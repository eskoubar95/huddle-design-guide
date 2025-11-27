import { z } from "zod";

/**
 * Validation schemas for sale listing operations
 * Matches database schema: sale_listings table
 */
const shippingSchema = z.object({
  worldwide: z.boolean(),
  localOnly: z.boolean(),
  costBuyer: z.boolean(),
  costSeller: z.boolean(),
  freeInCountry: z.boolean(),
});

export const saleListingCreateSchema = z.object({
  jerseyId: z.string().uuid(),
  price: z.string().regex(/^\d+\.?\d{0,2}$/, "Invalid price format"),
  currency: z.enum(["EUR", "DKK", "USD", "GBP"]),
  negotiable: z.boolean().default(false),
  shipping: shippingSchema,
});

export const saleListingUpdateSchema = saleListingCreateSchema.partial();

export type SaleListingCreateInput = z.infer<typeof saleListingCreateSchema>;
export type SaleListingUpdateInput = z.infer<typeof saleListingUpdateSchema>;

