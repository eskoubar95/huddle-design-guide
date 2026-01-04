'use client'

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMatchJerseyMetadata } from "@/hooks/use-match-jersey-metadata";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useEffect } from "react";


interface PlayerPrintStepProps {
  clubId?: string;
  seasonId?: string;
  playerId?: string;
  onPlayerIdChange: (playerId: string | undefined) => void;
  onClubIdChange?: (clubId: string | undefined) => void;
  onSeasonIdChange?: (seasonId: string | undefined) => void;
}

export const PlayerPrintStep = ({ clubId, seasonId, playerId, onPlayerIdChange, onClubIdChange, onSeasonIdChange }: PlayerPrintStepProps) => {
  const form = useFormContext();
  
  const playerName = form.watch("playerName");
  const playerNumber = form.watch("playerNumber");
  
  // Get club and season text from form for matching
  const clubText = form.watch("club");
  const seasonText = form.watch("season");
  
  // Fetch selected player if playerId is set
  const { data: selectedPlayerData } = useQuery<{ player: { id: string; full_name: string; current_shirt_number?: number | null } }>({
    queryKey: ['metadata-player-by-id', playerId],
    queryFn: async () => {
      if (!playerId) return null;
      const response = await fetch(`/api/v1/metadata/players/${encodeURIComponent(playerId)}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!playerId,
    staleTime: 300000, // Cache for 5 minutes
  });

  // Player matching query using unified Edge Function
  // We need clubText and seasonText from form, not just IDs
  const matchingQuery = useMatchJerseyMetadata(
    clubText && seasonText
      ? {
          clubText,
          seasonText,
          playerNameText: playerName || undefined,
          playerNumberText: playerNumber || undefined,
        }
      : null
  );
  
  // Auto-update clubId, seasonId, and playerId from matching result
  useEffect(() => {
    if (matchingQuery.data) {
      // Auto-update clubId if matched and not already set
      if (matchingQuery.data.clubId && !clubId && matchingQuery.data.matched.club && onClubIdChange) {
        onClubIdChange(matchingQuery.data.clubId);
      }
      // Auto-update seasonId if matched and not already set
      if (matchingQuery.data.seasonId && !seasonId && matchingQuery.data.matched.season && onSeasonIdChange) {
        onSeasonIdChange(matchingQuery.data.seasonId);
      }
      // Auto-select player if matched with high confidence
      if (matchingQuery.data.playerId && !playerId && matchingQuery.data.matched.player && matchingQuery.data.confidence.player >= 90) {
        onPlayerIdChange(matchingQuery.data.playerId);
      }
    }
  }, [matchingQuery.data, clubId, seasonId, playerId, onPlayerIdChange, onClubIdChange, onSeasonIdChange]);

  // Auto-retry after a delay if no player matched (Edge Function may need to fetch data)
  useEffect(() => {
    if (
      !matchingQuery.isLoading &&
      !matchingQuery.isError &&
      matchingQuery.data &&
      !matchingQuery.data.matched.player &&
      clubText &&
      seasonText &&
      !selectedPlayerData?.player
    ) {
      // Wait 2 seconds then retry (Edge Function may have fetched data)
      const timer = setTimeout(() => {
        if (!matchingQuery.isFetching) {
          matchingQuery.refetch();
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [
    matchingQuery.data,
    matchingQuery.isLoading,
    matchingQuery.isError,
    matchingQuery.isFetching,
    clubText,
    seasonText,
    selectedPlayerData,
    matchingQuery,
  ]);

  // Transform matching results to expected format
  const uniquePlayerResults = useMemo(() => {
    if (!matchingQuery.data?.players || matchingQuery.data.players.length === 0) {
      return [];
    }
    
    // Edge Function returns players array, already deduplicated
    return matchingQuery.data.players
      .sort((a: { confidenceScore: number }, b: { confidenceScore: number }) => b.confidenceScore - a.confidenceScore);
  }, [matchingQuery.data]);



  return (
    <div className="space-y-6">
      <div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="playerName">Player Name</Label>
            <Input
              id="playerName"
              placeholder="e.g., Messi, Ronaldo"
              {...form.register("playerName")}
              className="mt-2"
              maxLength={50}
            />
          </div>

          <div>
            <Label htmlFor="playerNumber">Player Number</Label>
            <Input
              id="playerNumber"
              placeholder="e.g., 10, 7"
              {...form.register("playerNumber")}
              className="mt-2"
              maxLength={3}
            />
          </div>

          {/* Player matching (show if club and season text are provided) */}
          {clubText && seasonText && (
            <div className="space-y-2">
              <Label>Link to Player (Optional)</Label>
              {matchingQuery.isLoading && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Searching for players...
                  </p>
                </div>
              )}

              {((matchingQuery.data?.players && matchingQuery.data.players.length > 0) || (selectedPlayerData?.player && clubId && seasonId)) && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      {playerNumber
                        ? `Matching jersey #${playerNumber}:`
                        : 'All players for this club and season:'}
                    </p>
                    {matchingQuery.data?.players && matchingQuery.data.players.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {matchingQuery.data.players.length} {matchingQuery.data.players.length === 1 ? 'player' : 'players'}
                      </span>
                    )}
                  </div>
                  <Select value={playerId || undefined} onValueChange={onPlayerIdChange}>
                    <SelectTrigger id="metadata-player" className="h-auto min-h-[44px] py-2">
                      <SelectValue placeholder="Select player">
                        {playerId && selectedPlayerData?.player ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{selectedPlayerData.player.full_name}</span>
                            {selectedPlayerData.player.current_shirt_number && (
                              <Badge variant="outline" className="text-xs font-mono">
                                #{selectedPlayerData.player.current_shirt_number}
                              </Badge>
                            )}
                          </div>
                        ) : playerId && matchingQuery.data?.players?.find((p) => p.playerId === playerId) ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {matchingQuery.data.players.find((p) => p.playerId === playerId)?.fullName}
                            </span>
                            {matchingQuery.data.players.find((p) => p.playerId === playerId)?.jerseyNumber && (
                              <Badge variant="outline" className="text-xs font-mono">
                                #{matchingQuery.data.players.find((p) => p.playerId === playerId)?.jerseyNumber}
                              </Badge>
                            )}
                          </div>
                        ) : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {/* Always include selected player in list if it exists, even if not in matching results */}
                      {playerId && selectedPlayerData?.player && 
                       !matchingQuery.data?.players?.some((p) => p.playerId === selectedPlayerData.player.id) && (
                        <SelectItem key={selectedPlayerData.player.id} value={selectedPlayerData.player.id}>
                          <div className="flex items-center justify-between w-full gap-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="font-medium truncate">{selectedPlayerData.player.full_name}</span>
                              {selectedPlayerData.player.current_shirt_number && (
                                <Badge variant="outline" className="text-xs font-mono shrink-0">
                                  #{selectedPlayerData.player.current_shirt_number}
                                </Badge>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Linked
                            </Badge>
                          </div>
                        </SelectItem>
                      )}
                      {/* Show loading state if playerId is set but data not loaded yet */}
                      {playerId && !selectedPlayerData?.player && (
                        <SelectItem value={playerId} disabled>
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Loading player...</span>
                          </div>
                        </SelectItem>
                      )}
                      {/* Show matching results - sorted by confidence score, deduplicated by playerId */}
                      {uniquePlayerResults.map((result) => (
                        <SelectItem key={result.playerId} value={result.playerId}>
                          <div className="flex items-center justify-between w-full gap-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="font-medium truncate">{result.fullName}</span>
                              <Badge variant="outline" className="text-xs font-mono shrink-0">
                                #{result.jerseyNumber}
                              </Badge>
                            </div>
                            <Badge
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
                            </Badge>
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
                      onClick={() => onPlayerIdChange(undefined)}
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
               (!matchingQuery.data?.players || matchingQuery.data.players.length === 0) && 
               !selectedPlayerData?.player && 
               clubText && 
               seasonText && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      No players found for this club and season combination.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground px-1">
                    We&apos;re fetching player data from the database. This may take a few seconds.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => matchingQuery.refetch()}
                    disabled={matchingQuery.isFetching}
                    className="w-full"
                  >
                    {matchingQuery.isFetching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      'Retry Search'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

