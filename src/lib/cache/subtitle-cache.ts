/**
 * Subtitle caching utilities for FetchSub
 * Browser-compatible implementation - no server-side dependencies
 */

import { cacheService } from './cache-service';

// Types
export interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

/**
 * Cache time configuration in milliseconds
 */
const CACHE_TIMES = {
  // Subtitles are cached for 7 days
  SUBTITLES: 7 * 24 * 60 * 60 * 1000,
  // Video info is cached for 24 hours
  VIDEO_INFO: 24 * 60 * 60 * 1000,
};

/**
 * YouTube URL to Video ID extraction
 * Client-side implementation that doesn't rely on server utils
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  // Regular YouTube watch URL
  const watchRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const watchMatch = url.match(watchRegex);
  
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1]; // Return the video ID
  }
  
  return null;
}

/**
 * Creates a cache key for a YouTube video's subtitles
 */
export function createSubtitleCacheKey(videoId: string, language: string): string {
  return `subtitle_${videoId}_${language}`;
}

/**
 * Creates a cache key for YouTube video info
 */
export function createVideoInfoCacheKey(videoId: string): string {
  return `video_info_${videoId}`;
}

/**
 * Store subtitle content in cache
 */
export async function cacheSubtitles(
  videoId: string,
  language: string,
  subtitles: TranscriptItem[]
): Promise<void> {
  try {
    const cacheKey = createSubtitleCacheKey(videoId, language);
    await cacheService.set(cacheKey, subtitles, { ttl: CACHE_TIMES.SUBTITLES });
  } catch (error) {
    console.error('Error caching subtitles:', error);
  }
}

/**
 * Get subtitles from cache
 */
export async function getSubtitlesFromCache(
  videoId: string,
  language: string
): Promise<TranscriptItem[] | null> {
  try {
    const cacheKey = createSubtitleCacheKey(videoId, language);
    return await cacheService.get<TranscriptItem[]>(cacheKey);
  } catch (error) {
    console.error('Error getting subtitles from cache:', error);
    return null;
  }
}

/**
 * Fetch and cache content from a subtitle object
 */
export async function cacheSubtitleContent(
  subtitleId: string,
  content: string
): Promise<void> {
  try {
    const cacheKey = `subtitle_content_${subtitleId}`;
    await cacheService.set(cacheKey, content, { ttl: CACHE_TIMES.SUBTITLES });
  } catch (error) {
    console.error('Error caching subtitle content:', error);
  }
}

/**
 * Get subtitle content from cache
 */
export async function getSubtitleContentFromCache(
  subtitleId: string
): Promise<string | null> {
  try {
    const cacheKey = `subtitle_content_${subtitleId}`;
    return await cacheService.get<string>(cacheKey);
  } catch (error) {
    console.error('Error getting subtitle content from cache:', error);
    return null;
  }
}

/**
 * Clears subtitle cache for a specific video
 */
export function clearSubtitleCache(videoId: string, language?: string): void {
  if (language) {
    // Clear specific language
    cacheService.remove(createSubtitleCacheKey(videoId, language));
  } else {
    // Clear all languages by removing all keys that match the video ID
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.includes(`subtitle_${videoId}`)) {
          const cacheKey = key.replace('fetchsub_cache_', '');
          cacheService.remove(cacheKey);
        }
      });
    }
  }
}

/**
 * Get all cached subtitles information
 */
export function getCachedSubtitlesList(): { videoId: string; language: string; cachedAt: Date }[] {
  const results: { videoId: string; language: string; cachedAt: Date }[] = [];
  
  if (typeof window === 'undefined') {
    return results;
  }
  
  try {
    // Find all subtitle cache entries
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('fetchsub_cache_subtitle_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key) as string);
          
          // Parse the key to extract videoId and language
          // Format: fetchsub_cache_subtitle_VIDEOID_LANGUAGE
          const parts = key.replace('fetchsub_cache_subtitle_', '').split('_');
          
          if (parts.length >= 2) {
            const videoId = parts[0];
            const language = parts[1];
            
            results.push({
              videoId,
              language,
              cachedAt: new Date(item.timestamp)
            });
          }
        } catch (e) {
          // Skip corrupted items
          console.error('Error parsing cache item:', e);
        }
      }
    });
  } catch (error) {
    console.error('Error getting cached subtitles list:', error);
  }
  
  // Sort by most recently cached
  return results.sort((a, b) => b.cachedAt.getTime() - a.cachedAt.getTime());
}
