/**
 * Cache utility functions for FetchSub
 * Provides utility functions for working with the cache service
 */

import { cacheService } from './cache-service';

/**
 * Cache statistics interface
 */
export interface CacheStats {
  totalItems: number;
  totalMemoryUsage: number; // in bytes
  oldestItemAge: number; // in milliseconds
  cacheHitRate: number; // 0-1 ratio
}

// Track cache hits and misses for statistics
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Measure cache hit rate by incrementing counters
 */
export function trackCacheHit(isHit: boolean): void {
  if (isHit) {
    cacheHits++;
  } else {
    cacheMisses++;
  }
}

/**
 * Reset cache hit statistics
 */
export function resetCacheStats(): void {
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  let totalItems = 0;
  let totalMemoryUsage = 0;
  let oldestTimestamp = Date.now();
  
  if (typeof window !== 'undefined') {
    // Count items and estimate size
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('fetchsub_cache_')) {
        totalItems++;
        
        try {
          const item = localStorage.getItem(key);
          if (item) {
            totalMemoryUsage += item.length * 2; // UTF-16 encoding (2 bytes per character)
            
            const parsedItem = JSON.parse(item);
            if (parsedItem.timestamp && parsedItem.timestamp < oldestTimestamp) {
              oldestTimestamp = parsedItem.timestamp;
            }
          }
        } catch (e) {
          // Skip corrupted items
        }
      }
    });
  }
  
  const oldestItemAge = Date.now() - oldestTimestamp;
  const totalAttempts = cacheHits + cacheMisses;
  const cacheHitRate = totalAttempts > 0 ? cacheHits / totalAttempts : 0;
  
  return {
    totalItems,
    totalMemoryUsage,
    oldestItemAge,
    cacheHitRate
  };
}

/**
 * Format cache size in human-readable format
 */
export function formatCacheSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

/**
 * Format cache age in human-readable format
 */
export function formatCacheAge(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 60 * 60) {
    return `${Math.floor(seconds / 60)} minutes`;
  } else if (seconds < 60 * 60 * 24) {
    return `${Math.floor(seconds / (60 * 60))} hours`;
  } else {
    return `${Math.floor(seconds / (60 * 60 * 24))} days`;
  }
}
