import type { Country } from "react-phone-number-input";
import * as Sentry from "@sentry/nextjs";

/**
 * Detect user's country from browser settings
 * Falls back to DK (Denmark) if detection fails
 */
export function detectUserCountry(): Country {
  try {
    // Try to get country from browser locale
    const nav = navigator as Navigator & { userLanguage?: string };
    const locale = nav.language || nav.userLanguage;
    
    if (locale) {
      // Extract country code from locale (e.g., "da-DK" -> "DK", "en-US" -> "US")
      const parts = locale.split("-");
      if (parts.length > 1) {
        const countryCode = parts[1].toUpperCase();
        // Validate it's a 2-letter code
        if (countryCode.length === 2) {
          return countryCode as Country;
        }
      }
    }

    // Fallback to Denmark for Huddle's primary market
    return "DK" as Country;
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        scope: "detect-country",
        operation: "detectUserCountry",
      },
    });
    return "DK" as Country;
  }
}

/**
 * Get country name from country code
 */
export function getCountryName(countryCode: Country): string {
  const countryNames: Record<string, string> = {
    DK: "Denmark",
    SE: "Sweden",
    NO: "Norway",
    DE: "Germany",
    GB: "United Kingdom",
    US: "United States",
    // Add more as needed
  };
  
  return countryNames[countryCode] || countryCode;
}
