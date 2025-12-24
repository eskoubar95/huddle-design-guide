"use client";

import { useMemo } from "react";
import { useListings } from "./use-listings";
import { useAuctions } from "./use-auctions";
import { useJerseys } from "./use-jerseys";
import type { Database } from "@/lib/supabase/types";

// Removed unused types: SaleListing, Auction
type _SaleListing = Database["public"]["Tables"]["sale_listings"]["Row"];
type _Auction = Database["public"]["Tables"]["auctions"]["Row"];
type Jersey = Database["public"]["Tables"]["jerseys"]["Row"];

interface SaleListingWithJersey extends Omit<Jersey, 'status' | 'vision_confidence' | 'vision_raw' | 'medusa_product_id'> {
  listing_id: string;
  price: number;
  currency: string | null;
  negotiable: boolean | null;
  status?: string | null;
  vision_confidence?: number | null;
  vision_raw?: unknown | null;
  medusa_product_id?: string | null;
}

export interface AuctionWithJersey extends Omit<Jersey, 'status' | 'vision_confidence' | 'vision_raw' | 'medusa_product_id'> {
  auction_id: string;
  current_bid?: number;
  starting_bid: number;
  buy_now_price?: number;
  currency: string | null;
  ends_at: string;
  status?: string | null;
  vision_confidence?: number | null;
  vision_raw?: unknown | null;
  medusa_product_id?: string | null;
}

/**
 * Hook to fetch and join marketplace data (listings/auctions with jerseys)
 */
export function useMarketplaceSales(filters?: {
  searchQuery?: string;
  filterType?: string;
  filterSeason?: string;
  minPrice?: string;
  maxPrice?: string;
}) {
  const { data: listingsData, isLoading, error } = useListings({
    status: "active",
    limit: 100, // Max allowed by API
  });

  // Get unique jersey IDs from listings
  // Note: jerseyIds is computed but not currently used - kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _jerseyIds = useMemo(() => {
    if (!listingsData?.items) return [];
    return [...new Set(listingsData.items.map((l) => l.jersey_id))];
  }, [listingsData]);

  // Fetch public jerseys (only public jerseys should be visible on marketplace)
  // Note: API has max limit of 100, so we fetch in batches if needed
  const { data: jerseysData } = useJerseys({
    visibility: "public",
    limit: 100, // Max allowed by API
  });

  // Join listings with jerseys
  const sales = useMemo((): SaleListingWithJersey[] => {
    if (!listingsData?.items || !jerseysData?.items) return [];

    const jerseysMap = new Map(jerseysData.items.map((j) => [j.id, j]));

    const joined = listingsData.items
      .map((listing) => {
        const jersey = jerseysMap.get(listing.jersey_id);
        if (!jersey) return null;

        return {
          ...jersey,
          listing_id: listing.id,
          price: listing.price,
          currency: listing.currency,
          negotiable: listing.negotiable,
        } as SaleListingWithJersey;
      })
      .filter((item) => item !== null) as SaleListingWithJersey[];

    // Apply filters
    return joined.filter((sale) => {
      if (filters?.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (
          !sale.club.toLowerCase().includes(query) &&
          !sale.player_name?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (filters?.filterType && filters.filterType !== "all" && sale.jersey_type !== filters.filterType) {
        return false;
      }
      if (filters?.filterSeason && filters.filterSeason !== "all" && sale.season !== filters.filterSeason) {
        return false;
      }
      if (filters?.minPrice && sale.price < parseFloat(filters.minPrice)) {
        return false;
      }
      if (filters?.maxPrice && sale.price > parseFloat(filters.maxPrice)) {
        return false;
      }
      return true;
    });
  }, [listingsData, jerseysData, filters]);

  return {
    sales,
    isLoading,
    error,
    totalItems: sales.length,
  };
}

export function useMarketplaceAuctions(filters?: {
  searchQuery?: string;
  filterType?: string;
  filterSeason?: string;
  minPrice?: string;
  maxPrice?: string;
}) {
  const { data: auctionsData, isLoading, error, refetch } = useAuctions({
    status: "active",
    limit: 100, // Fetch more for client-side filtering
  });

  // Get unique jersey IDs from auctions
  // Note: jerseyIds is computed but not currently used - kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _jerseyIds = useMemo(() => {
    if (!auctionsData?.items) return [];
    return [...new Set(auctionsData.items.map((a) => a.jersey_id))];
  }, [auctionsData]);

  // Fetch public jerseys (only public jerseys should be visible on marketplace)
  // Note: API has max limit of 100, so we fetch in batches if needed
  const { data: jerseysData } = useJerseys({
    visibility: "public",
    limit: 100, // Max allowed by API
  });

  // Join auctions with jerseys
  const auctions = useMemo((): AuctionWithJersey[] => {
    if (!auctionsData?.items || !jerseysData?.items) return [];

    const jerseysMap = new Map(jerseysData.items.map((j) => [j.id, j]));

    const joined = auctionsData.items
      .map((auction) => {
        const jersey = jerseysMap.get(auction.jersey_id);
        if (!jersey) return null;

        return {
          ...jersey,
          auction_id: auction.id,
          current_bid: auction.current_bid ?? undefined,
          starting_bid: auction.starting_bid,
          buy_now_price: auction.buy_now_price ?? undefined,
          currency: auction.currency,
          ends_at: auction.ends_at,
        } as AuctionWithJersey;
      })
      .filter((item) => item !== null)
      .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()) as AuctionWithJersey[]; // Sort by ends_at

    // Apply filters
    return joined.filter((auction) => {
      if (filters?.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (
          !auction.club.toLowerCase().includes(query) &&
          !auction.player_name?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (filters?.filterType && filters.filterType !== "all" && auction.jersey_type !== filters.filterType) {
        return false;
      }
      if (filters?.filterSeason && filters.filterSeason !== "all" && auction.season !== filters.filterSeason) {
        return false;
      }
      const currentBid = auction.current_bid || auction.starting_bid;
      if (filters?.minPrice && currentBid < parseFloat(filters.minPrice)) {
        return false;
      }
      if (filters?.maxPrice && currentBid > parseFloat(filters.maxPrice)) {
        return false;
      }
      return true;
    });
  }, [auctionsData, jerseysData, filters]);

  return {
    auctions,
    isLoading,
    error,
    totalItems: auctions.length,
    refetch,
  };
}

