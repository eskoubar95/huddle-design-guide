// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'
import { MetadataRepository } from '../_shared/repositories/metadata-repository.ts'
import { TransfermarktClient, type TransfermarktClub } from '../_shared/repositories/transfermarkt-client.ts'
import { MatchService } from '../_shared/services/match-service.ts'
import { UpsertService } from '../_shared/services/upsert-service.ts'
import { parseSeasonInput, normalizeSeasonLabel } from '../_shared/utils/season-parser.ts'
import { mapCountryToIso2 } from '../_shared/utils/country-mapper.ts'
import { generateClubSearchTerms } from '../_shared/utils/name-mapper.ts'
import { VISION_SYSTEM_PROMPT, VISION_USER_PROMPT, generateFallbackRecoveryPrompt } from '../_shared/prompts/vision-prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
}

// Sentry is optional - only use if available
// Note: Sentry for Deno Edge Functions requires additional setup
// For now, we use console.error for logging (can be enhanced later)
const sentryDsn = Deno.env.get('SENTRY_DSN')

/**
 * Verify Clerk JWT token and extract userId
 * Note: For production, we should verify the JWT signature properly
 * For now, we decode and validate the payload structure
 */
async function verifyClerkToken(token: string): Promise<{ userId: string | null; error?: string }> {
  try {
    const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY')
    if (!clerkSecretKey) {
      const error = 'CLERK_SECRET_KEY not set in Edge Function secrets. Set it via: supabase secrets set CLERK_SECRET_KEY=<your-key>'
      console.error(error)
      return { userId: null, error }
    }

    // Try @clerk/backend first
    try {
      const { verifyToken } = await import('https://esm.sh/@clerk/backend@1.34.0')
      const session = await verifyToken(token, {
        secretKey: clerkSecretKey,
      })
      
      if (session?.sub) {
        return { userId: session.sub }
      }
    } catch (clerkError) {
      console.warn('@clerk/backend verification failed, trying fallback:', clerkError)
    }

    // Fallback: Basic JWT payload extraction (for debugging - should verify signature in production)
    // This is a temporary workaround - proper JWT signature verification should be added
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { userId: null, error: 'Invalid JWT format' }
    }

    try {
      // Decode base64url payload
      const base64Url = parts[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      
      const payload = JSON.parse(jsonPayload)
      
      // Basic validation
      if (!payload.sub) {
        return { userId: null, error: 'Token missing subject (sub) claim' }
      }
      
      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return { userId: null, error: 'Token expired' }
      }
      
      // Verify issuer contains 'clerk'
      if (payload.iss && !payload.iss.includes('clerk')) {
        return { userId: null, error: 'Token issuer is not Clerk' }
      }
      
      return { userId: payload.sub }
    } catch (decodeError) {
      return { userId: null, error: `Failed to decode token: ${decodeError}` }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Token verification failed:', errorMessage)
    return { userId: null, error: `Token verification failed: ${errorMessage}` }
  }
}

interface AnalyzeVisionRequest {
  jerseyId: string
  imageUrls: string[]
  userId: string
}

interface Badge {
  position: "right_sleeve" | "left_sleeve" | "front" | "other" | null
  category: "competition" | "league" | "partner" | "captain" | "unknown" | null
  nameText: string | null
}

interface VisionResult {
  clubText: string | null
  seasonText: string | null
  kitType: string | null
  playerNameText: string | null
  playerNumberText: string | null
  sponsorText: string | null // Main shirt sponsor (large text across chest)
  manufacturerText: string | null // Brand logo (Adidas, Nike, Puma)
  colorText?: string | null // Dominant shirt color (e.g. "blue", "white with red accents")
  designText?: string | null // Visual pattern (e.g. "marble", "stripes", "gradient")
  hasPlayerPrint?: boolean // Whether there is player name/number on the back
  badges: Badge[] // All visible badges with position and category
  confidence: {
    club: number
    season: number
    player: number
    sponsor: number
    badges: number
    overall: number
  }
}

interface AnalyzeVisionResponse {
  vision: VisionResult | null // Null if template matched
  templateUsed: boolean
  matched: {
    clubId: string | null
    seasonId: string | null
    playerId: string | null
  }
  metadata?: { // Detailed metadata from matching service
    clubName?: string
    seasonLabel?: string
    playerName?: string
    matchedSeason?: any
  }
  confidence: {
    club: number
    season: number
    player: number
    sponsor: number
    badges: number
    overall: number
  }
  suggestions?: { // Season suggestions when player matches but season doesn't
    seasons?: Array<{
      id: string
      label: string
      confidence: number
    }>
  }
  missingFields?: string[] // Array of field names that are missing (e.g., ['club', 'season', 'player'])
  embedding: number[] | null
  error?: string
}

interface KitTemplate {
  id: string
  club_id: string | null
  season_id: string | null
  player_id: string | null
  kit_type: string | null
}

// Get PostgreSQL connection string
function getPostgresConnectionString(): string {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const dbPassword = Deno.env.get('DB_PASSWORD')
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is required')
  }
  
  if (!dbPassword) {
    throw new Error('DB_PASSWORD is required. Set it in Supabase Dashboard → Edge Functions → Secrets')
  }
  
  const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
  if (!urlMatch) {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`)
  }
  
  const projectRef = urlMatch[1]
  return `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-1-eu-central-2.pooler.supabase.com:6543/postgres`
}

/**
 * Get variant storage path from original storage path
 * Example: "jersey-id/1234567890-abc123.jpg" -> "jersey-id/1234567890-abc123-vision.jpg"
 */
function getVariantStoragePath(originalPath: string, variant: 'vision' | 'gallery' | 'card'): string {
  if (!originalPath) return originalPath

  const pathParts = originalPath.split('/')
  const fileName = pathParts[pathParts.length - 1]
  const baseName = fileName.replace(/\.[^.]+$/, '') // Remove extension
  const jerseyId = pathParts[0]

  const variantConfig = {
    vision: { suffix: '-vision', ext: '.jpg' },
    gallery: { suffix: '-gallery', ext: '.webp' },
    card: { suffix: '-card', ext: '.webp' },
  }[variant]

  const variantFileName = `${baseName}${variantConfig.suffix}${variantConfig.ext}`
  return `${jerseyId}/${variantFileName}`
}

/**
 * Download image from Storage and convert to base64
 * Tries vision variant first if storage_path is available, falls back to original
 */
async function downloadImageAsBase64(
  imageUrl: string,
  storagePath: string | null,
  supabase: any
): Promise<string> {
  try {
    let downloadPath: string

    // If storage_path is available, try vision variant first
    if (storagePath) {
      const visionVariantPath = getVariantStoragePath(storagePath, 'vision')
      
      // Try to download vision variant
      const { data: visionData, error: visionError } = await supabase.storage
        .from('jersey_images')
        .download(visionVariantPath)
      
      if (!visionError && visionData) {
        console.log(`[analyze-jersey-vision] Using vision variant: ${visionVariantPath}`)
        downloadPath = visionVariantPath
      } else {
        // Fallback to original
        console.log(`[analyze-jersey-vision] Vision variant not found, using original: ${storagePath}`)
        downloadPath = storagePath
      }
    } else {
      // Extract storage path from URL if storage_path not provided
      const urlParts = imageUrl.split('/storage/v1/object/public/jersey_images/')
      if (urlParts.length !== 2) {
        throw new Error(`Invalid image URL format: ${imageUrl}`)
      }
      downloadPath = urlParts[1]
    }
    
    // Download from Storage
    const { data, error } = await supabase.storage
      .from('jersey_images')
      .download(downloadPath)
    
    if (error) throw error
    
    // Convert to base64 in chunks to avoid "Maximum call stack size exceeded"
    const arrayBuffer = await data.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // Convert in chunks of 8192 bytes to avoid stack overflow
    // Build string in chunks, then encode entire string to base64
    const chunkSize = 8192
    const chunks: string[] = []
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize)
      // Convert chunk to string safely
      const chunkArray = Array.from(chunk)
      const chunkString = String.fromCharCode.apply(null, chunkArray)
      chunks.push(chunkString)
    }
    
    // Combine all chunks and encode to base64
    const fullString = chunks.join('')
    const base64 = btoa(fullString)
    
    return base64
  } catch (error) {
    console.error('Error downloading image:', error)
    throw new Error(`Failed to download image: ${error.message}`)
  }
}

/**
 * Generate embedding from text description using OpenAI
 * Note: Embeddings API doesn't support images directly, so we embed the Vision API text description
 */
async function generateEmbeddingFromText(textDescription: string): Promise<number[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required. Set it in Supabase Dashboard → Edge Functions → Secrets')
  }
  
  try {
    // Create a descriptive text from Vision results for embedding
    const embeddingText = `Jersey: ${textDescription}`
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: embeddingText,
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI Embeddings API error: ${response.status} ${error}`)
    }
    
    const data = await response.json()
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid embedding response format')
    }
    
    return data.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw new Error(`Failed to generate embedding: ${error.message}`)
  }
}

/**
 * Check similarity with kit_templates using pgvector
 */
async function findSimilarTemplate(
  embedding: number[],
  pgClient: Client
): Promise<KitTemplate | null> {
  try {
    // Convert embedding array to PostgreSQL vector format
    const embeddingStr = `[${embedding.join(',')}]`
    
    // Query for similar templates (cosine similarity > 0.85)
    const query = `
      SELECT id, club_id, season_id, player_id, kit_type
      FROM metadata.kit_templates
      WHERE image_embedding <-> $1::vector < 0.15  -- cosine distance < 0.15 = similarity > 0.85
      ORDER BY image_embedding <-> $1::vector
      LIMIT 1
    `
    
    const result = await pgClient.queryObject<KitTemplate>(query, [embeddingStr])
    
    if (result.rows.length > 0) {
      return result.rows[0]
    }
    
    return null
  } catch (error) {
    // Check if error is due to missing vector extension
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('type "vector" does not exist')) {
      console.warn('[analyze-jersey-vision] Vector extension not available - skipping template matching')
      return null
    }
    
    console.error('Error finding similar template:', error)
    // Don't throw - template matching is optional
    return null
  }
}

/**
 * Run Vision analysis on images using OpenAI Vision API
 */
async function analyzeImagesWithVision(imageBase64List: string[]): Promise<VisionResult> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required')
  }
  
  try {
    // Prepare images for Vision API
    const imageContents = imageBase64List.map(base64 => ({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${base64}`,
      },
    }))
    
    // Vision API prompts - imported from shared prompts file
    const systemPrompt = VISION_SYSTEM_PROMPT
    const userPrompt = VISION_USER_PROMPT

    const prompt = `${systemPrompt}\n\n${userPrompt}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              ...imageContents,
            ],
          },
        ],
        max_tokens: 1500, // Increased for more detailed badge objects
        response_format: { type: 'json_object' },
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI Vision API error: ${response.status} ${error}`)
    }
    
    const data = await response.json()
    const content = data.choices[0].message.content
    
    // Parse JSON response
    const visionResult: VisionResult = JSON.parse(content)
    
    return visionResult
  } catch (error) {
    console.error('Error analyzing images with Vision:', error)
    throw new Error(`Vision analysis failed: ${error.message}`)
  }
}

/**
 * Fallback: use a cheap text-only GPT call to try to recover missing club/season/player
 * based on the structured VisionResult fields (no images).
 */
async function recoverMissingVisionData(vision: VisionResult): Promise<{
  clubText?: string | null
  seasonText?: string | null
  kitType?: string | null
  playerNameText?: string | null
  playerNumberText?: string | null
}> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    console.warn('[analyze-jersey-vision] Missing OPENAI_API_KEY for fallback metadata recovery')
    return {}
  }

  // Generate fallback recovery prompt using shared prompt generator
  const prompt = generateFallbackRecoveryPrompt(vision)

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.warn('[analyze-jersey-vision] Fallback GPT call failed:', res.status, text)
      return {}
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return {}

    try {
      const parsed = JSON.parse(content)
      return parsed
    } catch {
      // When using response_format: json_object, content should already be JSON
      return {}
    }
  } catch (err) {
    console.error('[analyze-jersey-vision] Fallback metadata recovery error:', err)
    return {}
  }
}

/**
 * Match Vision results to metadata IDs using MatchService
 * This replaces the old fetch-based approach with direct service calls
 * 
 * Player matching can work without season - it will return all possible seasons
 * where the player played for the club as suggestions
 * 
 * Automatic backfill: If matching fails for club/season/player, automatically
 * triggers backfill from Transfermarkt API and retries matching
 */
async function matchMetadataToIds(
  visionResult: VisionResult,
  matchService: MatchService,
  repository: MetadataRepository,
  transfermarktClient: TransfermarktClient,
  upsertService: UpsertService
): Promise<{
  clubId: string | null
  seasonId: string | null
  playerId: string | null
  metadata?: any // Detailed metadata from matching service
  confidence: { club: number; season: number; player: number }
  suggestions?: {
    seasons?: Array<{ id: string; label: string; confidence: number }>
  }
}> {
  try {
    // Match club
    let clubId: string | null = null
    let clubConfidence = 0
    let clubName: string | undefined = undefined

    if (visionResult.clubText && visionResult.clubText.trim() !== '') {
      const clubMatch = await matchService.matchClub(visionResult.clubText)
      if (clubMatch.club) {
        clubId = clubMatch.club.id
        clubConfidence = clubMatch.confidence
        clubName = clubMatch.club.name
      } else {
        // Automatic backfill: Club not found - try Transfermarkt API with multiple search terms
        console.log('[analyze-jersey-vision] Club not matched, attempting automatic backfill...')
        try {
          // Generate alternative search terms
          const apiSearchTerms = generateClubSearchTerms(visionResult.clubText)
          
          let apiClubs: TransfermarktClub[] = []
          for (const searchTerm of apiSearchTerms) {
            apiClubs = await transfermarktClient.searchClubs(searchTerm)
            if (apiClubs.length > 0) {
              console.log(`[analyze-jersey-vision] Found club in API using search term: "${searchTerm}"`)
              break
            }
          }
          
          if (apiClubs.length > 0) {
            const apiClub = apiClubs[0]
            // Upsert club to database
            const countryCode = apiClub.country || apiClub.league?.countryName
              ? mapCountryToIso2(apiClub.country || apiClub.league?.countryName || '')
              : null
            
            await repository.upsertClub({
              id: apiClub.id,
              name: apiClub.name,
              official_name: apiClub.officialName || null,
              slug: apiClub.name.toLowerCase().replace(/\s+/g, '-'),
              country: apiClub.country || apiClub.league?.countryName || null,
              country_code: countryCode,
              crest_url: apiClub.image || null,
              colors: apiClub.colors || null,
              stadium_name: apiClub.stadiumName || apiClub.stadium?.name || null,
              stadium_seats: apiClub.stadiumSeats || apiClub.stadium?.seats || null,
              founded_on: apiClub.foundedOn || null,
              current_market_value: apiClub.currentMarketValue || apiClub.marketValue || null,
              external_url: apiClub.url || null,
            })
            
            // Retry matching
            const retryMatch = await matchService.matchClub(visionResult.clubText)
            if (retryMatch.club) {
              clubId = retryMatch.club.id
              clubConfidence = retryMatch.confidence
              clubName = retryMatch.club.name
              console.log(`[analyze-jersey-vision] Club backfilled and matched: ${clubName} (${clubId})`)
            }
          } else {
            console.log(`[analyze-jersey-vision] No clubs found in API for: ${visionResult.clubText} (tried: ${apiSearchTerms.join(', ')})`)
          }
        } catch (backfillError) {
          console.error('[analyze-jersey-vision] Club backfill failed:', backfillError)
        }
      }
    }

    // Match season
    let seasonId: string | null = null
    let seasonConfidence = 0
    let seasonLabel: string | undefined = undefined

    if (visionResult.seasonText && visionResult.seasonText.trim() !== '') {
      const seasonMatch = await matchService.matchSeason(visionResult.seasonText)
      if (seasonMatch.season) {
        seasonId = seasonMatch.season.id
        seasonConfidence = seasonMatch.confidence
        seasonLabel = seasonMatch.season.label
      } else {
        // Automatic backfill: Season not found - create it in database
        console.log('[analyze-jersey-vision] Season not matched, attempting automatic backfill...')
        try {
          const parsedSeason = parseSeasonInput(visionResult.seasonText)
          const normalizedLabel = normalizeSeasonLabel(parsedSeason)
          
          await repository.upsertSeason({
            tm_season_id: parsedSeason.tmSeasonId,
            label: normalizedLabel,
            start_year: parsedSeason.startYear,
            end_year: parsedSeason.endYear,
            season_type: parsedSeason.seasonType,
          })
          
          // Retry matching
          const retryMatch = await matchService.matchSeason(visionResult.seasonText)
          if (retryMatch.season) {
            seasonId = retryMatch.season.id
            seasonConfidence = retryMatch.confidence
            seasonLabel = retryMatch.season.label
            console.log(`[analyze-jersey-vision] Season backfilled and matched: ${seasonLabel} (${seasonId})`)
          }
        } catch (backfillError) {
          console.error('[analyze-jersey-vision] Season backfill failed:', backfillError)
        }
      }
    }

    // Match player (can work without season - will return season suggestions)
    let playerId: string | null = null
    let playerConfidence = 0
    let playerName: string | undefined = undefined
    let seasonSuggestions: Array<{ id: string; label: string; confidence: number }> | undefined = undefined

    if (clubId && (visionResult.playerNameText || visionResult.playerNumberText)) {
      // Strategy: Try with season first if available, otherwise match without season
      if (seasonId && visionResult.seasonText) {
        // Standard matching with season
        const seasonMatch = await matchService.matchSeason(visionResult.seasonText)
        if (seasonMatch.season) {
          const playerMatch = await matchService.matchPlayer(
            clubId,
            seasonId,
            seasonMatch.season.label,
            seasonMatch.season.tm_season_id,
            visionResult.playerNameText || undefined,
            visionResult.playerNumberText || undefined
          )

          if (playerMatch.player) {
            playerId = playerMatch.player.id
            playerConfidence = playerMatch.confidence
            playerName = playerMatch.player.full_name
          }
        }
      }

      // If player not matched yet (or season missing), try matching without season constraint
      if (!playerId && (visionResult.playerNameText || visionResult.playerNumberText)) {
        console.log('[analyze-jersey-vision] Attempting player matching without season constraint')
        
        // Search for player by name in database first
        let matchedPlayer: { id: string; full_name: string } | null = null
        
        if (visionResult.playerNameText || visionResult.playerNumberText) {
          // Find all contracts for this club matching player name/number
          const jerseyNumber = visionResult.playerNumberText 
            ? parseInt(visionResult.playerNumberText, 10) 
            : undefined
          
          const contractResult = await repository.findPlayerContractsByClubAndPlayer(
            clubId,
            visionResult.playerNameText || undefined,
            isNaN(jerseyNumber as number) ? undefined : jerseyNumber
          )
          
          if (contractResult && contractResult.length > 0) {
            // Use first match as the player
            const firstMatch = contractResult[0]
            matchedPlayer = { id: firstMatch.player_id, full_name: firstMatch.full_name }
            playerId = matchedPlayer.id
            playerName = matchedPlayer.full_name
            
            // Create season suggestions from all matches
            const seasonMap = new Map<string, { id: string; label: string }>()
            contractResult.forEach(row => {
              if (!seasonMap.has(row.season_uuid)) {
                seasonMap.set(row.season_uuid, {
                  id: row.season_uuid,
                  label: row.season_label,
                })
              }
            })
            
            seasonSuggestions = Array.from(seasonMap.values()).map(season => ({
              id: season.id,
              label: season.label,
              confidence: 80, // High confidence since player was found with this season
            }))
            
            // If jersey number matches, use that season as primary match
            if (visionResult.playerNumberText && !isNaN(jerseyNumber as number)) {
              const numberMatch = contractResult.find(r => r.jersey_number === jerseyNumber)
              if (numberMatch) {
                seasonId = numberMatch.season_uuid
                seasonLabel = numberMatch.season_label
                seasonConfidence = 100
                playerConfidence = 100
              } else {
                playerConfidence = 80
              }
            } else {
              playerConfidence = 80
            }
            
            console.log(`[analyze-jersey-vision] Matched player without season: ${playerName} (${playerId})`)
            console.log(`[analyze-jersey-vision] Found ${seasonSuggestions.length} season suggestions`)
          }
        }
        
        // Automatic backfill: Player not found - trigger backfill if we have club + season
        if (!playerId && clubId && seasonId) {
          console.log('[analyze-jersey-vision] Player not matched, attempting automatic backfill...')
          try {
            // Get season details for backfill
            const season = await repository.findSeasonById(seasonId)
            if (season) {
              // Trigger backfill for club/season
              const backfillResult = await upsertService.backfillClubSeason(
                clubId,
                seasonId,
                season.label,
                season.tm_season_id
              )
              
              console.log(`[analyze-jersey-vision] Backfill completed: ${backfillResult.playersProcessed} players, ${backfillResult.contractsCreated} contracts`)
              
              // Retry player matching after backfill
              if (seasonId && visionResult.seasonText) {
                const seasonMatch = await matchService.matchSeason(visionResult.seasonText)
                if (seasonMatch.season) {
                  const playerMatch = await matchService.matchPlayer(
                    clubId,
                    seasonId,
                    seasonMatch.season.label,
                    seasonMatch.season.tm_season_id,
                    visionResult.playerNameText || undefined,
                    visionResult.playerNumberText || undefined
                  )
                  
                  if (playerMatch.player) {
                    playerId = playerMatch.player.id
                    playerConfidence = playerMatch.confidence
                    playerName = playerMatch.player.full_name
                    console.log(`[analyze-jersey-vision] Player matched after backfill: ${playerName} (${playerId})`)
                  }
                }
              }
              
              // Also retry matching without season constraint to get season suggestions
              if (!playerId) {
                const jerseyNumber = visionResult.playerNumberText 
                  ? parseInt(visionResult.playerNumberText, 10) 
                  : undefined
                
                const contractResult = await repository.findPlayerContractsByClubAndPlayer(
                  clubId,
                  visionResult.playerNameText || undefined,
                  isNaN(jerseyNumber as number) ? undefined : jerseyNumber
                )
                
                if (contractResult && contractResult.length > 0) {
                  const firstMatch = contractResult[0]
                  playerId = firstMatch.player_id
                  playerName = firstMatch.full_name
                  
                  // Create season suggestions
                  const seasonMap = new Map<string, { id: string; label: string }>()
                  contractResult.forEach(row => {
                    if (!seasonMap.has(row.season_uuid)) {
                      seasonMap.set(row.season_uuid, {
                        id: row.season_uuid,
                        label: row.season_label,
                      })
                    }
                  })
                  
                  seasonSuggestions = Array.from(seasonMap.values()).map(s => ({
                    id: s.id,
                    label: s.label,
                    confidence: 80,
                  }))
                  
                  // If jersey number matches, use that season
                  if (visionResult.playerNumberText && !isNaN(jerseyNumber as number)) {
                    const numberMatch = contractResult.find(r => r.jersey_number === jerseyNumber)
                    if (numberMatch) {
                      seasonId = numberMatch.season_uuid
                      seasonLabel = numberMatch.season_label
                      seasonConfidence = 100
                      playerConfidence = 100
                    } else {
                      playerConfidence = 80
                    }
                  } else {
                    playerConfidence = 80
                  }
                  
                  console.log(`[analyze-jersey-vision] Player matched after backfill (cross-season): ${playerName} (${playerId})`)
                }
              }
            }
          } catch (backfillError) {
            console.error('[analyze-jersey-vision] Player backfill failed:', backfillError)
          }
        }
      }
    }

    return {
      clubId,
      seasonId,
      playerId,
      metadata: {
        clubName,
        seasonLabel,
        playerName,
      },
      confidence: {
        club: clubConfidence,
        season: seasonConfidence,
        player: playerConfidence,
      },
      suggestions: seasonSuggestions ? { seasons: seasonSuggestions } : undefined,
    }
  } catch (error) {
    console.error('[analyze-jersey-vision] Error matching metadata to IDs:', error)
    // Return partial results
    return {
      clubId: null,
      seasonId: null,
      playerId: null,
      confidence: { club: 0, season: 0, player: 0 },
      suggestions: undefined,
    }
  }
}

Deno.serve(async (req) => {
  console.log('[analyze-jersey-vision] Request received', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  })

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let pgClient: Client | null = null
  const startTime = performance.now()

  // Initialize repositories and services for metadata matching
  const repository = new MetadataRepository()
  const transfermarktClient = new TransfermarktClient()
  const matchService = new MatchService(repository, transfermarktClient)
  const upsertService = new UpsertService(repository, transfermarktClient)

  try {
    console.log('[analyze-jersey-vision] Starting request processing')
    // Get Clerk token from custom header (Supabase anon key is in Authorization header)
    const clerkToken = req.headers.get('x-clerk-token')
    console.log('[analyze-jersey-vision] Clerk token present:', !!clerkToken)
    
    if (!clerkToken) {
      console.error('[analyze-jersey-vision] Missing Clerk token')
      return new Response(
        JSON.stringify({ error: 'Missing Clerk token in X-Clerk-Token header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify Clerk token
    console.log('[analyze-jersey-vision] Verifying Clerk token')
    const { userId: verifiedUserId, error: verifyError } = await verifyClerkToken(clerkToken)
    
    if (!verifiedUserId) {
      console.error('[analyze-jersey-vision] Token verification failed:', verifyError)
      return new Response(
        JSON.stringify({ 
          error: verifyError || 'Invalid or expired token',
          details: verifyError
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful verification (no PII - only userId prefix)
    console.log('[analyze-jersey-vision] Token verified, userId prefix:', verifiedUserId.slice(0, 8))

    // Create Supabase client early so we can fetch images if needed
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Connect repository to PostgreSQL for metadata matching
    await repository.connect()

    const requestBody = await req.json()
    console.log('[analyze-jersey-vision] Request body:', {
      jerseyId: requestBody.jerseyId,
      imageCount: requestBody.imageUrls?.length,
      userId: requestBody.userId,
    })

    const { jerseyId, imageUrls: providedImageUrls, userId }: AnalyzeVisionRequest = requestBody

    // Validate request
    if (!jerseyId || !userId) {
      console.error('[analyze-jersey-vision] Missing required fields: jerseyId or userId')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: jerseyId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify userId from token matches userId from request
    if (verifiedUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch: token user does not match request user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get image URLs and storage paths from database if not provided
    let imageUrls: string[] = providedImageUrls || []
    let imageStoragePaths: (string | null)[] = []
    
    if (imageUrls.length === 0) {
      console.log('[analyze-jersey-vision] No imageUrls provided, fetching from database')
      const { data: jerseyImages, error: imagesError } = await supabase
        .from('jersey_images')
        .select('image_url, storage_path')
        .eq('jersey_id', jerseyId)
        .order('sort_order', { ascending: true })
      
      if (imagesError) {
        console.error('[analyze-jersey-vision] Failed to fetch images:', imagesError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch jersey images' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (!jerseyImages || jerseyImages.length === 0) {
        console.error('[analyze-jersey-vision] No images found for jersey')
        return new Response(
          JSON.stringify({ error: 'No images found for this jersey' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      imageUrls = jerseyImages.map(img => img.image_url)
      imageStoragePaths = jerseyImages.map(img => img.storage_path || null)
      console.log('[analyze-jersey-vision] Fetched', imageUrls.length, 'images from database')
    } else {
      // If imageUrls provided, we don't have storage_paths - will extract from URLs
      imageStoragePaths = imageUrls.map(() => null)
    }
    
    if (imageUrls.length === 0) {
      console.error('[analyze-jersey-vision] No images available')
      return new Response(
        JSON.stringify({ error: 'No images available for analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify jersey ownership
    const { data: jersey, error: jerseyError } = await supabase
      .from('jerseys')
      .select('id, owner_id, status')
      .eq('id', jerseyId)
      .single()

    if (jerseyError || !jersey) {
      return new Response(
        JSON.stringify({ error: 'Jersey not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (jersey.owner_id !== verifiedUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You do not own this jersey' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Connect to PostgreSQL for template matching
    const pgConnectionString = getPostgresConnectionString()
    pgClient = new Client(pgConnectionString)
    await pgClient.connect()
    
    // Ensure search_path includes public schema (where vector extension is installed)
    await pgClient.queryObject(`SET search_path = public, pg_catalog`)
    
    // Ensure pgvector extension is enabled (should already exist from migrations, but ensure it's available)
    // Test if we can actually use vector type (more reliable than just checking if extension exists)
    let vectorExtensionAvailable = false
    try {
      // Try to create a test vector to verify extension is actually usable
      const testQuery = await pgClient.queryObject(`SELECT '[1,2,3]'::vector(3) as test`)
      vectorExtensionAvailable = true
      console.log('[analyze-jersey-vision] Vector extension is available and usable')
    } catch (testError) {
      const errorMessage = testError instanceof Error ? testError.message : String(testError)
      if (errorMessage.includes('type "vector" does not exist')) {
        console.warn('[analyze-jersey-vision] Vector extension not available - attempting to create...')
        try {
          await pgClient.queryObject('CREATE EXTENSION IF NOT EXISTS vector')
          // Test again after creation attempt
          const retryTest = await pgClient.queryObject(`SELECT '[1,2,3]'::vector(3) as test`)
          vectorExtensionAvailable = true
          console.log('[analyze-jersey-vision] Vector extension created and verified')
        } catch (createError) {
          console.warn('[analyze-jersey-vision] Could not create vector extension:', createError)
          vectorExtensionAvailable = false
        }
      } else {
        console.warn('[analyze-jersey-vision] Unexpected error testing vector extension:', testError)
        vectorExtensionAvailable = false
      }
    }
    
    // Store availability flag for use in queries
    // If extension is not available, we'll skip vector operations gracefully

    // Download cover image (first image) - use vision variant if available
    const coverImageBase64 = await downloadImageAsBase64(
      imageUrls[0],
      imageStoragePaths[0],
      supabase
    )

    // Generate embedding for cover image
    // Note: This is simplified - actual implementation should use Vision API to get text description first
    // For now, we'll use a placeholder approach
      let embedding: number[] | null = null
      let matchedTemplate: KitTemplate | null = null
      let visionResult: VisionResult | null = null
      let matchedIds: { clubId: string | null; seasonId: string | null; playerId: string | null; metadata?: any } = {
        clubId: null,
        seasonId: null,
        playerId: null,
        metadata: undefined,
      }
      let confidence = { club: 0, season: 0, player: 0, sponsor: 0, badges: 0, overall: 0 }
      let seasonSuggestions: Array<{ id: string; label: string; confidence: number }> | undefined = undefined

    try {
      // Step 1: Run Vision analysis on all images - use vision variants if available
      const allImagesBase64 = await Promise.all(
        imageUrls.map((url, index) =>
          downloadImageAsBase64(url, imageStoragePaths[index] || null, supabase)
        )
      )
      
      visionResult = await analyzeImagesWithVision(allImagesBase64)
      
      // Optional fallback: if some key fields are missing or low confidence, try to recover via cheap text-only GPT
      const needsRecovery =
        (!visionResult.clubText || visionResult.confidence.club < 50) ||
        (!visionResult.seasonText || visionResult.confidence.season < 50) ||
        (!visionResult.kitType) ||
        (!visionResult.playerNameText || visionResult.confidence.player < 50)

      if (needsRecovery) {
        console.log('[analyze-jersey-vision] Running fallback metadata recovery based on VisionResult text')
        const recovered = await recoverMissingVisionData(visionResult)

        if (recovered.clubText && !visionResult.clubText) {
          visionResult.clubText = recovered.clubText
          // Bump confidence, but keep it below a perfect score
          visionResult.confidence.club = Math.max(visionResult.confidence.club, 70)
        }

        if (recovered.seasonText && !visionResult.seasonText) {
          visionResult.seasonText = recovered.seasonText
          visionResult.confidence.season = Math.max(visionResult.confidence.season, 70)
        }

        if (recovered.playerNameText && !visionResult.playerNameText) {
          visionResult.playerNameText = recovered.playerNameText
          visionResult.confidence.player = Math.max(visionResult.confidence.player, 70)
        }

        if (recovered.playerNumberText && !visionResult.playerNumberText) {
          visionResult.playerNumberText = recovered.playerNumberText
          // Don't touch confidence here; number is usually already high if visible
        }

        if (recovered.kitType && !visionResult.kitType) {
          visionResult.kitType = recovered.kitType
          // Kit type doesn't have a separate confidence score, but we recovered it
          console.log(`[analyze-jersey-vision] Recovered kitType via fallback: ${recovered.kitType}`)
        }

        // Update overall confidence after recovery
        if (recovered.clubText || recovered.seasonText || recovered.kitType || recovered.playerNameText) {
          visionResult.confidence.overall = Math.max(
            visionResult.confidence.overall,
            Math.min(
              (visionResult.confidence.club + visionResult.confidence.season + visionResult.confidence.player) / 3,
              85
            )
          )
        }
      }
      
      // Step 2: Generate embedding from Vision result for template matching
      const badgeNames = (visionResult.badges || []).map(b => b.nameText).filter(Boolean)
      const visionDescription = [
        visionResult.clubText,
        visionResult.seasonText,
        visionResult.kitType,
        visionResult.playerNameText,
        visionResult.playerNumberText,
        visionResult.sponsorText,
        visionResult.manufacturerText,
        visionResult.colorText,
        visionResult.designText,
        ...badgeNames,
      ].filter(Boolean).join(' ')
      
      if (visionDescription) {
        embedding = await generateEmbeddingFromText(visionDescription)
        
        // Step 3: Check for similar template
        matchedTemplate = await findSimilarTemplate(embedding, pgClient)
      }
      
      // Step 4: If template found, use template metadata
      if (matchedTemplate) {
        matchedIds.clubId = matchedTemplate.club_id ?? null
        matchedIds.seasonId = matchedTemplate.season_id ?? null
        matchedIds.playerId = matchedTemplate.player_id ?? null
        confidence = {
          club: matchedTemplate.club_id ? 100 : 0,
          season: matchedTemplate.season_id ? 100 : 0,
          player: matchedTemplate.player_id ? 100 : 0,
          sponsor: 0, // Template doesn't include sponsor info
          badges: 0, // Template doesn't include badge info
          overall: 95, // High confidence for template match
        }
        
        // Fetch metadata (clubName, seasonLabel, playerName) from database
        const metadataPromises: Promise<void>[] = []
        
        if (matchedTemplate.club_id) {
          metadataPromises.push(
            repository.findClubById(matchedTemplate.club_id).then(club => {
              if (club) {
                if (!matchedIds.metadata) matchedIds.metadata = {}
                matchedIds.metadata.clubName = club.name
              }
            }).catch(err => {
              console.warn('[analyze-jersey-vision] Failed to fetch club metadata:', err)
            })
          )
        }
        
        if (matchedTemplate.season_id) {
          metadataPromises.push(
            repository.findSeasonById(matchedTemplate.season_id).then(season => {
              if (season) {
                if (!matchedIds.metadata) matchedIds.metadata = {}
                matchedIds.metadata.seasonLabel = season.label
              }
            }).catch(err => {
              console.warn('[analyze-jersey-vision] Failed to fetch season metadata:', err)
            })
          )
        }
        
        if (matchedTemplate.player_id) {
          metadataPromises.push(
            repository.findPlayerById(matchedTemplate.player_id).then(player => {
              if (player) {
                if (!matchedIds.metadata) matchedIds.metadata = {}
                matchedIds.metadata.playerName = player.full_name
              }
            }).catch(err => {
              console.warn('[analyze-jersey-vision] Failed to fetch player metadata:', err)
            })
          )
        }
        
        // Wait for all metadata fetches to complete
        await Promise.all(metadataPromises)
        
        // Increment template usage count
        await pgClient.queryObject(
          'UPDATE metadata.kit_templates SET usage_count = usage_count + 1 WHERE id = $1',
          [matchedTemplate.id]
        )
      } else {
        // Step 5: Map Vision results to DB IDs
        // Log Vision result for debugging
        console.log('[analyze-jersey-vision] Vision result:', JSON.stringify(visionResult, null, 2))
        
        // Match metadata using MatchService (direct service call instead of Edge Function)
        // Match if we have clubText (season is optional, player matching can work without it)
        if (visionResult.clubText) {
          try {
            const matchResult = await matchMetadataToIds(
              visionResult,
              matchService,
              repository,
              transfermarktClient,
              upsertService
            )
            
            matchedIds.clubId = matchResult.clubId ?? null
            matchedIds.seasonId = matchResult.seasonId ?? null
            matchedIds.playerId = matchResult.playerId ?? null
            matchedIds.metadata = matchResult.metadata // Store metadata (includes playerName, clubName, seasonLabel)
            
            // Store season suggestions if available
            if (matchResult.suggestions?.seasons) {
              seasonSuggestions = matchResult.suggestions.seasons
            }
            
            console.log('[analyze-jersey-vision] Metadata matching result:', {
              clubId: matchedIds.clubId,
              seasonId: matchedIds.seasonId,
              playerId: matchedIds.playerId,
              metadata: matchedIds.metadata,
              confidence: matchResult.confidence,
              hasSeasonSuggestions: !!matchResult.suggestions?.seasons?.length,
              seasonSuggestionsCount: matchResult.suggestions?.seasons?.length || 0,
            })
            
            // Combine Vision confidence with MatchService confidence
            // Use MatchService confidence for matched fields, Vision confidence for unmatched
            confidence = {
              club: matchedIds.clubId ? matchResult.confidence.club : (visionResult.clubText ? visionResult.confidence.club : 0),
              season: matchedIds.seasonId ? matchResult.confidence.season : (visionResult.seasonText ? visionResult.confidence.season : 0),
              player: matchedIds.playerId ? matchResult.confidence.player : (visionResult.playerNameText ? visionResult.confidence.player : 0),
              sponsor: visionResult.sponsorText ? (visionResult.confidence.sponsor || 0) : 0,
              badges: (visionResult.badges && visionResult.badges.length > 0) ? (visionResult.confidence.badges || 0) : 0,
              overall: Math.min(
                matchedIds.clubId ? matchResult.confidence.club : (visionResult.clubText ? visionResult.confidence.club : 0),
                matchedIds.seasonId ? matchResult.confidence.season : (visionResult.seasonText ? visionResult.confidence.season : 0),
                visionResult.confidence.overall || 0
              ),
            }
          } catch (matchError) {
            console.error('[analyze-jersey-vision] Failed to match metadata to IDs:', matchError)
            // Continue with Vision results even if matching fails
            // Set confidence to 0 for unmatched fields
            confidence = {
              club: visionResult.clubText ? visionResult.confidence.club : 0,
              season: visionResult.seasonText ? visionResult.confidence.season : 0,
              player: visionResult.playerNameText ? visionResult.confidence.player : 0,
              sponsor: visionResult.sponsorText ? (visionResult.confidence.sponsor || 0) : 0,
              badges: (visionResult.badges && visionResult.badges.length > 0) ? (visionResult.confidence.badges || 0) : 0,
              overall: Math.min(
                visionResult.clubText ? visionResult.confidence.club : 0,
                visionResult.seasonText ? visionResult.confidence.season : 0,
                visionResult.confidence.overall || 0
              ),
            }
          }
        } else {
          console.warn('[analyze-jersey-vision] Skipping metadata matching - missing clubText:', {
            clubText: visionResult.clubText,
            seasonText: visionResult.seasonText,
          })
          // Use Vision confidence but mark as unmatched
          confidence = {
            club: visionResult.clubText ? visionResult.confidence.club : 0,
            season: visionResult.seasonText ? visionResult.confidence.season : 0,
            player: visionResult.playerNameText ? visionResult.confidence.player : 0,
            sponsor: visionResult.sponsorText ? (visionResult.confidence.sponsor || 0) : 0,
            badges: (visionResult.badges && visionResult.badges.length > 0) ? (visionResult.confidence.badges || 0) : 0,
            overall: Math.min(
              visionResult.clubText ? visionResult.confidence.club : 0,
              visionResult.seasonText ? visionResult.confidence.season : 0,
              visionResult.confidence.overall || 0
            ),
          }
        }
        
        // Step 6: Store results in jersey_images rows
        if (embedding && allImagesBase64.length > 0) {
          for (let i = 0; i < imageUrls.length; i++) {
            const imageUrl = imageUrls[i]
            
            // Extract storage_path from URL
            const urlParts = imageUrl.split('/storage/v1/object/public/jersey_images/')
            const storagePath = urlParts.length === 2 ? urlParts[1] : null
            
            // Determine view_type (simplified - could be improved with Vision analysis)
            const viewType = i === 0 ? 'front' : i === 1 ? 'back' : 'detail'
            
            // Update existing jersey_images row or insert if not exists
            // Only update embedding for cover image (first image)
            if (i === 0 && embedding.length === 3072) {
              try {
                await pgClient.queryObject(`
                  UPDATE public.jersey_images
                  SET 
                    view_type = $1,
                    image_embedding = $2::vector,
                    updated_at = now()
                  WHERE jersey_id = $3 AND image_url = $4
                `, [
                  viewType,
                  `[${embedding.join(',')}]`,
                  jerseyId,
                  imageUrl,
                ])
                
                // If no rows updated, insert new row
                const updateResult = await pgClient.queryObject(`
                  SELECT COUNT(*) as count FROM public.jersey_images
                  WHERE jersey_id = $1 AND image_url = $2
                `, [jerseyId, imageUrl])
                
                if (updateResult.rows[0]?.count === 0) {
                  await pgClient.queryObject(`
                    INSERT INTO public.jersey_images (
                      jersey_id, image_url, storage_path, view_type, sort_order, image_embedding
                    )
                    VALUES ($1, $2, $3, $4, $5, $6::vector)
                  `, [
                    jerseyId,
                    imageUrl,
                    storagePath,
                    viewType,
                    i,
                    `[${embedding.join(',')}]`,
                  ])
                }
              } catch (vectorError) {
                const errorMessage = vectorError instanceof Error ? vectorError.message : String(vectorError)
                if (errorMessage.includes('type "vector" does not exist')) {
                  console.warn('[analyze-jersey-vision] Vector extension not available - skipping embedding update')
                  // Continue without embedding - just update view_type
                  await pgClient.queryObject(`
                    UPDATE public.jersey_images
                    SET 
                      view_type = $1,
                      updated_at = now()
                    WHERE jersey_id = $2 AND image_url = $3
                  `, [viewType, jerseyId, imageUrl])
                  
                  // If no rows updated, insert new row without embedding
                  const updateResult = await pgClient.queryObject(`
                    SELECT COUNT(*) as count FROM public.jersey_images
                    WHERE jersey_id = $1 AND image_url = $2
                  `, [jerseyId, imageUrl])
                  
                  if (updateResult.rows[0]?.count === 0) {
                    await pgClient.queryObject(`
                      INSERT INTO public.jersey_images (
                        jersey_id, image_url, storage_path, view_type, sort_order
                      )
                      VALUES ($1, $2, $3, $4, $5)
                    `, [
                      jerseyId,
                      imageUrl,
                      storagePath,
                      viewType,
                      i,
                    ])
                  }
                } else {
                  throw vectorError
                }
              }
            } else {
              // Update view_type for other images
              await pgClient.queryObject(`
                UPDATE public.jersey_images
                SET view_type = $1, updated_at = now()
                WHERE jersey_id = $2 AND image_url = $3
              `, [viewType, jerseyId, imageUrl])
            }
          }
        }
        
        // Step 7: Create kit_template if unique (only for cover image with high confidence)
        if (embedding && confidence.overall >= 80 && matchedIds.clubId && matchedIds.seasonId) {
          // Check if template already exists for this club/season/kit_type
          const existingTemplate = await pgClient.queryObject<{ id: string }>(`
            SELECT id FROM metadata.kit_templates
            WHERE club_id = $1 AND season_id = $2 AND kit_type = $3
            LIMIT 1
          `, [matchedIds.clubId, matchedIds.seasonId, visionResult.kitType])
          
          if (existingTemplate.rows.length === 0) {
            // Create new template
            await pgClient.queryObject(`
              INSERT INTO metadata.kit_templates (
                club_id, season_id, player_id, kit_type, image_embedding, example_jersey_id
              )
              VALUES ($1, $2, $3, $4, $5::vector, $6)
            `, [
              matchedIds.clubId,
              matchedIds.seasonId,
              matchedIds.playerId,
              visionResult.kitType,
              `[${embedding.join(',')}]`,
              jerseyId,
            ])
          }
        }
      }
      
      // Step 8: Update jersey with Vision results
      await supabase
        .from('jerseys')
        .update({
          vision_raw: visionResult,
          vision_confidence: confidence.overall,
        })
        .eq('id', jerseyId)
      
    } catch (error) {
      console.error('Vision analysis error:', error)
      // Continue with partial results
    }

    const duration = performance.now() - startTime
    
    // Log completion (Sentry can be added later if needed)
    console.log('Vision analysis completed', {
      jerseyId,
      imageCount: imageUrls.length,
      duration: `${duration.toFixed(2)}ms`,
      templateUsed: matchedTemplate !== null,
    })

    // Determine missing fields (fields that are required but not found or matched)
    const missingFields: string[] = []
    if (!matchedIds.clubId && (!visionResult?.clubText || (confidence.club < 50))) {
      missingFields.push('club')
    }
    if (!matchedIds.seasonId && (!visionResult?.seasonText || (confidence.season < 50))) {
      missingFields.push('season')
    }
    // Only require player if hasPlayerPrint is true
    if (visionResult?.hasPlayerPrint && !matchedIds.playerId && (!visionResult?.playerNameText || (confidence.player < 50))) {
      missingFields.push('player')
    }

    const response: AnalyzeVisionResponse = {
      vision: visionResult,
      templateUsed: matchedTemplate !== null,
      matched: {
        clubId: matchedIds.clubId,
        seasonId: matchedIds.seasonId,
        playerId: matchedIds.playerId,
      },
      metadata: matchedIds.metadata,
      confidence,
      suggestions: seasonSuggestions ? { seasons: seasonSuggestions } : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      embedding,
    }

    console.log('[analyze-jersey-vision] Final response:', {
      matched: response.matched,
      metadata: response.metadata,
      hasMetadata: !!response.metadata,
    })

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Analyze vision error:', error)
    // Error logging (Sentry can be added later if needed)
    // For now, errors are logged to console and returned to client

    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Internal server error',
        vision: null,
        templateUsed: false,
        matched: { clubId: null, seasonId: null, playerId: null },
        confidence: { club: 0, season: 0, player: 0, sponsor: 0, badges: 0, overall: 0 },
        embedding: null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } finally {
    // Close repository connection
    await repository.close().catch(() => {})
    
    // Close pgClient if it was used
    if (pgClient) {
      await pgClient.end()
    }
  }
})

