'use client'

import { useUser } from "@clerk/nextjs";
import { useJerseys } from "./use-jerseys";
import { useListings } from "./use-listings";
import { useAuctions } from "./use-auctions";

export interface UserStats {
  jerseyCount: number;
  forSaleCount: number;
  activeAuctions: number;
  hasJerseys: boolean;
  featuredJersey: {
    id: string;
    club: string;
    season: string;
    jersey_type: string;
    images: string[];
  } | null;
}

export function useUserStats() {
  const { user, isLoaded: isUserLoaded } = useUser();

  // Fetch user's jerseys
  const { data: jerseysData, isLoading: isJerseysLoading } = useJerseys(
    user?.id
      ? {
          ownerId: user.id,
          visibility: "all",
          // We set limit to 100 to get a decent count. 
          // Ideally API should return total count.
          limit: 100,
        }
      : undefined
  );

  // Fetch user's active listings
  const { data: listingsData, isLoading: isListingsLoading } = useListings(
    user?.id
      ? {
          status: "active",
          limit: 100,
        }
      : undefined
  );

  // Fetch user's active auctions
  const { data: auctionsData, isLoading: isAuctionsLoading } = useAuctions(
    user?.id
      ? {
          status: "active",
          limit: 100,
        }
      : undefined
  );

  // MOCK DATA for visualization (when hooks are not ready/connected)
  const MOCK_STATS: UserStats = {
    jerseyCount: 12,
    forSaleCount: 3,
    activeAuctions: 1,
    hasJerseys: true,
    featuredJersey: {
      id: "mock-1",
      club: "FC Barcelona",
      season: "2010/11",
      jersey_type: "Home",
      images: ["/apps/web/public/Gemini_Generated_Image_ql6m56ql6m56ql6m.png"],
    }
  };

  if (!isUserLoaded) {
    return { data: null, isLoading: true };
  }

  // For development visualization: allow viewing even if logged out
  // if (!user) {
  //   return { data: null, isLoading: false };
  // }

  const isLoading = isJerseysLoading || isListingsLoading || isAuctionsLoading;

  // We need to handle the case where hooks might run with undefined params (fetching all)
  // but we only want to calculate stats if we actually targeted the user.
  // However, since we pass user.id in params, if user exists, we are good.
  
  const realStats: UserStats | null = user && jerseysData ? {
    jerseyCount: jerseysData.items.length, // Note: limited by fetch limit
    forSaleCount: listingsData?.items.filter((l) => l.seller_id === user.id).length || 0,
    activeAuctions: auctionsData?.items.filter((a) => a.seller_id === user.id).length || 0,
    hasJerseys: jerseysData.items.length > 0,
    featuredJersey: jerseysData.items.length > 0 ? {
      id: jerseysData.items[0].id,
      club: jerseysData.items[0].club,
      season: jerseysData.items[0].season,
      jersey_type: jerseysData.items[0].jersey_type,
      images: jerseysData.items[0].images,
    } : null,
  } : null;

  // Use mock data if real data is missing (or user is logged out for dev preview)
  const stats = realStats || MOCK_STATS;

  return {
    data: stats,
    // If using mock data, force loading to false so we can see it
    isLoading: realStats ? isLoading : false,
  };
}

