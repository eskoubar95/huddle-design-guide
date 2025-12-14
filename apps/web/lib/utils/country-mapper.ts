/**
 * Utility to map country names to ISO-2 codes
 * Maps Transfermarkt API country names to medusa.region_country.iso_2
 */

const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
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
};

/**
 * Map country name to ISO-2 code
 * Returns null if no mapping found
 */
export function mapCountryToIso2(countryName: string | null | undefined): string | null {
  if (!countryName) {
    return null;
  }

  const normalized = countryName.toLowerCase().trim();
  
  // Direct lookup
  if (COUNTRY_NAME_TO_ISO2[normalized]) {
    return COUNTRY_NAME_TO_ISO2[normalized];
  }

  // Try to find partial match (e.g., "Germany (Germany)" -> "germany")
  const partialMatch = Object.keys(COUNTRY_NAME_TO_ISO2).find((key) =>
    normalized.includes(key) || key.includes(normalized)
  );

  if (partialMatch) {
    return COUNTRY_NAME_TO_ISO2[partialMatch];
  }

  // Return null if no match found
  return null;
}

/**
 * Get display name for ISO-2 code from Medusa region_country
 * Requires database query - use this when you need the display name
 */
export async function getCountryDisplayName(iso2: string | null): Promise<string | null> {
  if (!iso2) {
    return null;
  }

  // This would require a database query to medusa.region_country
  // For now, return the ISO-2 code
  // In production, you'd query: SELECT display_name FROM medusa.region_country WHERE iso_2 = $1
  return iso2;
}

