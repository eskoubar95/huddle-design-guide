'use client'

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { MetadataCombobox } from "@/components/jersey/MetadataCombobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface MissingDataStepProps {
  missingFields: string[];
  clubId?: string;
  seasonId?: string;
  playerId?: string;
  onClubIdChange: (clubId: string | undefined) => void;
  onSeasonIdChange: (seasonId: string | undefined) => void;
  onPlayerIdChange: (playerId: string | undefined) => void;
  suggestions?: {
    seasons?: Array<{ id: string; label: string; confidence: number }>;
  };
}

const FIELD_LABELS: Record<string, string> = {
  club: 'Klub',
  season: 'Sæson',
  player: 'Spiller',
};

export const MissingDataStep = ({
  missingFields,
  clubId,
  seasonId,
  playerId,
  onClubIdChange,
  onSeasonIdChange,
  onPlayerIdChange,
  suggestions,
}: MissingDataStepProps) => {
  const form = useFormContext();
  const club = form.watch("club");
  const season = form.watch("season");
  const playerName = form.watch("playerName");

  const isClubMissing = missingFields.includes('club');
  const isSeasonMissing = missingFields.includes('season');
  const isPlayerMissing = missingFields.includes('player');

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Manglende information</AlertTitle>
        <AlertDescription>
          AI'en kunne ikke finde alle nødvendige oplysninger automatisk. Udfyld venligst de manglende felter nedenfor.
        </AlertDescription>
      </Alert>

      {isClubMissing && (
        <div className="space-y-2">
          <Label htmlFor="missing-club">
            Klub <span className="text-destructive">*</span>
          </Label>
          <MetadataCombobox
            type="club"
            value={clubId}
            onValueChange={(selectedClubId) => {
              onClubIdChange(selectedClubId);
              // Find the club name from the selected ID
              if (selectedClubId) {
                // The combobox will handle setting the name internally
                // We just need to track the ID
              }
            }}
            placeholder="Søg efter klub..."
          />
        </div>
      )}

      {isSeasonMissing && (
        <div className="space-y-2">
          <Label htmlFor="missing-season">
            Sæson <span className="text-destructive">*</span>
          </Label>
          <MetadataCombobox
            type="season"
            value={seasonId}
            clubId={clubId}
            onValueChange={(selectedSeasonId) => {
              onSeasonIdChange(selectedSeasonId);
            }}
            placeholder="Søg efter sæson..."
          />
        </div>
      )}

      {isPlayerMissing && (
        <div className="space-y-2">
          <Label htmlFor="missing-player">
            Spiller <span className="text-destructive">*</span>
          </Label>
          {clubId && seasonId ? (
            <MetadataCombobox
              type="player"
              value={playerId}
              clubId={clubId}
              seasonId={seasonId}
              onValueChange={(selectedPlayerId) => {
                onPlayerIdChange(selectedPlayerId);
              }}
              placeholder="Søg efter spiller..."
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              Vælg først klub og sæson for at søge efter spiller
            </div>
          )}
        </div>
      )}

      {!isClubMissing && !isSeasonMissing && !isPlayerMissing && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Alle felter udfyldt</AlertTitle>
          <AlertDescription>
            Alle nødvendige oplysninger er nu tilgængelige. Du kan fortsætte.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

