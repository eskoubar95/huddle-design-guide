'use client'

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useUserStats } from "./use-user-stats";
import { useFeaturedAuction } from "./use-featured-auction";
import { useRecommendedJersey } from "./use-recommended-jersey";
import { useFeaturedSale } from "./use-featured-sale";

export interface HeroSlideData {
  id: string;
  gradient: string;
  type: 'user-stats' | 'upload-encouragement' | 'auction' | 'jersey' | 'sale' | 'welcome';
  data?: unknown;
  priority?: number;
}

export function useHeroSlides() {
  const { user } = useUser();
  const { data: userStats, isLoading: userStatsLoading } = useUserStats();
  const { data: featuredAuction, isLoading: featuredAuctionLoading } = useFeaturedAuction();
  const { data: featuredSale, isLoading: featuredSaleLoading } = useFeaturedSale();
  const { data: recommendedJersey, isLoading: recommendedJerseyLoading } = useRecommendedJersey();

  const slides = useMemo(() => {
    const result: HeroSlideData[] = [];
    
    // Priority 1: Featured Auction
    if (featuredAuction) {
      result.push({
        id: 'featured-auction',
        type: 'auction',
        gradient: 'from-accent/20 to-success/20',
        priority: 1,
        data: featuredAuction,
      });
    }

    // Priority 1.5: Featured Sale (Just after auction, or first if no auction)
    if (featuredSale) {
      result.push({
        id: 'featured-sale',
        type: 'sale',
        gradient: 'from-emerald-500/20 to-emerald-300/20', // Greenish gradient for sale
        priority: 1, // Same priority level as auction, sort will keep order of insertion if equal
        data: featuredSale,
      });
    }

    // Priority 2: User Stats Slide or Upload Encouragement
    if (userStats) {
      if (userStats.hasJerseys) {
        // User has jerseys - show stats slide
        result.push({
          id: 'user-stats',
          type: 'user-stats',
          gradient: '', // No extra gradient, rely on background image + dark overlay
          priority: 2,
          data: userStats,
        });
      } else {
        // User has no jerseys - show upload encouragement
        result.push({
          id: 'upload-encouragement',
          type: 'upload-encouragement',
          gradient: 'from-primary/20 to-accent/20',
          priority: 2,
          data: null,
        });
      }
    }

    // Priority 3: Recommendations (Placeholder if no real data found)
    if (user) {
      // Use real data if available, otherwise fallback to placeholder for dev/demo
      const jerseyData = recommendedJersey || {
        id: 'placeholder-jersey',
        club: 'F.C. København',
        season: '2023/24',
        jersey_type: 'Home',
        images: ['/JW_FCK_1.jpg'], // Updated placeholder image
        owner_id: 'placeholder-owner',
        listing: {
          currency: 'DKK',
          price: 850
        }
      };

      result.push({
        id: 'recommended-jersey',
        type: 'jersey',
        gradient: '', 
        priority: 3,
        data: jerseyData,
      });
    }
    
    // Sort by priority
    return result.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }, [user, userStats, featuredAuction, featuredSale, recommendedJersey]);

  return { 
    slides, 
    isLoading: userStatsLoading || featuredAuctionLoading || recommendedJerseyLoading || featuredSaleLoading, 
    user 
  };
}
