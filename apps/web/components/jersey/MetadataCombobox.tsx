'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useClubSearch, usePlayerSearch, useSeasonSearch } from "@/hooks/use-metadata-search"
import { useQuery } from "@tanstack/react-query"

// Base types
type MetadataType = 'club' | 'player' | 'season'

interface BaseMetadataItem {
  id: string
  source?: 'database' | 'transfermarkt'
}

interface Club extends BaseMetadataItem {
  name: string
  crest_url?: string | null
}

interface Player extends BaseMetadataItem {
  full_name: string
  jersey_number?: number | null
}

interface Season extends BaseMetadataItem {
  label: string
  start_year: number
  end_year: number
}

type MetadataItem = Club | Player | Season

// Props
interface MetadataComboboxBaseProps {
  value?: string
  onValueChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
}

interface ClubProps extends MetadataComboboxBaseProps {
  type: 'club'
}

interface PlayerProps extends MetadataComboboxBaseProps {
  type: 'player'
  clubId: string
  seasonId?: string
}

interface SeasonProps extends MetadataComboboxBaseProps {
  type: 'season'
  clubId?: string
}

type MetadataComboboxProps = ClubProps | PlayerProps | SeasonProps

// Render functions for different item types
function renderClubItem(club: Club, isSelected: boolean) {
  return (
    <>
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="flex items-center gap-2 flex-1">
        {club.crest_url && (
          <img
            src={club.crest_url}
            alt=""
            className="w-4 h-4 object-contain"
          />
        )}
        <span>{club.name}</span>
      </div>
    </>
  )
}

function renderPlayerItem(player: Player, isSelected: boolean) {
  return (
    <>
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="flex items-center gap-2 flex-1">
        <span>{player.full_name}</span>
        {player.jersey_number && (
          <Badge variant="outline" className="text-xs ml-auto">
            #{player.jersey_number}
          </Badge>
        )}
      </div>
    </>
  )
}

function renderSeasonItem(season: Season, isSelected: boolean) {
  return (
    <>
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="flex items-center gap-2 flex-1">
        <span>{season.label}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {season.start_year}-{season.end_year}
        </span>
      </div>
    </>
  )
}

function renderSelectedItem(item: MetadataItem, type: MetadataType) {
  if (type === 'club') {
    const club = item as Club
    return (
      <span className="flex items-center gap-2">
        {club.name}
        {club.source === 'transfermarkt' && (
          <Badge variant="outline" className="text-xs ml-1">
            TM
          </Badge>
        )}
      </span>
    )
  }
  
  if (type === 'player') {
    const player = item as Player
    return (
      <span className="flex items-center gap-2">
        {player.full_name}
        {player.jersey_number && (
          <Badge variant="outline" className="text-xs">
            #{player.jersey_number}
          </Badge>
        )}
        {player.source === 'transfermarkt' && (
          <Badge variant="outline" className="text-xs">
            TM
          </Badge>
        )}
      </span>
    )
  }
  
  if (type === 'season') {
    const season = item as Season
    return <span>{season.label}</span>
  }
  
  return null
}

export function MetadataCombobox(props: MetadataComboboxProps) {
  const { value, onValueChange, placeholder, disabled, type } = props
  const [open, setOpen] = React.useState(false)

  // Hooks must be called unconditionally - call all hooks but disable unused ones
  const clubSearchResult = useClubSearch({
    enabled: type === 'club' && open,
    debounceMs: 300,
    staleTime: 30000,
  })

  const playerSearchResult = usePlayerSearch({
    clubId: type === 'player' ? props.clubId : '',
    seasonId: type === 'player' ? props.seasonId : undefined,
    enabled: type === 'player' && open && !!props.clubId,
    debounceMs: 300,
    staleTime: 30000,
  })

  const seasonSearchResult = useSeasonSearch({
    clubId: type === 'season' ? props.clubId : undefined,
    enabled: type === 'season' && open,
    debounceMs: 300,
    staleTime: 30000,
  })

  // Select the appropriate search result based on type
  const searchResult = React.useMemo(() => {
    if (type === 'club') return clubSearchResult
    if (type === 'player') return playerSearchResult
    return seasonSearchResult
  }, [type, clubSearchResult, playerSearchResult, seasonSearchResult])

  const results = (searchResult.results || []) as MetadataItem[]
  const isLoading = searchResult.isLoading || false
  const isError = searchResult.isError || false
  const error = searchResult.error
  // Note: searchQuery and setSearchQuery are available via searchResult but not used directly

  // Fetch selected item by ID if not in results
  const fetchByIdQuery = useQuery({
    queryKey: [`${type}-by-id`, value],
    queryFn: async () => {
      if (!value) throw new Error('No ID provided')
      
      if (type === 'club') {
        const response = await fetch(`/api/v1/metadata/clubs?id=${encodeURIComponent(value)}`)
        if (!response.ok) throw new Error('Failed to fetch club')
        const result = await response.json()
        return { items: result.clubs.map((c: Club) => ({ ...c, source: 'database' as const })) }
      }
      
      if (type === 'player') {
        const response = await fetch(`/api/v1/metadata/players/${value}`)
        if (!response.ok) throw new Error('Failed to fetch player')
        const result = await response.json()
        return { items: [result.player] }
      }
      
      if (type === 'season') {
        const response = await fetch(`/api/v1/metadata/seasons?id=${encodeURIComponent(value)}`)
        if (!response.ok) throw new Error('Failed to fetch season')
        const result = await response.json()
        return { items: result.seasons }
      }
      
      throw new Error('Unknown type')
    },
    enabled: !!value && !results.some((item) => item.id === value),
    staleTime: 300000, // Cache for 5 minutes
  })

  const selectedItem = React.useMemo(() => {
    if (!value) return undefined
    // First check in search results
    const found = results.find((item) => item.id === value)
    if (found) return found
    // Then check in fetched by ID
    if (fetchByIdQuery.data?.items && fetchByIdQuery.data.items.length > 0) {
      return fetchByIdQuery.data.items[0] as MetadataItem
    }
    return undefined
  }, [value, results, fetchByIdQuery.data])

  const handleSelect = (itemId: string) => {
    onValueChange(itemId === value ? undefined : itemId)
    setOpen(false)
    if (type === 'club') clubSearchResult.setQuery("")
    if (type === 'player') playerSearchResult.setQuery("")
    if (type === 'season') seasonSearchResult.setQuery("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange(undefined)
    if (type === 'club') clubSearchResult.setQuery("")
    if (type === 'player') playerSearchResult.setQuery("")
    if (type === 'season') seasonSearchResult.setQuery("")
  }

  // Show warning if context is missing (for player/season)
  if (type === 'player' && !props.clubId) {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full justify-between h-11"
      >
        <span className="text-muted-foreground">
          Select a club first
        </span>
      </Button>
    )
  }

  // Default placeholders
  const defaultPlaceholders = {
    club: "Search for club...",
    player: "Search for player...",
    season: "Search for season...",
  }

  const defaultSearchPlaceholders = {
    club: "Search clubs...",
    player: "Search players...",
    season: "Search seasons...",
  }

  const defaultGroupHeadings = {
    club: "Clubs",
    player: "Players",
    season: "Seasons",
  }

  const selectedPlaceholder = placeholder || defaultPlaceholders[type]
  const searchPlaceholder = defaultSearchPlaceholders[type]
  const groupHeading = defaultGroupHeadings[type]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11"
          disabled={disabled || (type === 'player' && !props.clubId)}
        >
          <span className="truncate">
            {selectedItem ? (
              renderSelectedItem(selectedItem, type)
            ) : (
              <span className="text-muted-foreground">{selectedPlaceholder}</span>
            )}
          </span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {selectedItem && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchResult.query}
            onValueChange={(value) => {
              if (type === 'club') clubSearchResult.setQuery(value)
              if (type === 'player') playerSearchResult.setQuery(value)
              if (type === 'season') seasonSearchResult.setQuery(value)
            }}
          />
          <CommandList>
            {/* Context warning for player */}
            {type === 'player' && !props.clubId && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p className="text-muted-foreground">Select a club first</p>
                </div>
              </CommandEmpty>
            )}

            {/* Loading state */}
            {((type !== 'player' || props.clubId) && isLoading) && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Searching...
                </span>
              </div>
            )}

            {/* Error state */}
            {((type !== 'player' || props.clubId) && isError) && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p className="text-destructive">Failed to load {type}s</p>
                  <p className="text-muted-foreground mt-1">
                    {error?.message || 'Please try again'}
                  </p>
                </div>
              </CommandEmpty>
            )}

            {/* Empty state */}
            {((type !== 'player' || props.clubId) && !isLoading && !isError && results.length === 0) && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p className="text-muted-foreground">No {type}s found</p>
                  {searchResult.query && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Try a different search term
                    </p>
                  )}
                  {type === 'player' && !props.seasonId && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Select a season for better results
                    </p>
                  )}
                </div>
              </CommandEmpty>
            )}

            {/* Results */}
            {((type !== 'player' || props.clubId) && !isLoading && !isError && results.length > 0) && (
              <>
                <CommandGroup heading={groupHeading}>
                  {results
                    .filter((item) => item.source === 'database' || !item.source)
                    .map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item.id)}
                      >
                        {type === 'club' && renderClubItem(item as Club, value === item.id)}
                        {type === 'player' && renderPlayerItem(item as Player, value === item.id)}
                        {type === 'season' && renderSeasonItem(item as Season, value === item.id)}
                      </CommandItem>
                    ))}
                </CommandGroup>

                {/* Transfermarkt results */}
                {results.some((item) => item.source === 'transfermarkt') && (
                  <CommandGroup heading="From Transfermarkt">
                    {results
                      .filter((item) => item.source === 'transfermarkt')
                      .map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          onSelect={() => handleSelect(item.id)}
                        >
                          {type === 'club' && renderClubItem(item as Club, value === item.id)}
                          {type === 'player' && renderPlayerItem(item as Player, value === item.id)}
                          {type === 'season' && renderSeasonItem(item as Season, value === item.id)}
                          <Badge variant="outline" className="text-xs ml-auto">
                            TM
                          </Badge>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

