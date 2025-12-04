'use client'

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Bookmark } from "lucide-react";

interface JerseyOwnerInfoProps {
  owner: {
    username: string;
    avatar_url?: string | null;
  } | null;
  isOwner: boolean;
  isLiked: boolean;
  isSaved: boolean;
  onLike?: () => void;
  onSave?: () => void;
}

export function JerseyOwnerInfo({
  owner,
  isOwner,
  isLiked,
  isSaved,
  onLike,
  onSave,
}: JerseyOwnerInfoProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={owner?.avatar_url || undefined} />
          <AvatarFallback>{owner?.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{owner?.username}</p>
          <p className="text-sm text-muted-foreground">Owner</p>
        </div>
      </div>
      {!isOwner && (
        <div className="flex gap-2">
          {onLike && (
            <Button
              variant={isLiked ? "default" : "outline"}
              size="icon"
              onClick={onLike}
            >
              <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            </Button>
          )}
          {onSave && (
            <Button
              variant={isSaved ? "default" : "outline"}
              size="icon"
              onClick={onSave}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

