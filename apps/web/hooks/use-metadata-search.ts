'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, UseQueryResult } from '@tanstack/react-query'

export type SearchEntityType = 'clubs' | 'players' | 'seasons'

interface SearchResult<T> {
  results: T[]
  source?: 'database' | 'transfermarkt'
}

interface Club {
  id: string
  name: string
  crest_url?: string | null
  source?: 'database' | 'transfermarkt'
}

interface Player {
  id: string
  full_name: string
  jersey_number?: number | null
  source?: 'database' | 'transfermarkt'
}

interface Season {
  id: string
  label: string
  start_year: number
  end_year: number
  source?: 'database'
}

interface UseMetadataSearchOptions {
  debounceMs?: number
  enabled?: boolean
  staleTime?: number
  entityType: SearchEntityType
  // Context for players search
  clubId?: string
  seasonId?: string
}

interface UseMetadataSearchReturn<T> {
  query: string
  setQuery: (query: string) => void
  debouncedQuery: string
  results: T[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  queryResult: UseQueryResult<SearchResult<T>, Error>
}

/**
 * Unified search hook for metadata (clubs, players, seasons)
 * 
 * Features:
 * - Automatic debouncing (300ms default)
 * - Intelligent caching (30s default)
 * - Context-aware search (e.g., players require clubId + seasonId)
 * - Unified API interface
 */
export function useMetadataSearch<T extends Club | Player | Season>(
  options: UseMetadataSearchOptions
): UseMetadataSearchReturn<T> {
  const {
    debounceMs = 300,
    enabled = true,
    staleTime = 30000, // 30 seconds
    entityType,
    clubId,
    seasonId,
  } = options

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  // Build API endpoint based on entity type
  const apiEndpoint = useMemo(() => {
    if (entityType === 'clubs') {
      return debouncedQuery
        ? `/api/v1/metadata/clubs/search?q=${encodeURIComponent(debouncedQuery)}`
        : '/api/v1/metadata/clubs'
    } else if (entityType === 'players') {
      // Players search requires clubId and optionally seasonId
      if (!clubId) return null // Cannot search players without clubId
      const params = new URLSearchParams({
        clubId,
        ...(seasonId && { seasonId }),
        ...(debouncedQuery && debouncedQuery.trim().length >= 2 && { q: debouncedQuery }),
      })
      return `/api/v1/metadata/players/search?${params.toString()}`
    } else if (entityType === 'seasons') {
      return debouncedQuery
        ? `/api/v1/metadata/seasons/search?q=${encodeURIComponent(debouncedQuery)}`
        : '/api/v1/metadata/seasons'
    }
    return null
  }, [entityType, debouncedQuery, clubId, seasonId])

  // Fetch results
  const queryResult = useQuery<SearchResult<T>, Error>({
    queryKey: [`metadata-search-${entityType}`, debouncedQuery, clubId, seasonId],
    queryFn: async () => {
      if (!apiEndpoint) {
        return { results: [] }
      }

      const response = await fetch(apiEndpoint)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${entityType}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Normalize response format
      if (entityType === 'clubs') {
        return { results: (data.clubs || []) as T[], source: 'database' }
      } else if (entityType === 'players') {
        return { results: (data.players || []) as T[], source: 'database' }
      } else if (entityType === 'seasons') {
        return { results: (data.seasons || []) as T[], source: 'database' }
      }

      return { results: [] }
    },
    enabled: enabled && (!!apiEndpoint || debouncedQuery.length === 0),
    staleTime,
    retry: 1,
  })

  return {
    query,
    setQuery,
    debouncedQuery,
    results: queryResult.data?.results || [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error || null,
    queryResult,
  }
}

// Type-safe hooks for each entity type
export function useClubSearch(options?: Omit<UseMetadataSearchOptions, 'entityType'>) {
  return useMetadataSearch<Club>({ ...options, entityType: 'clubs' })
}

export function usePlayerSearch(
  options: Omit<UseMetadataSearchOptions, 'entityType'> & { clubId: string; seasonId?: string }
) {
  return useMetadataSearch<Player>({
    ...options,
    entityType: 'players',
    clubId: options.clubId,
    seasonId: options.seasonId,
  })
}

export function useSeasonSearch(options?: Omit<UseMetadataSearchOptions, 'entityType'>) {
  return useMetadataSearch<Season>({ ...options, entityType: 'seasons' })
}

