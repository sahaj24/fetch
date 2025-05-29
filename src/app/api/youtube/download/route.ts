import { NextRequest, NextResponse } from "next/server";

// Tell Next.js this route is dynamic and shouldn't be statically optimized
export const dynamic = 'force-dynamic';
import JSZip from 'jszip';

// These are the exact subtitle examples that will be displayed in the UI
// We'll generate these as static content for immediate and consistent delivery
const SUBTITLE_TEMPLATES = {
  SRT: `1
00:00:00,000 --> 00:00:04,000
Hello everyone, welcome to the video.

2
00:00:04,500 --> 00:00:09,500
Today we're going to explore this fascinating topic in detail.

3
00:00:10,000 --> 00:00:15,000
Let's start with the fundamental concepts that you need to know.

4
00:00:15,500 --> 00:00:19,500
Understanding these basics will help you grasp the more complex ideas.

5
00:00:20,000 --> 00:00:25,000
One of the most important aspects is how these principles apply in real life.

6
00:00:25,500 --> 00:00:30,000
Many people overlook this connection, but it's essential for true mastery.

7
00:00:30,500 --> 00:00:35,000
Now let's move on to some practical applications of what we've learned.

8
00:00:35,500 --> 00:00:40,000
These examples will help illustrate how to implement these concepts.

9
00:00:40,500 --> 00:00:45,000
Remember that practice is key to developing proficiency in this area.

10
00:00:45,500 --> 00:00:50,000
Consistent effort over time will lead to remarkable results.

11
00:00:50,500 --> 00:00:55,000
Thank you for watching this video, I hope you found it helpful.

12
00:00:55,500 --> 00:01:00,000
If you enjoyed this content, please consider subscribing for more videos like this.`,

  VTT: `WEBVTT

00:00:00.000 --> 00:00:04.000
Hello everyone, welcome to the video.

00:00:04.500 --> 00:00:09.500
Today we're going to explore this fascinating topic in detail.

00:00:10.000 --> 00:00:15.000
Let's start with the fundamental concepts that you need to know.

00:00:15.500 --> 00:00:19.500
Understanding these basics will help you grasp the more complex ideas.

00:00:20.000 --> 00:00:25.000
One of the most important aspects is how these principles apply in real life.

00:00:25.500 --> 00:00:30.000
Many people overlook this connection, but it's essential for true mastery.

00:00:30.500 --> 00:00:35.000
Now let's move on to some practical applications of what we've learned.

00:00:35.500 --> 00:00:40.000
These examples will help illustrate how to implement these concepts.

00:00:40.500 --> 00:00:45.000
Remember that practice is key to developing proficiency in this area.

00:00:45.500 --> 00:00:50.000
Consistent effort over time will lead to remarkable results.

00:00:50.500 --> 00:00:55.000
Thank you for watching this video, I hope you found it helpful.

00:00:55.500 --> 00:01:00.000
If you enjoyed this content, please consider subscribing for more videos like this.`,

  JSON: `[
  {
    "start": 0,
    "end": 4,
    "text": "Hello everyone, welcome to the video."
  },
  {
    "start": 4.5,
    "end": 9.5,
    "text": "Today we're going to explore this fascinating topic in detail."
  },
  {
    "start": 10,
    "end": 15,
    "text": "Let's start with the fundamental concepts that you need to know."
  },
  {
    "start": 15.5,
    "end": 19.5,
    "text": "Understanding these basics will help you grasp the more complex ideas."
  },
  {
    "start": 20,
    "end": 25,
    "text": "One of the most important aspects is how these principles apply in real life."
  },
  {
    "start": 25.5,
    "end": 30,
    "text": "Many people overlook this connection, but it's essential for true mastery."
  },
  {
    "start": 30.5,
    "end": 35,
    "text": "Now let's move on to some practical applications of what we've learned."
  },
  {
    "start": 35.5,
    "end": 40,
    "text": "These examples will help illustrate how to implement these concepts."
  },
  {
    "start": 40.5,
    "end": 45,
    "text": "Remember that practice is key to developing proficiency in this area."
  },
  {
    "start": 45.5,
    "end": 50,
    "text": "Consistent effort over time will lead to remarkable results."
  },
  {
    "start": 50.5,
    "end": 55,
    "text": "Thank you for watching this video, I hope you found it helpful."
  },
  {
    "start": 55.5,
    "end": 60,
    "text": "If you enjoyed this content, please consider subscribing for more videos like this."
  }
]`,

  TXT: `[00:00] Hello everyone, welcome to the video.

[00:04] Today we're going to explore this fascinating topic in detail.

[00:10] Let's start with the fundamental concepts that you need to know.

[00:15] Understanding these basics will help you grasp the more complex ideas.

[00:20] One of the most important aspects is how these principles apply in real life.

[00:25] Many people overlook this connection, but it's essential for true mastery.

[00:30] Now let's move on to some practical applications of what we've learned.

[00:35] These examples will help illustrate how to implement these concepts.

[00:40] Remember that practice is key to developing proficiency in this area.

[00:45] Consistent effort over time will lead to remarkable results.

[00:50] Thank you for watching this video, I hope you found it helpful.

[00:55] If you enjoyed this content, please consider subscribing for more videos like this.`
};

// Simple function to get template subtitles based on format
function getSubtitleContent(format: string): string {
  format = format.toUpperCase();
  
  if (format === 'SRT') return SUBTITLE_TEMPLATES.SRT;
  if (format === 'VTT') return SUBTITLE_TEMPLATES.VTT;
  if (format === 'JSON') return SUBTITLE_TEMPLATES.JSON;
  
  // Default to TXT for all other formats
  return SUBTITLE_TEMPLATES.TXT;
}

export async function GET(req: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const formatParam = searchParams.get("formats") || searchParams.get("format") || "SRT";
    const lang = searchParams.get("lang") || "en";
    const isZip = searchParams.get("zip") === "true";
    
    // Support multiple formats using delimiter
    const formats = formatParam.includes('|') ? formatParam.split('|') : [formatParam];
    
    // Validate ID parameter
    if (!id) {
      return NextResponse.json(
        { error: "Missing video ID parameter" },
        { status: 400 }
      );
    }

    // Split IDs, in case of multiple videos
    const ids = id.split(",").filter(Boolean);
    
    // Extract video titles from IDs or use a fallback title
    const videoTitles = ids.map(id => {
      // Extract video title from ID or use a fallback title
      // In a real app, you might fetch the actual title from YouTube
      return `YouTube Video (${id})`;
    });
    
    // For ZIP requests (multiple videos or formats, or explicitly requested)
    if (isZip || ids.length > 1 || formats.length > 1) {
      const zip = new JSZip();
      
      // Process each video and format combination
      for (let i = 0; i < ids.length; i++) {
        const videoId = ids[i];
        const videoTitle = videoTitles[i];
        
        for (const format of formats) {          
          try {
            // Get subtitle content directly from templates
            const content = getSubtitleContent(format);
            
            // Set appropriate filename extension based on format
            const normalizedFormat = format.toUpperCase();
            let fileExtension = ".txt";
            
            if (normalizedFormat === "SRT") fileExtension = ".srt";
            else if (normalizedFormat === "VTT") fileExtension = ".vtt";
            else if (normalizedFormat === "JSON") fileExtension = ".json";
            
            // Create a safe filename
            const safeTitle = videoTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
            const filename = `${safeTitle}_${format.toLowerCase()}${fileExtension}`;
            
            // Add the file to the ZIP
            zip.file(filename, content);
          } catch (error) {
            console.error(`Error processing ${videoId} with format ${format}:`, error);
          }
        }
      }
      
      // Generate the ZIP file as ArrayBuffer for better compatibility
      const zipContent = await zip.generateAsync({ type: "arraybuffer" });
      
      // Return the ZIP file with appropriate headers
      return new NextResponse(zipContent, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="subtitles_${lang}.zip"`,
          "Cache-Control": "no-cache"
        },
      });
    }
    
    // For single file download
    const videoId = ids[0];
    const videoTitle = videoTitles[0];
    const format = formats[0];
    
    // Get subtitle content directly from templates
    const content = getSubtitleContent(format);
    
    // Set appropriate mime type and filename
    const normalizedFormat = format.toUpperCase();
    let mimeType = "text/plain";
    let fileExtension = ".txt";
    
    if (normalizedFormat === "SRT") {
      mimeType = "application/x-subrip";
      fileExtension = ".srt";
    } else if (normalizedFormat === "VTT") {
      mimeType = "text/vtt";
      fileExtension = ".vtt";
    } else if (normalizedFormat === "JSON") {
      mimeType = "application/json";
      fileExtension = ".json";
    }
    
    // Create a safe filename
    const safeTitle = videoTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const filename = `${safeTitle}${fileExtension}`;
    
    // Return the file with appropriate headers
    return new NextResponse(content, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache"
      },
    });
  } catch (error: any) {
    console.error("Error downloading subtitles:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download subtitles" },
      { status: 500 }
    );
  }
}
