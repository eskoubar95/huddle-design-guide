'use client'

import * as React from "react";
import { Loader2, Sparkles, CheckCircle2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge as BadgeUI } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetadataCombobox } from "@/components/jersey/MetadataCombobox";
import { useMetadataMatching } from "@/hooks/use-metadata-matching";
import { UseFormWatch } from "react-hook-form";
import type { JerseyUpdateInput } from "@/lib/validation/jersey-schemas";

interface MetadataMatchingSectionProps {
  clubId: string;
  playerId: string;
  seasonLabel: string;
  seasonId: string;
  isAutoLinking: boolean;
  autoLinkSuccess: boolean;
  club: string;
  season: string;
  playerNumber?: string | null;
  playerName?: string | null;
  allSeasons: Array<{ id: string; label: string; start_year: number; end_year: number }>;
  selectedSeasonData?: { seasons: Array<{ id: string; label: string; start_year: number; end_year: number }> };
  selectedPlayerData?: { player: { id: string; full_name: string; current_shirt_number?: number | null } };
  matchingQuery: ReturnType<typeof useMetadataMatching>;
  uniquePlayerResults: Array<{
    playerId: string;
    fullName: string;
    jerseyNumber: number;
    confidenceScore: number;
  }>;
  onClubChange: (value: string | undefined) => void;
  onSeasonChange: (label: string) => void;
  onPlayerChange: (playerId: string) => void;
  onClearSeason: () => void;
  onClearPlayer: () => void;
  onAutoLink: () => void;
  onDismissAutoLinkSuccess: () => void;
}

export function MetadataMatchingSection({
  clubId,
  playerId,
  seasonLabel,
  seasonId,
  isAutoLinking,
  autoLinkSuccess,
  club,
  season,
  playerNumber,
  playerName,
  allSeasons,
  selectedSeasonData,
  selectedPlayerData,
  matchingQuery,
  uniquePlayerResults,
  onClubChange,
  onSeasonChange,
  onPlayerChange,
  onClearSeason,
  onClearPlayer,
  onAutoLink,
  onDismissAutoLinkSuccess,
}: MetadataMatchingSectionProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Link to Official Data</h2>
            <BadgeUI variant="outline" className="text-xs">Optional</BadgeUI>
          </div>
          <p className="text-sm text-muted-foreground">
            Link this jersey to official club, season, and player data for better discovery and analytics.
          </p>
        </div>
        {(!clubId || !seasonId || !playerId) && club && season && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAutoLink}
            disabled={isAutoLinking}
            className="shrink-0"
          >
            {isAutoLinking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Auto-linking...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Auto-link
              </>
            )}
          </Button>
        )}
      </div>

      {autoLinkSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-foreground">
            Metadata linked successfully! The form has been updated with matched data.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto shrink-0"
            onClick={onDismissAutoLinkSuccess}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Club Combobox */}
      <div className="space-y-2">
        <Label htmlFor="metadata-club" className="flex items-center gap-2">
          Official Club
          {clubId && (
            <BadgeUI variant="secondary" className="text-xs">
              Linked
            </BadgeUI>
          )}
        </Label>
        <MetadataCombobox
          type="club"
          value={clubId}
          onValueChange={onClubChange}
          placeholder="Search for club..."
        />
      </div>

      {/* Season Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="metadata-season" className="flex items-center gap-2">
          Official Season
          {seasonId && (
            <BadgeUI variant="secondary" className="text-xs">
              Linked
            </BadgeUI>
          )}
        </Label>
        <Select value={seasonLabel || undefined} onValueChange={onSeasonChange}>
          <SelectTrigger id="metadata-season">
            <SelectValue placeholder="Select official season" />
          </SelectTrigger>
          <SelectContent>
            {allSeasons.map((season) => (
              <SelectItem key={season.id} value={season.label}>
                {season.label} ({season.start_year}/{season.end_year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {seasonId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearSeason}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            Clear season
          </Button>
        )}
      </div>

      {/* Player Suggestions */}
      {playerId || (clubId && seasonId) ? (
        <div className="space-y-2">
          <Label htmlFor="metadata-player" className="flex items-center gap-2">
            Suggested Players
            {playerId && (
              <BadgeUI variant="secondary" className="text-xs">
                Linked
              </BadgeUI>
            )}
          </Label>
          
          {matchingQuery.isLoading && clubId && seasonId && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Searching for players...</p>
            </div>
          )}

          {matchingQuery.isError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <Info className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">Failed to load player suggestions</p>
            </div>
          )}

          {/* Show player if playerId is set but club/season not selected */}
          {playerId && !clubId && !seasonId && (
            <>
              {selectedPlayerData?.player ? (
                <>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Linked player (select club and season to see suggestions)
                  </p>
                  <Select value={playerId || undefined} onValueChange={onPlayerChange}>
                    <SelectTrigger id="metadata-player">
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key={selectedPlayerData.player.id} value={selectedPlayerData.player.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{selectedPlayerData.player.full_name}</span>
                          <BadgeUI variant="outline" className="ml-2 text-xs">
                            Linked
                          </BadgeUI>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading player...</p>
                </div>
              )}
              {playerId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearPlayer}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear player
                </Button>
              )}
            </>
          )}

          {((matchingQuery.data && matchingQuery.data.length > 0) || (selectedPlayerData?.player && clubId && seasonId)) && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  {playerNumber
                    ? `Matching jersey #${playerNumber}:`
                    : 'All players for this club and season:'}
                </p>
                {matchingQuery.data && matchingQuery.data.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {matchingQuery.data.length} {matchingQuery.data.length === 1 ? 'player' : 'players'}
                  </span>
                )}
              </div>
              <Select value={playerId || undefined} onValueChange={onPlayerChange}>
                <SelectTrigger id="metadata-player" className="h-auto min-h-[44px] py-2">
                  <SelectValue placeholder="Select player">
                    {playerId && selectedPlayerData?.player ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedPlayerData.player.full_name}</span>
                        {selectedPlayerData.player.current_shirt_number && (
                          <BadgeUI variant="outline" className="text-xs font-mono">
                            #{selectedPlayerData.player.current_shirt_number}
                          </BadgeUI>
                        )}
                      </div>
                    ) : playerId && matchingQuery.data?.find((p) => p.playerId === playerId) ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {matchingQuery.data.find((p) => p.playerId === playerId)?.fullName}
                        </span>
                        <BadgeUI variant="outline" className="text-xs font-mono">
                          #{matchingQuery.data.find((p) => p.playerId === playerId)?.jerseyNumber}
                        </BadgeUI>
                      </div>
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {/* Always include selected player in list if it exists, even if not in matching results */}
                  {playerId && selectedPlayerData?.player && (
                    <SelectItem key={`selected-${selectedPlayerData.player.id}`} value={selectedPlayerData.player.id}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="font-medium truncate">{selectedPlayerData.player.full_name}</span>
                          {selectedPlayerData.player.current_shirt_number && (
                            <BadgeUI variant="outline" className="text-xs font-mono shrink-0">
                              #{selectedPlayerData.player.current_shirt_number}
                            </BadgeUI>
                          )}
                        </div>
                        <BadgeUI variant="secondary" className="text-xs shrink-0">
                          Linked
                        </BadgeUI>
                      </div>
                    </SelectItem>
                  )}
                  {/* Show loading state if playerId is set but data not loaded yet */}
                  {playerId && !selectedPlayerData?.player && (
                    <SelectItem key={`loading-${playerId}`} value={playerId} disabled>
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading player...</span>
                      </div>
                    </SelectItem>
                  )}
                  {/* Show matching results - sorted by confidence score, deduplicated by playerId */}
                  {uniquePlayerResults.map((result) => (
                    <SelectItem key={`match-${result.playerId}`} value={result.playerId}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="font-medium truncate">{result.fullName}</span>
                          <BadgeUI variant="outline" className="text-xs font-mono shrink-0">
                            #{result.jerseyNumber}
                          </BadgeUI>
                        </div>
                        <BadgeUI
                          variant={
                            result.confidenceScore >= 90
                              ? 'default'
                              : result.confidenceScore >= 70
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-xs shrink-0"
                        >
                          {result.confidenceScore}%
                        </BadgeUI>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {playerId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearPlayer}
                  className="text-muted-foreground hover:text-foreground h-8"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Clear player
                </Button>
              )}
            </>
          )}

          {!matchingQuery.isLoading && 
           !matchingQuery.isError && 
           (!matchingQuery.data || matchingQuery.data.length === 0) && 
           !selectedPlayerData?.player && 
           clubId && 
           seasonId && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Info className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                No players found for this club and season combination.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Status indicator */}
      {clubId && seasonId && playerId && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-foreground">
            All metadata linked! This jersey is now connected to official data.
          </p>
        </div>
      )}
    </div>
  );
}

