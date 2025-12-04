/**
 * Service for matching jersey metadata via unified Edge Function
 * Replaces fragmented backfill/matching logic with single synchronous call
 */

interface MatchJerseyMetadataRequest {
  clubText: string;
  seasonText: string;
  playerNameText?: string;
  playerNumberText?: string;
}

interface MatchJerseyMetadataResponse {
  clubId: string | null;
  seasonId: string | null;
  playerId: string | null;
  confidence: {
    club: number;
    season: number;
    player: number;
  };
  matched: {
    club: boolean;
    season: boolean;
    player: boolean;
  };
  metadata?: {
    clubName?: string;
    seasonLabel?: string;
    playerName?: string;
  };
  error?: string;
}

export class MetadataMatchService {
  /**
   * Match jersey metadata from text input
   * Calls unified match-jersey-metadata Edge Function
   * Returns all matched IDs synchronously
   */
  async matchMetadata(
    input: MatchJerseyMetadataRequest
  ): Promise<MatchJerseyMetadataResponse> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
    }

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/match-jersey-metadata`;

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorText;
        } catch {
          // Not JSON, use as-is
        }

        throw new Error(`Edge Function failed: ${response.status} ${errorMessage}`);
      }

      const result: MatchJerseyMetadataResponse = await response.json();
      return result;
    } catch (error) {
      console.error('[MATCH] Error calling match-jersey-metadata Edge Function:', error);
      throw error;
    }
  }
}

/**
 * Convenience function for matching metadata
 */
export async function matchJerseyMetadata(
  input: MatchJerseyMetadataRequest
): Promise<MatchJerseyMetadataResponse> {
  const service = new MetadataMatchService();
  return service.matchMetadata(input);
}

