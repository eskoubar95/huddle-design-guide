/**
 * Service for automatically linking jersey text fields to metadata
 * Handles fuzzy matching of club names, season labels, and player names
 * Triggers backfill via Edge Function when needed
 */

import { MetadataRepositoryPG } from '@/lib/repositories/metadata-repository-pg';
import { MetadataBackfillService } from './metadata-backfill-service';
import { MetadataMatchingService } from './metadata-matching-service';
import { query } from '@/lib/db/postgres-connection';

export interface AutoLinkInput {
  clubText: string; // User-entered club name (e.g., "FC København")
  seasonText: string; // User-entered season (e.g., "2019/20")
  playerNameText?: string; // Optional player name
  playerNumberText?: string; // Optional player number
}

export interface AutoLinkResult {
  clubId?: string;
  seasonId?: string;
  playerId?: string;
  confidence: number; // 0-100
  matchedClub?: {
    id: string;
    name: string;
  };
  matchedSeason?: {
    id: string;
    label: string;
  };
  matchedPlayers?: Array<{
    id: string;
    fullName: string;
    jerseyNumber: number;
    confidenceScore: number;
  }>;
}

export class MetadataAutoLinkService {
  private metadataRepository = new MetadataRepositoryPG();
  private backfillService = new MetadataBackfillService();
  private matchingService = new MetadataMatchingService();

  /**
   * Automatically link jersey text fields to metadata
   * Handles fuzzy matching and triggers backfill if needed
   */
  async autoLink(input: AutoLinkInput): Promise<AutoLinkResult> {
    const { clubText, seasonText, playerNameText, playerNumberText } = input;

    // 1. Match club name (fuzzy matching)
    const matchedClub = await this.matchClubName(clubText);
    if (!matchedClub) {
      return { confidence: 0 };
    }

    // 2. Match season label
    const matchedSeason = await this.matchSeasonLabel(seasonText);
    if (!matchedSeason) {
      return { confidence: 0, matchedClub };
    }

    // 3. Check if backfill is needed and trigger it
    if (matchedClub && matchedSeason) {
      try {
        await this.backfillService.autoBackfillIfNeeded(
          matchedClub.id,
          matchedSeason.id,
          matchedSeason.label
        );
      } catch (error) {
        console.error('[AUTO-LINK] Backfill failed, continuing:', error);
        // Continue even if backfill fails
      }
    }

    // 4. Match players if player number is provided
    let matchedPlayers: AutoLinkResult['matchedPlayers'] = [];
    if (matchedClub && matchedSeason && playerNumberText) {
      try {
        const jerseyNumber = parseInt(playerNumberText, 10);
        if (!isNaN(jerseyNumber)) {
          const players = await this.matchingService.matchPlayers({
            clubId: matchedClub.id,
            seasonId: matchedSeason.id,
            jerseyNumber,
            playerNameHint: playerNameText,
          });
          matchedPlayers = players.map((p) => ({
            id: p.playerId,
            fullName: p.fullName,
            jerseyNumber: p.jerseyNumber,
            confidenceScore: p.confidenceScore,
          }));
        }
      } catch (error) {
        console.error('[AUTO-LINK] Player matching failed:', error);
      }
    }

    // 5. Calculate overall confidence
    let confidence = 50; // Base confidence
    if (matchedClub) confidence += 25;
    if (matchedSeason) confidence += 15;
    if (matchedPlayers && matchedPlayers.length > 0) {
      confidence += 10;
      // Boost if top match has high confidence
      if (matchedPlayers[0].confidenceScore >= 90) {
        confidence += 10;
      }
    }

    return {
      clubId: matchedClub?.id,
      seasonId: matchedSeason?.id,
      playerId: matchedPlayers && matchedPlayers.length > 0 ? matchedPlayers[0].id : undefined,
      confidence: Math.min(confidence, 100),
      matchedClub,
      matchedSeason,
      matchedPlayers: matchedPlayers.length > 0 ? matchedPlayers : undefined,
    };
  }

  /**
   * Match club name with fuzzy matching
   * Handles Danish/English variations (e.g., "FC København" -> "FC Copenhagen")
   */
  private async matchClubName(clubText: string): Promise<{ id: string; name: string } | null> {
    if (!clubText || !clubText.trim()) {
      return null;
    }

    const normalized = clubText.trim().toLowerCase();

    // Common name mappings (Danish -> English)
    const nameMappings: Record<string, string> = {
      'fc københavn': 'fc copenhagen',
      'københavn': 'copenhagen',
      'brøndby': 'brondby',
      'brøndby if': 'brondby if',
      'aalborg': 'aalborg',
      'aab': 'aalborg',
      'midtjylland': 'fc midtjylland',
      'fc midtjylland': 'fc midtjylland',
      'nordsjælland': 'fc nordsjaelland',
      'fc nordsjælland': 'fc nordsjaelland',
    };

    // Try direct mapping first
    const mappedName = nameMappings[normalized];
    const searchTerms = mappedName ? [mappedName, normalized] : [normalized];

    // Search in database with ILIKE (case-insensitive, supports partial matching)
    // Search both name and official_name to handle local language names
    for (const term of searchTerms) {
      const clubs = await query<{ id: string; name: string }>(
        `
        SELECT id, name
        FROM metadata.clubs
        WHERE LOWER(name) LIKE $1
           OR LOWER(name) LIKE $2
           OR LOWER(official_name) LIKE $1
           OR LOWER(official_name) LIKE $2
        ORDER BY 
          CASE 
            WHEN LOWER(name) = $3 THEN 1
            WHEN LOWER(official_name) = $3 THEN 1
            WHEN LOWER(name) LIKE $4 THEN 2
            WHEN LOWER(official_name) LIKE $4 THEN 2
            ELSE 3
          END
        LIMIT 5
        `,
        [`%${term}%`, `%${term.replace(/^fc /, '')}%`, term, `${term}%`]
      );

      if (clubs && clubs.length > 0) {
        return clubs[0];
      }
    }

    // Fallback: try exact match with different variations
    // Also check official_name for local language names
    const exactMatch = await query<{ id: string; name: string }>(
      `
      SELECT id, name
      FROM metadata.clubs
      WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
         OR LOWER(TRIM(official_name)) = LOWER(TRIM($1))
      LIMIT 1
      `,
      [clubText]
    );

    if (exactMatch && exactMatch.length > 0) {
      return exactMatch[0];
    }

    return null;
  }

  /**
   * Match season label (e.g., "2019/20", "19/20", "2019-2020")
   */
  private async matchSeasonLabel(
    seasonText: string
  ): Promise<{ id: string; label: string } | null> {
    if (!seasonText || !seasonText.trim()) {
      return null;
    }

    const normalized = seasonText.trim();

    // Try to parse different formats
    // Format 1: "2019/20" or "19/20" or "2019/2021" (handle 4-digit end year)
    const slashMatch = normalized.match(/(\d{2,4})\/(\d{2,4})/);
    if (slashMatch) {
      const startYear = parseInt(slashMatch[1], 10);
      const endYearRaw = parseInt(slashMatch[2], 10);
      
      // Handle both 2-digit and 4-digit end years
      const endYear = endYearRaw < 100 ? 2000 + endYearRaw : endYearRaw;
      const fullStartYear = startYear < 100 ? 2000 + startYear : startYear;

      // Convert to 2-digit format for season label (e.g., "19/20")
      const seasonLabel = `${fullStartYear % 100}/${endYear % 100}`;
      const season = await this.metadataRepository.findSeasonByTmIdOrLabel('', seasonLabel);
      if (season) {
        return { id: season.id, label: season.label };
      }
    }

    // Format 2: "2019-2020" or "2019-20"
    const dashMatch = normalized.match(/(\d{4})-(\d{2,4})/);
    if (dashMatch) {
      const startYear = parseInt(dashMatch[1], 10);
      const endYear = parseInt(dashMatch[2], 10);
      const fullEndYear = endYear < 100 ? 2000 + endYear : endYear;

      const season = await this.metadataRepository.findSeasonByTmIdOrLabel('', `${startYear % 100}/${fullEndYear % 100}`);
      if (season) {
        return { id: season.id, label: season.label };
      }
    }

    // Format 3: Direct label match (e.g., "19/20")
    const directMatch = await query<{ id: string; label: string }>(
      `
      SELECT id, label
      FROM metadata.seasons
      WHERE label = $1
      LIMIT 1
      `,
      [normalized]
    );

    if (directMatch && directMatch.length > 0) {
      return directMatch[0];
    }

    // Format 4: Try to match by year range
    const yearMatch = normalized.match(/(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      const season = await this.metadataRepository.findSeasonByTmIdOrLabel('', `${year % 100}/${(year + 1) % 100}`);
      if (season) {
        return { id: season.id, label: season.label };
      }
    }

    return null;
  }
}

