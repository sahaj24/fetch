/**
 * Robust caching system for FetchSub
 * Provides efficient caching mechanisms with fallbacks and error handling
 */

// Cache storage interfaces
export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Force refresh even if cache exists */
  forceRefresh?: boolean;
  /** Optional version identifier for cache invalidation */
  version?: string;
}

export interface CacheItem<T> {
  /** Cached data */
  data: T;
  /** Timestamp when cached */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Version of the cached data */
  version: string;
  /** Original key used to store the item */
  key: string;
}

/**
 * Multi-level cache service that provides:
 * - Memory cache (fastest, but clears on page refresh)
 * - LocalStorage cache (persists between sessions)
 * - Automatic cache invalidation
 * - Type safety
 * - Error handling and fallbacks
 */
class CacheService {
  // Default TTL is 1 hour
  private readonly DEFAULT_TTL = 60 * 60 * 1000;
  private readonly DEFAULT_VERSION = 'v1';
  // Memory cache for fastest access
  private memoryCache: Map<string, CacheItem<any>> = new Map();
  // Prefix for all cache keys to avoid collisions with other apps
  private readonly PREFIX = 'fetchsub_cache_';
  
  constructor() {
    // Clean up expired cache on initialization
    this.cleanExpiredCache();
    
    // Set up periodic cleanup (every 5 minutes)
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanExpiredCache(), 5 * 60 * 1000);
    }
  }
  
  /**
   * Get an item from cache with full type safety
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const cacheKey = this.createKey(key);
    const { ttl = this.DEFAULT_TTL, forceRefresh = false, version = this.DEFAULT_VERSION } = options;
    
    // If force refresh is enabled, skip cache
    if (forceRefresh) {
      return null;
    }
    
    try {
      // First try memory cache (fastest)
      const memoryItem = this.memoryCache.get(cacheKey);
      if (memoryItem && !this.isExpired(memoryItem) && memoryItem.version === version) {
        return memoryItem.data as T;
      }
      
      // Then try localStorage (if available)
      if (typeof window !== 'undefined') {
        const localStorageItem = localStorage.getItem(cacheKey);
        
        if (localStorageItem) {
          try {
            const parsedItem: CacheItem<T> = JSON.parse(localStorageItem);
            
            // Check if item is valid
            if (!this.isExpired(parsedItem) && parsedItem.version === version) {
              // Store in memory cache for faster future access
              this.memoryCache.set(cacheKey, parsedItem);
              return parsedItem.data;
            }
            
            // If item is expired or version mismatch, remove it
            this.remove(key);
          } catch (error) {
            console.error('Cache parse error:', error);
            // If parsing fails, remove the corrupted item
            this.remove(key);
          }
        }
      }
    } catch (error) {
      console.error('Cache retrieval error:', error);
      // Fail gracefully by returning null
    }
    
    return null;
  }
  
  /**
   * Store an item in cache
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const cacheKey = this.createKey(key);
    const { ttl = this.DEFAULT_TTL, version = this.DEFAULT_VERSION } = options;
    
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version,
        key
      };
      
      // Store in memory cache
      this.memoryCache.set(cacheKey, item);
      
      // Store in localStorage if available
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(item));
        } catch (error) {
          // Handle localStorage quota exceeded
          if (error instanceof DOMException && (
            error.code === 22 || // Chrome
            error.code === 1014 || // Firefox
            error.name === 'QuotaExceededError'
          )) {
            console.warn('Cache storage quota exceeded, clearing old items');
            this.clearOldestItems(cacheKey, item);
          } else {
            console.error('Cache storage error:', error);
          }
        }
      }
    } catch (error) {
      console.error('Cache set error:', error);
      // Fail gracefully
    }
  }
  
  /**
   * Remove an item from cache
   */
  remove(key: string): void {
    try {
      const cacheKey = this.createKey(key);
      
      // Remove from memory cache
      this.memoryCache.delete(cacheKey);
      
      // Remove from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(cacheKey);
      }
    } catch (error) {
      console.error('Cache removal error:', error);
      // Fail gracefully
    }
  }
  
  /**
   * Clear all cache
   */
  clear(): void {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      
      // Clear localStorage (only our cache items)
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(this.PREFIX)) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.error('Cache clear error:', error);
      // Fail gracefully
    }
  }
  
  /**
   * Check if a key exists in cache and is valid
   */
  async has(key: string, options: CacheOptions = {}): Promise<boolean> {
    const value = await this.get(key, options);
    return value !== null;
  }
  
  /**
   * Get cached value or execute function to fetch and cache the value
   * Perfect for API calls that should be cached
   */
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cachedValue = await this.get<T>(key, options);
      if (cachedValue !== null) {
        return cachedValue;
      }
      
      // If not in cache, execute the fetch function
      const freshValue = await fetchFn();
      
      // Store the fetched value in cache
      await this.set(key, freshValue, options);
      
      return freshValue;
    } catch (error) {
      console.error(`Error in getOrSet for key ${key}:`, error);
      throw error; // Re-throw to let caller handle it
    }
  }
  
  /**
   * Clear all expired cache items
   */
  private cleanExpiredCache(): void {
    try {
      // Clean memory cache
      // Convert Map entries iterator to array to avoid TypeScript downlevelIteration error
      Array.from(this.memoryCache.entries()).forEach(([key, item]) => {
        if (this.isExpired(item)) {
          this.memoryCache.delete(key);
        }
      });
      
      // Clean localStorage
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(this.PREFIX)) {
            try {
              const item = JSON.parse(localStorage.getItem(key) as string);
              if (this.isExpired(item)) {
                localStorage.removeItem(key);
              }
            } catch (e) {
              // If we can't parse it, remove it
              localStorage.removeItem(key);
            }
          }
        });
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
      // Fail gracefully
    }
  }
  
  /**
   * Create a prefixed key to avoid collisions
   */
  private createKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }
  
  /**
   * Check if a cache item is expired
   */
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() > item.timestamp + item.ttl;
  }
  
  /**
   * Clear oldest items from localStorage to make space for a new item
   */
  private clearOldestItems(newKey: string, newItem: CacheItem<any>): void {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheItems: { key: string; timestamp: number }[] = [];
      
      // Collect all cache items with their timestamps
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.PREFIX) && key !== newKey) {
          try {
            const item = JSON.parse(localStorage.getItem(key) as string);
            cacheItems.push({ key, timestamp: item.timestamp });
          } catch (e) {
            // Remove corrupted items
            localStorage.removeItem(key);
          }
        }
      });
      
      // Sort by timestamp (oldest first)
      cacheItems.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest items until we can store the new item
      // Try to remove up to half of the existing items
      const removeCount = Math.max(Math.ceil(cacheItems.length / 2), 5);
      
      for (let i = 0; i < removeCount; i++) {
        if (cacheItems[i]) {
          localStorage.removeItem(cacheItems[i].key);
        }
      }
      
      // Try to store the new item again
      localStorage.setItem(newKey, JSON.stringify(newItem));
    } catch (error) {
      console.error('Error clearing oldest cache items:', error);
      // If still fails, just store in memory
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export type-safe cached function creator
export function createCachedFunction<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  keyGenerator: (...args: Args) => string,
  options: CacheOptions = {}
) {
  return async (...args: Args): Promise<T> => {
    const key = keyGenerator(...args);
    return cacheService.getOrSet(key, () => fn(...args), options);
  };
}
