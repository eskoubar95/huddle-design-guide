/**
 * Service for on-demand backfill of historical player_contracts data
 * Fills in missing jersey_numbers data for clubs/seasons as needed
 * Also creates players if they don't exist in the database
 */

import { TransfermarktService } from './transfermarkt-service';
import { MetadataRepositoryPG } from '@/lib/repositories/metadata-repository-pg';
import { MetadataMatchingService } from './metadata-matching-service';
import { mapCountryToIso2 } from '@/lib/utils/country-mapper';

export interface BackfillOptions {
  clubId: string;
  seasonId?: string; // UUID - optional if seasonLabel provided
  seasonLabel?: string; // E.g. "19/20" - optional if seasonId provided
  playerIds?: string[]; // Optional: specific players to backfill
}

export class MetadataBackfillService {
  private transfermarktService = new TransfermarktService();
  private metadataRepository = new MetadataRepositoryPG();
  private matchingService = new MetadataMatchingService();

  /**
   * Backfill player_contracts for a club/season combination
   * Also creates players if they don't exist in the database
   */
  async backfillClubSeason(options: BackfillOptions): Promise<void> {
    const { clubId, seasonId, seasonLabel, playerIds } = options;

    // 1. Resolve season record
    let season = seasonId
      ? await this.metadataRepository.findSeasonById(seasonId)
      : null;

    if (!season && seasonLabel) {
      season = await this.metadataRepository.findSeasonByTmIdOrLabel('', seasonLabel);
    }

    if (!season) {
      throw new Error(`Season not found: ${seasonId || seasonLabel}`);
    }

    // 2. Get players to backfill
    let playersToBackfill: string[] = playerIds || [];
    let playersData: Array<{
      id: string;
      name: string;
      position?: string;
      dateOfBirth?: string;
      nationality?: string[];
      height?: number;
      foot?: string;
    }> = [];

    if (playersToBackfill.length === 0) {
      // Get all players for this club/season from API
      const playersResult = await this.transfermarktService.getClubPlayers(
        clubId,
        season.tm_season_id
      );
      playersData = playersResult.players;
      playersToBackfill = playersData.map((p) => p.id);
    }

    // 3. Create/update players in database if they don't exist
    for (const playerData of playersData) {
      if (!playerData.name || !playerData.name.trim()) {
        console.warn(`[BACKFILL] Skipping player ${playerData.id} - missing name`);
        continue;
      }

      try {
        const primaryCountryCode = playerData.nationality && playerData.nationality.length > 0
          ? (mapCountryToIso2(playerData.nationality[0]) ?? undefined)
          : undefined;

        // Upsert player (creates if doesn't exist)
        await this.metadataRepository.upsertPlayer({
          id: playerData.id,
          full_name: playerData.name,
          known_as: undefined, // Not available from getClubPlayers
          date_of_birth: playerData.dateOfBirth,
          nationalities: playerData.nationality,
          primary_country_code: primaryCountryCode,
          height_cm: playerData.height,
          preferred_position: playerData.position,
          foot: playerData.foot,
          current_club_id: clubId, // Set current club
          current_shirt_number: undefined, // Will be set from jersey_numbers
          profile_url: undefined,
          image_url: undefined,
        });

        console.log(`[BACKFILL] Upserted player: ${playerData.name} (${playerData.id})`);
      } catch (error) {
        console.error(`[BACKFILL] Error upserting player ${playerData.id}:`, error);
      }
    }

    // 4. For each player, get jersey_numbers and upsert contracts
    for (const playerId of playersToBackfill) {
      try {
        const jerseyNumbersResult = await this.transfermarktService.getPlayerJerseyNumbers(
          playerId
        );

        for (const jerseyData of jerseyNumbersResult.jerseyNumbers) {
          // Map season label to season_id
          const contractSeason = await this.metadataRepository.findSeasonByTmIdOrLabel(
            '', // tm_season_id not available from jersey_numbers API
            jerseyData.season // Use season label (e.g. "19/20")
          );

          if (!contractSeason) {
            console.warn(`[BACKFILL] Season not found: ${jerseyData.season}`);
            continue;
          }

          // Only backfill if club matches
          if (jerseyData.club === clubId) {
            await this.metadataRepository.upsertPlayerContract({
              player_id: playerId,
              club_id: clubId,
              season_id: contractSeason.id,
              jersey_number: jerseyData.jerseyNumber,
              source: 'jersey_numbers',
            });
          }
        }

        console.log(`[BACKFILL] Backfilled contracts for player: ${playerId}`);
      } catch (error) {
        console.error(`[BACKFILL] Error backfilling player ${playerId}:`, error);
      }
    }
  }

  /**
   * Auto-backfill if needed (called before matching)
   * Works with both seasonId (UUID) and seasonLabel
   * Uses Edge Function for better performance and isolation
   */
  async autoBackfillIfNeeded(
    clubId: string,
    seasonId?: string,
    seasonLabel?: string
  ): Promise<void> {
    // Resolve seasonId if only seasonLabel provided
    let resolvedSeasonId = seasonId;
    if (!resolvedSeasonId && seasonLabel) {
      const season = await this.metadataRepository.findSeasonByTmIdOrLabel('', seasonLabel);
      if (!season) {
        // Season doesn't exist - trigger backfill anyway so Edge Function can create it
        console.log(`[BACKFILL] Season not found for label: ${seasonLabel}, triggering backfill to create it`);
        await this.backfillViaEdgeFunction({
          clubId,
          seasonLabel,
        });
        return;
      }
      resolvedSeasonId = season.id;
    }

    if (!resolvedSeasonId && !seasonLabel) {
      console.warn('[BACKFILL] Cannot auto-backfill: seasonId or seasonLabel required');
      return;
    }

    // Check if backfill is needed (only if we have resolvedSeasonId)
    let needsBackfill = true; // Default to true if we can't check
    if (resolvedSeasonId) {
      try {
        needsBackfill = await this.matchingService.needsBackfill(clubId, resolvedSeasonId);
      } catch (error) {
        // If needsBackfill fails (e.g., season doesn't exist), trigger backfill anyway
        console.warn(`[BACKFILL] Error checking if backfill needed:`, error);
        needsBackfill = true;
      }
    }

    if (needsBackfill) {
      console.log(`[BACKFILL] Auto-backfilling ${clubId} / ${resolvedSeasonId || seasonLabel} via Edge Function`);
      
      // Call Edge Function instead of direct backfill
      await this.backfillViaEdgeFunction({
        clubId,
        seasonId: resolvedSeasonId,
        seasonLabel,
      });
    } else {
      console.log(`[BACKFILL] Backfill not needed for ${clubId} / ${resolvedSeasonId || seasonLabel} (sufficient data exists)`);
    }
  }

  /**
   * Call Edge Function for backfill (non-blocking)
   */
  private async backfillViaEdgeFunction(options: {
    clubId: string;
    seasonId?: string;
    seasonLabel?: string;
  }): Promise<void> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
    }

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    }

    // If we have seasonId but no seasonLabel, try to get label as fallback
    let seasonLabel = options.seasonLabel;
    if (options.seasonId && !seasonLabel) {
      try {
        const season = await this.metadataRepository.findSeasonById(options.seasonId);
        if (season) {
          seasonLabel = season.label;
          console.log(`[BACKFILL] Resolved season label: ${seasonLabel} for ID: ${options.seasonId}`);
        }
      } catch (error) {
        console.warn(`[BACKFILL] Could not resolve season label for ID ${options.seasonId}:`, error);
      }
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/backfill-metadata`;

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          clubId: options.clubId,
          seasonId: options.seasonId,
          seasonLabel: seasonLabel, // Always include label as fallback
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BACKFILL] Edge Function failed: ${response.status} ${errorText}`);
        
        // Try to parse error response
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorText;
        } catch {
          // Not JSON, use as-is
        }
        
        // If season not found error, try with only seasonLabel (no seasonId)
        if (errorMessage.includes('Season not found') && options.seasonId && options.seasonLabel) {
          console.log(`[BACKFILL] Retrying with seasonLabel only (no seasonId)...`);
          try {
            const retryResponse = await fetch(edgeFunctionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                clubId: options.clubId,
                seasonLabel: options.seasonLabel, // Only send label, no ID
              }),
            });
            
            if (retryResponse.ok) {
              const retryResult = await retryResponse.json();
              console.log('[BACKFILL] Edge Function completed on retry:', retryResult);
              return; // Success on retry
            } else {
              const retryErrorText = await retryResponse.text();
              console.error(`[BACKFILL] Retry also failed: ${retryResponse.status} ${retryErrorText}`);
            }
          } catch (retryError) {
            console.error('[BACKFILL] Retry error:', retryError);
          }
        }
        
        throw new Error(`Edge Function failed: ${response.status} ${errorMessage}`);
      }

      const result = await response.json();
      console.log('[BACKFILL] Edge Function completed:', result);
    } catch (error) {
      console.error('[BACKFILL] Error calling Edge Function:', error);
      // Don't throw - allow matching to continue even if backfill fails
      // But log the error so we can debug
    }
  }
}

/**
 * Call Edge Function for auto-linking metadata (for automatic/batch processing)
 */
export async function autoLinkMetadataViaEdgeFunction(options: {
  jerseyId: string;
  clubText: string;
  seasonText: string;
  playerNameText?: string;
  playerNumberText?: string;
}): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/auto-link-metadata`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('[AUTO-LINK] Edge Function completed:', result);
  } catch (error) {
    console.error('[AUTO-LINK] Error calling Edge Function:', error);
    throw error; // Re-throw for caller to handle
  }
}

