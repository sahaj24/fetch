"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, XCircle, CheckCircle, DownloadCloud, Database, Clock, RefreshCw } from "lucide-react";
import { cacheService } from "@/lib/cache/cache-service";
import { getCacheStats, formatCacheSize, formatCacheAge } from "@/lib/cache/cache-utils";
import { getCachedSubtitlesList } from "@/lib/cache/subtitle-cache";

interface CacheProps {
  showDetailed?: boolean;
}

export function CacheManager({ showDetailed = false }: CacheProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [cacheStats, setCacheStats] = useState({
    totalItems: 0,
    totalMemoryUsage: 0,
    oldestItemAge: 0,
    cacheHitRate: 0
  });
  const [cachedSubtitles, setCachedSubtitles] = useState<{ videoId: string; language: string; cachedAt: Date }[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Load cache stats
  const loadStats = () => {
    setIsLoading(true);
    
    try {
      const stats = getCacheStats();
      setCacheStats(stats);
      
      // Get cached subtitles list
      const subtitles = getCachedSubtitlesList();
      setCachedSubtitles(subtitles);
    } catch (error) {
      console.error("Error loading cache stats:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear all cache
  const clearCache = async () => {
    setIsClearing(true);
    
    try {
      cacheService.clear();
      
      // Reload stats
      loadStats();
    } catch (error) {
      console.error("Error clearing cache:", error);
    } finally {
      setIsClearing(false);
    }
  };
  
  // Calculate cache usage percentage (estimate)
  const calculateCacheUsage = () => {
    // localStorage has a limit of ~5MB in most browsers
    const estimatedLimit = 5 * 1024 * 1024;
    return Math.min(100, (cacheStats.totalMemoryUsage / estimatedLimit) * 100);
  };
  
  // Trigger stats load on mount
  useEffect(() => {
    loadStats();
    
    // Refresh stats every minute
    const interval = setInterval(loadStats, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Simple mode just shows a status badge when there are cached items
  if (!showDetailed) {
    // Only show the badge if there are items in the cache
    if (cacheStats.totalItems === 0) {
      return null;
    }
    
    return (
      <div className="flex items-center gap-2">
        <Badge 
          variant="secondary"
          className="px-2 py-1"
        >
          <Database className="h-3 w-3 mr-1" />
          <span>{cacheStats.totalItems} cached</span>
        </Badge>
      </div>
    );
  }
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cache Manager</CardTitle>
            <CardDescription>Manage cached subtitle data</CardDescription>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={loadStats}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subtitles">Cached Subtitles</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <CardContent className="space-y-4 pt-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cache Usage</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCacheSize(cacheStats.totalMemoryUsage)}
                    </span>
                  </div>
                  <Progress value={calculateCacheUsage()} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Items Cached</span>
                      <Badge variant="secondary">{cacheStats.totalItems}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cachedSubtitles.length} subtitles
                    </p>
                  </div>
                  
                  <div className="rounded-lg border p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Cache Age</span>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatCacheAge(cacheStats.oldestItemAge)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Oldest cached item
                    </p>
                  </div>
                  
                  <div className="rounded-lg border p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Hit Rate</span>
                      <span className="text-sm font-medium">
                        {Math.round(cacheStats.cacheHitRate * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${cacheStats.cacheHitRate * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Status</span>
                      <Badge 
                        variant="secondary"
                        className={`${cacheStats.totalItems > 0 ? "bg-green-500 text-white" : ""}`}
                      >
                        {cacheStats.totalItems > 0 ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> Empty</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cache is functioning normally
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="subtitles">
          <CardContent className="space-y-4 pt-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : cachedSubtitles.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {cachedSubtitles.map((item, index) => (
                  <div
                    key={`${item.videoId}_${item.language}_${index}`}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                        <DownloadCloud className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[180px]">
                          {item.videoId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.language} · {item.cachedAt.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        cacheService.remove(`subtitle_${item.videoId}_${item.language}`);
                        loadStats();
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Database className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-muted-foreground">No cached subtitles found</p>
              </div>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="bg-gray-50 p-4">
        <Button
          variant="destructive"
          onClick={clearCache}
          disabled={isClearing || cacheStats.totalItems === 0}
          className="w-full"
        >
          {isClearing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Clearing...
            </>
          ) : (
            "Clear All Cache"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
