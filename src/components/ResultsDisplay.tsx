"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  Download, 
  Info, 
  Check, 
  Copy, 
  ExternalLink, 
  Clock, 
  Languages,
  Archive 
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { addToDownloadHistory } from "@/app/history/utils";

interface Subtitle {
  id: string;
  videoTitle: string;
  language: string;
  format: string;
  fileSize: string;
  content: string;
  url: string;
  downloadUrl: string;
  isPlaylistOrChannel?: boolean;
  isBeingProcessed?: boolean;
  error?: string;
  notice?: string;
  isGenerated?: boolean;
}

interface ResultsDisplayProps {
  subtitles: Subtitle[];
  onDownloadAll?: () => void;
  isProcessComplete?: boolean;
}

const ResultsDisplay = ({
  subtitles = [],
  onDownloadAll = () => {},
  isProcessComplete = false,
}: ResultsDisplayProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);

  if (subtitles.length === 0) {
    return null;
  }

  // Define the group type for clarity
  type SubtitleGroup = {
    videoTitle: string;
    videoUrl: string;
    subtitles: Subtitle[];
    isPlaylist?: boolean;
    isBeingProcessed?: boolean;
    isGenerated?: boolean;
    error?: string;
    notice?: string;
  };

  // Group subtitles by video
  const subtitlesByVideo = subtitles.reduce((groups, subtitle) => {
    // If this is a playlist being processed, create a special group for it
    if (subtitle.isPlaylistOrChannel && subtitle.isBeingProcessed) {
      // Create a special playlist group
      const playlistId = `playlist-${Date.now()}`;
      if (!groups[playlistId]) {
        groups[playlistId] = {
          videoTitle: subtitle.videoTitle,
          videoUrl: subtitle.url,
          subtitles: [subtitle],
          isPlaylist: true,
          isBeingProcessed: true
        };
      }
      return groups;
    }
    
    // Extract video ID from URL
    const videoId = subtitle.url.includes("v=") 
      ? subtitle.url.split("v=")[1].split("&")[0] 
      : subtitle.url.split("/").pop() || "unknown";
    
    // Create new group if it doesn't exist
    if (!groups[videoId]) {
      groups[videoId] = {
        videoTitle: subtitle.videoTitle,
        videoUrl: subtitle.url,
        subtitles: [],
        isGenerated: subtitle.isGenerated,
        error: subtitle.error,
        notice: subtitle.notice
      };
    }
    
    // Add subtitle to its group
    groups[videoId].subtitles.push(subtitle);
    return groups;
  }, {} as Record<string, SubtitleGroup>);

  const handleCopyContent = async (subtitle: Subtitle) => {
    try {
      // Clean up the content before copying - remove any system messages or notices
      let cleanContent = subtitle.content;
      
      // Remove any notice messages that might be in the content
      cleanContent = cleanContent.replace(/\[Note:.*?\]/g, '');
        // For certain formats, ensure proper newlines and spacing
      if (subtitle.format === 'SRT' || subtitle.format === 'VTT') {
        // Ensure proper double spacing between subtitle entries
        cleanContent = cleanContent.replace(/\n\n\n+/g, '\n\n');
      }
      
      await navigator.clipboard.writeText(subtitle.content);
      setCopiedId(subtitle.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // Silent fail - clipboard access might be restricted
    }
  };
  const handleDownload = async (subtitle: Subtitle) => {
    try {
      setDownloadingIds(prev => [...prev, subtitle.id]);
      
      // Create a direct download with the exact content already in the UI
      const blob = new Blob([subtitle.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a direct download from the blob
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      
      // Ensure a clean filename by removing unsafe characters
      const safeTitle = subtitle.videoTitle
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .slice(0, 50);
      
      // Determine proper file extension based on format
      const fileExtensions: Record<string, string> = {
        'srt': '.srt',
        'vtt': '.vtt',
        'ass': '.ass',
        'smi': '.smi',
        'json': '.json',
        'lrc': '.lrc'
      };
      
      const format = subtitle.format.toLowerCase();
      const fileExtension = format in fileExtensions ? fileExtensions[format] : '.txt';
      
      downloadLink.download = `${safeTitle}_${subtitle.language}_${subtitle.format}${fileExtension}`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Record this download in history
      try {
        // Extract video ID from the URL
        const videoId = subtitle.url.includes("v=") 
          ? subtitle.url.split("v=")[1].split("&")[0] 
          : subtitle.url.split("/").pop() || "unknown";
          
        // Create a simple thumbnail URL based on the video ID
        const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        
        // Add to download history with all required parameters
        await addToDownloadHistory(
          subtitle.url,
          videoId,
          subtitle.videoTitle,
          thumbnail,
          subtitle.format,
          subtitle.language
        );
      } catch (historyError) {
        // Non-critical error, continue with download despite history failure
      }
      
      // Cleanup
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
      
      // Remove from downloading state after a short delay to show feedback
      setTimeout(() => {
        setDownloadingIds(prev => prev.filter(id => id !== subtitle.id));
      }, 1000);
    } catch (err) {
      // Remove from downloading state in case of error
      setDownloadingIds(prev => prev.filter(id => id !== subtitle.id));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Extracted Subtitles</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {Object.keys(subtitlesByVideo).length} videos processed • {subtitles.length} subtitle files
          </p>
        </div>
        <Button
          onClick={onDownloadAll}
          className="flex items-center gap-2 bg-black hover:bg-black/90 text-white fancy-button"
        >
          <Archive size={16} />
          Download All as ZIP
        </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(subtitlesByVideo).map(([videoId, data]) => (
          <Card key={videoId} className="overflow-hidden border-black/5 shadow-sm">
            <div className="border-b border-black/5 bg-muted/30 p-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-semibold line-clamp-1">
                    {data.videoTitle}
                  </h3>
                  <div className="flex items-center text-sm text-muted-foreground mt-1 gap-1 flex-wrap">
                    <span className="truncate max-w-[300px]">{data.videoUrl}</span>
                    <a 
                      href={data.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs hover:text-black transition-colors"
                    >
                      <ExternalLink size={12} className="ml-1" />
                    </a>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white/80">
                  {data.subtitles.length} subtitle files
                </Badge>
              </div>
            </div>
            
            <div className="p-4 grid gap-3">
              {data.isPlaylist && data.isBeingProcessed ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-800">Processing Playlist</h4>
                      <p className="text-sm text-blue-600 mt-1">
                        All videos in this playlist are being processed. Results will appear as they're completed.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                data.subtitles.map((subtitle) => (
                  <div 
                    key={subtitle.id} 
                    className="flex justify-between items-center p-3 bg-white rounded-md border border-black/5 hover:border-black/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Languages size={18} className="text-muted-foreground" />
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="rounded-sm">
                            {subtitle.format}
                          </Badge>
                          <Badge variant="outline" className="rounded-sm font-normal">
                            {subtitle.language}
                          </Badge>
                          {subtitle.isGenerated && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200 rounded-sm font-normal">
                              Generated
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {subtitle.fileSize}
                        </p>
                        {subtitle.notice && (
                          <p className="text-xs text-blue-600 mt-1">
                            {subtitle.notice}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleCopyContent(subtitle)}
                            >
                              {copiedId === subtitle.id ? (
                                <Check size={14} className="text-green-500" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{copiedId === subtitle.id ? "Copied!" : "Copy content"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 gap-1"
                        onClick={() => handleDownload(subtitle)}
                        disabled={downloadingIds.includes(subtitle.id)}
                      >
                        {downloadingIds.includes(subtitle.id) ? (
                          <>
                            <Clock size={14} className="animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download size={14} />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="p-4 bg-muted/40 rounded-lg flex items-start gap-3">
        <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p>
            The extracted subtitles are ready for download. You can download
            individual subtitle files, copy subtitle content directly, or get all of them as a ZIP archive.
            Advanced subtitle formats like ASS and SMI may have better styling and positioning capabilities for
            video editing software.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;
