'use client'

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Edit, Trash2, Eye, EyeOff } from "lucide-react";

interface JerseyHeaderProps {
  club: string;
  season: string;
  jerseyType: string;
  visibility: string;
  likesCount: number;
  hasListing: boolean;
  hasAuction: boolean;
  isOwner: boolean;
  onToggleVisibility?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function JerseyHeader({
  club,
  season,
  jerseyType,
  visibility,
  likesCount,
  hasListing,
  hasAuction,
  isOwner,
  onToggleVisibility,
  onEdit,
  onDelete,
}: JerseyHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-start gap-3 mb-2">
          <h2 className="text-2xl font-bold">
            {club} {season}
          </h2>
          {likesCount > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Heart className="w-4 h-4" />
              <span className="text-sm">{likesCount}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{jerseyType}</Badge>
          {visibility === "private" && (
            <Badge variant="outline">
              <EyeOff className="w-3 h-3 mr-1" />
              Private
            </Badge>
          )}
          {hasListing && <Badge variant="default">For Sale</Badge>}
          {hasAuction && <Badge variant="default">Auction Active</Badge>}
        </div>
      </div>
      {isOwner && (
        <div className="flex gap-2">
          {onToggleVisibility && (
            <Button variant="outline" size="icon" onClick={onToggleVisibility}>
              {visibility === "public" ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="icon" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="icon" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

