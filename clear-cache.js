/**
 * FetchSub Cache Cleanup Script
 * 
 * Run this script in your browser's developer console to clear any remaining
 * cache data from localStorage after the cache system has been removed.
 * 
 * Usage:
 * 1. Open your browser's developer tools (F12)
 * 2. Go to the Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to run it
 */

(function clearFetchSubCache() {
  console.log('🧹 Starting FetchSub cache cleanup...');
  
  let keysCleared = 0;
  const keysToRemove = [];
  
  // Find all localStorage keys that start with our cache prefix
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('fetchsub_cache_')) {
      keysToRemove.push(key);
    }
  }
  
  // Remove the cache keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    keysCleared++;
    console.log(`🗑️ Removed cache key: ${key}`);
  });
  
  // Also clear any cache statistics or metadata
  const metadataKeys = [
    'fetchsub_cache_stats',
    'fetchsub_cache_hits',
    'fetchsub_cache_misses',
    'fetchsub_cache_last_cleanup'
  ];
  
  metadataKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      keysCleared++;
      console.log(`🗑️ Removed metadata key: ${key}`);
    }
  });
  
  if (keysCleared > 0) {
    console.log(`✅ Cache cleanup complete! Removed ${keysCleared} cache entries.`);
  } else {
    console.log('✅ No cache entries found. Your localStorage is already clean!');
  }
  
  // Log current localStorage usage
  const remainingKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('fetchsub_') || key.includes('cache')
  );
  
  if (remainingKeys.length > 0) {
    console.log('ℹ️ Other FetchSub-related keys still present:', remainingKeys);
  }
})();
