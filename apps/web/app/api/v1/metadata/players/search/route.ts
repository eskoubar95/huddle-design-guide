import { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { rateLimitMiddleware } from '@/lib/api/rate-limit'
import { handleApiError } from '@/lib/api/errors'
import { query } from '@/lib/db/postgres-connection'
import { z } from 'zod'

interface Player {
  id: string
  full_name: string
  jersey_number?: number | null
  source?: 'database' | 'transfermarkt'
}

const searchQuerySchema = z.object({
  clubId: z.string().min(1),
  seasonId: z.string().uuid().optional(),
  q: z.string().optional(),
})

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'GET') {
      return new Response(null, { status: 405 })
    }

    const searchParams = req.nextUrl.searchParams
    const clubIdParam = searchParams.get('clubId')
    
    // Validate clubId is provided
    if (!clubIdParam || clubIdParam.trim().length === 0) {
      return Response.json(
        { error: 'clubId is required' },
        { status: 400 }
      )
    }
    
    const queryParams = searchQuerySchema.parse({
      clubId: clubIdParam,
      seasonId: searchParams.get('seasonId') || undefined,
      q: searchParams.get('q') || undefined,
    })

    const { clubId, seasonId, q: searchTerm } = queryParams

    let players: Player[] = []

    // Build query based on parameters
    if (seasonId) {
      // Search players by club and season (from player_contracts)
      if (searchTerm && searchTerm.trim().length >= 2) {
        const searchPattern = `%${searchTerm.trim()}%`
        const results = await query<{
          player_id: string
          full_name: string
          jersey_number: number | null
        }>(
          `
          SELECT DISTINCT
            p.id as player_id,
            p.full_name,
            pc.jersey_number
          FROM metadata.player_contracts pc
          JOIN metadata.players p ON p.id = pc.player_id
          WHERE pc.club_id = $1
            AND pc.season_id = $2
            AND p.full_name ILIKE $3
          ORDER BY p.full_name
          LIMIT 50
          `,
          [clubId, seasonId, searchPattern]
        )

        players = results.map((r) => ({
          id: r.player_id,
          full_name: r.full_name,
          jersey_number: r.jersey_number,
          source: 'database' as const,
        }))
      } else {
        // Get all players for club/season (no search term)
        const results = await query<{
          player_id: string
          full_name: string
          jersey_number: number | null
        }>(
          `
          SELECT DISTINCT
            p.id as player_id,
            p.full_name,
            pc.jersey_number
          FROM metadata.player_contracts pc
          JOIN metadata.players p ON p.id = pc.player_id
          WHERE pc.club_id = $1
            AND pc.season_id = $2
          ORDER BY p.full_name
          LIMIT 50
          `,
          [clubId, seasonId]
        )

        players = results.map((r) => ({
          id: r.player_id,
          full_name: r.full_name,
          jersey_number: r.jersey_number,
          source: 'database' as const,
        }))
      }
    } else {
      // Search players by club only (no season filter)
      if (searchTerm && searchTerm.trim().length >= 2) {
        const searchPattern = `%${searchTerm.trim()}%`
        const results = await query<{
          player_id: string
          full_name: string
          jersey_number: number | null
        }>(
          `
          SELECT DISTINCT
            p.id as player_id,
            p.full_name,
            pc.jersey_number
          FROM metadata.player_contracts pc
          JOIN metadata.players p ON p.id = pc.player_id
          WHERE pc.club_id = $1
            AND p.full_name ILIKE $2
          ORDER BY p.full_name
          LIMIT 50
          `,
          [clubId, searchPattern]
        )

        players = results.map((r) => ({
          id: r.player_id,
          full_name: r.full_name,
          jersey_number: r.jersey_number,
          source: 'database' as const,
        }))
      } else {
        // Get all players for club (no search term)
        const results = await query<{
          player_id: string
          full_name: string
          jersey_number: number | null
        }>(
          `
          SELECT DISTINCT
            p.id as player_id,
            p.full_name,
            pc.jersey_number
          FROM metadata.player_contracts pc
          JOIN metadata.players p ON p.id = pc.player_id
          WHERE pc.club_id = $1
          ORDER BY p.full_name
          LIMIT 50
          `,
          [clubId]
        )

        players = results.map((r) => ({
          id: r.player_id,
          full_name: r.full_name,
          jersey_number: r.jersey_number,
          source: 'database' as const,
        }))
      }
    }

    return Response.json({ players })
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        url: req.url,
        clubId: req.nextUrl.searchParams.get('clubId'),
        seasonId: req.nextUrl.searchParams.get('seasonId'),
        q: req.nextUrl.searchParams.get('q'),
      },
      tags: { component: 'metadata-players-search-api' },
    })
    return handleApiError(error, req)
  }
}

export const GET = rateLimitMiddleware(handler)

