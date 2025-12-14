'use client'

import { Button } from "@/components/ui/button";
import { ShoppingCart, Gavel } from "lucide-react";
import { CountdownTimer } from "@/components/marketplace/CountdownTimer";

interface Listing {
  price: number;
  currency: string | null;
  negotiable: boolean | null;
}

interface Auction {
  current_bid?: number | null;
  starting_bid: number;
  currency: string | null;
  ends_at: string;
}

interface JerseyMarketplaceInfoProps {
  listing?: Listing | null;
  auction?: Auction | null;
  isOwner: boolean;
  onBuy?: () => void;
  onBid?: () => void;
  onExpire?: () => void;
}

export function JerseyMarketplaceInfo({
  listing,
  auction,
  isOwner,
  onBuy,
  onBid,
  onExpire,
}: JerseyMarketplaceInfoProps) {
  if (!listing && !auction) return null;

  return (
    <>
      {listing && (
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Price</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
          <p className="text-2xl font-bold mb-2">
            {listing.currency || "€"} {listing.price.toLocaleString()}
            {listing.negotiable && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Negotiable)
              </span>
            )}
          </p>
          {!isOwner && onBuy && (
            <Button className="w-full" onClick={onBuy}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy Now
            </Button>
          )}
        </div>
      )}

      {auction && (
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Current Bid</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
          <p className="text-2xl font-bold mb-2">
            {auction.currency || "€"}{" "}
            {(auction.current_bid || auction.starting_bid).toLocaleString()}
          </p>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Ends in</span>
            <CountdownTimer endsAt={auction.ends_at} onExpire={onExpire} />
          </div>
          {!isOwner && onBid && (
            <Button className="w-full" onClick={onBid}>
              <Gavel className="w-4 h-4 mr-2" />
              Place Bid
            </Button>
          )}
        </div>
      )}
    </>
  );
}

