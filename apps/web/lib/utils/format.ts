/**
 * Standardized formatting utilities for currency and dates
 * Use these across the app for consistent formatting
 */

/**
 * Format monetary values for display
 * 
 * @param amount - Amount in minor units (cents) or major units based on isMinorUnits flag
 * @param currency - Currency code (e.g., 'EUR', 'USD')
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "€100.00")
 */
export function formatCurrency(
  amount: number,
  currency: string = 'EUR',
  options: {
    isMinorUnits?: boolean;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    isMinorUnits = true, // Default: amount is in cents
    locale = 'da-DK', // Danish locale for Huddle
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  // Convert to major units if amount is in minor units
  const majorAmount = isMinorUnits ? amount / 100 : amount;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(majorAmount);
}

/**
 * Format date for display
 * 
 * @param date - Date string or Date object
 * @param format - Predefined format type
 * @param locale - Locale for formatting
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: 'short' | 'medium' | 'long' | 'relative' = 'medium',
  locale: string = 'da-DK'
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  switch (format) {
    case 'short':
      // e.g., "24/12/25"
      return new Intl.DateTimeFormat(locale, {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
      }).format(dateObj);

    case 'medium':
      // e.g., "24. dec. 2025"
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(dateObj);

    case 'long':
      // e.g., "24. december 2025"
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);

    case 'relative':
      return formatRelativeDate(dateObj, locale);

    default:
      return dateObj.toLocaleDateString(locale);
  }
}

/**
 * Format date as relative time (e.g., "2 days ago", "in 3 hours")
 */
function formatRelativeDate(date: Date, locale: string): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, 'day');
  } else if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, 'hour');
  } else {
    return rtf.format(diffMinutes, 'minute');
  }
}

/**
 * Format datetime for display (date + time)
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  locale: string = 'da-DK'
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

