import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

// Tell Next.js this route is dynamic and shouldn't be statically optimized
export const dynamic = 'force-dynamic';

const execPromise = promisify(exec);

// Cache for playlist info to avoid repeated API calls
const playlistCache = new Map<string, { 
  data: PlaylistInfo; 
  timestamp: number; 
  ttl: number; 
}>();

interface PlaylistInfo {
  title: string;
  videoCount: number;
  isEstimate: boolean;
}

// Cache TTL: 10 minutes for accurate data, 30 minutes for estimates
const CACHE_TTL_ACCURATE = 10 * 60 * 1000; // 10 minutes
const CACHE_TTL_ESTIMATE = 30 * 60 * 1000; // 30 minutes

/**
 * Endpoint to get YouTube playlist information quickly and efficiently
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const playlistId = url.searchParams.get('id');
  
  try {
    if (!playlistId) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = getFromCache(playlistId);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Try multiple methods in order of speed and accuracy
    const playlistInfo = await getPlaylistInfoFast(playlistId);
    
    // Cache the result
    const ttl = playlistInfo.isEstimate ? CACHE_TTL_ESTIMATE : CACHE_TTL_ACCURATE;
    setCache(playlistId, playlistInfo, ttl);
    
    return NextResponse.json(playlistInfo);
  } catch (error) {
    console.error('Error getting playlist info:', error);
    // Return a reasonable estimate based on the playlistId format
    const estimatedCount = getPlaylistEstimate(playlistId || '');
    
    return NextResponse.json(
      { 
        title: "YouTube Playlist",
        videoCount: estimatedCount,
        isEstimate: true,
        error: 'Failed to fetch playlist information' 
      },
      { status: 200 } // Return 200 with estimate even on error
    );
  }
}

/**
 * Fast method to get playlist info using multiple approaches
 */
async function getPlaylistInfoFast(playlistId: string): Promise<PlaylistInfo> {
  // Method 1: Try YouTube Data API v3 (fastest and most accurate)
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const result = await getPlaylistInfoFromAPI(playlistId);
      if (result) {
        return result;
      }
    } catch (error) {
    }
  }

  // Method 2: Use direct playlist processing (no external commands or JSON parsing)
  try {
    console.log('🚀 [PLAYLIST-INFO] Using direct playlist processing for playlist info');
    
    // Use the same logic as the main processor to ensure consistency
    let videoIds: string[] = [];
    
    // Try YouTube Data API v3 first (if available)
    if (process.env.YOUTUBE_API_KEY) {
      console.log('📡 [PLAYLIST-INFO] Attempting YouTube Data API...');
      try {
        const response = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems`, {
          params: {
            part: 'snippet',
            maxResults: 200,
            playlistId: playlistId,
            key: process.env.YOUTUBE_API_KEY
          },
          timeout: 15000,
          headers: {
            'User-Agent': 'fetchsub.com/1.0 (YouTube Transcript Service)',
            'Accept': 'application/json'
          }
        });
        
        // Direct object access - no JSON.parse() needed since axios handles it
        if (response.data?.items && Array.isArray(response.data.items) && response.data.items.length > 0) {
          videoIds = response.data.items
            .map((item: any) => item?.snippet?.resourceId?.videoId)
            .filter((id: string) => id && typeof id === 'string' && id.length === 11);
          
          if (videoIds.length > 0) {
            console.log(`✅ [PLAYLIST-INFO] YouTube API success: ${videoIds.length} videos`);
          }
        }
      } catch (apiError) {
        console.log(`⚠️ [PLAYLIST-INFO] YouTube API failed:`, apiError instanceof Error ? apiError.message : 'Unknown error');
      }
    }
    
    // If API didn't work, try web scraping
    if (videoIds.length === 0) {
      console.log('🌐 [PLAYLIST-INFO] Attempting web scraping...');
      try {
        const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
        const response = await axios.get(playlistUrl, {
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          maxRedirects: 3
        });

        if (response.data && typeof response.data === 'string') {
          // Extract video IDs using regex patterns - NO JSON PARSING
          const videoIdPatterns = [
            /"videoId":"([^"]{11})"/g,
            /href="\/watch\?v=([^"&]{11})[^"]*"/g
          ];

          const foundIds = new Set<string>();
          
          for (const pattern of videoIdPatterns) {
            let match;
            while ((match = pattern.exec(response.data)) !== null) {
              if (match[1] && match[1].length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
                foundIds.add(match[1]);
              }
            }
          }

          videoIds = Array.from(foundIds);
          if (videoIds.length > 0) {
            console.log(`✅ [PLAYLIST-INFO] Web scraping success: ${videoIds.length} videos`);
          }
        }
      } catch (webError) {
        console.log(`⚠️ [PLAYLIST-INFO] Web scraping failed:`, webError instanceof Error ? webError.message : 'Unknown error');
      }
    }
    
    // Use fallback if still no videos found
    if (videoIds.length === 0) {
      console.log('🆘 [PLAYLIST-INFO] Using fallback count');
      videoIds = ['fallback']; // Just to get a count, we don't need actual IDs for playlist info
    }
    
    if (videoIds.length > 0) {
      // Create playlist info from the successful video extraction
      const result: PlaylistInfo = {
        title: "YouTube Playlist", // Default title - will be enhanced later if needed
        videoCount: videoIds.length === 1 && videoIds[0] === 'fallback' ? 8 : videoIds.length,
        isEstimate: videoIds[0] === 'fallback'
      };
      
      console.log(`✅ [PLAYLIST-INFO] Direct processor success: ${result.videoCount} videos`);
      return result;
    }
  } catch (error) {
    console.error('⚠️ [PLAYLIST-INFO] Direct processor failed:', error);
  }

  // Method 3: Try web scraping without browser (lighter weight)
  try {
    const result = await getPlaylistInfoFromWeb(playlistId);
    if (result && result.videoCount > 0) {
      return result;
    }
  } catch (error) {
  }

  // Method 4: Fallback to intelligent estimate
  return {
    title: 'YouTube Playlist',
    videoCount: getPlaylistEstimate(playlistId),
    isEstimate: true
  };
}

/**
 * Get playlist info using YouTube Data API v3
 */
async function getPlaylistInfoFromAPI(playlistId: string): Promise<PlaylistInfo | null> {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return null;

    // Get playlist details
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`;
    const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=0&playlistId=${playlistId}&key=${apiKey}`;
    
    // Make parallel requests
    const [playlistResponse, itemsResponse] = await Promise.all([
      axios.get(playlistUrl, { timeout: 5000 }),
      axios.get(itemsUrl, { timeout: 5000 })
    ]);

    const playlistData = playlistResponse.data;
    const itemsData = itemsResponse.data;

    if (!playlistData.items || playlistData.items.length === 0) {
      return null;
    }

    const title = playlistData.items[0].snippet.title;
    const videoCount = itemsData.pageInfo?.totalResults || 0;
    
    return {
      title,
      videoCount,
      isEstimate: false
    };
  } catch (error) {
    console.error('Error in YouTube API method:', error);
    return null;
  }
}



/**
 * Get playlist info using lightweight web scraping
 */
async function getPlaylistInfoFromWeb(playlistId: string): Promise<PlaylistInfo | null> {
  try {
    const url = `https://www.youtube.com/playlist?list=${playlistId}`;
    
    // Fetch the playlist page
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000
    });
    
    const html = response.data;
    
    // Extract title
    const titleMatch = html.match(/<title>(.+?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : 'YouTube Playlist';
    
    // Extract video count using multiple patterns
    const countMatches = [
      // Pattern 1: "123 videos"
      html.match(/(\d+)\s+video/i),
      // Pattern 2: "Updated last on Apr 1, 2023 • 123 videos"
      html.match(/•\s*(\d+)\s+video/i),
      // Pattern 3: In header stats
      html.match(/headerSubtext.*?(\d+)\s+video/i),
      // Pattern 4: In metadata
      html.match(/videosCountText.*?(\d+)\s+video/i)
    ];
    
    // Find the first successful match
    const countMatch = countMatches.find(match => match && match[1]);
    
    if (countMatch && countMatch[1]) {
      const count = parseInt(countMatch[1], 10);
      return {
        title,
        videoCount: count,
        isEstimate: false
      };
    }
    
    // Count video items in the page as a last resort
    const videoItemCount = (html.match(/"videoId":"/g) || []).length;
    
    if (videoItemCount > 0) {
      return {
        title,
        videoCount: videoItemCount,
        isEstimate: true // This is likely an undercount
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error in web scraping method:', error);
    return null;
  }
}

/**
 * Get from cache if valid
 */
function getFromCache(playlistId: string): PlaylistInfo | null {
  const cached = playlistCache.get(playlistId);
  
  if (cached) {
    const now = Date.now();
    if (now - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    // Remove expired cache
    playlistCache.delete(playlistId);
  }
  
  return null;
}

/**
 * Set cache with TTL
 */
function setCache(playlistId: string, data: PlaylistInfo, ttl: number): void {
  // Clean up expired cache items periodically
  if (playlistCache.size > 50) {
    cleanupCache();
  }
  
  // Set new cache
  playlistCache.set(playlistId, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

/**
 * Clean up expired cache entries
 */
function cleanupCache(): void {
  const now = Date.now();
  
  // Use entries() to get iterator
  const entries = playlistCache.entries();
  
  // Convert iterator to array to avoid modification during iteration
  const entriesArray = Array.from(entries);
  
  for (const [key, value] of entriesArray) {
    if (now - value.timestamp > value.ttl) {
      playlistCache.delete(key);
    }
  }
}

/**
 * Get a reasonable estimate for playlist size based on the URL pattern
 * This is used as a fallback when all other methods fail
 */
function getPlaylistEstimate(urlOrId: string): number {
  // Extract playlist ID from URL if needed
  let playlistId = urlOrId;
  if (urlOrId.includes('list=')) {
    const match = urlOrId.match(/[?&]list=([^&]+)/i);
    if (match && match[1]) {
      playlistId = match[1];
    }
  }
  
  // Different types of playlists tend to have different sizes
  
  // Music playlists (often starting with PL, RDCL, OLAK5uy) tend to be larger
  if (
    playlistId.startsWith('PL') || 
    playlistId.startsWith('RDCL') || 
    playlistId.startsWith('OLAK5uy')
  ) {
    return 25; // Music playlists tend to be larger
  }
  
  // "Watch later" or "Liked videos" playlists
  if (playlistId.startsWith('LL') || playlistId.includes('watchlater')) {
    return 30;
  }
  
  // Education playlists (often with PL prefix and relatively shorter)
  if (
    playlistId.startsWith('PLZ') || 
    playlistId.startsWith('PLE') || 
    playlistId.startsWith('PLT')
  ) {
    return 15;
  }
  
  // YouTube-generated topic playlists
  if (playlistId.startsWith('RDCL')) {
    return 20;
  }
  
  // Default case - regular user-created playlist
  return 18;
}
