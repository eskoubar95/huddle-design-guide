import { Heart, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden transition-smooth cursor-pointer",
        "bg-card hover:bg-card-hover shadow-card hover:shadow-elevated",
        "border border-border/50 hover:border-primary/30",
        className
      )}
    >
      {/* Jersey Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-card">
        <img
          src={image}
          alt={`${club} ${season} ${type}`}
          className="w-full h-full object-cover transition-smooth group-hover:scale-105"
        />
        
        {/* Top actions */}
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            className={cn(
              "p-1.5 rounded-full backdrop-blur-sm transition-smooth",
              "bg-background/40 hover:bg-background/60",
              isLiked && "text-destructive"
            )}
            onClick={(e) => {
              e.stopPropagation();
              // Handle like
            }}
          >
            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
          </button>
          <button
            className={cn(
              "p-1.5 rounded-full backdrop-blur-sm transition-smooth",
              "bg-background/40 hover:bg-background/60",
              isSaved && "text-accent"
            )}
            onClick={(e) => {
              e.stopPropagation();
              // Handle save
            }}
          >
            <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
          </button>
        </div>

        {/* Condition badge */}
        <div className="absolute top-2 left-2">
          <div className="px-2 py-1 rounded-md backdrop-blur-sm bg-background/60 border border-border/50">
            <span className="text-xs font-bold text-success">{condition}/10</span>
          </div>
        </div>

        {/* For Sale badge */}
        {forSale && price && (
          <div className="absolute bottom-2 left-2 right-2">
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
