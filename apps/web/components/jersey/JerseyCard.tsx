'use client'

import { Heart, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { JerseyImageWithLoading } from "@/components/jersey/JerseyImageWithLoading";

interface JerseyCardProps {
  id: string;
  image: string;
  club: string;
  season: string;
  type: string;
  player?: string;
  condition: number;
  isLiked?: boolean;
  isSaved?: boolean;
  forSale?: boolean;
  price?: string;
  className?: string;
}

export const JerseyCard = ({
  id,
  image,
  club,
  season,
  type,
  player,
  condition,
  isLiked = false,
  isSaved = false,
  forSale = false,
  price,
  className,
}: JerseyCardProps) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/wardrobe/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View ${club} ${season} ${type} jersey`}
      className={cn(
        "group relative rounded-xl overflow-hidden transition-smooth cursor-pointer",
        "bg-card hover:bg-card-hover shadow-card hover:shadow-elevated",
        "border border-border/50 hover:border-primary/30",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        className
      )}
    >
      {/* Jersey Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-card">
        {image ? (
          <JerseyImageWithLoading
            src={image}
            alt={`${club} ${season} ${type}`}
            className="w-full h-full object-cover transition-smooth group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <span className="text-muted-foreground text-sm">No image</span>
          </div>
        )}

        {/* Top actions */}
        <div className="absolute top-2 right-2 flex gap-2 z-20">
          <button
            className={cn(
              "p-1.5 rounded-full backdrop-blur-sm transition-smooth",
              "bg-background/40 hover:bg-background/60",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              isLiked && "text-destructive"
            )}
            onClick={(e) => {
              e.stopPropagation();
              // Handle like
            }}
            aria-label={isLiked ? "Unlike jersey" : "Like jersey"}
          >
            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
          </button>
          <button
            className={cn(
              "p-1.5 rounded-full backdrop-blur-sm transition-smooth",
              "bg-background/40 hover:bg-background/60",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              isSaved && "text-accent"
            )}
            onClick={(e) => {
              e.stopPropagation();
              // Handle save
            }}
            aria-label={isSaved ? "Unsave jersey" : "Save jersey"}
          >
            <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
          </button>
        </div>

        {/* Condition badge */}
        <div className="absolute top-2 left-2 z-20">
          <div className="px-2 py-1 rounded-md backdrop-blur-sm bg-background/60 border border-border/50">
            <span className="text-xs font-bold text-success">{condition}/10</span>
          </div>
        </div>

        {/* For Sale badge */}
        {forSale && price && (
          <div className="absolute bottom-2 left-2 right-2 z-20">
            <div className="px-3 py-1.5 rounded-lg backdrop-blur-md bg-accent/90 border border-accent-glow/50">
              <p className="text-sm font-bold text-accent-foreground text-center">{price}</p>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <h3 className="font-bold text-sm truncate">{club}</h3>
        <p className="text-xs text-muted-foreground">
          {season} • {type}
        </p>
        {player && (
          <p className="text-xs text-primary font-medium truncate">{player}</p>
        )}
      </div>
    </div>
  );
};


