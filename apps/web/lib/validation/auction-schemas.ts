import { z } from "zod";

/**
 * Validation schemas for auction and bid operations
 * Matches database schema: auctions and bids tables
 */
const shippingSchema = z.object({
  worldwide: z.boolean(),
  localOnly: z.boolean(),
  costBuyer: z.boolean(),
  costSeller: z.boolean(),
  freeInCountry: z.boolean(),
});

export const auctionCreateSchema = z.object({
  jerseyId: z.string().uuid(),
  startingBid: z.string().regex(/^\d+\.?\d{0,2}$/, "Invalid price format"),
  buyNowPrice: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  currency: z.enum(["EUR", "DKK", "USD", "GBP"]),
  durationHours: z.enum(["24", "48", "72", "168"]).transform(Number),
  shipping: shippingSchema,
});

export const bidCreateSchema = z.object({
  auctionId: z.string().uuid(),
  amount: z.string().regex(/^\d+\.?\d{0,2}$/, "Invalid price format"),
});

export type AuctionCreateInput = z.infer<typeof auctionCreateSchema>;
export type BidCreateInput = z.infer<typeof bidCreateSchema>;

