'use client'

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useFeaturedSale() {
  // 1. Try to get ID from env var
  const featuredListingId = process.env.NEXT_PUBLIC_FEATURED_LISTING_ID;

  return useQuery({
    queryKey: ["featured-sale", featuredListingId],
    queryFn: async () => {
      const supabase = createClient();

      // TEST DATA FOR VISUALIZATION
      // In production, we would check supabase first.
      // For now, we return this immediately to verify the UI.
      
      /* 
      // Real logic commented out for demo:
      let listingId = featuredListingId;
      if (!listingId) {
         // ... fetch logic
      }
      */

      // Placeholder / Test Data
      return {
        id: 'placeholder-sale-jersey',
        club: 'AC Milan',
        season: '2006/07',
        jersey_type: 'Away',
        condition: 9, // Mint condition
        images: ['/JW_FCK_1.jpg'], // Reusing the FCK image for now as we know it works, or you can add another
        listing: {
          id: 'placeholder-listing',
          currency: 'EUR',
          price: 450,
          status: 'active',
          type: 'fixed_price'
        }
      };
    },
    staleTime: 1000 * 60 * 5, 
  });
}
