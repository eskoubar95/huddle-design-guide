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

/**
 * Schema for shipping address input
 * Matches database schema: shipping_addresses table
 */
export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  street: z.string().trim().min(1).max(255), // Address line 1
  addressLine2: z.string().trim().max(255).optional(), // Address line 2 (optional)
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().max(100).optional(), // State/Province/Region (optional)
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().length(2), // ISO country code
  phone: z.string().trim().min(1).max(50),
  isDefault: z.boolean().optional(),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;

/**
 * Schema for profile completion
 * Validates all required fields for marketplace participation
 */
export const profileCompletionSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(50),
  shippingAddress: shippingAddressSchema,
});

export type ProfileCompletionInput = z.infer<typeof profileCompletionSchema>;

/**
 * Step-specific schemas for partial validation
 * These allow validating only the current step's fields
 */
export const personalInfoSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(50),
});

export const shippingAddressOnlySchema = z.object({
  shippingAddress: shippingAddressSchema,
});

/**
 * Schema for identity verification review request
 */
export const reviewRequestSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>;

