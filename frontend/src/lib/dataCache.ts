/**
 * Data caching utility using sessionStorage with TTL (Time-To-Live).
 * 
 * This utility provides functions for caching data in the browser's session storage
 * with expiration times. Cached data is automatically cleared when it expires.
 */

const TTL_MINUTES = 5; // Cache data for 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Get cached data if it exists and hasn't expired.
 * 
 * @param key - Cache key
 * @returns Cached data or null if not found or expired
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) {
      return null;
    }

    const item: CachedData<T> = JSON.parse(itemStr);
    const now = Date.now();

    // Check if cache has expired
    if (now - item.timestamp > TTL_MINUTES * 60 * 1000) {
      sessionStorage.removeItem(key);
      return null;
    }

    return item.data;
  } catch (error) {
    sessionStorage.removeItem(key);
    return null;
  }
}

/**
 * Cache data with a timestamp.
 * 
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlMinutes - Time-to-live in minutes (default: 5)
 */
export function setCachedData<T>(key: string, data: T, ttlMinutes: number = TTL_MINUTES): void {
  const now = Date.now();
  const item: CachedData<T> = {
    data,
    timestamp: now,
  };
  try {
    sessionStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      sessionStorage.clear();
      try {
        sessionStorage.setItem(key, JSON.stringify(item));
      } catch (retryError) {
        // If still fails after clearing, give up
      }
    }
  }
}

/**
 * Clear cached data for a specific key.
 * 
 * @param key - Cache key to clear
 */
export function clearCachedData(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Clear all cached data.
 */
export function clearAllCachedData(): void {
  try {
    sessionStorage.clear();
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Clear expired cache entries.
 * This is useful to call periodically to clean up old cache entries.
 */
export function clearExpiredCache(): void {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      
      try {
        const itemStr = sessionStorage.getItem(key);
        if (!itemStr) continue;
        
        const item: CachedData<unknown> = JSON.parse(itemStr);
        if (now - item.timestamp > TTL_MINUTES * 60 * 1000) {
          keysToRemove.push(key);
        }
      } catch {
        // If parsing fails, remove the item
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch (error) {
    // Ignore errors
  }
}
