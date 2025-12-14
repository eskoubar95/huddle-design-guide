'use client'

import { Button } from "@/components/ui/button";
import { ShoppingCart, Gavel, MessageSquare } from "lucide-react";

interface JerseyActionsProps {
  isOwner: boolean;
  hasListing: boolean;
  hasAuction: boolean;
  onListForSale?: () => void;
  onStartAuction?: () => void;
  onMessageSeller?: () => void;
  onShowInterest?: () => void;
}

export function JerseyActions({
  isOwner,
  hasListing,
  hasAuction,
  onListForSale,
  onStartAuction,
  onMessageSeller,
  onShowInterest,
}: JerseyActionsProps) {
  if (isOwner) {
    return (
      <div className="space-y-2">
        {!hasListing && !hasAuction && (
          <>
            {onListForSale && (
              <Button variant="outline" className="w-full" onClick={onListForSale}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                List for Sale
              </Button>
            )}
            {onStartAuction && (
              <Button variant="outline" className="w-full" onClick={onStartAuction}>
                <Gavel className="w-4 h-4 mr-2" />
                Start Auction
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {onMessageSeller && (
        <Button variant="default" className="w-full" onClick={onMessageSeller}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Message Seller
        </Button>
      )}
      {!hasListing && !hasAuction && onShowInterest && (
        <Button variant="outline" className="w-full" onClick={onShowInterest}>
          Show Interest
        </Button>
      )}
    </div>
  );
}

