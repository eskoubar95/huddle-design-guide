/**
 * Country name to ISO-2 code mapping utilities
 * Maps Transfermarkt API country names to medusa.region_country.iso_2
 * 
 * NOTE: Metadata tables (competitions, clubs, players) reference medusa.region_country(iso_2)
 * as foreign keys. This mapping serves as an optimization/fallback before database lookup.
 * 
 * For production, consider querying medusa.region_country table directly via Repository Layer.
 * Used across edge functions for consistent country code handling.
 */

/**
 * Country code mapping - synchronized with frontend apps/web/lib/utils/country-mapper.ts
 * Maps common country name variations to ISO-2 codes matching medusa.region_country.iso_2
 * 
 * This mapping is optimized for Transfermarkt API country name formats.
 * All codes must exist in medusa.region_country.iso_2 for foreign key constraints.
 */
export const countryMap: Record<string, string> = {
  // Common variations
  denmark: 'dk',
  'denmark (denmark)': 'dk',
  england: 'gb',
  'united kingdom': 'gb',
  'great britain': 'gb',
  germany: 'de',
  spain: 'es',
  italy: 'it',
  france: 'fr',
  netherlands: 'nl',
  belgium: 'be',
  portugal: 'pt',
  sweden: 'se',
  norway: 'no',
  finland: 'fi',
  poland: 'pl',
  austria: 'at',
  switzerland: 'ch',
  turkey: 'tr',
  greece: 'gr',
  russia: 'ru',
  ukraine: 'ua',
  croatia: 'hr',
  'czech republic': 'cz',
  romania: 'ro',
  hungary: 'hu',
  brazil: 'br',
  argentina: 'ar',
  mexico: 'mx',
  usa: 'us',
  'united states': 'us',
  canada: 'ca',
  japan: 'jp',
  china: 'cn',
  'south korea': 'kr',
  australia: 'au',
  egypt: 'eg',
  morocco: 'ma',
  algeria: 'dz',
  tunisia: 'tn',
  senegal: 'sn',
  nigeria: 'ng',
  ghana: 'gh',
  'south africa': 'za',
  israel: 'il',
  'saudi arabia': 'sa',
  uae: 'ae',
  qatar: 'qa',
}

/**
 * Map country name to ISO-2 code
 * 
 * This function maps country names to ISO-2 codes that match medusa.region_country.iso_2.
 * The returned codes must exist in medusa.region_country table for foreign key constraints.
 * 
 * The function handles:
 * - Case-insensitive matching
 * - Whitespace trimming
 * - Partial matches (e.g., "Germany (Germany)" → "de")
 * - Common variations (e.g., "United Kingdom" → "gb")
 * 
 * @param {string | null | undefined} countryName - Country name from Transfermarkt API (case-insensitive)
 * @returns {string | null} ISO-2 country code matching medusa.region_country.iso_2, or null if not found
 * 
 * @example
 * ```typescript
 * mapCountryToIso2('Denmark') // Returns 'dk'
 * mapCountryToIso2('Germany (Germany)') // Returns 'de'
 * mapCountryToIso2('United Kingdom') // Returns 'gb'
 * mapCountryToIso2('Unknown') // Returns null
 * ```
 */
export function mapCountryToIso2(countryName: string | null | undefined): string | null {
  if (!countryName) return null
  
  const normalized = countryName.toLowerCase().trim()
  
  // Direct lookup
  if (countryMap[normalized]) {
    return countryMap[normalized]
  }
  
  // Try to find partial match (e.g., "Germany (Germany)" -> "germany")
  const partialMatch = Object.keys(countryMap).find((key) =>
    normalized.includes(key) || key.includes(normalized)
  )
  
  if (partialMatch) {
    return countryMap[partialMatch]
  }
  
  // Return null if no match found
  // In future: could query medusa.region_country table via Repository Layer
  return null
}

