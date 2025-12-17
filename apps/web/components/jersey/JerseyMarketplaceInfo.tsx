'use client'

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Gavel } from "lucide-react";
import { CountdownTimer } from "@/components/marketplace/CountdownTimer";
import { PriceBreakdown } from "@/components/checkout/PriceBreakdown";
import { FeeService } from "@/lib/services/fee-service";

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
  const [feeBreakdown, setFeeBreakdown] = useState<{
    platformFee: number;
    totalAmount: number;
  } | null>(null);

  // Calculate fees using FeeService (for consistency)
  useEffect(() => {
    if (!listing || isOwner) {
      setFeeBreakdown(null);
      return;
    }

    const calculateFees = async () => {
      try {
        const feeService = new FeeService();
        const { platformPct } = await feeService.getActiveFeePercentages();

        // Convert listing.price from major units (EUR) to cents
        const itemCents = Math.round(listing.price * 100);

        // Calculate platform fee in cents
        const platformFeeCents = feeService.calculatePlatformFeeCents(
          itemCents,
          platformPct
        );

        // Calculate total in cents (item + platform fee, no shipping yet)
        const totalCents = feeService.calculateBuyerTotalCents({
          itemCents,
          shippingCents: 0, // Shipping not selected yet
          platformFeeCents,
        });

        // Convert back to major units for PriceBreakdown
        setFeeBreakdown({
          platformFee: platformFeeCents / 100,
          totalAmount: totalCents / 100,
        });
      } catch (error) {
        // Fallback to default calculation if FeeService fails
        console.error("Failed to calculate fees:", error);
        setFeeBreakdown({
          platformFee: listing.price * 0.05, // 5% fallback
          totalAmount: listing.price * 1.05, // Item + 5% fallback
        });
      }
    };

    calculateFees();
  }, [listing, isOwner]);

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
          
          {/* Platform Fee Preview (for buyers) */}
          {!isOwner && feeBreakdown && (
            <div className="mb-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <PriceBreakdown
                itemPrice={listing.price}
                platformFee={feeBreakdown.platformFee}
                totalAmount={feeBreakdown.totalAmount}
                currency={listing.currency || "€"}
                showShipping={false} // Shipping not selected yet
              />
            </div>
          )}
          
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

