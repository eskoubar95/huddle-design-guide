// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
/**
 * Match Service
 * 
 * Business logic for matching jersey metadata (clubs, seasons, players)
 * Handles: Database lookup, API fallback, confidence calculation
 */

import { normalizeClubName, generateClubSearchTerms } from '../utils/name-mapper.ts'
import { parseSeasonInput, normalizeSeasonLabel, seasonsMatch, type ParsedSeason } from '../utils/season-parser.ts'
import { mapCountryToIso2 } from '../utils/country-mapper.ts'
import { MetadataRepository } from '../repositories/metadata-repository.ts'
import { TransfermarktClient, type TransfermarktPlayer } from '../repositories/transfermarkt-client.ts'

export interface MatchClubResult {
  club: { id: string; name: string } | null
  confidence: number // 0-100
}

export interface MatchSeasonResult {
  season: { id: string; label: string; tm_season_id: string } | null
  confidence: number // 0-100
}

export interface MatchPlayerResult {
  player: { id: string; full_name: string; jersey_number?: number } | null
  confidence: number // 0-100
  candidates?: Array<{
    playerId: string
    fullName: string
    jerseyNumber?: number
    seasonLabel: string
    confidenceScore: number
  }>
}

export class MatchService {
  constructor(
    private repository: MetadataRepository,
    private transfermarktClient: TransfermarktClient
  ) {}

  /**
   * Match club by text input
   * Strategy: Database lookup → Transfermarkt API fallback
   */
  async matchClub(clubText: string): Promise<MatchClubResult> {
    console.log(`[MATCH-SERVICE] Matching club "${clubText}"`)

    const searchTerms = normalizeClubName(clubText)
    let matchedClub: { id: string; name: string } | null = null

    // Try database lookup first
    for (const term of searchTerms) {
      const dbClub = await this.repository.findClubByName(term)
      if (dbClub) {
        matchedClub = { id: dbClub.id, name: dbClub.name }
        console.log(`[MATCH-SERVICE] Found club in database: ${matchedClub.name} (${matchedClub.id})`)
        break
      }
    }

    // If not found in database, try Transfermarkt API with multiple search terms
    if (!matchedClub) {
      console.log(`[MATCH-SERVICE] Club not found in database, searching Transfermarkt API...`)
      
      // Generate alternative search terms for API
      const apiSearchTerms = generateClubSearchTerms(clubText)
      
      for (const searchTerm of apiSearchTerms) {
        try {
          const clubs = await this.transfermarktClient.searchClubs(searchTerm)
          
          if (clubs.length > 0) {
            const apiClub = clubs[0]
            const isNationalTeam = apiClub.isNationalTeam === true || apiClub.isNationalTeam === 'true'
            const clubType = isNationalTeam ? 'national team' : 'club'
            console.log(`[MATCH-SERVICE] Found ${clubType} in Transfermarkt API: ${apiClub.name} (${apiClub.id}) using search term: "${searchTerm}"`)
            
            // Create club/national team in database
            try {
              // Map country name to ISO-2 code (required for medusa.region_country foreign key)
              const countryCode = apiClub.country ? mapCountryToIso2(apiClub.country) : null
              
              const savedClub = await this.repository.upsertClub({
                id: apiClub.id,
                name: apiClub.name,
                official_name: apiClub.officialName || null,
                slug: apiClub.name.toLowerCase().replace(/\s+/g, '-'),
                country: apiClub.country || null,
                country_code: countryCode || null, // ISO-2 code matching medusa.region_country.iso_2
                crest_url: apiClub.image || null,
                colors: apiClub.colors || null,
                stadium_name: apiClub.stadium?.name || null,
                stadium_seats: apiClub.stadium?.seats || null,
                founded_on: apiClub.foundedOn || null,
                current_market_value: apiClub.marketValue || null,
                external_url: apiClub.url || null,
              })

              matchedClub = { id: savedClub.id, name: savedClub.name }
              console.log(`[MATCH-SERVICE] Created/updated ${clubType} in database: ${matchedClub.name} (${matchedClub.id})`)
              break // Stop trying other terms once we find a match
            } catch (sqlError) {
              console.error(`[MATCH-SERVICE] Error creating ${clubType} in database:`, sqlError)
              // Still use API club even if DB save fails
              matchedClub = { id: apiClub.id, name: apiClub.name }
              break // Stop trying other terms once we find a match
            }
          }
        } catch (apiError) {
          console.warn(`[MATCH-SERVICE] Transfermarkt API search failed for "${searchTerm}":`, apiError)
          // Continue to next search term
        }
      }
      
      if (!matchedClub) {
        console.log(`[MATCH-SERVICE] No clubs/national teams found in Transfermarkt API for: ${clubText} (tried: ${apiSearchTerms.join(', ')})`)
      }
    }

    return {
      club: matchedClub,
      confidence: matchedClub ? 100 : 0,
    }
  }

  /**
   * Match season by text input
   * 
   * Strategy: Parse input → Database lookup → Create if missing
   * 
   * 1. Parses season input (supports "23/24", "2006", "23", etc.)
   * 2. Normalizes season label based on season type
   * 3. Searches database by label or tm_season_id
   * 4. Creates season in database if not found
   * 5. Returns match with confidence score
   * 
   * @param {string} seasonText - Season input (e.g., "23/24", "2006", "22/23")
   * @returns {Promise<MatchSeasonResult>} Match result with season and confidence (0-100)
   * 
   * @example
   * ```typescript
   * const result = await matchService.matchSeason('23/24')
   * // Returns: { season: { id: '...', label: '23/24', tm_season_id: '2023' }, confidence: 100 }
   * 
   * const tournament = await matchService.matchSeason('2006')
   * // Returns: { season: { id: '...', label: '2006', tm_season_id: '2006' }, confidence: 100 }
   * ```
   */
  async matchSeason(seasonText: string): Promise<MatchSeasonResult> {
    console.log(`[MATCH-SERVICE] Matching season "${seasonText}"`)

    // Parse season input
    let parsedSeason: ParsedSeason
    try {
      parsedSeason = parseSeasonInput(seasonText)
      console.log(`[MATCH-SERVICE] Parsed season: label="${parsedSeason.label}", tm_season_id="${parsedSeason.tmSeasonId}", seasonType="${parsedSeason.seasonType}"`)
    } catch (parseError) {
      console.error(`[MATCH-SERVICE] Failed to parse season:`, parseError)
      return {
        season: null,
        confidence: 0,
      }
    }

    // Use normalized label for database lookup
    const normalizedLabel = normalizeSeasonLabel(parsedSeason)
    
    // Try lookup with normalized label first, then original label, then tm_season_id
    let matchedSeason: { id: string; label: string; tm_season_id: string } | null = null

    const dbSeason = await this.repository.findSeasonByLabelOrTmId(normalizedLabel, parsedSeason.tmSeasonId) ||
                     await this.repository.findSeasonByLabelOrTmId(parsedSeason.label, parsedSeason.tmSeasonId)

    if (dbSeason) {
      matchedSeason = { id: dbSeason.id, label: dbSeason.label, tm_season_id: dbSeason.tm_season_id }
      console.log(`[MATCH-SERVICE] Found season in database: ${matchedSeason.label} (${matchedSeason.id})`)
    } else {
      // Create season if not found using repository with normalized label
      console.log(`[MATCH-SERVICE] Season not found in database, creating with normalized label: ${normalizedLabel}...`)
      try {
        const savedSeason = await this.repository.upsertSeason({
          tm_season_id: parsedSeason.tmSeasonId,
          label: normalizedLabel,
          start_year: parsedSeason.startYear,
          end_year: parsedSeason.endYear,
          season_type: parsedSeason.seasonType,
        })

        matchedSeason = { id: savedSeason.id, label: savedSeason.label, tm_season_id: savedSeason.tm_season_id }
        console.log(`[MATCH-SERVICE] Created/updated season in database: ${matchedSeason.label} (${matchedSeason.id})`)
      } catch (seasonError) {
        console.error(`[MATCH-SERVICE] Error creating season:`, seasonError)
        // Try to fetch existing season as fallback
        try {
          const existingSeason = await this.repository.findSeasonByLabelOrTmId(parsedSeason.label, parsedSeason.tmSeasonId)
          if (existingSeason) {
            matchedSeason = { id: existingSeason.id, label: existingSeason.label, tm_season_id: existingSeason.tm_season_id }
            console.log(`[MATCH-SERVICE] Found existing season after error: ${matchedSeason.label} (${matchedSeason.id})`)
          }
        } catch (fetchError) {
          console.error(`[MATCH-SERVICE] Error fetching existing season:`, fetchError)
        }
      }
    }

    return {
      season: matchedSeason,
      confidence: matchedSeason ? 100 : 0,
    }
  }

  /**
   * Match player by club, season, name, and/or jersey number
   * Strategy: API first (most reliable) → Database fallback → Backfill if needed
   */
  async matchPlayer(
    clubId: string,
    seasonId: string,
    seasonLabel: string,
    tmSeasonId: string,
    playerNameText?: string,
    playerNumberText?: string
  ): Promise<MatchPlayerResult> {
    console.log(`[MATCH-SERVICE] Matching player (clubId="${clubId}", seasonId="${seasonId}", name="${playerNameText}", number="${playerNumberText}")`)

    if (!playerNameText && !playerNumberText) {
      return {
        player: null,
        confidence: 0,
        candidates: [],
      }
    }

    let matchedPlayer: { id: string; full_name: string; jersey_number?: number } | null = null
    const candidates: MatchPlayerResult['candidates'] = []

    // Strategy: Prioritize API search over database to ensure we get players from the actual club/season roster
    // STEP 1: Try Transfermarkt API first (most reliable)
    try {
      const players = await this.transfermarktClient.getClubPlayers(clubId, tmSeasonId)
      console.log(`[MATCH-SERVICE] Transfermarkt API returned ${players.length} players for club/season`)

      if (players.length > 0) {
        // Search for player by name or number in club/season roster
        let apiPlayer: TransfermarktPlayer | null = null
        
        if (playerNameText) {
          const searchTerm = playerNameText.toLowerCase().trim()
          const searchWords = searchTerm.split(/\s+/)
          
          // 1. Try exact match
          const exactMatch = players.find(p => p.name.toLowerCase() === searchTerm)
          
          let nameMatches: TransfermarktPlayer[] = []
          
          if (exactMatch) {
            nameMatches = [exactMatch]
          } else {
            // 2. Try contains match
            const containsMatches = players.filter(p => 
              p.name.toLowerCase().includes(searchTerm)
            )
            
            if (containsMatches.length > 0) {
              nameMatches = containsMatches
            } else if (searchWords.length > 1) {
              // 3. Multi-word: try last name match
              const lastName = searchWords[searchWords.length - 1]
              nameMatches = players.filter(p => {
                const playerWords = p.name.toLowerCase().split(/\s+/)
                return playerWords.some(word => word.includes(lastName) || lastName.includes(word))
              })
            } else {
              // 4. Single word: try partial match
              nameMatches = players.filter(p => {
                const playerWords = p.name.toLowerCase().split(/\s+/)
                return playerWords.some(word => word.includes(searchTerm) || searchTerm.includes(word))
              })
            }
          }
          
          if (nameMatches.length > 0) {
            console.log(`[MATCH-SERVICE] Found ${nameMatches.length} name match(es) in club/season roster: ${nameMatches.map(p => p.name).join(', ')}`)
            
            // If jersey number provided, verify it matches
            if (playerNumberText) {
              const jerseyNumber = parseInt(playerNumberText, 10)
              console.log(`[MATCH-SERVICE] Verifying jersey number ${jerseyNumber} for name matches...`)
              
              for (const player of nameMatches) {
                try {
                  const jerseyNumbers = await this.transfermarktClient.getPlayerJerseyNumbers(player.id)

                  const matchingJersey = jerseyNumbers.find(
                    jn => jn.club === clubId && 
                          (seasonsMatch(jn.season, seasonLabel) || seasonsMatch(jn.season, tmSeasonId)) && 
                          jn.jerseyNumber === jerseyNumber
                  )

                  if (matchingJersey) {
                    apiPlayer = player
                    console.log(`[MATCH-SERVICE] Verified jersey number match: ${player.name} (${player.id}) wore #${jerseyNumber} for ${seasonLabel}`)
                    break
                  }
                } catch (jerseyError) {
                  console.warn(`[MATCH-SERVICE] Error fetching jersey numbers for ${player.name}:`, jerseyError)
                }
              }
              
              // If no jersey match but we have name matches, use the first one
              // This handles cases where jersey number verification fails due to season format mismatches
              // but we still have a valid name match in the club/season roster
              if (!apiPlayer && nameMatches.length > 0) {
                apiPlayer = nameMatches[0]
                if (exactMatch) {
                  console.log(`[MATCH-SERVICE] Using exact name match (jersey verification failed): ${apiPlayer.name} (${apiPlayer.id})`)
                } else {
                  console.log(`[MATCH-SERVICE] Using name match (jersey verification failed): ${apiPlayer.name} (${apiPlayer.id})`)
                }
              }
            } else {
              // No jersey number, use first/best match
              apiPlayer = nameMatches[0]
              console.log(`[MATCH-SERVICE] Using first name match: ${apiPlayer.name} (${apiPlayer.id})`)
            }
          }
        }
        
        // If no name match but jersey number provided, try by jersey number only
        if (!apiPlayer && playerNumberText) {
          const jerseyNumber = parseInt(playerNumberText, 10)
          console.log(`[MATCH-SERVICE] No name match, searching by jersey number ${jerseyNumber} in club/season roster...`)
          
          for (const player of players) {
            try {
              const jerseyNumbers = await this.transfermarktClient.getPlayerJerseyNumbers(player.id)

              const matchingJersey = jerseyNumbers.find(
                jn => jn.club === clubId && 
                      (seasonsMatch(jn.season, seasonLabel) || seasonsMatch(jn.season, tmSeasonId)) && 
                      jn.jerseyNumber === jerseyNumber
              )

              if (matchingJersey) {
                apiPlayer = player
                console.log(`[MATCH-SERVICE] Found by jersey number: ${player.name} (${player.id}) wore #${jerseyNumber} for ${seasonLabel}`)
                break
              }
            } catch (jerseyError) {
              // Continue to next player
            }
          }
        }

        // Fallback: If no name match in club/season players, try general player search
        if (!apiPlayer && playerNameText) {
          console.log(`[MATCH-SERVICE] No name match found in club/season players, trying general player search...`)
          
          try {
            const searchPlayers = await this.transfermarktClient.searchPlayers(playerNameText, 1)
            console.log(`[MATCH-SERVICE] Player search returned ${searchPlayers.length} results`)
              
            // Find players that match name and validate against club/season
            const searchTerm = playerNameText.toLowerCase().trim()
            const searchWords = searchTerm.split(/\s+/)
            
            // Try exact match first
            let candidatePlayers = searchPlayers.filter((p: TransfermarktPlayer) => 
              p.name.toLowerCase() === searchTerm
            )
            
            // If no exact match, try contains match
            if (candidatePlayers.length === 0) {
              candidatePlayers = searchPlayers.filter((p: TransfermarktPlayer) => 
                p.name.toLowerCase().includes(searchTerm)
              )
            }
            
            // If still no match, try last name match
            if (candidatePlayers.length === 0 && searchWords.length > 1) {
              const lastName = searchWords[searchWords.length - 1]
              candidatePlayers = searchPlayers.filter((p: TransfermarktPlayer) => {
                const playerWords = p.name.toLowerCase().split(/\s+/)
                return playerWords.some(word => word.includes(lastName) || lastName.includes(word))
              })
            }
            
            console.log(`[MATCH-SERVICE] Found ${candidatePlayers.length} candidate player(s) from general search`)
            
            // Validate candidates against club/season players list
            for (const candidate of candidatePlayers) {
              const isInClubSeason = players.some(p => p.id === candidate.id)
              
              if (isInClubSeason) {
                apiPlayer = candidate
                console.log(`[MATCH-SERVICE] Validated player from general search: ${candidate.name} (${candidate.id}) is in club/season players list`)
                
                // If jersey number provided, verify it
                if (playerNumberText) {
                  const jerseyNumber = parseInt(playerNumberText, 10)
                  try {
                    const jerseyNumbers = await this.transfermarktClient.getPlayerJerseyNumbers(candidate.id)

                    const matchingJersey = jerseyNumbers.find(
                      jn => jn.club === clubId && 
                            (seasonsMatch(jn.season, seasonLabel) || seasonsMatch(jn.season, tmSeasonId)) && 
                            jn.jerseyNumber === jerseyNumber
                    )

                    if (matchingJersey) {
                      console.log(`[MATCH-SERVICE] Verified jersey number match: ${candidate.name} wore #${jerseyNumber} for ${seasonLabel}`)
                      break
                    } else {
                      console.log(`[MATCH-SERVICE] Player ${candidate.name} did not wear #${jerseyNumber} for ${seasonLabel}, continuing search...`)
                      // Continue to next candidate
                    }
                  } catch (jerseyError) {
                    console.warn(`[MATCH-SERVICE] Error verifying jersey number for ${candidate.name}:`, jerseyError)
                    // Use this player anyway since it's validated against club/season list
                    break
                  }
                } else {
                  // No jersey number to verify, use this player
                  break
                }
              }
            }
            
            // If no validated candidate found, log warning
            if (!apiPlayer && candidatePlayers.length > 0) {
              console.warn(`[MATCH-SERVICE] Found ${candidatePlayers.length} candidate(s) in general search but none are in club/season players list`)
            }
          } catch (searchError) {
            console.warn(`[MATCH-SERVICE] General player search failed:`, searchError)
          }
        }
        
        // If found via API, save to database and build result
        if (apiPlayer) {
          console.log(`[MATCH-SERVICE] ✅ Matched player via API: ${apiPlayer.name} (${apiPlayer.id})`)
          
          // Get jersey number for matched player
          let jerseyNum: number | undefined = undefined
          if (playerNumberText) {
            jerseyNum = parseInt(playerNumberText, 10)
          } else {
            // Try to get jersey number from API
            try {
              const jerseyNumbers = await this.transfermarktClient.getPlayerJerseyNumbers(apiPlayer.id)
              const matchingJersey = jerseyNumbers.find(
                jn => jn.club === clubId && 
                      (seasonsMatch(jn.season, seasonLabel) || seasonsMatch(jn.season, tmSeasonId))
              )
              if (matchingJersey) {
                jerseyNum = matchingJersey.jerseyNumber
              }
            } catch (e) {
              // Ignore
            }
          }
          
          // Create player in database
          const primaryCountryCode = apiPlayer.nationality && apiPlayer.nationality.length > 0
            ? mapCountryToIso2(apiPlayer.nationality[0])
            : null

          try {
            const dbPlayer = await this.repository.upsertPlayer({
              id: apiPlayer.id,
              full_name: apiPlayer.name,
              known_as: null,
              date_of_birth: apiPlayer.dateOfBirth || null,
              nationalities: apiPlayer.nationality || null,
              primary_country_code: primaryCountryCode,
              height_cm: apiPlayer.height || null,
              preferred_position: apiPlayer.position || null,
              foot: apiPlayer.foot || null,
              current_club_id: clubId || null,
              current_shirt_number: null,
              profile_url: null,
              image_url: null,
            })

            console.log(`[MATCH-SERVICE] Created/updated player in database: ${dbPlayer.full_name} (${dbPlayer.id})`)
            
            // Create player contract if jersey number provided
            if (jerseyNum && clubId && seasonId) {
              try {
                await this.repository.upsertPlayerContract({
                  player_id: apiPlayer.id,
                  club_id: clubId,
                  season_id: seasonId,
                  jersey_number: jerseyNum,
                  source: 'transfermarkt_api',
                  from_date: null,
                  to_date: null,
                })
                console.log(`[MATCH-SERVICE] Created/updated player contract: ${apiPlayer.name} #${jerseyNum} for ${seasonLabel}`)
              } catch (contractError) {
                console.warn(`[MATCH-SERVICE] Error creating player contract:`, contractError)
              }
            }
            
            // Convert to matchedPlayer format
            matchedPlayer = {
              id: dbPlayer.id,
              full_name: dbPlayer.full_name,
              jersey_number: jerseyNum
            }
            
            // Add to candidates array
            candidates.push({
              playerId: apiPlayer.id,
              fullName: apiPlayer.name,
              jerseyNumber: jerseyNum,
              seasonLabel: seasonLabel,
              confidenceScore: 100
            })
          } catch (dbError) {
            console.error(`[MATCH-SERVICE] Error saving player to database:`, dbError)
            // Still use API player even if DB save fails
            matchedPlayer = {
              id: apiPlayer.id,
              full_name: apiPlayer.name,
              jersey_number: jerseyNum
            }
            candidates.push({
              playerId: apiPlayer.id,
              fullName: apiPlayer.name,
              jerseyNumber: jerseyNum,
              seasonLabel: seasonLabel,
              confidenceScore: 90 // Lower confidence if not saved to DB
            })
          }
        } else {
          console.log(`[MATCH-SERVICE] No player match found in club/season roster, will try database fallback`)
        }
      }
    } catch (apiError) {
      console.warn(`[MATCH-SERVICE] API search failed, falling back to database:`, apiError)
    }

    // STEP 2: Database fallback (only if API didn't find a match)
    // 1. Try database lookup by jersey number (if not already matched)
    if (!matchedPlayer && playerNumberText && clubId && seasonId) {
      const jerseyNumber = parseInt(playerNumberText, 10)
      if (!isNaN(jerseyNumber)) {
        const contract = await this.repository.findContractByJerseyNumber(
          clubId,
          seasonId,
          jerseyNumber
        )

        if (contract) {
          matchedPlayer = {
            id: contract.player_id,
            full_name: contract.full_name,
            jersey_number: contract.jersey_number || undefined,
          }
          console.log(`[MATCH-SERVICE] Found player by jersey number in database: ${matchedPlayer.full_name} (${matchedPlayer.id})`)
          
          // Add to candidates array
          candidates.push({
            playerId: contract.player_id,
            fullName: contract.full_name,
            jerseyNumber: contract.jersey_number || undefined,
            seasonLabel: seasonLabel,
            confidenceScore: 100
          })
        }
      }
    }
    
    // Also fetch all players for this club/season from database to populate candidates array
    if (clubId && seasonId) {
      const allContracts = await this.repository.findContractsByClubSeason(clubId, seasonId)
      
      if (allContracts.length > 0) {
        // Build candidates array from database contracts
        const dbCandidates = allContracts.map(contract => ({
          playerId: contract.player_id,
          fullName: contract.full_name,
          jerseyNumber: contract.jersey_number || undefined,
          seasonLabel: seasonLabel,
          confidenceScore: contract.player_id === matchedPlayer?.id ? 100 : 80
        }))
        
        // Merge with existing candidates array (avoid duplicates)
        const existingIds = new Set(candidates.map(p => p.playerId))
        for (const candidate of dbCandidates) {
          if (!existingIds.has(candidate.playerId)) {
            candidates.push(candidate)
          }
        }
        
        console.log(`[MATCH-SERVICE] Added ${dbCandidates.length} players from database to candidates array`)
      }
    }

    // 2. Try database lookup by name (if still not found)
    if (!matchedPlayer && playerNameText) {
      const dbPlayers = await this.repository.findPlayerByName(playerNameText)

      if (dbPlayers.length > 0) {
        // If we have club/season context, prefer players with contracts for that club/season
        if (clubId && seasonId) {
          const contracts = await this.repository.findContractsByClubSeason(clubId, seasonId)
          const contractPlayerIds = new Set(contracts.map(c => c.player_id))
          
          for (const player of dbPlayers) {
            if (contractPlayerIds.has(player.id)) {
              matchedPlayer = { id: player.id, full_name: player.full_name }
              console.log(`[MATCH-SERVICE] Found player by name with contract: ${matchedPlayer.full_name} (${matchedPlayer.id})`)
              break
            }
          }
        }

        // If no contract match, use first name match
        if (!matchedPlayer && dbPlayers.length > 0) {
          matchedPlayer = { id: dbPlayers[0].id, full_name: dbPlayers[0].full_name }
          console.log(`[MATCH-SERVICE] Found player by name: ${matchedPlayer.full_name} (${matchedPlayer.id})`)
        }
      }
    }

    // Calculate confidence
    let confidence = 0
    if (matchedPlayer) {
      confidence = matchedPlayer.jersey_number ? 100 : 80
    }

    return {
      player: matchedPlayer,
      confidence,
      candidates,
    }
  }
}

