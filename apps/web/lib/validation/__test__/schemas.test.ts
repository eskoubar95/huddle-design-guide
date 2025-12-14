/**
 * Quick validation test for Phase 2 schemas
 * This file can be removed after manual verification
 */

import {
  jerseyCreateSchema,
  // Removed unused: jerseyUpdateSchema
} from "../jersey-schemas";
import {
  saleListingCreateSchema,
  // Removed unused: saleListingUpdateSchema
} from "../listing-schemas";
import {
  // Removed unused: auctionCreateSchema, bidCreateSchema
} from "../auction-schemas";
// Removed unused: postCreateSchema, profileUpdateSchema, paginationSchema, jerseyListQuerySchema, listingListQuerySchema

// Test valid inputs
const validJersey = {
  club: "Manchester United",
  season: "2023-24",
  jerseyType: "Home" as const,
  playerName: "Ronaldo",
  playerNumber: "7",
  badges: ["Premier League"],
  conditionRating: 9,
  notes: "Excellent condition",
  visibility: "public" as const,
  images: ["https://example.com/jersey.jpg"],
};

const validSaleListing = {
  jerseyId: "123e4567-e89b-12d3-a456-426614174000",
  price: "99.99",
  currency: "EUR" as const,
  negotiable: true,
  shipping: {
    worldwide: true,
    localOnly: false,
    costBuyer: true,
    costSeller: false,
    freeInCountry: false,
  },
};

// Test that schemas parse valid input
console.log("Testing valid jersey:", jerseyCreateSchema.parse(validJersey));
console.log("Testing valid sale listing:", saleListingCreateSchema.parse(validSaleListing));

// Test that schemas reject invalid input
try {
  jerseyCreateSchema.parse({ club: "" }); // Should fail
  console.error("❌ Schema should reject invalid input");
} catch {
  console.log("✅ Schema correctly rejects invalid input");
}

export {};

