'use client'

import { useAuction } from "./use-auctions";
import { useMarketplaceAuctions } from "./use-marketplace";

export function useFeaturedAuction() {
  const featuredAuctionId = process.env.NEXT_PUBLIC_FEATURED_AUCTION_ID;

  // If no env var, don't fetch
  if (!featuredAuctionId) {
    return {
      data: null,
      isLoading: false,
      error: null,
    };
  }

  // Fetch auction details
  const { data: auction, isLoading, error } = useAuction(featuredAuctionId);

  // Fetch marketplace auctions to get jersey data
  // We use the existing hook logic but filters are empty. 
  // Note: This is slightly inefficient as it fetches multiple auctions/jerseys just to find one.
  // Ideally, we would have a useAuctionWithJersey(id) hook.
  // But for now, reusing existing hooks is fine as per plan.
  const { auctions } = useMarketplaceAuctions({});

  // Join auction with jersey data
  const auctionWithJersey = auction && auctions
    ? auctions.find((a) => a.auction_id === auction.id)
    : null;

  return {
    data: auctionWithJersey || null,
    isLoading,
    error,
  };
}

