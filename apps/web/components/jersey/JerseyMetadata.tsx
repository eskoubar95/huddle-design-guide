'use client'

import { Badge } from "@/components/ui/badge";

interface JerseyMetadataProps {
  playerName?: string | null;
  playerNumber?: string | null;
  competitionBadges?: string[] | null;
  conditionRating?: number | null;
  notes?: string | null;
}

export function JerseyMetadata({
  playerName,
  playerNumber,
  competitionBadges,
  conditionRating,
  notes,
}: JerseyMetadataProps) {
  return (
    <div className="space-y-3">
      {playerName && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Player</p>
          <p className="font-medium">
            {playerName}
            {playerNumber && ` #${playerNumber}`}
          </p>
        </div>
      )}

      {competitionBadges && competitionBadges.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Competition Badges</p>
          <div className="flex flex-wrap gap-2">
            {competitionBadges.map((badge, index) => (
              <Badge key={index} variant="outline">
                {badge}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {conditionRating && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Condition</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${conditionRating * 10}%` }}
              />
            </div>
            <span className="font-medium">{conditionRating}/10</span>
          </div>
        </div>
      )}

      {notes && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Notes</p>
          <p className="text-sm">{notes}</p>
        </div>
      )}
    </div>
  );
}

