/**
 * Hook for matching jersey metadata
 */

import { useQuery } from '@tanstack/react-query';

interface MatchPlayersParams {
  clubId: string;
  seasonId?: string;
  seasonLabel?: string;
  jerseyNumber?: number; // Optional - if not provided, returns all players for club/season
  playerNameHint?: string;
}

interface MatchPlayerResult {
  playerId: string;
  fullName: string;
  jerseyNumber: number;
  seasonLabel: string;
  confidenceScore: number;
}

export function useMetadataMatching(params: MatchPlayersParams | null) {
  return useQuery<MatchPlayerResult[]>({
    queryKey: ['metadata-match', params],
    queryFn: async () => {
      if (!params) return [];

      const searchParams = new URLSearchParams({
        clubId: params.clubId,
      });

      if (params.jerseyNumber !== undefined && params.jerseyNumber !== null) {
        searchParams.set('jerseyNumber', params.jerseyNumber.toString());
      }
      if (params.seasonId) {
        searchParams.set('seasonId', params.seasonId);
      }
      if (params.seasonLabel) {
        searchParams.set('seasonLabel', params.seasonLabel);
      }
      if (params.playerNameHint) {
        searchParams.set('playerNameHint', params.playerNameHint);
      }

      const response = await fetch(`/api/v1/metadata/match?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to match players');
      }

      const data = await response.json();
      return data.results || [];
    },
    enabled: !!params && !!params.clubId,
  });
}

