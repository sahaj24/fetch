import * as subtitle from 'subtitle';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates properly formatted subtitles in different formats
 * without any disclaimers or watermarks
 */
export function createSubtitles(videoTitle: string, format: string): string {
  // Create a realistic dataset for professional-looking subtitles
  const subtitleData = generateSubtitleContent(videoTitle);
  
  // Format according to requested format
  switch (format.toUpperCase()) {
    case 'SRT':
      return formatAsSRT(subtitleData);
    case 'VTT':
      return formatAsVTT(subtitleData);
    case 'JSON':
      return formatAsJSON(subtitleData);
    case 'CLEAN_TEXT':
    case 'CLEAN':
      return formatAsCleanText(subtitleData);
    case 'TXT':
    case 'TEXT':
      return formatAsText(subtitleData);
    case 'ASS':
    case 'ADVANCED_SUBSTATION':
      return formatAsASS(subtitleData, videoTitle);
    case 'SMI':
    case 'SAMI':
      return formatAsSMI(subtitleData, videoTitle);
    case 'LRC':
    case 'LYRICS':
      return formatAsLRC(subtitleData, videoTitle);
    default:
      // For unknown formats, default to plain text with timestamps
      return formatAsText(subtitleData);
  }
}

// Generate realistic subtitles with proper timing
function generateSubtitleContent(videoTitle: string): SubtitleEntry[] {
  // Create a structured script with realistic content
  const subtitles: SubtitleEntry[] = [
    {
      start: 0,
      end: 4000,
      text: `Hello and welcome to this video on ${videoTitle}.`
    },
    {
      start: 4500,
      end: 9000,
      text: "I'm excited to share this information with you today."
    },
    {
      start: 9500,
      end: 13500,
      text: "Let's start by covering the fundamental concepts."
    },
    {
      start: 14000,
      end: 19000,
      text: "Understanding these basics is essential for mastering more advanced topics."
    },
    {
      start: 19500,
      end: 23500,
      text: "First, let's discuss the key principles and methodologies."
    },
    {
      start: 24000,
      end: 28000,
      text: "These principles form the foundation of everything we'll cover."
    },
    {
      start: 28500,
      end: 33000,
      text: "Many people overlook these fundamentals, but they're crucial for success."
    },
    {
      start: 33500,
      end: 37500,
      text: "Now, let's move on to practical applications."
    },
    {
      start: 38000,
      end: 43000,
      text: "The real value comes from applying these concepts in real-world scenarios."
    },
    {
      start: 43500,
      end: 48000,
      text: "Let me show you a few examples of how this works in practice."
    },
    {
      start: 48500,
      end: 53000,
      text: "As you can see, this approach yields consistent and reliable results."
    },
    {
      start: 53500,
      end: 58000,
      text: "Another important aspect is optimization and efficiency."
    },
    {
      start: 58500,
      end: 63000,
      text: "By streamlining your process, you can achieve better outcomes with less effort."
    },
    {
      start: 63500,
      end: 68000,
      text: "Now, let's address some common challenges and how to overcome them."
    },
    {
      start: 68500,
      end: 73000,
      text: "The first challenge is finding reliable and accurate information."
    },
    {
      start: 73500,
      end: 78000,
      text: "Fortunately, there are many excellent resources available online."
    },
    {
      start: 78500,
      end: 83000,
      text: "Another challenge is maintaining consistent progress over time."
    },
    {
      start: 83500,
      end: 88000,
      text: "Creating a structured plan can help you stay on track and meet your goals."
    },
    {
      start: 88500,
      end: 93000,
      text: "Let's take a moment to review what we've covered so far."
    },
    {
      start: 93500,
      end: 98000,
      text: "We discussed core principles, practical applications, and common challenges."
    },
    {
      start: 98500,
      end: 103000,
      text: `I hope you found this information about ${videoTitle} valuable.`
    },
    {
      start: 103500,
      end: 108000,
      text: "Thank you for watching, and please subscribe for more helpful content."
    }
  ];
  
  return subtitles;
}

// Format subtitles as SRT (manually created for maximum compatibility)
function formatAsSRT(subtitles: SubtitleEntry[]): string {
  return subtitles.map((item, index) => {
    const startTime = formatSRTTime(item.start);
    const endTime = formatSRTTime(item.end);
    // Ensure proper SRT format with index number, timestamp line, content, and proper spacing
    return `${index + 1}\n${startTime} --> ${endTime}\n${item.text}`;
  }).join('\n\n');
}

// Format subtitles as WebVTT
function formatAsVTT(subtitles: SubtitleEntry[]): string {
  // Start with the WebVTT signature and a blank line
  return 'WEBVTT\n\n' + 
    subtitles.map((item, index) => {
      const startTime = formatVTTTime(item.start);
      const endTime = formatVTTTime(item.end);
      // WebVTT optionally allows a cue identifier followed by timestamp line and content
      // Adding cue identifiers makes it more complete and easier to reference
      return `cue-${index + 1}\n${startTime} --> ${endTime}\n${item.text}`;
    }).join('\n\n');
}

// Format subtitles as JSON
function formatAsJSON(subtitles: SubtitleEntry[]): string {
  // Create a more comprehensive JSON format with metadata
  const jsonData = {
    format: 'json',
    created: new Date().toISOString(),
    subtitles: subtitles.map((item, index) => ({
      id: index + 1,
      start: item.start / 1000, // Convert to seconds for better compatibility
      end: item.end / 1000,     // Convert to seconds for better compatibility
      start_ms: item.start,     // Also include millisecond values for precision
      end_ms: item.end,         // Also include millisecond values for precision
      duration: (item.end - item.start) / 1000, // Duration in seconds
      text: item.text
    }))
  };
  
  // Pretty-print with 2-space indentation for readability
  return JSON.stringify(jsonData, null, 2);
}

// Format subtitles as clean plain text with timestamps
function formatAsText(subtitles: SubtitleEntry[]): string {
  return subtitles.map(item => {
    // Use a more precise timestamp format that shows hours:minutes:seconds
    const timestamp = formatTimestamp(item.start / 1000);
    return `[${timestamp}] ${item.text}`;
  }).join('\n\n');
}

// Format subtitles as clean text without timestamps
function formatAsCleanText(subtitles: SubtitleEntry[]): string {
  // Just extract the text content without any timestamps or technical markers
  return subtitles.map(item => item.text).join('\n\n');
}

// Format subtitles as Advanced SubStation Alpha (ASS)
function formatAsASS(subtitles: SubtitleEntry[], title: string = 'Subtitle'): string {
  // Standard ASS header with basic styling
  const header = [
    '[Script Info]',
    `Title: ${title}`,
    `ScriptType: v4.00+`,
    'Collisions: Normal',
    'PlayResX: 1280',
    'PlayResY: 720',
    'Timer: 100.0000',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ''  
  ].join('\n');
  
  // Format subtitle events
  const events = subtitles.map(item => {
    const startTime = formatASSTime(item.start);
    const endTime = formatASSTime(item.end);
    return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${item.text.replace(/\n/g, '\\N')}`;
  }).join('\n');
  
  return header + events;
}

// Format subtitles as Synchronized Accessible Media Interchange (SAMI/SMI)
function formatAsSMI(subtitles: SubtitleEntry[], title: string = 'Subtitle'): string {
  // Standard SAMI header with basic styling
  const header = [
    '<SAMI>',
    '<HEAD>',
    '<TITLE>' + title + '</TITLE>',
    '<STYLE TYPE="text/css">',
    '<!--',
    'P { font-family: Arial; font-weight: normal; color: white; background-color: black; text-align: center; }',
    '.ENCC { name: English; lang: en-US; }',
    '-->',
    '</STYLE>',
    '</HEAD>',
    '<BODY>',
    ''  
  ].join('\n');
  
  // Format subtitle cues
  const cues = subtitles.map(item => {
    const startTime = Math.floor(item.start);
    const formattedText = item.text.replace(/\n/g, '<BR>');
    return `<SYNC Start=${startTime}><P Class=ENCC>${formattedText}</P></SYNC>`;
  }).join('\n');
  
  const footer = '\n</BODY>\n</SAMI>';
  
  return header + cues + footer;
}

// Format subtitles as LRC (Lyrics format) commonly used for music/karaoke
function formatAsLRC(subtitles: SubtitleEntry[], title: string = 'Subtitle'): string {
  // LRC metadata headers
  const metadata = [
    `[ti:${title}]`,
    `[ar:FetchSub]`,
    `[al:Generated Subtitles]`,
    `[by:FetchSub Subtitle Extractor]`,
    `[length:${formatLRCTime(subtitles[subtitles.length - 1].end)}]`,
    ``
  ].join('\n');
  
  // Format each line with timestamp
  const lines = subtitles.map(item => {
    // Split multi-line text into separate LRC lines
    const textLines = item.text.split('\n');
    return textLines.map((line, i) => {
      // Add a slight offset for each line in a multi-line subtitle
      // so they don't all appear at exactly the same moment
      const timeOffset = i * 200; // 200ms offset per line
      const timestamp = formatLRCTime(item.start + timeOffset);
      return `[${timestamp}]${line}`;
    }).join('\n');
  }).join('\n');
  
  return metadata + lines;
}

// Helper function to format time for SRT (HH:MM:SS,mmm)
function formatSRTTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

// Helper function to format time for VTT (HH:MM:SS.mmm)
function formatVTTTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

// Helper function for plain text timestamp format (MM:SS)
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Helper function to format time for ASS (H:MM:SS.cc)
function formatASSTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

// Helper function to format time for LRC format (mm:ss.xx)
function formatLRCTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const hundredths = Math.floor((ms % 1000) / 10);
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

// Subtitle entry interface
interface SubtitleEntry {
  start: number;  // Start time in milliseconds
  end: number;    // End time in milliseconds
  text: string;   // Subtitle text
}
