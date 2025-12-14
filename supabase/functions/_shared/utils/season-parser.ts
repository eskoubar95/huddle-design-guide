/**
 * Season parsing utilities
 * Pure functions for parsing season input strings and detecting season types
 * Used across edge functions for consistent season handling
 */

/**
 * Parsed season data structure
 * 
 * @interface ParsedSeason
 * @property {number} startYear - Start year of the season (e.g., 2023)
 * @property {number} endYear - End year of the season (e.g., 2024)
 * @property {string} label - Human-readable label (e.g., "23/24" or "2006")
 * @property {string} tmSeasonId - Transfermarkt season ID (e.g., "2023")
 * @property {'league' | 'calendar' | 'tournament'} seasonType - Type of season
 */
export interface ParsedSeason {
  startYear: number
  endYear: number
  label: string
  tmSeasonId: string
  seasonType: 'league' | 'calendar' | 'tournament'
}

/**
 * Parse season input to extract start year, end year, label, and Transfermarkt season_id
 * 
 * Supports formats:
 * - "23" → Single year (2-digit) → tm_season_id: "2023", seasonType: 'calendar'
 * - "2006" → Single year (4-digit) → tm_season_id: "2006", seasonType: 'tournament'
 * - "23/24" → Range (short) → tm_season_id: "2023", seasonType: 'league'
 * - "2023/2024" → Range (full) → tm_season_id: "2023", seasonType: 'league'
 * 
 * Season type detection:
 * - 'tournament': Single year with 4-digit format (e.g., "2006" for World Cup)
 * - 'calendar': Single year with 2-digit format or other single-year patterns
 * - 'league': Multi-year format (default, e.g., "23/24")
 * 
 * @param {string} seasonText - Season input string (e.g., "23/24", "2006", "23")
 * @returns {ParsedSeason} Parsed season data with start/end years, label, and type
 * @throws {Error} If season format is invalid
 * 
 * @example
 * ```typescript
 * const parsed = parseSeasonInput('23/24')
 * // Returns: { startYear: 2023, endYear: 2024, label: '23/24', tmSeasonId: '2023', seasonType: 'league' }
 * 
 * const tournament = parseSeasonInput('2006')
 * // Returns: { startYear: 2006, endYear: 2006, label: '2006', tmSeasonId: '2006', seasonType: 'tournament' }
 * ```
 */
export function parseSeasonInput(seasonText: string): ParsedSeason {
  const trimmed = seasonText.trim()
  
  // Format 1: Single year "23" (2-digit) - Calendar year season
  const singleYearMatch = trimmed.match(/^(\d{2})$/);
  if (singleYearMatch) {
    const year = 2000 + parseInt(singleYearMatch[1], 10);
    return {
      startYear: year,
      endYear: year,
      label: trimmed,
      tmSeasonId: year.toString(),
      seasonType: 'calendar',
    };
  }

  // Format 1b: Single year "2006" (4-digit) - Tournament (World Cup, Euros, etc.)
  const singleYear4Match = trimmed.match(/^(\d{4})$/);
  if (singleYear4Match) {
    const year = parseInt(singleYear4Match[1], 10);
    // For years 2000+, assume tournament (World Cup, Euros, etc.)
    // For years before 2000, use as-is (less common but possible)
    const isTournament = year >= 2000;
    return {
      startYear: year,
      endYear: year,
      label: year >= 2000 ? year.toString() : `${year % 100}`, // "2006" for tournaments, "06" for pre-2000
      tmSeasonId: year.toString(),
      seasonType: isTournament ? 'tournament' : 'calendar',
    };
  }

  // Format 2: Short range "23/24" - League season
  const shortRangeMatch = trimmed.match(/^(\d{2})\/(\d{2})$/);
  if (shortRangeMatch) {
    const startYear = 2000 + parseInt(shortRangeMatch[1], 10);
    const endYear = 2000 + parseInt(shortRangeMatch[2], 10);
    return {
      startYear,
      endYear,
      label: trimmed,
      tmSeasonId: startYear.toString(), // First year
      seasonType: 'league',
    };
  }

  // Format 3: Full range "2023/2024" - League season
  const fullRangeMatch = trimmed.match(/^(\d{4})\/(\d{4})$/);
  if (fullRangeMatch) {
    const startYear = parseInt(fullRangeMatch[1], 10);
    const endYear = parseInt(fullRangeMatch[2], 10);
    return {
      startYear,
      endYear,
      label: `${startYear % 100}/${endYear % 100}`, // Normalize to "23/24"
      tmSeasonId: startYear.toString(), // First year
      seasonType: 'league',
    };
  }

  // Format 4: Mixed range "2023/24" - League season (4-digit start, 2-digit end)
  const mixedRangeMatch = trimmed.match(/^(\d{4})\/(\d{2})$/);
  if (mixedRangeMatch) {
    const startYear = parseInt(mixedRangeMatch[1], 10);
    const endYear = 2000 + parseInt(mixedRangeMatch[2], 10);
    return {
      startYear,
      endYear,
      label: `${startYear % 100}/${endYear % 100}`, // Normalize to "23/24"
      tmSeasonId: startYear.toString(), // First year
      seasonType: 'league',
    };
  }

  // Format 5: Full range with dash "2023-2024" - League season
  const fullRangeDashMatch = trimmed.match(/^(\d{4})-(\d{4})$/);
  if (fullRangeDashMatch) {
    const startYear = parseInt(fullRangeDashMatch[1], 10);
    const endYear = parseInt(fullRangeDashMatch[2], 10);
    return {
      startYear,
      endYear,
      label: `${startYear % 100}/${endYear % 100}`, // Normalize to "23/24"
      tmSeasonId: startYear.toString(), // First year
      seasonType: 'league',
    };
  }

  // Format 6: Short range with dash "23-24" - League season
  const shortRangeDashMatch = trimmed.match(/^(\d{2})-(\d{2})$/);
  if (shortRangeDashMatch) {
    const startYear = 2000 + parseInt(shortRangeDashMatch[1], 10);
    const endYear = 2000 + parseInt(shortRangeDashMatch[2], 10);
    return {
      startYear,
      endYear,
      label: `${startYear % 100}/${endYear % 100}`, // Normalize to "23/24"
      tmSeasonId: startYear.toString(), // First year
      seasonType: 'league',
    };
  }

  // Format 7: Mixed range with dash "2023-24" - League season (4-digit start, 2-digit end)
  const mixedRangeDashMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (mixedRangeDashMatch) {
    const startYear = parseInt(mixedRangeDashMatch[1], 10);
    const endYear = 2000 + parseInt(mixedRangeDashMatch[2], 10);
    return {
      startYear,
      endYear,
      label: `${startYear % 100}/${endYear % 100}`, // Normalize to "23/24"
      tmSeasonId: startYear.toString(), // First year
      seasonType: 'league',
    };
  }

  throw new Error(`Invalid season format: ${seasonText}. Expected: "23", "2006", "23/24", "23-24", "2023/24", "2023-24", "2023/2024", or "2023-2024"`)
}

/**
 * Normalize season label based on season type
 * 
 * Normalization rules:
 * - Tournament seasons: Keep full year format ("2006")
 * - League seasons: Use short format ("23/24")
 * - Calendar seasons: Use short format ("23")
 * 
 * @param {ParsedSeason} parsed - Parsed season data
 * @returns {string} Normalized season label
 * 
 * @example
 * ```typescript
 * const league = normalizeSeasonLabel({ startYear: 2023, endYear: 2024, label: '23/24', tmSeasonId: '2023', seasonType: 'league' })
 * // Returns: "23/24"
 * 
 * const tournament = normalizeSeasonLabel({ startYear: 2006, endYear: 2006, label: '2006', tmSeasonId: '2006', seasonType: 'tournament' })
 * // Returns: "2006"
 * ```
 */
export function normalizeSeasonLabel(parsed: ParsedSeason): string {
  if (parsed.seasonType === 'tournament') {
    // Tournament: Use full year format
    return parsed.startYear.toString();
  } else if (parsed.seasonType === 'league') {
    // League: Use short format "YY/YY"
    return parsed.label.includes('/') ? parsed.label : `${parsed.startYear % 100}/${parsed.endYear % 100}`;
  } else {
    // Calendar: Use short format "YY"
    return parsed.label.length <= 2 ? parsed.label : `${parsed.startYear % 100}`;
  }
}

/**
 * Check if two season strings represent the same season, accounting for different formats
 * 
 * This function handles cross-format matching:
 * - "2006" (tournament) matches "06/07" (league season starting in 2006)
 * - "2006" matches "2006" (exact match)
 * - "06/07" matches "2006" (if start year is 2006)
 * - "23/24" matches "2023" (if start year is 2023)
 * 
 * @param {string} season1 - First season string (e.g., "2006", "06/07")
 * @param {string} season2 - Second season string (e.g., "2006", "06/07")
 * @returns {boolean} True if seasons match, false otherwise
 * 
 * @example
 * ```typescript
 * seasonsMatch("2006", "06/07") // Returns: true (both start in 2006)
 * seasonsMatch("2006", "2006") // Returns: true (exact match)
 * seasonsMatch("23/24", "2023") // Returns: true (both start in 2023)
 * seasonsMatch("23/24", "24/25") // Returns: false (different years)
 * ```
 */
export function seasonsMatch(season1: string, season2: string): boolean {
  // Exact match
  if (season1 === season2) {
    return true
  }

  try {
    // Parse both seasons
    const parsed1 = parseSeasonInput(season1)
    const parsed2 = parseSeasonInput(season2)

    // Match if start years are the same
    // This handles: "2006" (tournament) matches "06/07" (league starting in 2006)
    if (parsed1.startYear === parsed2.startYear) {
      return true
    }

    // Also check if one season's start year matches the other's end year
    // This handles edge cases where seasons overlap
    if (parsed1.startYear === parsed2.endYear || parsed1.endYear === parsed2.startYear) {
      return true
    }
  } catch (error) {
    // If parsing fails, fall back to exact string match (already checked above)
    return false
  }

  return false
}

