/**
 * Utility functions for formatting numbers and percentages
 */

/**
 * Format a number as a percentage, handling NaN and invalid values
 * @param value - The number to format as percentage
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "0.0%" or "45.5%")
 */
export function formatPercentage(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return "0%";
  }
  // Always round to whole numbers, no decimals
  return `${Math.round(value)}%`;
}

/**
 * Format a number, handling NaN and invalid values
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string (e.g., "0.0" or "45.5")
 */
export function formatNumber(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return "0";
  }
  // Always round to whole numbers, no decimals
  return Math.round(value).toString();
}

/**
 * Safely calculate percentage with fallback to 0
 * @param numerator - The numerator value
 * @param denominator - The denominator value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Percentage value or 0 if calculation fails
 */
export function safePercentage(numerator: number | null | undefined, denominator: number | null | undefined, decimals: number = 1): number {
  if (!numerator || !denominator || isNaN(numerator) || isNaN(denominator) || denominator === 0) {
    return 0;
  }
  const percentage = (numerator / denominator) * 100;
  // Always round to whole numbers, no decimals
  return isNaN(percentage) || !isFinite(percentage) ? 0 : Math.round(percentage);
}

