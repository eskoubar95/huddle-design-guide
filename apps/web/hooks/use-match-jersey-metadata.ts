/**
 * Hook for matching jersey metadata via unified Edge Function
 * Replaces fragmented backfill/matching logic with single synchronous call
 */

import { useQuery } from '@tanstack/react-query';

interface MatchJerseyMetadataParams {
  clubText: string;
  seasonText: string;
  playerNameText?: string;
  playerNumberText?: string;
}

interface MatchJerseyMetadataResponse {
  clubId: string | null;
  seasonId: string | null;
  playerId: string | null;
  matched: {
    club: boolean;
    season: boolean;
    player: boolean;
  };
  confidence: {
    club: number;
    season: number;
    player: number;
  };
  players?: Array<{
    playerId: string;
    fullName: string;
    jerseyNumber?: number;
    confidenceScore: number;
  }>;
  metadata?: {
    clubName?: string;
    seasonLabel?: string;
    playerName?: string;
  };
  error?: string;
}

export function useMatchJerseyMetadata(params: MatchJerseyMetadataParams | null) {
  return useQuery<MatchJerseyMetadataResponse>({
    queryKey: ['match-jersey-metadata', params],
    queryFn: async () => {
      if (!params) {
        return {
          clubId: null,
          seasonId: null,
          playerId: null,
          matched: { club: false, season: false, player: false },
          confidence: { club: 0, season: 0, player: 0 },
        };
      }

      const response = await fetch('/api/v1/metadata/match-jersey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to match jersey metadata: ${errorText}`);
      }

      return response.json();
    },
    enabled: !!params && !!params.clubText && !!params.seasonText,
    staleTime: 30000, // Cache for 30 seconds (matching can change as data is backfilled)
  });
}

