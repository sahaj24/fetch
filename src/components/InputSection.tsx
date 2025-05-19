"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Upload, Link as LinkIcon, FileText, Info, Coins, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

// Interface for CSV statistics
interface CSVStats {
  totalRows: number;
  validUrls: number;
  duplicates: number;
  invalidUrls: number;
  playlistCount: number;
  channelCount: number;
  singleVideoCount: number;
}

interface InputSectionProps {
  onSubmit?: (data: {
    inputType: "url" | "file";
    url?: string;
    file?: File;
    csvContent?: string;
  }) => void;
  onInputChange?: (data: {
    videoCount: number;
    isPlaylist: boolean;
  }) => void;
  onChangeTab?: (tab: string) => void;
  isProcessing?: boolean;
}

interface PlaylistInfo {
  title?: string;
  videoCount?: number;
  isEstimate?: boolean;
}

export default function InputSection({
  onSubmit = () => {},
  onInputChange = () => {},
  onChangeTab = () => {},
  isProcessing = false,
}: InputSectionProps) {
  const [inputType, setInputType] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // New state for CSV preview and analysis
  const [csvContent, setCsvContent] = useState<string>("");
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [csvStats, setCsvStats] = useState<CSVStats | null>(null);
  const [isAnalyzingCsv, setIsAnalyzingCsv] = useState(false);
  
  // Track video counts and playlist status for coin calculation
  const [videoCount, setVideoCount] = useState(1);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [isLoadingPlaylistInfo, setIsLoadingPlaylistInfo] = useState(false);
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);

  // Function to extract playlist ID from URL
  const extractPlaylistId = (url: string): string | null => {
    // Extract playlist ID from various YouTube URL formats
    let match;
    // Match playlist in the format ?list=PLAYLIST_ID
    match = url.match(/[&?]list=([^&]+)/i);
    if (match) return match[1];
    
    // Match direct playlist URL format
    match = url.match(/\/playlist\?.*list=([^&]+)/i);
    if (match) return match[1];
    
    return null;
  };

  // Function to fetch playlist info including video count
  const fetchPlaylistInfo = async (url: string) => {
    const playlistId = extractPlaylistId(url);
    
    if (!playlistId) return;
    
    setIsLoadingPlaylistInfo(true);
    setPlaylistInfo(null);
    
    try {
      const response = await fetch(`/api/youtube/playlist-info?id=${playlistId}`);
      
      if (response.ok) {
        const data = await response.json();
        setPlaylistInfo(data);
        
        // Update video count with actual count
        if (data.videoCount && data.videoCount > 0) {
          setVideoCount(data.videoCount);
          
          // Emit changes for coin calculation
          onInputChange({
            videoCount: data.videoCount,
            isPlaylist: true
          });
        }
      } else {
        console.error("Error fetching playlist info");
        // Fall back to estimate
        setVideoCount(10);
        
        onInputChange({
          videoCount: 10,
          isPlaylist: true
        });
      }
    } catch (error) {
      console.error("Error fetching playlist info:", error);
      // Fall back to estimate if fetch fails
      setVideoCount(10);
      
      onInputChange({
        videoCount: 10,
        isPlaylist: true
      });
    } finally {
      setIsLoadingPlaylistInfo(false);
    }
  };

  // Effect to update coin calculation when URL changes
  useEffect(() => {
    if (inputType === "url") {
      // Check if the URL is a playlist or channel
      const isPlaylistUrl = url.includes('playlist') || url.includes('list=');
      const isChannelUrl = url.includes('channel/') || url.includes('/c/') || url.includes('@');
      
      // Update state
      setIsPlaylist(isPlaylistUrl || isChannelUrl);
      
      // For playlists, fetch actual video count
      if (isPlaylistUrl && url.trim().length > 15) {
        fetchPlaylistInfo(url);
      } else if (isChannelUrl) {
        // For channels, we'll estimate 15 videos by default
        setVideoCount(15);
        
        // Emit changes for coin calculation
        onInputChange({
          videoCount: 15,
          isPlaylist: true
        });
      } else {
        // For single videos, use 1
        setVideoCount(1);
        setPlaylistInfo(null);
        
        // Emit changes for coin calculation
        onInputChange({
          videoCount: 1,
          isPlaylist: false
        });
      }
    }
  }, [url, inputType, onInputChange]);

  // Effect to update coin calculation when CSV stats change
  useEffect(() => {
    if (inputType === "file" && csvStats) {
      // Calculate estimated video count (single videos + playlists * estimated videos per playlist)
      const estimatedVideosPerPlaylist = 10;
      const estimatedVideosPerChannel = 15;
      const totalEstimatedVideos = 
        csvStats.singleVideoCount + 
        csvStats.playlistCount * estimatedVideosPerPlaylist +
        csvStats.channelCount * estimatedVideosPerChannel;
      
      // Update state
      setVideoCount(totalEstimatedVideos);
      setIsPlaylist(csvStats.playlistCount > 0 || csvStats.channelCount > 0);
      
      // Emit changes for coin calculation
      onInputChange({
        videoCount: totalEstimatedVideos,
        isPlaylist: csvStats.playlistCount > 0 || csvStats.channelCount > 0
      });
    }
  }, [csvStats, inputType, onInputChange]);

  // Function to analyze CSV content and extract YouTube URLs
  const analyzeCSVContent = async (content: string) => {
    setIsAnalyzingCsv(true);
    setCsvContent(content);
    
    try {
      // Simple preview extraction - just get the first few lines
      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      setCsvPreview(lines.slice(0, 5)); // Show first 5 non-empty lines
      
      // Count YouTube URLs using regex
      const youtubeUrlRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|playlist\?list=|channel\/|c\/|@)|youtu\.be\/)([^\s"'<>]+)/g;
      
      const matches = Array.from(content.matchAll(youtubeUrlRegex));
      const uniqueUrls = new Set(matches.map(match => match[0]));
      
      // Count different types of URLs
      let playlistCount = 0;
      let channelCount = 0;
      let videoCount = 0;
      
      uniqueUrls.forEach(url => {
        if (url.includes('playlist') || url.includes('list=')) {
          playlistCount++;
        } else if (url.includes('channel/') || url.includes('/c/') || url.includes('@')) {
          channelCount++;
        } else {
          videoCount++;
        }
      });
      
      // Create stats object
      const stats: CSVStats = {
        totalRows: lines.length,
        validUrls: uniqueUrls.size,
        duplicates: matches.length - uniqueUrls.size,
        invalidUrls: 0, // We can't determine this client-side accurately
        playlistCount,
        channelCount,
        singleVideoCount: videoCount
      };
      
      setCsvStats(stats);
    } catch (err) {
      console.error('Error analyzing CSV:', err);
      setError('Error analyzing CSV content');
    } finally {
      setIsAnalyzingCsv(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (inputType === "url") {
      if (!url.trim()) {
        setError("Please enter a YouTube URL");
        return;
      }

      // Enhanced YouTube URL validation
      if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
        setError("Please enter a valid YouTube URL");
        return;
      }

      onSubmit({ inputType, url });
    } else {
      if (!file) {
        setError("Please upload a CSV file");
        return;
      }

      if (!csvContent) {
        setError("CSV file is empty or couldn't be processed");
        return;
      }
      
      // Check if we found any valid URLs
      if (csvStats && csvStats.validUrls === 0) {
        setError("No valid YouTube URLs found in the CSV file");
        return;
      }

      onSubmit({ inputType, file, csvContent });
    }
    onChangeTab("next");
  };

  // Helper function to read file content
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Reset previous data
    setCsvContent("");
    setCsvPreview([]);
    setCsvStats(null);
    setError(null);
    
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check if it's a CSV file
      if (
        selectedFile.type !== "text/csv" &&
        !selectedFile.name.endsWith(".csv") &&
        !selectedFile.name.endsWith(".txt") // Also allow .txt files that might contain CSV data
      ) {
        setError("Please upload a CSV or TXT file with YouTube URLs");
        return;
      }
      
      // Update file state
      setFile(selectedFile);
      
      try {
        // Read and analyze the file
        const content = await readFileAsText(selectedFile);
        if (!content.trim()) {
          setError("The uploaded file is empty");
          return;
        }
        
        // Analyze the CSV content for statistics
        await analyzeCSVContent(content);
      } catch (err) {
        console.error("Error reading file:", err);
        setError("Failed to read the uploaded file. Please try again.");
        setFile(null);
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <Tabs
        defaultValue="url"
        onValueChange={(value) => {
          setInputType(value as "url" | "file");
          // Reset video count when changing input type
          if (value === "url") {
            const isPlaylistUrl = url.includes('playlist') || url.includes('list=');
            const isChannelUrl = url.includes('channel/') || url.includes('/c/') || url.includes('@');
            
            if (isPlaylistUrl && playlistInfo?.videoCount) {
              setVideoCount(playlistInfo.videoCount);
              onInputChange({
                videoCount: playlistInfo.videoCount,
                isPlaylist: true
              });
            } else {
              setVideoCount(isPlaylistUrl || isChannelUrl ? 10 : 1);
              setIsPlaylist(isPlaylistUrl || isChannelUrl);
              
              onInputChange({
                videoCount: isPlaylistUrl || isChannelUrl ? 10 : 1,
                isPlaylist: isPlaylistUrl || isChannelUrl
              });
            }
          } else if (csvStats) {
            // If we have CSV stats, use them
            const estimatedVideosPerPlaylist = 10;
            const estimatedVideosPerChannel = 15;
            const totalEstimatedVideos = 
              csvStats.singleVideoCount + 
              csvStats.playlistCount * estimatedVideosPerPlaylist +
              csvStats.channelCount * estimatedVideosPerChannel;
            
            setVideoCount(totalEstimatedVideos);
            setIsPlaylist(csvStats.playlistCount > 0 || csvStats.channelCount > 0);
            
            onInputChange({
              videoCount: totalEstimatedVideos,
              isPlaylist: csvStats.playlistCount > 0 || csvStats.channelCount > 0
            });
          } else {
            // Default values
            setVideoCount(1);
            setIsPlaylist(false);
            onInputChange({
              videoCount: 1,
              isPlaylist: false
            });
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-secondary/70">
          <TabsTrigger 
            value="url" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <LinkIcon className="h-4 w-4" />
            Enter URL
          </TabsTrigger>
          <TabsTrigger 
            value="file" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="youtube-url" className="text-base font-medium">YouTube URL</Label>
            <Input
              id="youtube-url"
              placeholder="https://www.youtube.com/playlist?list=PLAYLIST_ID"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isProcessing}
              className="bg-white/60 backdrop-blur-sm border-black/10 shadow-sm h-11 input-focus-ring"
            />
            <p className="text-sm text-muted-foreground">
              Enter a YouTube playlist URL to batch process all videos in the playlist at once.
            </p>
          </div>
          
          {/* Coin estimate for URL */}
          {url && (
            <div className="mt-2 p-3 bg-amber-50/70 border border-amber-100 rounded-md flex items-center gap-2">
              {isLoadingPlaylistInfo ? (
                <>
                  <Loader2 className="h-4 w-4 text-amber-600 shrink-0 animate-spin" />
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">Loading accurate playlist information...</span>
                  </div>
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4 text-amber-600 shrink-0" />
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">
                      {isPlaylist ? (
                        playlistInfo?.title ? (
                          <>
                            Playlist: <span className="font-semibold">{playlistInfo.title}</span> {" "}
                            {playlistInfo?.isEstimate ? 
                              `(~${videoCount} videos est.)` : 
                              `(${videoCount} videos)`}
                          </>
                        ) : (
                          `Playlist detected - ${videoCount} videos${isPlaylist ? " est." : ""}`
                        )
                      ) : (
                        "Single video detected"
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Add new callout for playlist transcription feature */}
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <span className="font-medium">NEW: Playlist Transcription</span> - You can now directly paste playlist URLs to transcribe all videos at once. Just paste and go!
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="file" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file" className="text-base font-medium">CSV or Text File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                disabled={isProcessing || isAnalyzingCsv}
                className="bg-white/60 backdrop-blur-sm border-black/10 shadow-sm file:mr-4 file:py-2 file:px-4 
                           file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-black h-11
                           file:text-white hover:file:bg-black/90 input-focus-ring file:h-full"
              />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Upload a CSV file with YouTube video links or a plain text file with one URL per line.
            </p>
          </div>
          
          {/* CSV Analysis and Preview */}
          {isAnalyzingCsv && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>
                <p className="text-sm text-blue-700">Analyzing file content...</p>
              </div>
            </div>
          )}
          
          {csvStats && !isAnalyzingCsv && (
            <div className="bg-white/80 border border-black/5 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium mb-3">File Analysis Results</h3>
              
              <div className="space-y-4">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-3 bg-secondary/20 rounded-md">
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                    <p className="text-lg font-semibold">{csvStats.totalRows}</p>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-md">
                    <p className="text-xs text-green-700">Valid URLs</p>
                    <p className="text-lg font-semibold text-green-700">{csvStats.validUrls}</p>
                  </div>
                  
                  <div className="p-3 bg-amber-50 rounded-md">
                    <p className="text-xs text-amber-700">Duplicates</p>
                    <p className="text-lg font-semibold text-amber-700">{csvStats.duplicates}</p>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-xs text-blue-700">URL Types</p>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{csvStats.singleVideoCount} videos</span>
                      {csvStats.playlistCount > 0 && (
                        <span className="font-medium">{csvStats.playlistCount} playlists</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Estimated video count for coin calculation */}
                {videoCount > csvStats.validUrls && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-md flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="text-sm text-amber-700">
                      <span className="font-medium">Estimated {videoCount} total videos</span> 
                      <span className="text-xs ml-1">
                        (includes videos from {csvStats.playlistCount} playlists and {csvStats.channelCount} channels)
                      </span>
                    </div>
                  </div>
                )}
                
                {/* URL Preview */}
                {csvPreview.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Preview (first {Math.min(csvPreview.length, 5)} lines):</h4>
                    <div className="max-h-32 overflow-auto rounded-md bg-gray-50 p-2 text-xs font-mono">
                      {csvPreview.map((line, index) => (
                        <div key={index} className="py-0.5">
                          <span className="text-gray-500 mr-2">{index + 1}.</span>
                          {line.length > 60 ? line.substring(0, 57) + '...' : line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Ready to process message */}
                {csvStats.validUrls > 0 && (
                  <div className="p-2 bg-green-50 border border-green-100 rounded-md text-sm text-green-700 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    Ready to process {csvStats.validUrls} YouTube {csvStats.validUrls === 1 ? 'URL' : 'URLs'}
                    {csvStats.playlistCount > 0 && ` (including ${csvStats.playlistCount} playlist${csvStats.playlistCount === 1 ? '' : 's'})`}
                  </div>
                )}
                
                {csvStats.validUrls === 0 && (
                  <div className="p-2 bg-red-50 border border-red-100 rounded-md text-sm text-red-700 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    No valid YouTube URLs found in file. Please check the content and try again.
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Advanced CSV Instructions */}
          <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <h4 className="text-sm font-medium mb-2">File Format Options:</h4>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 mt-1.5"></div>
                <span><strong>CSV File:</strong> Can contain headers and multiple columns - we'll extract all YouTube URLs</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 mt-1.5"></div>
                <span><strong>Text File:</strong> Simple list with one URL per line</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 mt-1.5"></div>
                <span>Include YouTube video</span>
              </li>
            </ul>
          </div>
        </TabsContent>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 p-5 bg-white/70 backdrop-blur-sm rounded-lg border border-black/5 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-black shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-2">Supported formats:</p>
              <ul className="grid gap-2 pl-0">
                <li className="flex items-center gap-2 bg-secondary/50 p-2 rounded-md">
                  <div className="h-1.5 w-1.5 rounded-full bg-black"></div>
                  YouTube playlist URLs
                  <span className="text-xs text-muted-foreground">
                    (https://www.youtube.com/playlist?list=...)
                  </span>
                </li>
                <li className="flex items-center gap-2 bg-secondary/50 p-2 rounded-md">
                  <div className="h-1.5 w-1.5 rounded-full bg-black"></div>
                  YouTube channel URLs
                  <span className="text-xs text-muted-foreground">
                    (https://www.youtube.com/c/...)
                  </span>
                </li>
                <li className="flex items-center gap-2 bg-secondary/50 p-2 rounded-md">
                  <div className="h-1.5 w-1.5 rounded-full bg-black"></div>
                  Individual YouTube video URLs
                  <span className="text-xs text-muted-foreground">
                    (https://www.youtube.com/watch?v=...)
                  </span>
                </li>
                <li className="flex items-center gap-2 bg-secondary/50 p-2 rounded-md">
                  <div className="h-1.5 w-1.5 rounded-full bg-black"></div>
                  CSV files with one YouTube URL per line
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
