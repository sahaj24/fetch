import { NextRequest, NextResponse } from "next/server";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { 
  extractVideoId, 
  getVideoInfo, 
  generateSubtitles, 
  fetchTranscript,
  getPlaylistVideoIds,
  getChannelVideoIds,
  parseCSVContent,
  processBatchWithConcurrency,
  SubtitleResult,
  TranscriptItem,
  getLanguageName
} from "./utils";
import { OPERATION_COSTS } from "@/app/coins/utils";
import { supabase } from "@/supabase/config";
import { deductCoinsForOperation } from "@/utils/coinUtils";
import { validateApiRoute, createApiResponse, createApiErrorResponse, logApiRequest } from "@/lib/apiUtils";

// PRODUCTION DEBUGGING: Add explicit route checking
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Production environment check
const isProduction = process.env.NODE_ENV === 'production';

// Cloud environment detection
const isCloudEnvironment = !!(
  process.env.VERCEL ||
  process.env.NETLIFY ||
  process.env.HEROKU ||
  process.env.RAILWAY ||
  process.env.AWS_REGION ||
  process.env.CF_PAGES || // Cloudflare Pages
  process.env.RENDER || // Render.com
  isProduction
);

// Site routing configuration
const SITE_ROUTING_CONFIG = {
  // More conservative limits for site-routed requests
  MAX_CONCURRENT_SITE_ROUTED: 1,
  MAX_VIDEOS_SITE_ROUTED: 200, // Increased to 200 to handle very large playlists
  TIMEOUT_SITE_ROUTED: 7200000, // DO NOT CHANGE: 2 hours for site-routed requests (playlist processing needs time)
  TIMEOUT_DIRECT: 7200000, // DO NOT CHANGE: 2 hours for direct requests (playlist processing needs time)
};

// Function to detect if request is coming through site routing
function isSiteRoutedRequest(req: NextRequest): boolean {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIp = req.headers.get('x-real-ip');
  const referer = req.headers.get('referer') || '';
  const host = req.headers.get('host') || '';
  
  return !!(xForwardedFor || xRealIp || 
    referer.includes('yoursite.com') || // Replace with actual site domain
    referer.includes('netlify.app') ||
    referer.includes('vercel.app') ||
    (host !== 'localhost:3000' && host !== 'localhost:3001' && !host.includes('127.0.0.1')));
}

// Function to log production debugging info
function logProductionDebug(message: string, data?: any) {
  if (isProduction) {
    console.log(`[PRODUCTION DEBUG] ${message}`, data ? JSON.stringify(data) : '');
  }
}

// Enhanced error handler for production
function handleProductionError(error: any, context: string): NextResponse {
  logProductionDebug(`Error in ${context}:`, {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
  
  // Always return JSON, never HTML
  return NextResponse.json({
    error: error.message || 'Internal server error',
    context,
    production: isProduction,
    timestamp: new Date().toISOString()
  }, { 
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Route': 'youtube-extract'
    }
  });
}

// Create a simple in-memory cache for transcripts to avoid redundant fetching
type TranscriptCache = {
  [key: string]: {
    transcript: TranscriptItem[];
    videoInfo: { title: string; duration: number };
    timestamp: number;
  };
};

// Negative cache for videos that don't have subtitles
type NegativeCache = {
  [key: string]: {
    reason: 'SUBTITLES_DISABLED' | 'UNAVAILABLE' | 'PRIVATE';
    timestamp: number;
  };
};

// Cache will expire after 15 minutes for successful results (increased from 10)
// Negative cache expires after 3 minutes for failed results (decreased from 5)
const CACHE_EXPIRY_MS = 15 * 60 * 1000;
const NEGATIVE_CACHE_EXPIRY_MS = 3 * 60 * 1000;
const transcriptCache: TranscriptCache = {};
const negativeCache: NegativeCache = {};

// Cache cleanup function to prevent memory issues
function cleanupCaches() {
  const now = Date.now();
  
  // Clean up expired positive cache entries
  for (const key in transcriptCache) {
    if (now - transcriptCache[key].timestamp > CACHE_EXPIRY_MS) {
      delete transcriptCache[key];
    }
  }
  
  // Clean up expired negative cache entries
  for (const key in negativeCache) {
    if (now - negativeCache[key].timestamp > NEGATIVE_CACHE_EXPIRY_MS) {
      delete negativeCache[key];
    }
  }
}

// Run cache cleanup every 5 minutes
setInterval(cleanupCaches, 5 * 60 * 1000);

// Cloud-aware configuration
const CLOUD_MAX_CONCURRENT = 1;
const CLOUD_MAX_VIDEOS = 200; // Increased to 200 to handle very large playlists
const LOCAL_MAX_CONCURRENT = 3;
const LOCAL_MAX_VIDEOS = Number.MAX_SAFE_INTEGER;

// Dynamic configuration based on environment and routing
function getProcessingConfig(isSiteRouted: boolean) {
  if (isSiteRouted) {
    // Most conservative settings for site-routed requests
    return {
      maxConcurrent: SITE_ROUTING_CONFIG.MAX_CONCURRENT_SITE_ROUTED,
      maxVideos: SITE_ROUTING_CONFIG.MAX_VIDEOS_SITE_ROUTED,
      timeout: SITE_ROUTING_CONFIG.TIMEOUT_SITE_ROUTED
    };
  } else if (isCloudEnvironment) {
    // Cloud settings for direct requests
    return {
      maxConcurrent: CLOUD_MAX_CONCURRENT,
      maxVideos: CLOUD_MAX_VIDEOS,
      timeout: SITE_ROUTING_CONFIG.TIMEOUT_DIRECT
    };
  } else {
    // Local development settings
    return {
      maxConcurrent: LOCAL_MAX_CONCURRENT,
      maxVideos: LOCAL_MAX_VIDEOS,
      timeout: SITE_ROUTING_CONFIG.TIMEOUT_DIRECT
    };
  }
}

// Legacy constants for backward compatibility
const MAX_CONCURRENT_REQUESTS = 3;
const MAX_VIDEOS_PER_BATCH = Number.MAX_SAFE_INTEGER;

// Update SubtitleResult interface to include the new properties used in the code
interface ExtendedSubtitleResult extends SubtitleResult {
  isPlaylistOrChannel?: boolean;
  isBeingProcessed?: boolean;
  notice?: string;
}

// Function to extract subtitles from YouTube video with optimizations
async function extractSubtitles(url: string, format: string, language: string): Promise<ExtendedSubtitleResult> {
  // Extract video ID from URL - do this only once
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }
  
  // Handle different URL types (single video, playlist, channel)
  let actualVideoId = videoId;
  let videoInfo;
  
  // Get video information
  if (videoId.startsWith('playlist:')) {
    // For playlist URLs, directly start batch processing through processYouTubeUrl
    // This allows users to simply paste playlist URLs and get all videos processed
    const playlistId = videoId.replace('playlist:', '');
    
    // Get basic playlist info to return to the user
    videoInfo = await getVideoInfo(videoId);
    
    try {
      // Add playlist metadata to help with display in the UI
      const playlistName = videoInfo.title || "YouTube Playlist";
      return {
        id: `${videoId}-${format}-${language}`,
        videoTitle: `${playlistName} (Processing All Videos)`,
        language: getLanguageName(language),
        format,
        fileSize: '0KB',
        content: `Processing playlist: ${playlistName}\n\nThis playlist URL will be processed automatically and all available videos will have their subtitles extracted.`,
        url,
        isPlaylistOrChannel: true,
        isBeingProcessed: true,  // Flag to indicate this is being actively processed
        downloadUrl: ``
      };
    } catch (error) {
      console.error(`Error handling playlist URL: ${error}`);
      throw new Error(`Failed to process playlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else if (videoId.startsWith('channel:')) {
    // For channel URLs, we'll keep the existing behavior
    videoInfo = await getVideoInfo(videoId);
    return {
      id: `${videoId}-${format}-${language}`,
      videoTitle: videoInfo.title,
      language: getLanguageName(language),
      format,
      fileSize: '0KB',
      content: 'This is a channel URL. Please use the batch processing option to extract subtitles from multiple videos.',
      url,
      isPlaylistOrChannel: true,
      downloadUrl: ``
    };  } else {
    // This is a single video URL - get video info first
    actualVideoId = videoId;
    videoInfo = await getVideoInfo(videoId);
    if (!videoInfo) {
      return {
        id: `error-${videoId}-${format}-${language}`,
        videoTitle: `YouTube Video ${videoId}`,
        language: getLanguageName(language),
        format,
        fileSize: '0KB',
        content: `Failed to fetch video information for this video.`,
        url,
        downloadUrl: '',
        error: `Failed to fetch video information`,
        notice: 'Video info unavailable'
      };
    }
    
    // Now check negative cache after we have video info
    const cacheKey = `${videoId}-${language}`;
    const now = Date.now();
    
  // Check negative cache first
    if (negativeCache[cacheKey] && 
        (now - negativeCache[cacheKey].timestamp) < NEGATIVE_CACHE_EXPIRY_MS) {
      const cachedFailure = negativeCache[cacheKey];
      if (cachedFailure.reason === 'SUBTITLES_DISABLED') {
        // Return graceful error result instead of throwing
        return {
          id: `cached-subtitles-disabled-${actualVideoId}-${format}-${language}`,
          videoTitle: videoInfo.title,
          language: getLanguageName(language),
          format,
          fileSize: '0KB',
          content: `Subtitles are not available for this video. The creator has disabled captions.`,
          url,
          downloadUrl: '',
          error: `Creator has disabled subtitles for this video`,
          notice: 'Subtitles disabled by creator'
        };
      } else if (cachedFailure.reason === 'UNAVAILABLE') {
        // Return graceful error result instead of throwing
        return {
          id: `cached-unavailable-${actualVideoId}-${format}-${language}`,
          videoTitle: videoInfo.title,
          language: getLanguageName(language),
          format,
          fileSize: '0KB',
          content: `This video is private or unavailable and cannot be processed.`,
          url,
          downloadUrl: '',
          error: `This video is private or unavailable and cannot be processed`,
          notice: 'Video unavailable'
        };
      } else if (cachedFailure.reason === 'PRIVATE') {
        // Return graceful error result instead of throwing
        return {
          id: `cached-private-${actualVideoId}-${format}-${language}`,
          videoTitle: videoInfo.title,
          language: getLanguageName(language),
          format,
          fileSize: '0KB',
          content: `This video is private and cannot be accessed.`,
          url,
          downloadUrl: '',
          error: `This video is private and cannot be accessed`,
          notice: 'Video private'
        };
      }    }
    
    // For single videos, we already have videoInfo, so no need to fetch again
  }

  try {
    // Create a cache key for this video+language combination
    const cacheKey = `${actualVideoId}-${language}`;
    let transcript;
    
    // Check if we have this transcript in cache and it's not expired
    const now = Date.now();
    if (transcriptCache[cacheKey] && 
        (now - transcriptCache[cacheKey].timestamp) < CACHE_EXPIRY_MS) {
      // Use cached transcript
      transcript = transcriptCache[cacheKey].transcript;
    } else {
      // Fetch the actual transcript using the youtube-transcript-api
      transcript = await fetchTranscript(actualVideoId, language);
      logProductionDebug('[DEBUG] extractSubtitles: transcript fetched', { videoId: actualVideoId, transcriptLength: transcript?.length });
      if (!transcript || transcript.length === 0) {
        logProductionDebug('[DEBUG] extractSubtitles: No transcript found', { videoId: actualVideoId });
        return {
          id: `no-subtitles-${actualVideoId}-${format}-${language}`,
          videoTitle: videoInfo.title,
          language: getLanguageName(language),
          format,
          fileSize: '0KB',
          content: 'No subtitles found for this video.',
          url,
          downloadUrl: '',
          error: 'No subtitles found',
          notice: 'No subtitles available for this video.'
        };
      }
      
      // Store in cache for future requests
      transcriptCache[cacheKey] = {
        transcript,
        videoInfo,
        timestamp: now
      };
    }
    
    // Convert the raw transcript to the requested format
    const formattedContent = await formatTranscript(transcript, format, videoInfo.title);
    
    // Calculate file size (approximate)
    const fileSize = `${Math.ceil(formattedContent.length / 1024)}KB`;
    
    return {
      id: `${actualVideoId}-${format}-${language}`,
      videoTitle: videoInfo.title,
      language: getLanguageName(language),
      format,
      fileSize,
      content: formattedContent,
      url,
      downloadUrl: `/api/youtube/download?id=${actualVideoId}&format=${format}&lang=${language}`,
    };  } catch (error: any) {
    console.error("Error extracting real transcript:", error);
    
    const cacheKey = `${actualVideoId}-${language}`;
    const now = Date.now();
      // Handle the new classified error types from the optimized fetchTranscript function
    if (error.message?.startsWith('SUBTITLES_DISABLED:')) {
      // Cache this failure to avoid repeated requests
      negativeCache[cacheKey] = {
        reason: 'SUBTITLES_DISABLED',
        timestamp: now
      };
      // Return an informative error result instead of throwing
      return {
        id: `subtitles-disabled-${actualVideoId}-${format}-${language}`,
        videoTitle: videoInfo.title,
        language: getLanguageName(language),
        format,
        fileSize: '0KB',
        content: `Subtitles are not available for this video. The creator "${videoInfo.title}" has disabled captions.`,
        url,
        downloadUrl: '',
        error: `Creator has disabled subtitles for this video: ${videoInfo.title}`,
        notice: 'Subtitles disabled by creator'
      };
    }
    
    if (error.message?.startsWith('TIMEOUT:')) {
      // Don't cache timeout errors as they might be temporary
      // Return a timeout error result instead of throwing
      return {
        id: `timeout-${actualVideoId}-${format}-${language}`,
        videoTitle: videoInfo.title,
        language: getLanguageName(language),
        format,
        fileSize: '0KB',
        content: `Video processing timed out. This may be a temporary network issue - please try again in a few moments.`,
        url,
        downloadUrl: '',
        error: `Video processing timed out. This may be a temporary issue - please try again in a few moments.`,
        notice: 'Processing timeout - please retry'
      };
    }
    
    if (error.message?.startsWith('UNAVAILABLE:')) {
      // Cache this failure
      negativeCache[cacheKey] = {
        reason: 'UNAVAILABLE',
        timestamp: now
      };
      // Return an unavailable error result instead of throwing
      return {
        id: `unavailable-${actualVideoId}-${format}-${language}`,
        videoTitle: videoInfo.title,
        language: getLanguageName(language),
        format,
        fileSize: '0KB',
        content: `This video is private or unavailable and cannot be processed.`,
        url,
        downloadUrl: '',
        error: `This video is private or unavailable and cannot be processed.`,
        notice: 'Video unavailable'
      };
    }    // For old-style error messages that don't have our new classification
    if (error.message?.includes("Could not find any transcripts") || 
        error.message?.includes("No transcript available")) {
      
      // Cache as subtitles disabled since fetchTranscript now handles language fallback internally
      negativeCache[cacheKey] = {
        reason: 'SUBTITLES_DISABLED',
        timestamp: now
      };
      // Return an informative error result instead of throwing
      return {
        id: `no-transcripts-${actualVideoId}-${format}-${language}`,
        videoTitle: videoInfo.title,
        language: getLanguageName(language),
        format,
        fileSize: '0KB',
        content: `No subtitles are available for this video: ${videoInfo.title}. The creator may have disabled captions.`,
        url,
        downloadUrl: '',
        error: `No subtitles are available for this video: ${videoInfo.title}. The creator may have disabled captions.`,
        notice: 'No subtitles available'
      };
    }
    
    // For unknown errors, return an error result instead of throwing
    return {
      id: `error-${actualVideoId}-${format}-${language}`,
      videoTitle: videoInfo.title,
      language: getLanguageName(language),
      format,
      fileSize: '0KB',
      content: `Failed to extract subtitles from video: ${videoInfo.title}. Error: ${error.message}`,
      url,
      downloadUrl: '',
      error: `Failed to extract subtitles from video: ${videoInfo.title}. Error: ${error.message}`,
      notice: 'Processing failed'
    };
  }
}

// Pre-compiled regex patterns for HTML entity decoding (performance optimization)
const HTML_ENTITY_PATTERNS = {
  doubleEncodedNumeric: /&amp;#(\d+);/g,
  doubleEncodedHex: /&amp;#x([0-9a-fA-F]+);/g,
  amp: /&amp;/g,
  lt: /&lt;/g,
  gt: /&gt;/g,
  quot: /&quot;/g,
  apos1: /&#39;/g,
  apos2: /&apos;/g,
  nbsp: /&nbsp;/g,
  numeric: /&#(\d+);/g,
  hex: /&#x([0-9a-fA-F]+);/g,
  rsquo: /&rsquo;/g,
  lsquo: /&lsquo;/g,
  rdquo: /&rdquo;/g,
  ldquo: /&ldquo;/g,
  mdash: /&mdash;/g,
  ndash: /&ndash;/g
};

// Helper function to format transcript data into different subtitle formats
async function formatTranscript(transcript: any[], format: string, videoTitle: string) {
  if (!transcript || transcript.length === 0) {
    throw new Error("No transcript data available");
  }
  
  // Optimized helper function to decode HTML entities using pre-compiled patterns
  const decodeHtmlEntities = (text: string): string => {
    return text
      // Handle double-encoded entities first (like &amp;#39;)
      .replace(HTML_ENTITY_PATTERNS.doubleEncodedNumeric, (match, dec) => String.fromCharCode(parseInt(dec)))
      .replace(HTML_ENTITY_PATTERNS.doubleEncodedHex, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
      // Handle standard named entities
      .replace(HTML_ENTITY_PATTERNS.amp, '&')
      .replace(HTML_ENTITY_PATTERNS.lt, '<')
      .replace(HTML_ENTITY_PATTERNS.gt, '>')
      .replace(HTML_ENTITY_PATTERNS.quot, '"')
      .replace(HTML_ENTITY_PATTERNS.apos1, "'")
      .replace(HTML_ENTITY_PATTERNS.apos2, "'")
      .replace(HTML_ENTITY_PATTERNS.nbsp, ' ')
      // Handle numbered entities
      .replace(HTML_ENTITY_PATTERNS.numeric, (match, dec) => String.fromCharCode(parseInt(dec)))
      .replace(HTML_ENTITY_PATTERNS.hex, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
      // Handle common special cases
      .replace(HTML_ENTITY_PATTERNS.rsquo, "'")
      .replace(HTML_ENTITY_PATTERNS.lsquo, "'")
      .replace(HTML_ENTITY_PATTERNS.rdquo, '"')
      .replace(HTML_ENTITY_PATTERNS.ldquo, '"')
      .replace(HTML_ENTITY_PATTERNS.mdash, '—')
      .replace(HTML_ENTITY_PATTERNS.ndash, '–');
  };
  
  // Pre-process all transcript items to decode HTML entities
  const cleanTranscript = transcript.map(item => ({
    ...item,
    text: decodeHtmlEntities(item.text)
  }));
  
  let formattedContent = "";
  
  if (format === "SRT") {
    // SRT format
    formattedContent = cleanTranscript.map((item, index) => {
      const startTime = formatSRTTime(item.offset / 1000);
      const endTime = formatSRTTime((item.offset + item.duration) / 1000);
      
      // Handle multi-line text by preserving line breaks
      const text = item.text.replace(/\n/g, '\r\n');
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${text}`;
    }).join('\n\n');
  } else if (format === "VTT") {
    // WebVTT format
    formattedContent = "WEBVTT\n\n" + cleanTranscript.map((item, index) => {
      const startTime = formatVTTTime(item.offset / 1000);
      const endTime = formatVTTTime((item.offset + item.duration) / 1000);
      
      // Handle multi-line text by preserving line breaks
      const text = item.text;
      
      return `${startTime} --> ${endTime}\n${text}`;
    }).join('\n\n');
  } else if (format === "TXT" || format === "PLAIN") {
    // Plain text format - just the transcript text without timings
    // Preserve any line breaks within each item's text
    formattedContent = cleanTranscript.map(item => item.text).join('\n\n');
  } else if (format === "PARAGRAPH") {
    // Single paragraph format - everything in one continuous text
    // Convert line breaks to spaces for a flowing paragraph
    formattedContent = cleanTranscript.map(item => item.text.replace(/\n/g, ' ')).join(' ');  } else if (format === "CLEAN_TEXT") {
    // Clean text format - properly formatted and readable text
    // Step 1: Extract all text and clean it thoroughly
    let rawText = cleanTranscript.map(item => {
      // Clean any remaining VTT artifacts and XML/HTML tags
      let cleanedText = item.text
        // Remove any remaining timestamp and VTT tags that might have been missed
        .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '') 
        .replace(/<\/?[cv][^>]*>/g, '')
        .replace(/<[^>]*>/g, '')
        // Remove VTT positioning info
        .replace(/align:start position:\d+%/g, '')
        // Remove common auto-generated subtitle artifacts
        .replace(/\[Music\]/gi, '')
        .replace(/\[Applause\]/gi, '')
        .replace(/\[Laughter\]/gi, '')
        .replace(/\[Silence\]/gi, '')
        // Replace newlines with spaces
        .replace(/\n/g, ' ')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ');
      
      return cleanedText.trim();
    }).filter(text => text.length > 0).join(' ');
    
    // Step 2: Remove duplicate phrases and repetitions common in auto-generated captions
    // This pattern looks for identical phrases that often repeat in auto-generated subtitles
    const words = rawText.split(' ');
    const deduplicatedWords = [];
    const windowSize = 8; // Look for repetitions within 8 words
    
    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i];
      // Check if this word sequence already appeared recently
      let isDuplicate = false;
      if (i >= windowSize) {
        for (let j = 1; j <= windowSize && i - j >= 0; j++) {
          if (words[i - j] === currentWord && 
              i + 1 < words.length && i - j + 1 < words.length &&
              words[i + 1] === words[i - j + 1]) {
            // Found a potential duplicate sequence, check a few more words
            let matchLength = 0;
            for (let k = 0; k < 4 && i + k < words.length && i - j + k < words.length; k++) {
              if (words[i + k] === words[i - j + k]) {
                matchLength++;
              } else {
                break;
              }
            }
            if (matchLength >= 2) {
              isDuplicate = true;
              break;
            }
          }
        }
      }
      
      if (!isDuplicate) {
        deduplicatedWords.push(currentWord);
      }
    }
    
    rawText = deduplicatedWords.join(' ');
    
    // Step 3: Fix common punctuation and capitalization issues
    rawText = rawText
      // Fix spacing around punctuation
      .replace(/\s+([.!?,:;])/g, '$1')
      .replace(/([.!?])\s*([a-z])/g, '$1 $2')
      // Fix capitalization after sentence endings
      .replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())
      // Fix common transcription errors for contractions
      .replace(/\bwont\b/g, "won't")
      .replace(/\bdont\b/g, "don't")
      .replace(/\bcant\b/g, "can't")
      .replace(/\bweve\b/g, "we've")
      .replace(/\btheyre\b/g, "they're")
      .replace(/\byoure\b/g, "you're")
      .replace(/\bits\b/g, "it's")
      .replace(/\bim\b/gi, "I'm")
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    // Step 4: Add paragraph breaks at logical points
    const sentences = rawText.split(/([.!?]+\s+)/);
    let paragraphedText = '';
    let currentParagraph = '';
    let sentenceCount = 0;
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] || '';
      const punctuation = sentences[i + 1] || '';
      
      if (sentence.trim()) {
        currentParagraph += sentence + punctuation;
        sentenceCount++;
        
        // Create paragraph breaks every 4-6 sentences or at transition words
        const hasTransition = /\b(however|meanwhile|furthermore|moreover|therefore|consequently|in conclusion|finally|next|first|second|third)\b/i.test(sentence);
        
        if (sentenceCount >= 4 && (sentenceCount >= 6 || hasTransition || Math.random() > 0.7)) {
          paragraphedText += currentParagraph.trim() + '\n\n';
          currentParagraph = '';
          sentenceCount = 0;
        }
      }
    }
    
    // Add remaining content
    if (currentParagraph.trim()) {
      paragraphedText += currentParagraph.trim();
    }
    
    // Step 5: Remove common filler words (but preserve meaning)
    const excessiveFillers = [
      /\bum,?\s+/gi, 
      /\buh,?\s+/gi, 
      /\byou know,?\s+/gi,
      /\bI mean,?\s+/gi,
      /\bbasically,?\s+/gi,
      /\bliterally,?\s+/gi
    ];
    
    formattedContent = paragraphedText;
    excessiveFillers.forEach(filler => {
      formattedContent = formattedContent.replace(filler, ' ');
    });
    
    // Final cleanup
    formattedContent = formattedContent
      .replace(/\s+/g, ' ')
      .replace(/\s+([.!?,:;])/g, '$1')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Ensure proper capitalization
    formattedContent = formattedContent
      .split('\n\n')
      .map(paragraph => {
        if (paragraph.length > 0) {
          return paragraph.charAt(0).toUpperCase() + paragraph.slice(1);
        }
        return paragraph;
      })      .join('\n\n');
    
  } else if (format === "JSON") {
    // JSON format with more detailed information
    const jsonEntries = cleanTranscript.map((item, index) => ({
      id: index + 1,
      startTime: formatVTTTime(item.offset / 1000),
      endTime: formatVTTTime((item.offset + item.duration) / 1000),
      startSeconds: item.offset / 1000,
      endSeconds: (item.offset + item.duration) / 1000,
      text: item.text
    }));
    formattedContent = JSON.stringify({ 
      title: videoTitle, 
      entries: jsonEntries,
      totalCount: transcript.length,
      totalDuration: transcript.reduce((sum, item) => sum + item.duration, 0) / 1000
    }, null, 2);
  } else if (format === "ASS") {
    // Advanced SubStation Alpha format
    let header = `[Script Info]\nTitle: ${videoTitle}\nScriptType: v4.00+\nWrapStyle: 0\nPlayResX: 1280\nPlayResY: 720\n\n`;
    header += `[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`;
    header += `Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1\n\n`;
    header += `[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
    
    const events = cleanTranscript.map((item, index) => {
      const startTime = formatASSTime(item.offset / 1000);
      const endTime = formatASSTime((item.offset + item.duration) / 1000);
      return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${item.text.replace(/\n/g, '\\N')}`;
    }).join('\n');
    
    formattedContent = header + events;
  } else if (format === "SMI") {
    // SAMI format
    let header = `<SAMI>\n<HEAD>\n<TITLE>${videoTitle}</TITLE>\n`;
    header += `<STYLE TYPE="text/css">\nP { font-family: Arial; font-weight: normal; color: white; background-color: black; text-align: center; }\n.ENCC { name: English; lang: en-US; }\n</STYLE>\n</HEAD>\n`;
    header += `<BODY>\n`;
    
    const events = cleanTranscript.map((item) => {
      const startTime = Math.floor(item.offset);
      return `<SYNC Start=${startTime}>\n<P Class=ENCC>${item.text.replace(/\n/g, '<BR>')}</P>\n</SYNC>\n`;
    }).join('');
    
    formattedContent = header + events + `</BODY>\n</SAMI>`;
  } else {
    // Default to a simple format for unknown types
    formattedContent = cleanTranscript.map(item => item.text).join('\n\n');
  }
  
  return formattedContent;
}

// Helper function to format time for SRT format (HH:MM:SS,mmm)
function formatSRTTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// Helper function to format time for VTT format (HH:MM:SS.mmm)
function formatVTTTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// Helper function to format time for ASS format (HH:MM:SS:FF)
function formatASSTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds - Math.floor(seconds)) * 30);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

// Process a YouTube URL (single video, playlist, or channel)
async function processYouTubeUrl(
  url: string,
  formats: string[],
  language: string,
  isSiteRouted: boolean = false
): Promise<SubtitleResult[]> {
  // Get dynamic configuration based on routing
  const config = getProcessingConfig(isSiteRouted);
  
  logProductionDebug('Processing YouTube URL', {
    url: url.substring(0, 100),
    formats,
    language,
    isSiteRouted,
    config
  });
  
  // Extract the video ID to determine what type of URL it is
  const videoId = extractVideoId(url);
  if (!videoId) {
    return [{ 
      id: `error-${Date.now()}`,
      videoTitle: 'Error',
      language: 'N/A',
      format: 'txt',
      fileSize: '0KB',
      content: 'Invalid YouTube URL',
      url,
      downloadUrl: '',
      error: "Invalid YouTube URL"
    }];
  }

  let videoUrls: string[] = [];

  // Handle different URL types
  
  if (videoId.startsWith('playlist:')) {
    // This is a playlist URL - get all video IDs in the playlist
    const playlistId = videoId.replace('playlist:', '');
    logProductionDebug('[DEBUG] Playlist processing started', { playlistId });
    try {
      // Validate the playlist ID format
      if (!playlistId || playlistId.length < 5) {
        throw new Error('Invalid playlist ID format');
      }
      let playlistVideoIds;
      try {
        playlistVideoIds = await getPlaylistVideoIds(playlistId, config.timeout, isSiteRouted);
        logProductionDebug('[DEBUG] Playlist video IDs fetched', { playlistId, playlistVideoIds });
      } catch (playlistError) {
        console.error('Error in getPlaylistVideoIds:', playlistError);
        throw new Error(`Could not retrieve videos from playlist: ${playlistError instanceof Error ? playlistError.message : 'Unknown error'}`);
      }
      if (playlistVideoIds.length === 0) {
        logProductionDebug('[DEBUG] No video IDs found for playlist', { playlistId });
        throw new Error('No videos found in this playlist. The playlist might be empty, private, or does not exist.');
      }
      // Convert video IDs to full URLs
      videoUrls = playlistVideoIds.map(id => `https://www.youtube.com/watch?v=${id}`);
      
      // Apply dynamic limits based on routing and environment
      const originalCount = videoUrls.length;
      let wasLimited = false;
      
      if (videoUrls.length > config.maxVideos) {
        videoUrls = videoUrls.slice(0, config.maxVideos);
        wasLimited = true;
      }
      
      // Log processing info with routing context
      logProductionDebug('Playlist processing info', {
        playlistId,
        originalCount,
        processedCount: videoUrls.length,
        wasLimited,
        isSiteRouted,
        maxVideos: config.maxVideos,
        reason: isSiteRouted ? 'site-routed-limits' : (isCloudEnvironment ? 'cloud-limits' : 'no-limits')
      });
        // If no videos were returned after limits, throw an error
      if (videoUrls.length === 0) {
        throw new Error(`Failed to extract any valid videos from playlist. Retrieved ${originalCount} IDs but none were valid.`);
      }
      
      // Add processing notice for limited playlists
      if (wasLimited) {
        const limitReason = isSiteRouted 
          ? `Limited to ${config.maxVideos} videos for site-routed requests to ensure reliability`
          : `Limited to ${config.maxVideos} videos for cloud processing to manage resources`;
        
        logProductionDebug('Playlist limited', {
          originalCount,
          processedCount: videoUrls.length,
          reason: limitReason
        });
      }
    } catch (error) {
      console.error(`Error fetching playlist videos:`, error);
      
      // Enhanced error message with routing context
      let errorMessage = "Failed to fetch playlist videos.";
      let detailedError = "";
      
      if (error instanceof Error) {
        detailedError = error.message;
        
        if (error.message.includes("private") || error.message.includes("not exist")) {
          errorMessage = "This playlist appears to be private or doesn't exist. Please check that you have the correct playlist URL and it is publicly accessible.";
        } else if (error.message.includes("no valid videos") || error.message.includes("No videos found")) {
          errorMessage = "No valid videos found in this playlist. The playlist may be empty or contains only unavailable videos.";
        } else if (error.message.includes("yt-dlp")) {
          errorMessage = isSiteRouted 
            ? "There was an issue with playlist processing through your site. This might be due to routing timeouts. Try using the direct API endpoint or individual video URLs."
            : "There was an issue with the video extraction tool. This might be a temporary issue, please try again later.";
        } else if (error.message.includes("not available")) {
          errorMessage = "The necessary tools for extracting playlist videos are not available on the server. Please contact support.";
        } else if (error.message.includes("timeout")) {
          errorMessage = isSiteRouted
            ? "Playlist processing timed out when routed through your site. Try using fewer videos or access the API directly."
            : "Playlist processing timed out. Please try again with fewer videos.";
        }
      }
      
      // Add routing-specific guidance
      let routingGuidance = "";
      if (isSiteRouted) {
        routingGuidance = "\n\nSite Routing Issue: This request came through your site's proxy/CDN which has stricter limits. Try:\n" +
          "1. Using individual video URLs instead of playlist URLs\n" +
          "2. Accessing the API endpoint directly\n" +
          "3. Processing smaller batches of videos";
      }
      
      return [{ 
        id: `playlist-error-${playlistId}-${Date.now()}`,
        videoTitle: 'Playlist Processing Error',
        language: getLanguageName(language),
        format: formats[0] || 'txt',
        fileSize: '0KB',
        content: `${errorMessage}\n\nTechnical details: ${detailedError}${routingGuidance}\n\nTry using individual video URLs instead of the playlist URL.`,
        url,
        downloadUrl: '',
        error: errorMessage,
        notice: isSiteRouted 
          ? "Site routing detected - try direct API access for better playlist processing"
          : "If this error persists, try extracting videos from the playlist one by one instead."
      }];
    }
  } else if (videoId.startsWith('channel:')) {
    // This is a channel URL - get recent videos from the channel
    const channelId = videoId.replace('channel:', '');
    try {
      const channelVideoIds = await getChannelVideoIds(channelId);
      
      // Convert video IDs to full URLs
      videoUrls = channelVideoIds.map(id => `https://www.youtube.com/watch?v=${id}`);
      
      // Limit the number of videos to process
      if (videoUrls.length > MAX_VIDEOS_PER_BATCH) {
        videoUrls = videoUrls.slice(0, MAX_VIDEOS_PER_BATCH);
      }
    } catch (error) {
      console.error(`Error fetching channel videos:`, error);
      return [{ 
        id: `channel-error-${channelId}`,
        videoTitle: 'Channel Error',
        language: getLanguageName(language),
        format: formats[0] || 'txt',
        fileSize: '0KB',
        content: `Error fetching videos from channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url,
        downloadUrl: '',
        error: `Failed to fetch channel videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      }];
    }
  } else {
    // Single video URL
    videoUrls = [url];
  }

  // Process each video with concurrency limits to avoid rate limiting

  // Create a processing function that handles multiple formats for a single video in parallel
  const processVideo = async (videoUrl: string): Promise<ExtendedSubtitleResult[]> => {
    const videoId = extractVideoId(videoUrl);
    logProductionDebug('[DEBUG] Processing video for subtitles', { videoUrl, videoId });
    if (!videoId) {
      // Return an error result if the URL is invalid
      return [{
        id: `error-invalid-url-${Date.now()}`,
        videoTitle: `Invalid YouTube URL`,
        language: getLanguageName(language),
        format: formats[0],
        fileSize: '0KB',
        content: `The URL ${videoUrl} is not a valid YouTube URL.`,
        url: videoUrl,
        downloadUrl: '',
        error: `Invalid YouTube URL: ${videoUrl}`
      }];
    }
    try {
      const formatPromises = formats.map(async (format) => {
        try {
          logProductionDebug('[DEBUG] Extracting subtitles', { videoId, format });
          return await extractSubtitles(videoUrl, format, language);
        } catch (error: any) {
          console.error(`[DEBUG] Error processing ${videoUrl} with format ${format}:`, error);
          return {
            id: `error-${videoId}-${format}-${language}`,
            videoTitle: `Error processing video`,
            language: getLanguageName(language),
            format,
            fileSize: '0KB',
            content: `Failed to extract subtitle: ${error instanceof Error ? error.message : 'Unknown error'}`,
            url: videoUrl,
            downloadUrl: '',
            error: `Failed to extract subtitle for ${videoUrl} in ${format} format: ${error instanceof Error ? error.message : 'Unknown error'}`
          } as ExtendedSubtitleResult;
        }
      });
      return await Promise.all(formatPromises);
    } catch (error: any) {
      console.error(`[DEBUG] Error in parallel format processing for ${videoUrl}:`, error);
      return [{
        id: `error-${videoId}-general-${language}`,
        videoTitle: `Error processing video`,
        language: getLanguageName(language),
        format: formats[0],
        fileSize: '0KB',
        content: `Failed to process video: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url: videoUrl,
        downloadUrl: '',
        error: `General processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }];
    }
  };
  // Process all videos with concurrency limits
  try {
    const batchResults = await processBatchWithConcurrency(
      videoUrls,
      processVideo,
      config.maxConcurrent // Use dynamic concurrency based on routing
    );

    // Add batch processing metadata
    const results = batchResults.flat();
    // Ensure all error results have their error message in the content field for UI display
    results.forEach(r => {
      if (r.error && !r.content.includes(r.error)) {
        r.content = `${r.content}\nError: ${r.error}`;
      }
    });
    
    if (videoUrls.length > 1) {
      const successCount = results.filter(r => !r.error && !r.isGenerated).length;
      const generatedCount = results.filter(r => r.isGenerated).length;
      const errorCount = results.filter(r => r.error).length;
      
      // Enhanced summary with routing context
      const routingInfo = isSiteRouted ? " (site-routed)" : (isCloudEnvironment ? " (cloud)" : " (local)");
      
      logProductionDebug('Batch processing completed', {
        totalVideos: videoUrls.length,
        successCount,
        generatedCount,
        errorCount,
        concurrency: config.maxConcurrent,
        routing: routingInfo.trim()
      });
      
      // Add a summary entry
      results.push({
        id: `batch-summary-${Date.now()}`,
        videoTitle: 'Batch Processing Summary',
        language: 'en',
        format: 'txt',
        fileSize: '0KB',
        content: `Processed ${videoUrls.length} videos with ${formats.length} format(s) each.\n` +
                `✅ Successfully extracted: ${successCount}\n` +
                `⚠️ Generated fallbacks: ${generatedCount}\n` +
                `❌ Errors: ${errorCount}`,
        url: '',
        downloadUrl: '',
        notice: `Batch processing complete: ${successCount} successful, ${generatedCount} fallbacks, ${errorCount} errors`
      });
    }

    // Return the flattened results
    return results;
  } catch (error: any) {
    console.error("Error in batch processing: ", error);
    return [{ 
      id: `batch-error-${Date.now()}`,
      videoTitle: 'Batch Processing Error',
      language: getLanguageName(language),
      format: formats[0] || 'txt',
      fileSize: '0KB',
      content: `Error during batch processing: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again with fewer videos or formats.`,
      url,
      downloadUrl: '',
      error: `Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }];
  }
}

// Process CSV file content to extract subtitles from multiple YouTube URLs
async function processCSVFile(
  csvContent: string,
  formats: string[],
  language: string,
  isSiteRouted: boolean = false
): Promise<SubtitleResult[]> {
  // Get dynamic configuration based on routing
  const config = getProcessingConfig(isSiteRouted);
  
  try {
    // Parse CSV content to extract URLs
    const parsedResult = await parseCSVContent(csvContent);
    const { urls: videoUrls, stats } = parsedResult;
    
    // Log CSV parsing statistics with routing context
    logProductionDebug('CSV parsing completed', {
      totalUrls: videoUrls.length,
      stats,
      isSiteRouted,
      config
    });
    
    if (videoUrls.length === 0) {
      return [{
        id: `csv-error-${Date.now()}`,
        videoTitle: 'CSV Processing Error',
        language: getLanguageName(language),
        format: formats[0] || 'txt',
        fileSize: '0KB',
        content: 'No valid YouTube URLs found in CSV file. Please ensure your CSV contains YouTube video URLs.',
        url: '',
        downloadUrl: '',
        error: "No valid YouTube URLs found in CSV file"
      }];
    }
    
    
    // Process all URLs without limit
    let processableUrls = videoUrls;
    let skippedUrls = 0; // Always 0 now since there's no limit
    
    // Log the processing intent
    
    // Process each video with concurrency limits
    const processVideo = async (videoUrl: string): Promise<SubtitleResult[]> => {
      const videoResults: SubtitleResult[] = [];
      for (const format of formats) {
        try {
          const subtitle = await extractSubtitles(videoUrl, format, language);
          videoResults.push(subtitle);
        } catch (error) {
          console.error(`Error processing ${videoUrl} with format ${format}:`, error);
          const extractedId = extractVideoId(videoUrl) || 'unknown';
          videoResults.push({
            id: `error-${extractedId}-${format}-${language}`,
            videoTitle: `Error processing video`,
            language: getLanguageName(language),
            format,
            fileSize: '0KB',
            content: `Failed to extract subtitle: ${error instanceof Error ? error.message : 'Unknown error'}`,
            url: videoUrl,
            downloadUrl: '',
            error: `Failed to extract subtitle for ${videoUrl} in ${format} format: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
      return videoResults;
    };
      // Process all videos with concurrency limits
    const batchResults = await processBatchWithConcurrency(
      processableUrls,
      processVideo,
      config.maxConcurrent // Use dynamic concurrency based on routing
    );
    
    // Process all results without skipping any
    const results = batchResults.flat();
    
    // Calculate statistics
    const successCount = results.filter(r => !r.error && !r.isGenerated).length;
    const generatedCount = results.filter(r => r.isGenerated).length;
    const errorCount = results.filter(r => r.error).length;
    
    // Add a summary entry
    results.push({
      id: `batch-summary-${Date.now()}`,
      videoTitle: 'CSV Processing Summary',
      language: 'en',
      format: 'txt',
      fileSize: '0KB',
      content: `Processed ${processableUrls.length} videos with ${formats.length} format(s) each.\n` +
              `✅ Successfully extracted: ${successCount}\n` +
              `⚠️ Generated fallbacks: ${generatedCount}\n` +
              `❌ Errors: ${errorCount}\n` +
              (skippedUrls > 0 ? `⏸️ Skipped (due to limit): ${skippedUrls}` : ''),
      url: '',
      downloadUrl: '',
      notice: `CSV processing complete: ${successCount} successful, ${generatedCount} fallbacks, ${errorCount} errors`
    });
    
    return results;
  } catch (error) {
    console.error("Error processing CSV file:", error);
    return [{ 
      id: `csv-error-${Date.now()}`,
      videoTitle: 'CSV Processing Error',
      language: getLanguageName(language),
      format: formats[0] || 'txt',
      fileSize: '0KB',
      content: `Error processing CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url: '',
      downloadUrl: '',
      error: "Failed to process CSV file"
    }];
  }
}

// Stream handler for large responses
async function streamResponse(data: any) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(JSON.stringify({ status: 'processing', total: data.length }));
      
      // Stream each subtitle result individually
      for (const item of data) {
        controller.enqueue(JSON.stringify(item));
      }
      
      controller.enqueue(JSON.stringify({ status: 'complete' }));
      controller.close();
    }
  });
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    }
  });
}

// Main API handler with timeout protection
export async function POST(req: NextRequest) {
  // Timeout fallback: always return JSON if processing takes too long
  const timeoutFallback = new Promise<NextResponse>((resolve) => {
    setTimeout(() => {
      resolve(NextResponse.json({
        id: 'timeout_fallback',
        videoTitle: 'Processing Timeout - Please Try Again',
        language: 'en',
        format: 'text',
        fileSize: '0.8 KB',
        content: '[00:00] Request processing timed out to prevent gateway errors.\n\n[00:03] This is a protective measure for cloud deployments.\n\n[00:06] Please try again with:\n\n[00:09] - A shorter playlist (under 50 videos)\n\n[00:12] - A single video URL instead\n\n[00:15] - Or try again in a few moments\n\n[00:18] The system is working correctly.',
        url: req.url || '',
        downloadUrl: '',
        isGenerated: true,
        isTimeoutFallback: true,
        error: 'Processing timeout (protective measure)',
        notice: 'This timeout prevents 504 Gateway errors. Please try a shorter request.'
      }, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Timeout-Protection': 'active'
        }
      }));
    }, 25000); // 25 seconds
  });

  // Race the actual processing against the timeout
  return Promise.race([
    (async () => {
      // Log the request for production debugging
      logApiRequest(req, 'YouTube Extract POST');
      
      // Validate this is actually an API route
      if (!validateApiRoute(req)) {
        return NextResponse.json(
          { error: 'Invalid API route', url: req.url },
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Enhanced production debugging with site routing detection
      const userAgent = req.headers.get('user-agent') || '';
      const referer = req.headers.get('referer') || '';
      const xForwardedFor = req.headers.get('x-forwarded-for') || '';
      const xRealIp = req.headers.get('x-real-ip') || '';
      const host = req.headers.get('host') || '';
      const contentLength = req.headers.get('content-length') || '';
      
      // Detect if request is coming through a proxy/CDN (site routing)
      const isSiteRouted = !!(xForwardedFor || xRealIp || 
        referer.includes('yoursite.com') || // Replace with actual site domain
        host !== 'localhost:3000' && host !== 'localhost:3001');
      
      logProductionDebug('POST request received', {
        url: req.url,
        method: req.method,
        host,
        userAgent: userAgent.substring(0, 100),
        referer,
        xForwardedFor,
        xRealIp,
        contentLength,
        isSiteRouted,
        timestamp: new Date().toISOString()
      });

      try {
        const body = await req.json();
        const { inputType, url, csvContent, formats, language } = body;
        
        logProductionDebug('Request body parsed', { inputType, url: url ? 'present' : 'missing', formats, language });
        
        // Get the auth token from the request header
        const authToken = req.headers.get('authorization')?.split('Bearer ')[1];
        // Check if this is an anonymous user with free coins
        const isAnonymousUser = req.headers.get('X-Anonymous-User') === 'true';
        const anonymousId = body.anonymousId || `anonymous-${Date.now()}`;
        
        let userId: string | null = null;
        
        if (isAnonymousUser) {
          // This is an anonymous user with free coins
          // Allow the request to proceed without authentication
          // We'll use the free 15 coins for processing
          userId = anonymousId;
        } else if (!authToken) {
          // Non-anonymous requests still need authentication
          return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 },
          );
        } else {
          // Authenticate the user with Supabase
          const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
          
          if (authError || !user) {
            console.error("Auth error:", authError);
            return NextResponse.json(
              { error: "Invalid authentication" },
              { status: 401 },
            );
          }
          
          // We now have the proper Supabase UUID for authenticated users
          userId = user.id;
        }
        
        
        // Validate required parameters
        if (!formats || !language) {
          return NextResponse.json(
            { error: "Missing required parameters" },
            { status: 400 },
          );
        }

        // Track processing start time for performance monitoring
        const startTime = Date.now();
        let subtitles = [];
        let processingStats = { totalVideos: 0, processedVideos: 0, errorCount: 0 };    // Process based on input type
        if (inputType === "url" && url) {
            // For single video URLs, use the requested language
          let actualLanguage = language;
          const videoId = extractVideoId(url);
          
          if (videoId && !videoId.startsWith('playlist:') && !videoId.startsWith('channel:')) {
            // This is a single video - use the requested language directly
          }
          
          subtitles = await processYouTubeUrl(url, formats, actualLanguage, isSiteRouted);
          // Calculate stats for successful subtitles
          const validSubtitles = subtitles as SubtitleResult[];
          processingStats.totalVideos = validSubtitles.length / formats.length;
          // Round up to the nearest integer to avoid fractional video counts
          processingStats.processedVideos = Math.ceil(validSubtitles.filter(s => !s.error && !s.isGenerated).length / formats.length);
          processingStats.errorCount = validSubtitles.filter(s => s.error).length;

          // Deduct coins for successfully processed videos
          if (userId && processingStats.processedVideos > 0) {
            try {
              
              // Get coin cost from the payload if available, otherwise calculate it
              let cost = 0;
              
              // Use the provided estimate if available instead of recalculating
              if (body.coinCostEstimate && typeof body.coinCostEstimate === 'number') {
                cost = body.coinCostEstimate;
              } else {
                // Calculate cost based on type and count
                if (inputType === "url") {
                  if (processingStats.processedVideos > 1) {
                    // Batch rate for playlists/channels - multiply by formats.length since each format is a separate subtitle
                    cost = processingStats.processedVideos * OPERATION_COSTS.BATCH_SUBTITLE * formats.length;
                  } else {
                    // Single video rate - multiply by formats.length since each format is a separate subtitle
                    cost = OPERATION_COSTS.SINGLE_SUBTITLE * formats.length;
                  }
                } else if (inputType === "file") {
                  // CSV files always use batch rate - multiply by formats.length since each format is a separate subtitle
                  cost = processingStats.processedVideos * OPERATION_COSTS.BATCH_SUBTITLE * formats.length;
                }
                
                // Ensure minimum cost is 1 coin
                cost = Math.max(cost, 1);
              }
              
              // Check if this is an anonymous user with free coins
              const isAnonymousUser = userId?.startsWith('anonymous-');

              if (isAnonymousUser) {
                // Continue processing without coin deduction for anonymous users
              } else {
                // For authenticated users, use the deductCoinsForOperation utility
                // Use a valid OperationType from the defined type
                const operationType = inputType === "url" ? "EXTRACT_SUBTITLES" : "BATCH_EXTRACT";
                const deductionSuccess = await deductCoinsForOperation(userId, operationType, cost);
                
                if (!deductionSuccess) {
                  console.error(`❌ Failed to deduct ${cost} coins for user ${userId} - insufficient balance`);
                  return NextResponse.json(
                    { 
                      error: "Insufficient coins for this operation",
                      requireMoreCoins: true
                    },
                    { status: 402 }
                  );
                }
                
              }        } catch (deductError) {
                console.error(`Error in coin handling for user ${userId}:`, deductError);
                // Return error response - don't continue processing if coin deduction fails
                return NextResponse.json(
                  { 
                    error: "Failed to process coin deduction. Please try again.",
                    details: deductError instanceof Error ? deductError.message : 'Unknown error'
                  },
                  { status: 500 }
                );
              }
          } else {
            console.warn(`Not deducting coins because userId=${userId} or processedVideos=${processingStats.processedVideos}`);
          }
        } else if (inputType === "file" && csvContent) {
          try {
            // Make sure the CSV content is a proper string
            if (typeof csvContent !== 'string' || !csvContent.trim()) {
              throw new Error("Empty or invalid CSV content");
            }
              // Process the CSV file
            subtitles = await processCSVFile(csvContent, formats, language, isSiteRouted);
            
            // Check if we got results
            if (!Array.isArray(subtitles) || subtitles.length === 0) {
              console.warn("CSV processing returned no results");
              subtitles = [{ 
                id: `csv-error-${Date.now()}`,
                videoTitle: 'CSV Processing Warning',
                language: getLanguageName(language),
                format: formats[0] || 'txt',
                fileSize: '0KB',
                content: 'No valid YouTube URLs could be processed from the uploaded file.',
                url: '',
                downloadUrl: '',
                error: "No valid YouTube URLs processed"
              }];
            }
            
            // Calculate stats for successful subtitles
            const validSubtitles = subtitles as SubtitleResult[];
            processingStats.totalVideos = validSubtitles.length / formats.length || 0;
            // Round up to the nearest integer to avoid fractional video counts
            processingStats.processedVideos = Math.ceil(validSubtitles.filter(s => !s.error && !s.isGenerated).length / formats.length || 0);
            processingStats.errorCount = validSubtitles.filter(s => s.error).length || 0;
            
            // Deduct coins for successfully processed videos
            if (userId && processingStats.processedVideos > 0) {
              try {
                
                // Calculate cost for this operation
                let cost = 0;
                
                // Calculate cost based on type and count
                if (inputType === "file") {
                  // CSV files always use batch rate
                  cost = processingStats.processedVideos * OPERATION_COSTS.BATCH_SUBTITLE;
                }
                
                // Minimum cost is 1 coin
                cost = Math.max(cost, 1);
                
                // Use the new utility function to deduct coins
                const success = await deductCoinsForOperation(userId, 'BATCH_EXTRACT', cost);
                
                if (success) {
                } else {
                  console.error(`❌ Failed to deduct ${cost} coins for user ${userId} - insufficient balance`);
                  return NextResponse.json(
                    { error: "Insufficient coins for this operation" },
                    { status: 402 }
                  );
                }          } catch (deductError) {
                console.error(`Error in direct coin deduction for user ${userId}:`, deductError);
                // Return error response - don't continue processing if coin deduction fails
                return NextResponse.json(
                  { 
                    error: "Failed to process coin deduction for CSV processing. Please try again.",
                    details: deductError instanceof Error ? deductError.message : 'Unknown error'
                  },
                  { status: 500 }
                );
              }
            } else {
              console.warn(`Not deducting coins because userId=${userId} or processedVideos=${processingStats.processedVideos}`);
            }
          } catch (csvError) {
            console.error("Error during CSV processing:", csvError);
            subtitles = [{ 
              id: `csv-error-${Date.now()}`,
              videoTitle: 'CSV Processing Error',
              language: getLanguageName(language),
              format: formats[0] || 'txt',
              fileSize: '0KB',
              content: `Error processing CSV file: ${csvError instanceof Error ? csvError.message : 'Unknown error'}`,
              url: '',
              downloadUrl: '',
              error: "Failed to process CSV file"
            }];
            processingStats.errorCount = 1;
          }
        } else {
          return NextResponse.json(
            { error: "Invalid input type or missing data" },
            { status: 400 },
          );
        }

        // Calculate processing time
        const processingTime = Date.now() - startTime;

        // For very large responses, we could use streaming, but for now we'll return the full response
        if (subtitles.length > 500) {
          // For large responses, return a streamable response
          return streamResponse(subtitles);
        } else {
          // Debug log: print a summary of the subtitles array before returning
          logProductionDebug('Returning subtitles array', {
            count: subtitles.length,
            summary: subtitles.map(s => ({
              id: s.id,
              videoTitle: s.videoTitle,
              error: s.error,
              content: (s.content || '').slice(0, 100)
            }))
          });
          // For smaller responses, return the full JSON
          return NextResponse.json({ 
            subtitles, 
            stats: processingStats,
            processingTime: `${processingTime}ms` 
          }, { status: 200 });    }
      } catch (error: any) {
        logProductionDebug("Error extracting subtitles:", error);
        return handleProductionError(error, 'POST /api/youtube/extract');
      }
    })(),
    timeoutFallback
  ]);
}

// Update the handler function to better handle the transcripts
export async function GET(request: NextRequest) {
  // Log the request for production debugging
  logApiRequest(request, 'YouTube Extract GET');
  
  // Validate this is actually an API route
  if (!validateApiRoute(request)) {
    return NextResponse.json(
      { error: 'Invalid API route', url: request.url },
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  logProductionDebug('GET request received', {
    url: request.url,
    method: request.method
  });

  try {
    // Get URL and format parameters
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const format = searchParams.get('format') || 'text';
    const language = searchParams.get('lang') || 'en';

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Get video info (title, etc.)
    const { title: videoTitle } = await getVideoInfo(videoId);

    try {
      // Try to fetch actual transcript data
      const transcript = await fetchTranscript(videoId, language);
      
      // Create the content based on the format requested
      let content = '';
      
      if (format === 'json') {
        content = JSON.stringify(transcript, null, 2);
      } else if (format === 'srt') {
        content = transcript.map((item, index) => {
          const startTime = formatSrtTime(item.offset);
          const endTime = formatSrtTime(item.offset + item.duration);
          return `${index + 1}\n${startTime} --> ${endTime}\n${item.text}\n\n`;
        }).join('');
      } else if (format === 'vtt') {
        content = "WEBVTT\n\n" + transcript.map((item, index) => {
          const startTime = formatVttTime(item.offset);
          const endTime = formatVttTime(item.offset + item.duration);
          return `${startTime} --> ${endTime}\n${item.text}\n\n`;
        }).join('');
      } else {
        // Plain text format
        content = transcript.map(item => item.text).join('\n');
      }

      // Determine if this is a generated transcript (contains the notice)
      const isGenerated = transcript.length === 1 && transcript[0].text.startsWith('Note: Could not extract actual subtitles');
      
      // Create the response
      return NextResponse.json({
        id: videoId,
        videoTitle,
        language,
        format,
        fileSize: `${(content.length / 1024).toFixed(2)} KB`,
        content,
        url,
        downloadUrl: `${request.nextUrl.origin}/api/youtube/download?url=${encodeURIComponent(url)}&format=${format}&lang=${language}`,
        isGenerated
      });

    } catch (transcriptError: any) {
      console.error(`Transcript extraction error: ${transcriptError.message}`);
      // Generate placeholder subtitles as a last resort
      const { content } = await generateSubtitles(videoTitle, format);
      // Return response with error and generated content
      return NextResponse.json({
        id: videoId,
        videoTitle,
        language,
        format,
        fileSize: `${(content.length / 1024).toFixed(2)} KB`,
        content,
        url,
        downloadUrl: `${request.nextUrl.origin}/api/youtube/download?url=${encodeURIComponent(url)}&format=${format}&lang=${language}`,
        isGenerated: true,
        error: transcriptError.message
      });
    }
  } catch (error: any) {
    logProductionDebug(`Error in GET route handler: ${error.message}`);
    return handleProductionError(error, 'GET /api/youtube/extract');
  }
}

// Helper function to format time for SRT
function formatSrtTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const ms = milliseconds % 1000;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// Helper function to format time for VTT
function formatVttTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const ms = milliseconds % 1000;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}
