import { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { rateLimitMiddleware } from '@/lib/api/rate-limit'
import { handleApiError } from '@/lib/api/errors'
import { query } from '@/lib/db/postgres-connection'

interface Season {
  id: string
  label: string
  start_year: number
  end_year: number
  source?: 'database'
}

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'GET') {
      return new Response(null, { status: 405 })
    }

    const searchParams = req.nextUrl.searchParams
    const queryParam = searchParams.get('q')

    let seasons: Season[] = []

    if (queryParam && queryParam.trim().length >= 2) {
      const searchTerm = queryParam.trim()
      
      // Search by label or year
      seasons = await query<Season>(
        `
        SELECT id, label, start_year, end_year
        FROM metadata.seasons
        WHERE label ILIKE $1
           OR CAST(start_year AS TEXT) LIKE $2
           OR CAST(end_year AS TEXT) LIKE $2
        ORDER BY 
          CASE 
            WHEN label = $3 THEN 1
            WHEN label ILIKE $4 THEN 2
            ELSE 3
          END,
          start_year DESC
        LIMIT 20
        `,
        [
          `%${searchTerm}%`,
          `${searchTerm}%`,
          searchTerm,
          `${searchTerm}%`,
        ]
      )

      seasons = seasons.map((s) => ({
        ...s,
        source: 'database' as const,
      }))
    } else {
      // No search term - return recent seasons
      seasons = await query<Season>(
        `
        SELECT id, label, start_year, end_year
        FROM metadata.seasons
        ORDER BY start_year DESC
        LIMIT 20
        `
      )

      seasons = seasons.map((s) => ({
        ...s,
        source: 'database' as const,
      }))
    }

    return Response.json({ seasons })
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        url: req.url,
        q: req.nextUrl.searchParams.get('q'),
      },
      tags: { component: 'metadata-seasons-search-api' },
    })
    return handleApiError(error, req)
  }
}

export const GET = rateLimitMiddleware(handler)

