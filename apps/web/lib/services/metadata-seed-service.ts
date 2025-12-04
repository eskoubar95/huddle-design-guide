/**
 * Service for seeding initial metadata from Transfermarkt API
 * Seeds competitions, clubs, seasons, and baseline players for Top 5 + Superliga
 * Uses direct PostgreSQL connection to bypass PostgREST cache issues
 */

import { TransfermarktService } from './transfermarkt-service';
import { MetadataRepositoryPG } from '../repositories/metadata-repository-pg';
import { mapCountryToIso2 } from '../utils/country-mapper';

const TARGET_COMPETITIONS = [
  'Premier League',
  'La Liga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
  'Superliga', // Danish Superliga
];

const TARGET_SEASONS = [
  { tm_season_id: '2024', label: '24/25', start_year: 2024, end_year: 2025 },
  { tm_season_id: '2023', label: '23/24', start_year: 2023, end_year: 2024 },
  // Add more seasons as needed
];

export class MetadataSeedService {
  private transfermarktService = new TransfermarktService();
  private metadataRepository = new MetadataRepositoryPG();

  /**
   * Seed all initial metadata
   */
  async seedAll(): Promise<void> {
    console.log('[SEED] Starting metadata seed...');

    // 1. Seed competitions
    await this.seedCompetitions();

    // 2. Seed seasons
    await this.seedSeasons();

    // 3. Seed clubs and club_seasons
    await this.seedClubsAndSeasons();

    // 4. Seed baseline players
    await this.seedBaselinePlayers();

    console.log('[SEED] Metadata seed completed');
  }

  /**
   * Seed competitions
   */
  private async seedCompetitions(): Promise<void> {
    console.log('[SEED] Seeding competitions...');

    for (const compName of TARGET_COMPETITIONS) {
      try {
        const results = await this.transfermarktService.searchCompetitions(compName);
        
        // Check if results is an array and has items
        if (!Array.isArray(results) || results.length === 0) {
          console.warn(`[SEED] No competition found for: ${compName}`);
          continue;
        }

        // Take first result (most relevant)
        const comp = results[0];
        if (!comp || !comp.id) {
          console.warn(`[SEED] Invalid competition data for: ${compName}`, comp);
          continue;
        }

        // Map country name to ISO-2 code
        const countryCode = mapCountryToIso2(comp.country);

            await this.metadataRepository.upsertCompetition({
              id: comp.id,
              name: comp.name,
              country: comp.country || undefined, // Keep for backward compatibility
              country_code: countryCode || undefined, // ISO-2 code from Medusa
              continent: comp.continent || undefined,
              clubs_count: comp.clubs,
              players_count: comp.players,
              total_market_value: comp.totalMarketValue,
              mean_market_value: comp.meanMarketValue,
            });

        console.log(`[SEED] Upserted competition: ${comp.name} (${comp.id})`);
      } catch (error) {
        console.error(`[SEED] Error seeding competition ${compName}:`, error);
        // Log more details for debugging
        if (error instanceof Error) {
          console.error(`[SEED] Error details: ${error.message}`);
        }
      }
    }
  }

  /**
   * Seed seasons
   */
  private async seedSeasons(): Promise<void> {
    console.log('[SEED] Seeding seasons...');

    for (const season of TARGET_SEASONS) {
      try {
        await this.metadataRepository.upsertSeason({
          tm_season_id: season.tm_season_id,
          label: season.label,
          start_year: season.start_year,
          end_year: season.end_year,
        });
        console.log(`[SEED] Upserted season: ${season.label}`);
      } catch (error) {
        console.error(`[SEED] Error seeding season ${season.label}:`, error);
      }
    }
  }

  /**
   * Seed clubs and club_seasons
   */
  private async seedClubsAndSeasons(): Promise<void> {
    console.log('[SEED] Seeding clubs and club_seasons...');

    // Get all competitions we seeded
    const competitions = await this.getSeededCompetitions();

    for (const comp of competitions) {
      for (const season of TARGET_SEASONS) {
        try {
          // Get clubs for this competition and season
          const clubsResult = await this.transfermarktService.getCompetitionClubs(
            comp.id,
            season.tm_season_id
          );

          // Find or create season
          const seasonRecord = await this.metadataRepository.findSeasonByTmIdOrLabel(
            season.tm_season_id,
            season.label
          );

          if (!seasonRecord) {
            console.warn(`[SEED] Season not found: ${season.label}`);
            continue;
          }

          // Upsert each club
          for (const clubData of clubsResult.clubs) {
            // Get full club profile for additional data
            const clubProfile = await this.transfermarktService.getClubProfile(clubData.id);

            // Map country name to ISO-2 code
            const countryCode = mapCountryToIso2(clubProfile.country);

            await this.metadataRepository.upsertClub({
              id: clubData.id,
              name: clubData.name,
              official_name: clubProfile.officialName || undefined,
              slug: this.normalizeSlug(clubData.name),
              country: clubProfile.country || undefined, // Keep for backward compatibility
              country_code: countryCode || undefined, // ISO-2 code from Medusa
              crest_url: clubProfile.image || undefined,
              colors: clubProfile.colors || undefined,
              stadium_name: clubProfile.stadiumName || undefined,
              stadium_seats: clubProfile.stadiumSeats || undefined,
              founded_on: clubProfile.foundedOn || undefined,
              current_market_value: clubProfile.currentMarketValue || undefined,
              external_url: clubProfile.externalUrl || undefined,
            });

            // Create club_season relationship
            await this.metadataRepository.upsertClubSeason({
              competition_id: comp.id,
              season_id: seasonRecord.id,
              club_id: clubData.id,
            });

            console.log(`[SEED] Upserted club: ${clubData.name} (${clubData.id})`);
          }
        } catch (error) {
          console.error(`[SEED] Error seeding clubs for ${comp.name} ${season.label}:`, error);
        }
      }
    }
  }

  /**
   * Seed baseline players
   */
  private async seedBaselinePlayers(): Promise<void> {
    console.log('[SEED] Seeding baseline players...');

    // Get all clubs we seeded
    const clubs = await this.getSeededClubs();

    for (const club of clubs) {
      // Seed players for current season (2024)
      try {
        const playersResult = await this.transfermarktService.getClubPlayers(
          club.id,
          '2024' // Current season
        );

        for (const playerData of playersResult.players) {
          // Skip players without name (required field) - API returns "name" not "fullName"
          if (!playerData.name || !playerData.name.trim()) {
            console.warn(`[SEED] Skipping player ${playerData.id} - missing name`);
            continue;
          }

          // Map primary nationality to ISO-2 code - API returns "nationality" array
          const primaryCountryCode = playerData.nationality && playerData.nationality.length > 0
            ? mapCountryToIso2(playerData.nationality[0])
            : null;

          // Get jersey numbers for this player to find current shirt number and seed contracts
          let currentShirtNumber: number | null = null;
          try {
            const jerseyNumbersResult = await this.transfermarktService.getPlayerJerseyNumbers(playerData.id);
            
            // Find current season's jersey number (use most recent season for current club)
            const currentSeasonJersey = jerseyNumbersResult.jerseyNumbers
              .filter(jn => jn.club === club.id)
              .sort((a, b) => {
                // Sort by season (newest first) - "25/26" > "24/25" > "23/24"
                return b.season.localeCompare(a.season);
              })[0];
            
            if (currentSeasonJersey) {
              currentShirtNumber = currentSeasonJersey.jerseyNumber;
            }

            // Seed player contracts for all jersey numbers
            await this.seedPlayerContracts(playerData.id, jerseyNumbersResult.jerseyNumbers);
          } catch (error) {
            console.warn(`[SEED] Could not fetch jersey numbers for player ${playerData.id}:`, error instanceof Error ? error.message : String(error));
          }

          await this.metadataRepository.upsertPlayer({
            id: playerData.id,
            full_name: playerData.name, // API "name" maps to our "full_name"
            date_of_birth: playerData.dateOfBirth || undefined,
            nationalities: playerData.nationality || undefined, // API "nationality" maps to our "nationalities"
            height_cm: playerData.height || undefined, // API "height" maps to our "height_cm"
            preferred_position: playerData.position || undefined, // API "position" maps to our "preferred_position"
            foot: playerData.foot || undefined,
            current_club_id: club.id, // Set current club from context
            current_shirt_number: currentShirtNumber || undefined, // From jersey_numbers endpoint
          });

          console.log(`[SEED] Upserted player: ${playerData.name} (${playerData.id})${primaryCountryCode ? ` [${primaryCountryCode}]` : ''}${currentShirtNumber ? ` #${currentShirtNumber}` : ''}`);
        }
      } catch (error) {
        console.error(`[SEED] Error seeding players for club ${club.name}:`, error);
      }
    }
  }

  /**
   * Seed player contracts from jersey numbers data
   * Only seeds contracts for clubs that exist in our database
   */
  private async seedPlayerContracts(
    playerId: string,
    jerseyNumbers: Array<{ season: string; club: string; jerseyNumber: number }>
  ): Promise<void> {
    // Get all seeded club IDs to filter
    const seededClubs = await this.getSeededClubs();
    const seededClubIds = new Set(seededClubs.map(c => c.id));

    for (const jn of jerseyNumbers) {
      try {
        // Skip if club doesn't exist in our database
        if (!seededClubIds.has(jn.club)) {
          continue; // Silently skip historical clubs we haven't seeded
        }

        // Find season by label (e.g. "24/25", "25/26")
        let season = await this.metadataRepository.findSeasonByTmIdOrLabel('', jn.season);
        
        if (!season) {
          // Try to create season if it doesn't exist
          // Parse season label (e.g. "24/25" -> start_year: 2024, end_year: 2025)
          const seasonMatch = jn.season.match(/^(\d{2})\/(\d{2})$/);
          if (seasonMatch) {
            const startYear = 2000 + parseInt(seasonMatch[1], 10);
            const endYear = 2000 + parseInt(seasonMatch[2], 10);
            
            season = await this.metadataRepository.upsertSeason({
              tm_season_id: startYear.toString(),
              label: jn.season,
              start_year: startYear,
              end_year: endYear,
            });
          } else {
            // Skip if we can't parse season
            continue;
          }
        }

        // Upsert player contract
        await this.metadataRepository.upsertPlayerContract({
          player_id: playerId,
          club_id: jn.club,
          season_id: season.id,
          jersey_number: jn.jerseyNumber,
          source: 'jersey_numbers',
        });
      } catch (error) {
        // Only log if it's not a foreign key constraint (club doesn't exist)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('foreign key constraint')) {
          console.warn(`[SEED] Error seeding contract for player ${playerId}, club ${jn.club}, season ${jn.season}:`, errorMessage);
        }
      }
    }
  }

  /**
   * Helper: Get seeded competitions
   */
  private async getSeededCompetitions(): Promise<Array<{ id: string; name: string }>> {
    const competitions = await this.metadataRepository.getSeededCompetitions();
    return competitions.map((c) => ({ id: c.id, name: c.name }));
  }

  /**
   * Helper: Get seeded clubs
   */
  private async getSeededClubs(): Promise<Array<{ id: string; name: string }>> {
    const clubs = await this.metadataRepository.getSeededClubs();
    return clubs.map((c) => ({ id: c.id, name: c.name }));
  }

  /**
   * Normalize club name to slug
   */
  private normalizeSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

