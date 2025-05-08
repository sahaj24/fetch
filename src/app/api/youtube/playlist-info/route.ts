import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

/**
 * Endpoint to get YouTube playlist information quickly and efficiently
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const playlistId = url.searchParams.get('id');
    
    if (!playlistId) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    // Format the YouTube playlist URL
    const youtubePlaylistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    
    // Get playlist information using the fast method
    const playlistInfo = await getPlaylistInfoFast(youtubePlaylistUrl);
    
    return NextResponse.json({
      title: playlistInfo.title,
      videoCount: playlistInfo.videoCount,
      isEstimate: playlistInfo.isEstimate
    });
    
  } catch (error) {
    console.error('Error getting playlist info:', error);
    // Return a reasonable estimate based on the playlistId format
    const estimatedCount = getPlaylistEstimate(request.url);
    
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
 * Fast method to get playlist info using Puppeteer
 * This method avoids scrolling and just extracts the count from the page header
 */
async function getPlaylistInfoFast(playlistUrl: string): Promise<{
  title: string;
  videoCount: number;
  isEstimate: boolean;
}> {
  // Use a strict timeout for the entire operation
  const TIMEOUT = 8000; // 8 seconds max
  
  // Launch the browser with minimal settings for speed
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-extensions',
    ],
    defaultViewport: { width: 800, height: 600 }
  });
  
  let timeoutId: NodeJS.Timeout;
  
  try {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${TIMEOUT}ms`));
      }, TIMEOUT);
    });
    
    // Create the actual scraping promise
    const scrapingPromise = (async () => {
      const page = await browser.newPage();
      
      // Block images, fonts, and CSS to speed up loading
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Set a realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      
      // Navigate to the YouTube playlist with minimal waiting
      await page.goto(playlistUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT - 1000 });
      
      // First try: Extract video count from page title or metadata without waiting for full load
      let videoCount = 0;
      let isEstimate = false;
      let title = 'YouTube Playlist';
      
      // Get the page title
      title = await page.title();
      title = title.replace(' - YouTube', '').trim();
      
      // METHOD 1: Extract from initial HTML response (fastest method)
      // YouTube often includes the video count in the initial HTML response
      const initialHtml = await page.content();
      
      // Try to find the playlist info in multiple formats
      
      // Format 1: Look for JSON data in the page that contains videoCount
      const jsonScriptMatch = initialHtml.match(/("playlistId":"[^"]+","title":"[^"]+"[^}]+"videoCount":)(\d+)/i);
      if (jsonScriptMatch && jsonScriptMatch[2]) {
        videoCount = parseInt(jsonScriptMatch[2], 10);
        console.log(`Found video count in JSON data: ${videoCount}`);
        
        // We found the count in the page data - it's accurate
        await browser.close();
        return {
          title,
          videoCount,
          isEstimate: false
        };
      }
      
      // Format 2: Try to extract from the page text
      // Wait a very short time for the stats to load, but with a strict timeout
      await Promise.race([
        page.waitForSelector('[class*="stats"], [class*="metadata-stats"], #stats', { timeout: 3000 }),
        new Promise(r => setTimeout(r, 3000))
      ]).catch(() => {});
      
      // Look for text containing "X videos" in multiple places
      const statsText = await page.evaluate(() => {
        // Try different selectors where YouTube might show video count
        const selectors = [
          '[class*="stats"]',
          '[class*="metadata-stats"]',
          '#stats',
          'yt-formatted-string:contains("video")',
          '.metadata-line',
          '.style-scope ytd-playlist-header-renderer'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent || '';
            if (text.includes('video')) {
              return text;
            }
          }
        }
        return '';
      });
      
      // Extract the video count from the stats text
      if (statsText) {
        const match = statsText.match(/(\d+)\s*videos?/i);
        if (match && match[1]) {
          videoCount = parseInt(match[1], 10);
          console.log(`Found video count in page text: ${videoCount}`);
        }
      }
      
      // If we found a count, return it as accurate
      if (videoCount > 0) {
        await browser.close();
        return {
          title,
          videoCount,
          isEstimate: false
        };
      }
      
      // METHOD 3: Count visible videos only (without scrolling)
      // This will give us a lower bound, but it's better than nothing
      const visibleVideoCount = await page.evaluate(() => {
        return document.querySelectorAll('ytd-playlist-video-renderer').length;
      });
      
      if (visibleVideoCount > 0) {
        // We'll estimate there's about 4x as many videos as initially visible
        // This is a rough estimate and might not be accurate
        videoCount = visibleVideoCount * 4;
        isEstimate = true;
        console.log(`Estimated ${videoCount} videos based on ${visibleVideoCount} visible`);
      }
      
      // If we still don't have a count, make an intelligent estimate based on the playlist ID
      if (videoCount === 0) {
        // Get a more reasonable estimate based on the URL pattern
        const url = new URL(playlistUrl);
        const playlistId = url.searchParams.get('list') || '';
        videoCount = getPlaylistEstimate(playlistId);
        isEstimate = true;
      }
      
      await browser.close();
      return {
        title,
        videoCount,
        isEstimate
      };
    })();
    
    // Race between the scraping operation and the timeout
    const result = await Promise.race([scrapingPromise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result as { title: string; videoCount: number; isEstimate: boolean };
    
  } catch (error) {
    // Make sure to clear the timeout if it exists
    if (timeoutId) clearTimeout(timeoutId);
    
    // Close the browser if it's still open
    try {
      await browser.close();
    } catch (e) {
      // Ignore browser close errors
    }
    
    // Extract the URL from the error for the fallback estimation
    let urlString = '';
    if (error instanceof Error && error.message.includes('http')) {
      const matches = error.message.match(/(https?:\/\/[^\s]+)/);
      if (matches) urlString = matches[0];
    }
    
    console.error('Error in fast playlist info retrieval:', error);
    
    // Return a reasonable estimate
    return {
      title: 'YouTube Playlist',
      videoCount: getPlaylistEstimate(playlistUrl),
      isEstimate: true
    };
  }
}

/**
 * Get a reasonable estimate for playlist size based on the URL pattern
 * This is used as a fallback when scraping fails
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