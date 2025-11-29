'use client'

import { useAuction } from "./use-auctions";
import { useMarketplaceAuctions } from "./use-marketplace";

export function useFeaturedAuction() {
  const featuredAuctionId = process.env.NEXT_PUBLIC_FEATURED_AUCTION_ID;

  // Always call hooks (React rules) - use conditional logic inside
  // useAuction has enabled: !!id, so empty string will disable the query
  const { data: auction, isLoading: auctionLoading, error: auctionError } = useAuction(
    featuredAuctionId || ""
  );
  const { auctions, isLoading: marketplaceLoading } = useMarketplaceAuctions({});

  // If no env var, return early
  if (!featuredAuctionId) {
    return {
      data: null,
      isLoading: false,
      error: null,
    };
  }

  // Join auction with jersey data
  const auctionWithJersey = auction && auctions
    ? auctions.find((a) => a.auction_id === auction.id)
    : null;

  return {
    data: auctionWithJersey || null,
    isLoading: auctionLoading || marketplaceLoading,
    error: auctionError,
  };
}

