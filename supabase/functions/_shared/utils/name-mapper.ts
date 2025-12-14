/**
 * Club name normalization utilities
 * Maps Danish club names to English equivalents for better search matching
 * Used across edge functions for consistent club name handling
 */

/**
 * Common name mappings (Danish → English)
 * Merged from match-jersey-metadata and auto-link-metadata
 */
export const nameMappings: Record<string, string> = {
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
}

/**
 * Normalize club name for search
 * 
 * Returns array of search terms (original + mapped if exists).
 * This allows searching for clubs using both local language names (e.g., Danish)
 * and English names stored in the database.
 * 
 * @param {string} clubText - Club name input (case-insensitive)
 * @returns {string[]} Array of search terms - [mappedName, originalName] if mapping exists, [originalName] otherwise
 * 
 * @example
 * ```typescript
 * normalizeClubName('fc københavn')
 * // Returns: ['fc copenhagen', 'fc københavn']
 * 
 * normalizeClubName('Manchester United')
 * // Returns: ['manchester united']
 * ```
 */
export function normalizeClubName(clubText: string): string[] {
  const normalized = clubText.trim().toLowerCase()
  const mappedName = nameMappings[normalized]
  
  if (mappedName) {
    // Return both mapped and original for broader search
    return [mappedName, normalized]
  }
  
  // Return original only if no mapping exists
  return [normalized]
}

/**
 * Generate alternative search terms for club names
 * Handles common variations like "S.S. Lazio" → ["Lazio", "SS Lazio", "S.S. Lazio"]
 * 
 * This function creates multiple search term variations to improve matching
 * with Transfermarkt API, which may use different naming conventions.
 * 
 * @param {string} clubText - Original club name
 * @returns {string[]} Array of alternative search terms to try
 * 
 * @example
 * ```typescript
 * generateClubSearchTerms('S.S. Lazio')
 * // Returns: ['S.S. Lazio', 'SS Lazio', 'Lazio']
 * 
 * generateClubSearchTerms('FC Barcelona')
 * // Returns: ['FC Barcelona', 'Barcelona']
 * ```
 */
export function generateClubSearchTerms(clubText: string): string[] {
  const normalized = clubText.trim()
  const terms: string[] = [normalized] // Always include original
  
  // Remove periods and normalize spacing: "S.S. Lazio" → "SS Lazio"
  const withoutPeriods = normalized.replace(/\./g, '').trim()
  if (withoutPeriods !== normalized) {
    terms.push(withoutPeriods)
  }
  
  // Extract last word (often the main identifier): "S.S. Lazio" → "Lazio"
  const words = normalized.split(/\s+/)
  if (words.length > 1) {
    const lastWord = words[words.length - 1]
    if (lastWord.length > 2) { // Only if meaningful
      terms.push(lastWord)
    }
  }
  
  // Remove common prefixes: "FC", "SS", "AC", etc.
  const prefixPattern = /^(FC|SS|AC|AS|SC|CF|CD|SD|UD|RC|US)\s+/i
  const withoutPrefix = normalized.replace(prefixPattern, '').trim()
  if (withoutPrefix !== normalized && withoutPrefix.length > 2) {
    terms.push(withoutPrefix)
  }
  
  // Remove duplicates and return
  return [...new Set(terms)]
}

