/**
 * Utility functions for jersey-related operations
 * Shared across components for consistency
 */

/**
 * Convert condition rating number to human-readable label
 * @param rating - Condition rating (1-10)
 * @returns Label string (e.g., "Mint", "Excellent", "Good", "Fair", "Poor")
 */
export function getConditionLabel(rating: number | null | undefined): string {
  if (!rating) return "";
  if (rating >= 9) return "Mint";
  if (rating >= 7) return "Excellent";
  if (rating >= 5) return "Good";
  if (rating >= 3) return "Fair";
  return "Poor";
}

