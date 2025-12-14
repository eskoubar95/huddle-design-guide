/**
 * Service for matching jersey metadata to players
 * Given club, season, and jersey number, returns candidate players
 * Uses direct PostgreSQL connection for better performance and reliability
 */

import { MetadataRepositoryPG } from '@/lib/repositories/metadata-repository-pg';
import { query } from '@/lib/db/postgres-connection';

export interface MatchPlayerInput {
  clubId: string;
  seasonId?: string; // UUID
  seasonLabel?: string; // E.g. "25/26" - used if seasonId not provided
  jerseyNumber?: number; // Optional - if not provided, returns all players for club/season
  playerNameHint?: string; // Optional hint for fuzzy matching
}

export interface MatchPlayerResult {
  playerId: string;
  fullName: string;
  jerseyNumber: number;
  seasonLabel: string;
  confidenceScore: number; // 0-100
}

export class MetadataMatchingService {
  private metadataRepository = new MetadataRepositoryPG();

  /**
   * Match players based on club, season, and jersey number
   */
  async matchPlayers(input: MatchPlayerInput): Promise<MatchPlayerResult[]> {
    const { clubId, seasonId, seasonLabel, jerseyNumber, playerNameHint } = input;

    // 1. Resolve season_id if only label provided
    let resolvedSeasonId = seasonId;
    if (!resolvedSeasonId && seasonLabel) {
      const season = await this.metadataRepository.findSeasonByTmIdOrLabel(
        '', // tm_season_id not known
        seasonLabel
      );
      if (!season) {
        return []; // No season found
      }
      resolvedSeasonId = season.id;
    }

    if (!resolvedSeasonId) {
      throw new Error('Either seasonId or seasonLabel must be provided');
    }

    // 2. Query player_contracts with joins using direct PostgreSQL
    interface ContractRow {
      jersey_number: number;
      player_id: string;
      season_id: string;
      player_full_name: string;
      season_label: string;
    }

    // If jerseyNumber is provided, filter by it. Otherwise, get all players for club/season
    let contracts: ContractRow[];
    if (jerseyNumber !== undefined && jerseyNumber !== null) {
      contracts = await query<ContractRow>(
        `
        SELECT 
          pc.jersey_number,
          pc.player_id,
          pc.season_id,
          p.full_name as player_full_name,
          s.label as season_label
        FROM metadata.player_contracts pc
        JOIN metadata.players p ON p.id = pc.player_id
        JOIN metadata.seasons s ON s.id = pc.season_id
        WHERE pc.club_id = $1
          AND pc.season_id = $2
          AND pc.jersey_number = $3
        `,
        [clubId, resolvedSeasonId, jerseyNumber]
      );
    } else {
      // Get all unique players for club/season (use DISTINCT to avoid duplicates if player has multiple jersey numbers)
      const allContracts = await query<ContractRow>(
        `
        SELECT 
          pc.jersey_number,
          pc.player_id,
          pc.season_id,
          p.full_name as player_full_name,
          s.label as season_label
        FROM metadata.player_contracts pc
        JOIN metadata.players p ON p.id = pc.player_id
        JOIN metadata.seasons s ON s.id = pc.season_id
        WHERE pc.club_id = $1
          AND pc.season_id = $2
        ORDER BY p.full_name, pc.jersey_number
        `,
        [clubId, resolvedSeasonId]
      );
      
      // Group by player_id to get unique players (take first jersey_number if multiple)
      const playerMap = new Map<string, ContractRow>();
      for (const contract of allContracts) {
        if (!playerMap.has(contract.player_id)) {
          playerMap.set(contract.player_id, contract);
        }
      }
      contracts = Array.from(playerMap.values());
    }

    if (!contracts || contracts.length === 0) {
      return []; // No matches found
    }

    // 3. Map to results and calculate confidence scores
    const results: MatchPlayerResult[] = contracts.map((contract) => {
      // Base confidence: 100 for exact match
      let confidenceScore = 100;

      // Reduce confidence if player name hint doesn't match
      if (playerNameHint && contract.player_full_name) {
        const hintLower = playerNameHint.toLowerCase();
        const nameLower = contract.player_full_name.toLowerCase();

        if (nameLower.includes(hintLower) || hintLower.includes(nameLower)) {
          // Name matches - keep high confidence
        } else {
          // Name doesn't match - reduce confidence
          confidenceScore = 70;
        }
      }

      return {
        playerId: contract.player_id,
        fullName: contract.player_full_name,
        jerseyNumber: contract.jersey_number,
        seasonLabel: contract.season_label,
        confidenceScore,
      };
    });

    // 4. Sort by confidence score (highest first)
    results.sort((a, b) => b.confidenceScore - a.confidenceScore);

    return results;
  }

  /**
   * Check if backfill is needed for a club/season combination
   */
  async needsBackfill(clubId: string, seasonId: string): Promise<boolean> {
    const result = await query<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM metadata.player_contracts
      WHERE club_id = $1 AND season_id = $2
      `,
      [clubId, seasonId]
    );

    const count = parseInt(result[0]?.count || '0', 10);

    // If count is 0 or very low, backfill is needed
    return count < 5; // Threshold: at least 5 contracts expected
  }
}

