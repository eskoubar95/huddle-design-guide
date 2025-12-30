"use client";

import { JerseyImageWithLoading } from "@/components/jersey/JerseyImageWithLoading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface JerseyData {
  id: string;
  club: string;
  season: string;
  jersey_type: string;
  player_name?: string | null;
  player_number?: string | null;
  condition_rating?: number | null;
  images: string[];
}

interface SellerData {
  id: string;
  username: string;
  avatar_url?: string | null;
  country?: string | null;
}

interface CheckoutSummaryProps {
  jersey: JerseyData;
  seller?: SellerData | null;
  listingPrice: number; // in major units (EUR)
  currency?: string;
  className?: string;
}

export function CheckoutSummary({
  jersey,
  seller,
  listingPrice,
  currency = "€",
  className,
}: CheckoutSummaryProps) {
  // Get condition label
  const getConditionLabel = (rating: number | null | undefined): string => {
    if (!rating) return "";
    if (rating >= 9) return "Mint";
    if (rating >= 7) return "Excellent";
    if (rating >= 5) return "Good";
    if (rating >= 3) return "Fair";
    return "Poor";
  };

  const conditionLabel = getConditionLabel(jersey.condition_rating);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Jersey Info */}
      <div className="flex gap-4">
        {/* Jersey Image */}
        <div className="relative h-24 w-24 rounded-lg overflow-hidden border shrink-0">
          <JerseyImageWithLoading
            src={jersey.images[0] || "/placeholder-jersey.svg"}
            fallbackSrc="/placeholder-jersey.svg"
            alt={`${jersey.club} ${jersey.season}`}
            className="object-cover"
          />
        </div>

        {/* Jersey Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">
            {jersey.club}
          </h3>
          <p className="text-muted-foreground text-sm">
            {jersey.season} • {jersey.jersey_type}
          </p>

          {/* Player Info */}
          {(jersey.player_name || jersey.player_number) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {jersey.player_name && <span>{jersey.player_name}</span>}
              {jersey.player_name && jersey.player_number && " • "}
              {jersey.player_number && <span>#{jersey.player_number}</span>}
            </p>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 mt-2">
            {conditionLabel && (
              <Badge variant="secondary" className="text-xs">
                {conditionLabel}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs font-semibold">
              {currency} {listingPrice.toLocaleString()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Seller Info */}
      {seller && (
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Sælger</p>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={seller.avatar_url || undefined} alt={seller.username} />
              <AvatarFallback>
                {seller.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">@{seller.username}</p>
              {seller.country && (
                <p className="text-xs text-muted-foreground">{seller.country}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

