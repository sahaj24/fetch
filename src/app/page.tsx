"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InputSection from "@/components/InputSection";
import FormatSelection from "@/components/FormatSelection";
import ProcessVisualization from "@/components/ProcessVisualization";
import ResultsDisplay from "@/components/ResultsDisplay";
import { QuietCoinBalance } from "@/components/QuietCoinBalance";
import { ProcessingMessages } from "@/components/ProcessingMessages";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  AlertCircle, 
  Loader2,
  Headphones,
  ArrowDown,
  CheckCircle
} from "lucide-react";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { getUserCoins, OPERATION_COSTS } from "@/app/coins/utils";
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/supabase/config';

// Default formats for subtitle extraction
const DEFAULT_FORMATS = ["CLEAN_TEXT", "SRT"];

export default function Home() {
  const [activeTab, setActiveTab] = useState("input");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasResults, setHasResults] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(DEFAULT_FORMATS);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const [processedVideos, setProcessedVideos] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  
  // For time estimation
  const [startTime, setStartTime] = useState<number>(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>("--:--");

  // For coin cost calculation
  const [coinCostEstimate, setCoinCostEstimate] = useState(0);
  const [videoCount, setVideoCount] = useState(1);
  const [isPlaylist, setIsPlaylist] = useState(false);
    // For coin balance tracking
  const [userCoinBalance, setUserCoinBalance] = useState<number>(0);
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);
  const [hasInsufficientCoins, setHasInsufficientCoins] = useState(false);
  
  // Flag to prevent coin balance updates during critical state transitions
  const [isProcessingTransition, setIsProcessingTransition] = useState(false);
  
  // For tracking current input data from InputSection
  const [currentInputData, setCurrentInputData] = useState<{
    inputType: "url" | "file";
    url?: string;
    file?: File;
    csvContent?: string;
  } | null>(null);

  // State persistence keys for localStorage
  const STORAGE_KEYS = {
    activeTab: 'fetchsub_activeTab',
    processingState: 'fetchsub_processingState',
    subtitles: 'fetchsub_subtitles',
    hasResults: 'fetchsub_hasResults',
    selectedFormats: 'fetchsub_selectedFormats',
    selectedLanguage: 'fetchsub_selectedLanguage'
  };
  // Function to save state to localStorage
  const saveState = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    console.log('💾 saveState called with:', {
      activeTab,
      isProcessing,
      progress,
      hasResults,
      subtitlesLength: subtitles.length
    });
    
    try {
      localStorage.setItem(STORAGE_KEYS.activeTab, activeTab);
      localStorage.setItem(STORAGE_KEYS.processingState, JSON.stringify({
        isProcessing,
        progress,
        processedVideos,
        totalVideos
      }));
      localStorage.setItem(STORAGE_KEYS.subtitles, JSON.stringify(subtitles));
      localStorage.setItem(STORAGE_KEYS.hasResults, JSON.stringify(hasResults));
      localStorage.setItem(STORAGE_KEYS.selectedFormats, JSON.stringify(selectedFormats));
      localStorage.setItem(STORAGE_KEYS.selectedLanguage, selectedLanguage);
      console.log('✅ State saved to localStorage successfully');
    } catch (error) {
      console.error('❌ Error saving state to localStorage:', error);
    }
  }, [activeTab, isProcessing, progress, processedVideos, totalVideos, subtitles, hasResults, selectedFormats, selectedLanguage]);  // Function to restore state from localStorage
  const restoreState = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    console.log('🔄 restoreState called - checking localStorage...');
    let shouldRestoreResultsTab = false;
    
    try {
      const savedTab = localStorage.getItem(STORAGE_KEYS.activeTab);
      const savedProcessingState = localStorage.getItem(STORAGE_KEYS.processingState);
      const savedSubtitles = localStorage.getItem(STORAGE_KEYS.subtitles);
      const savedHasResults = localStorage.getItem(STORAGE_KEYS.hasResults);
      const savedFormats = localStorage.getItem(STORAGE_KEYS.selectedFormats);      const savedLanguage = localStorage.getItem(STORAGE_KEYS.selectedLanguage);

      console.log('📦 Found in localStorage:', {
        savedTab,
        savedHasResults,
        savedSubtitles: savedSubtitles ? `${savedSubtitles.length} chars` : 'null',
        savedFormats,
        savedLanguage
      });

      // STEP 1: First check what needs to be restored
      let savedSubtitlesData = null;
      if (savedHasResults) {
        const hasResultsValue = JSON.parse(savedHasResults);
        if (hasResultsValue) {
          console.log('✅ Found hasResults=true in localStorage');
          shouldRestoreResultsTab = true;
        }
      }

      if (savedSubtitles) {
        const parsedSubtitles = JSON.parse(savedSubtitles);
        if (Array.isArray(parsedSubtitles) && parsedSubtitles.length > 0) {
          console.log(`📋 Found ${parsedSubtitles.length} subtitles in localStorage`);
          savedSubtitlesData = parsedSubtitles;
          shouldRestoreResultsTab = true;
        }
      }

      // STEP 2: Restore processing state
      if (savedProcessingState) {
        const processingState = JSON.parse(savedProcessingState);
        if (processingState.isProcessing) {
          console.log('🔄 Restoring processing state:', processingState);
          setIsProcessing(processingState.isProcessing);
          setProgress(processingState.progress || 0);
          setProcessedVideos(processingState.processedVideos || 0);
          setTotalVideos(processingState.totalVideos || 0);        }
      }

      // STEP 3: Finally restore activeTab based on all the restored state
      // Use startTransition to batch state updates and ensure hasResults is set before activeTab
      if (savedTab && (savedTab === 'processing' || savedTab === 'results')) {
        // Only restore results tab if we actually have results
        if (savedTab === 'results' && shouldRestoreResultsTab) {
          console.log('🎯 Restoring activeTab to results (has results) - using startTransition');
          startTransition(() => {
            // Restore all results-related state together in proper order
            setHasResults(true);
            if (savedSubtitlesData) {
              setSubtitles(savedSubtitlesData);
            }
            setActiveTab('results');
          });
        } else if (savedTab === 'processing') {
          console.log('🎯 Restoring activeTab to processing');
          setActiveTab('processing');
        } else {
          console.log('⚠️ Cannot restore results tab - no results found');
        }
      } else if (shouldRestoreResultsTab && !savedTab) {
        // If we have results but no saved tab, default to results
        console.log('🎯 No saved tab but have results - defaulting to results tab - using startTransition');
        startTransition(() => {
          // Restore all results-related state together in proper order
          setHasResults(true);
          if (savedSubtitlesData) {
            setSubtitles(savedSubtitlesData);
          }
          setActiveTab('results');
        });
      }

      if (savedFormats) {
        const parsedFormats = JSON.parse(savedFormats);
        if (Array.isArray(parsedFormats) && parsedFormats.length > 0) {
          console.log('📝 Restoring formats:', parsedFormats);
          setSelectedFormats(parsedFormats);
        }
      }

      if (savedLanguage) {
        console.log('🌐 Restoring language:', savedLanguage);
        setSelectedLanguage(savedLanguage);
      }

      console.log('✅ State restoration complete');
    } catch (error) {
      console.error('❌ Error restoring state from localStorage:', error);
    }
  }, []);

  // Function to clear saved state
  const clearSavedState = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Error clearing saved state:', error);
    }
  }, []);  // Restore state on component mount
  useEffect(() => {
    console.log('🚀 Component mounted - restoring state...');
    restoreState();
  }, [restoreState]);
  // Save state whenever important state changes
  useEffect(() => {
    console.log('🔄 State change detected:', { 
      activeTab, 
      hasResults, 
      subtitlesLength: subtitles.length, 
      isProcessing 
    });
    
    // Only save state if we're in processing or results tab, or have results
    if (activeTab === 'processing' || activeTab === 'results' || hasResults || subtitles.length > 0) {
      console.log('💾 Saving state due to change...');
      saveState();
    } else {
      console.log('⏭️ Skipping state save - conditions not met');
    }
  }, [activeTab, isProcessing, progress, processedVideos, totalVideos, subtitles, hasResults, saveState]);  // Handle tab changes with state management
  const handleTabChange = useCallback((newTab: string) => {
    console.log(`🔄 Tab change requested: ${activeTab} -> ${newTab}`);
    setActiveTab(newTab);
    
    // Only clear state if user manually navigates to input tab AND there are no results
    // This prevents clearing state when processing just completed but isProcessing became false
    if (newTab === 'input' && !isProcessing && !hasResults && subtitles.length === 0) {
      console.log('🧹 Clearing saved state (user navigated to input, no results)');
      clearSavedState();
      setHasResults(false);
      setSubtitles([]);
      setProgress(0);
      setProcessedVideos(0);
      setTotalVideos(0);
    } else if (newTab === 'input' && (hasResults || subtitles.length > 0)) {
      console.log('⚠️ User navigated to input but we have results - not clearing state');
    }
  }, [isProcessing, hasResults, subtitles.length, clearSavedState]);

  // Helper function to format time as mm:ss
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds === Infinity || isNaN(seconds) || seconds < 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle input changes for dynamic coin calculation
  const handleInputChange = (data: { videoCount: number; isPlaylist: boolean }) => {
    setVideoCount(data.videoCount);
    setIsPlaylist(data.isPlaylist);
  };
  
  // Start simulated progress for UI feedback
  const startSimulatedProgress = () => {
    const start = Date.now();
    setStartTime(start);
    let currentProgress = 0;
    let lastUpdateTime = Date.now();
    
    return setInterval(() => {
      // Calculate elapsed time since start
      const elapsedTime = (Date.now() - start) / 1000; // in seconds
      
      // Update progress more realistically
      const progressIncrement = Math.random() * 3;
      currentProgress += progressIncrement;
      currentProgress = Math.min(currentProgress, 95); // Cap at 95% until we get actual results
      
      // Calculate time remaining based on progress rate
      if (currentProgress > 5) { // Wait until we have some progress to avoid wild initial estimates
        const timePerPercent = elapsedTime / currentProgress;
        const remainingPercent = 100 - currentProgress;
        const estimatedSeconds = timePerPercent * remainingPercent;
        
        // Update estimated time remaining, but don't update too frequently to avoid jitter
        if (Date.now() - lastUpdateTime > 1000) { // Update max once per second
          setEstimatedTimeRemaining(formatTimeRemaining(estimatedSeconds));
          lastUpdateTime = Date.now();
        }
      }
      
      setProgress(currentProgress);
    }, 300);
  };  // Function to handle input data changes from InputSection
  const handleInputDataChange = useCallback((data: {
    inputType: "url" | "file";
    url?: string;
    file?: File;
    csvContent?: string;
  } | null) => {
    setCurrentInputData(data);
  }, []);

  // Function to handle the Start Processing button click
  const handleStartProcessing = () => {
    if (!currentInputData) {
      toast.error("Please enter a YouTube URL or upload a CSV file", {
        duration: 3000
      });
      return;
    }

    handleSubmit(currentInputData);
  };

  // Function to process YouTube URLs or CSV files
  const handleSubmit = async (data: {
    inputType: "url" | "file";
    url?: string;
    file?: File;
    csvContent?: string;
  }) => {
    // Store the current input data
    setCurrentInputData(data);

    // Build the payload
    type PayloadType = {
      inputType: "url" | "file";
      formats: string[];
      language: string;
      url?: string;
      csvContent?: string;
      videoCount?: number;
      coinCostEstimate?: number;
    };
  
    const payload: PayloadType = {
      inputType: data.inputType,
      formats: selectedFormats,
      language: selectedLanguage,
      videoCount,
      coinCostEstimate,
    };
  
    if (data.inputType === "url" && data.url) {
      payload.url = data.url;
    } else if (data.inputType === "file" && data.csvContent) {
      payload.csvContent = data.csvContent;    } else {
      return toast.error("Invalid input data", {
        duration: 5000
      });
    }
  
  // Pre-check coin balance
    if (hasInsufficientCoins) {
      return toast.error(`Insufficient Coins: You need ${coinCostEstimate} coins, but you have ${userCoinBalance || 0}.`, {
        duration: 5000
      });
    }
  
    // Kick off processing (coins will be deducted inside)
    try {
      await processRequest(payload);    } catch (err: any) {
      // console.error(err);
      toast.error(err.message || "Failed to process request", {
        duration: 5000
      });
    }
  };
    // Function to process the actual API request
  const processRequest = async (payload: any) => {
    setIsProcessing(true);
    setActiveTab("processing");
    setProgress(0);
    setSubtitles([]);
    setHasResults(false);
    setTotalVideos(payload.videoCount || 0);
    setProcessedVideos(0);
    setEstimatedTimeRemaining("--:--");

    // Save state before processing in case auth redirect is needed
    saveState();

    // Start progress simulation with time estimation
    const progressInterval = startSimulatedProgress();
  
    try {
      // Get user ID upfront to verify it exists
      const { data: { session } } = await supabase.auth.getSession();
      // Get both the access token for authentication and user ID
      const userToken = session?.access_token;
      const userId = session?.user?.id;
      console.log("[DEBUG] Retrieved Supabase auth token and user ID:", userToken ? 'valid token' : 'no token', userId);
      
      // For anonymous users, we'll use their free 15 coins
      const isAnonymousUser = !userToken || !userId;
      const anonymousId = isAnonymousUser ? 'anonymous-' + Date.now().toString() : null;
      
      // Check for anonymous mode with free coins
      if (isAnonymousUser) {
        console.log("[INFO] Anonymous user with free coins processing request");
        
        // Import the helper function if needed
        let coinDeductionFunction;
        try {
          // This will use the function we just added to QuietCoinBalance
          const { deductAnonymousCoins } = await import('@/components/QuietCoinBalance');
          coinDeductionFunction = deductAnonymousCoins;
        } catch (error) {
          console.error("Error importing anonymous coin functions:", error);
          // Fallback implementation if import fails
          coinDeductionFunction = (amount: number) => {
            try {
              const currentCoins = localStorage.getItem('anonymousCoins') 
                ? parseInt(localStorage.getItem('anonymousCoins') || '15', 10) 
                : 15;
              
              if (currentCoins < amount) {
                return { success: false, remainingCoins: currentCoins };
              }
              
              const remainingCoins = currentCoins - amount;
              localStorage.setItem('anonymousCoins', remainingCoins.toString());
              
              // Dispatch event for UI update
              if (typeof window !== 'undefined') {
                const coinChangeEvent = new CustomEvent('anonymousCoinChange', { 
                  detail: { balance: remainingCoins } 
                });
                window.dispatchEvent(coinChangeEvent);
              }
              
              return { success: true, remainingCoins };
            } catch (error) {
              console.error('Error in fallback coin deduction:', error);
              return { success: false, remainingCoins: 15 };
            }
          };
        }
        
        // Calculate cost
        let coinCost = payload.coinCostEstimate || 1;
        
        // Deduct coins
        const deductResult = coinDeductionFunction(coinCost);        if (!deductResult.success) {
          clearInterval(progressInterval);
          toast.error("Insufficient Free Coins: You've used all your free coins. Sign up for more!", {
            duration: 5000
          });
          setActiveTab("input");
          return;
        }
        
        console.log(`Anonymous coins deducted: ${coinCost}. Remaining: ${deductResult.remainingCoins}`);
      }
        console.log(`[INFO] Processing request for user ${userId} with payload:`, {
        inputType: payload.inputType,
        formats: payload.formats,
        videoCount: payload.videoCount,
        coinCost: payload.coinCostEstimate
      });
      
      // For logged-in users, deduct coins before making the API call
      if (!isAnonymousUser && userId) {
        console.log(`[INFO] Deducting ${payload.coinCostEstimate} coins for logged-in user ${userId}`);
        
        // Import the coin deduction function
        const { directCoinDeduction } = await import('@/app/coins/utils');
        
        // Deduct coins from Supabase
        const deductResult = await directCoinDeduction(
          userId, 
          payload.coinCostEstimate || 1, 
          `Subtitle extraction: ${payload.videoCount || 1} video(s), ${payload.formats?.length || 1} format(s)`
        );
        
        if (!deductResult.success) {
          clearInterval(progressInterval);
          toast.error(deductResult.error || "Insufficient coins for this operation.", {
            duration: 5000
          });
          setActiveTab("input");
          return;
        }
        
        console.log(`[SUCCESS] Coins deducted successfully. Remaining balance: ${deductResult.remainingBalance}`);
        
        // Update the UI with the new balance immediately
        setUserCoinBalance(deductResult.remainingBalance);
      }
      
      // Make API request to extract subtitles
      const response = await fetch("/api/youtube/extract", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Only include auth token if user is logged in
          ...(userToken ? { "Authorization": `Bearer ${userToken}` } : {}),
          // Add anonymous flag for free coin users
          ...(isAnonymousUser ? { "X-Anonymous-User": "true" } : {})
        },
        body: JSON.stringify({
          ...payload,
          // Add anonymous ID if needed
          ...(isAnonymousUser ? { anonymousId } : {}),
          // Add flag to skip coin deduction in API since we already did it
          ...(userId ? { "skipCoinDeduction": true } : {})
        }),
      });
  
      // Clear progress interval
      clearInterval(progressInterval);
  
      if (!response.ok) {
        const errorData = await response.json();
        // console.error("[ERROR] Extract API error:", errorData);
          // Check if this is an insufficient funds error
        if (errorData.requireMoreCoins) {
          toast.error("Insufficient Coins: You don't have enough coins for this operation. Please add more coins to your account.", {
            duration: 5000
          });
          setActiveTab("input");
          return;
        }
        
        throw new Error(errorData.error || "Failed to extract subtitles");
      }
  
      const result = await response.json();
      const extractedSubtitles = result.subtitles || [];
      
      console.log(`[SUCCESS] Extracted ${extractedSubtitles.length} subtitle items`);
  
      // Update state with results
      setTotalVideos(
        Math.ceil(extractedSubtitles.length / selectedFormats.length) || payload.videoCount || 0,
      );
      setProcessedVideos(
        Math.ceil(extractedSubtitles.length / selectedFormats.length) || payload.videoCount || 0,
      );      // Only proceed if we have actual results
      if (extractedSubtitles && extractedSubtitles.length > 0) {        console.log('🎉 Processing complete with results, updating state...');
        
        // Prevent coin balance updates during this critical state transition
        console.log('🚫 Setting processing transition flag to prevent coin balance interference');
        setIsProcessingTransition(true);
        
          // Use startTransition to batch all state updates together
        // This ensures hasResults and subtitles are set before activeTab changes
        startTransition(() => {
          // Set results first to ensure they're available before tab switch
          setProgress(100);
          setHasResults(true);
          setSubtitles(extractedSubtitles);
          setActiveTab("results");
        });
          // Save state immediately after setting results
        console.log('💾 Saving state after successful processing');
        setTimeout(() => {
          saveState();
        }, 10);
        
        // Re-enable coin balance updates after state transition is complete
        setTimeout(() => {
          console.log('✅ Re-enabling coin balance updates after processing transition');
          setIsProcessingTransition(false);
        }, 500); // Wait longer to ensure tab state is fully committed
        
        // Also force save directly to localStorage as backup
        try {
          localStorage.setItem('fetchsub_activeTab', 'results');
          localStorage.setItem('fetchsub_hasResults', 'true');
          localStorage.setItem('fetchsub_subtitles', JSON.stringify(extractedSubtitles));
          console.log('💾 Backup state saved directly to localStorage');
        } catch (error) {
          console.error('❌ Backup state save failed:', error);
        }        // Show success toast
        toast.success(`Processing Complete: ${payload.coinCostEstimate} coins used for subtitle extraction`, {
          duration: 3000
        });
      } else {// No subtitles found
        // console.warn("[WARNING] No subtitles found in the response");
        toast.error("No Results: No subtitles were found for the provided video(s).", {
          duration: 5000
        });
        setActiveTab("input");
      }
    } catch (error: any) {
      // console.error("[ERROR] Process Error:", error);
      toast.error(error.message || "Processing failed", {
        duration: 5000
      });
      setActiveTab("input");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Function to fetch user coins - extracted for reusability
  const fetchUserCoins = async () => {
    setIsLoadingCoins(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      console.log("[INFO] Fetching coins for user:", userId);
      const coins = await getUserCoins();
      
      if (coins) {
        // console.log("[INFO] User coin balance:", coins.balance);
        setUserCoinBalance(coins.balance);
        
        // Calculate if user has enough coins
        const estimatedCost = calculateCoinCost();
        setHasInsufficientCoins(coins.balance < estimatedCost);
        setCoinCostEstimate(estimatedCost);
      } else {
        // console.warn("[WARNING] No coins data returned");
        setUserCoinBalance(0);
        setHasInsufficientCoins(true);
      }
    } catch (error) {
      // console.error("Error fetching user coins:", error);
      setUserCoinBalance(0);
      setHasInsufficientCoins(true);
    } finally {
      setIsLoadingCoins(false);
    }
  };

  // Calculate estimated coin cost based on current selections
  const calculateCoinCost = useCallback(() => {
    // Base calculation
    let baseCost = 0;
    
    // Handle calculation based on input type
    if (isPlaylist) {
      // For playlists/channels - use batch rate
      baseCost = videoCount * OPERATION_COSTS.BATCH_SUBTITLE * selectedFormats.length;
      console.log(`[COST] Playlist mode: ${videoCount} videos × ${OPERATION_COSTS.BATCH_SUBTITLE} batch rate × ${selectedFormats.length} formats = ${baseCost}`);
    } else {
      // For single videos
      if (videoCount > 1) {
        // Multiple single videos (from CSV)
        baseCost = videoCount * OPERATION_COSTS.BATCH_SUBTITLE * selectedFormats.length;
        // console.log(`[COST] Multiple videos: ${videoCount} videos × ${OPERATION_COSTS.BATCH_SUBTITLE} batch rate × ${selectedFormats.length} formats = ${baseCost}`);
      } else {
        // Just one video
        baseCost = OPERATION_COSTS.SINGLE_SUBTITLE * selectedFormats.length;
        // console.log(`[COST] Single video: ${OPERATION_COSTS.SINGLE_SUBTITLE} single rate × ${selectedFormats.length} formats = ${baseCost}`);
      }
    }
    
    // Calculate total with minimum of 1 coin
    const total = Math.max(baseCost, 1);
    console.log(`[COST] Final cost calculation: ${baseCost} base = ${total} coins`);
    
    return total;
  }, [videoCount, selectedFormats, isPlaylist]);
  // Effect to check user coin balance
  useEffect(() => {    // Don't update coin balance during processing transitions to prevent interference
    if (isProcessingTransition) {
      console.log('🚫 Skipping coin balance update during processing transition to prevent tab state interference');
      return;
    }

    const fetchUserCoins = async () => {
      setIsLoadingCoins(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        if (userId) {
          // console.log("[INFO] User authenticated with Supabase ID:", userId);
        } else {
          // console.warn("[WARNING] No authenticated user found");
        }
        
        const coins = await getUserCoins();
        
        if (coins) {
          // console.log("[INFO] User coin balance:", coins.balance);
          setUserCoinBalance(coins.balance);
          
          // Calculate if user has enough coins
          const estimatedCost = calculateCoinCost();
          setHasInsufficientCoins(coins.balance < estimatedCost);
          setCoinCostEstimate(estimatedCost);
        } else {
          // console.warn("[WARNING] No coins data returned");
          setUserCoinBalance(0);
          setHasInsufficientCoins(true);
        }
      } catch (error) {
        // console.error("Error fetching user coins:", error);
        setUserCoinBalance(0);
        setHasInsufficientCoins(true);
      } finally {
        setIsLoadingCoins(false);
      }
    };

    fetchUserCoins();
  }, [videoCount, selectedFormats.length, calculateCoinCost, isProcessingTransition]);

  // Effect to update coin estimation when inputs change
  useEffect(() => {
    const estimatedCost = calculateCoinCost();
    setCoinCostEstimate(estimatedCost);
    
    // Check if user has enough coins
    if (userCoinBalance !== null) {
      setHasInsufficientCoins(userCoinBalance < estimatedCost);
    }
  }, [videoCount, selectedFormats.length, userCoinBalance, calculateCoinCost]);

  useEffect(() => {
    // Helper to check and save user ID to localStorage
    const checkAndSetUserId = async () => {
      try {
        // Just verify the user is authenticated via Supabase
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        if (userId) {
          // console.log('[DEBUG] User authenticated with Supabase ID:', userId);
        } else {
          // console.warn('[WARNING] No authenticated user found');
        }
      } catch (err) {
        // console.error('[ERROR] Error checking/setting user ID:', err);
      }
    };
    
    // Initial check for user ID
    checkAndSetUserId();
  }, []);

  // Handle cancellation of processing
  const handleCancel = () => {
    setIsProcessing(false);
    setActiveTab("input");
    setProgress(0);
    
    // Show toast notification
    toast.info("Processing Cancelled", {
      description: "The subtitle extraction was cancelled.",
      duration: 3000,
    });
  };
  
  // Create and download ZIP file with all subtitles
  const handleDownloadZip = async () => {
    try {
      // Show loading toast
      toast.loading("Preparing ZIP", {
        description: "Creating ZIP file with all subtitles...",
        duration: 3000,
      });
      
      // Create a new JSZip instance
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Group subtitles by video for better organization
      const subtitlesByVideo = subtitles.reduce((acc, subtitle) => {
        const videoId = subtitle.url.includes("v=") 
          ? subtitle.url.split("v=")[1].split("&")[0] 
          : subtitle.url.split("/").pop() || "unknown";
          
        if (!acc[videoId]) {
          acc[videoId] = {
            videoTitle: subtitle.videoTitle,
            subtitles: []
          };
        }
        
        acc[videoId].subtitles.push(subtitle);
        return acc;
      }, {});
      
      // Add files to ZIP organized in folders by video
      Object.entries(subtitlesByVideo).forEach(([videoId, data]: [string, any]) => {
        // Create a safe folder name
        const safeTitle = data.videoTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        
        // Add each subtitle file to the folder
        data.subtitles.forEach((subtitle: any) => {
          // Determine file extension
          let extension = '.txt';
          switch (subtitle.format.toLowerCase()) {
            case 'srt':
              extension = '.srt';
              break;
            case 'vtt':
              extension = '.vtt';
              break;
            case 'ass':
              extension = '.ass';
              break;
            case 'json':
              extension = '.json';
              break;
            case 'smi':
              extension = '.smi';
              break;
            case 'clean_text':
            case 'raw':
              extension = '.txt';
          }
          
          // Create filename with format and language
          const filename = `${safeTitle}_${subtitle.language}_${subtitle.format}${extension}`;
          
          // Add file to ZIP
          zip.file(`${safeTitle}/${filename}`, subtitle.content);
        });
      });
      
      // Generate ZIP file
      const content = await zip.generateAsync({ type: "blob" });
      
      // Create download link
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fetchsub_subtitles_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100);
        // Show success toast
      toast.success("Download Complete: ZIP archive has been downloaded successfully", {
        duration: 3000
      });
    } catch (error) {
      // console.error("Error creating ZIP file:", error);
      toast.error("Download Failed: Failed to create ZIP archive. Please try again.", {
        duration: 5000
      });
    }
  };  // Debug: Add delayed localStorage check to ensure state restoration works
  useEffect(() => {
    // Add small delay to ensure all effects have run
    const checkTimer = setTimeout(() => {
      console.log('🔍 Delayed state check:', {
        activeTab,
        hasResults,
        subtitlesLength: subtitles.length,
        windowDefined: typeof window !== 'undefined'
      });
      
      if (typeof window !== 'undefined') {
        const savedTab = localStorage.getItem('fetchsub_activeTab');
        const savedHasResults = localStorage.getItem('fetchsub_hasResults');
        const savedSubtitles = localStorage.getItem('fetchsub_subtitles');
        
        console.log('📋 Delayed localStorage values:', {
          savedTab,
          savedHasResults,
          currentActiveTab: activeTab,
          savedSubtitlesLength: savedSubtitles ? JSON.parse(savedSubtitles).length : 0
        });
        
        // Force restoration if there's a mismatch
        if (savedTab === 'results' && savedHasResults === 'true' && activeTab !== 'results') {
          console.log('🚨 DELAYED MISMATCH DETECTED! Forcing restoration with startTransition...');
          
          // Use startTransition to ensure proper state batching
          startTransition(() => {
            setHasResults(true);
            
            // Also restore subtitles if available
            if (savedSubtitles) {
              try {
                const parsedSubtitles = JSON.parse(savedSubtitles);
                if (Array.isArray(parsedSubtitles) && parsedSubtitles.length > 0) {
                  setSubtitles(parsedSubtitles);
                }
              } catch (error) {
                console.error('Error parsing saved subtitles:', error);
              }
            }
            
            setActiveTab('results');
          });
        }
      }
    }, 250); // 250ms delay to ensure all effects have run
    
    return () => clearTimeout(checkTimer);
  }, [activeTab, hasResults, subtitles.length]); // Dependencies to trigger checks

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50">
      <div className="container max-w-5xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 staggered-fade-in py-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-12 w-12 bg-black rounded-full flex items-center justify-center shadow-lg">
              <Headphones className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">FetchSub</h1>
          </div>
          <h2 className="text-4xl font-bold tracking-tighter sm:text-5xl max-w-3xl mx-auto">
            Extract YouTube Subtitles <span className="text-gray-500">in Seconds</span>
          </h2>
          <p className="max-w-2xl mx-auto text-gray-500 text-xl">
            Batch download subtitles from YouTube videos, playlists, and channels.
            Multiple formats supported.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Supports playlists</span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Multiple formats</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Batch processing</span>
            </div>
          </div>
          <div className="pt-2 flex justify-center">
            <ArrowDown className="h-6 w-6 text-gray-400 animate-bounce" />
          </div>
        </div>

        <Card className="w-full shadow-xl border-black/5 card-hover-effect bg-white rounded-xl overflow-hidden">
          <CardHeader className="space-y-1 pb-4 bg-gradient-to-r from-gray-50 to-white border-b">
            <CardTitle className="text-2xl font-bold">Extract Subtitles</CardTitle>
            <CardDescription className="text-base">
              Batch download subtitles by providing playlist URLs, channel URLs, or CSV files with video links
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 mb-1 p-1 bg-muted rounded-lg">
                <TabsTrigger 
                  value="input" 
                  disabled={isProcessing} 
                  className="data-[state=active]:bg-white data-[state=active]:text-black rounded-md data-[state=active]:shadow-sm">
                  1. Input
                </TabsTrigger>
                <TabsTrigger
                  value="processing"
                  disabled={!isProcessing && !hasResults}
                  className="data-[state=active]:bg-white data-[state=active]:text-black rounded-md data-[state=active]:shadow-sm"
                >
                  2. Processing
                </TabsTrigger>
                <TabsTrigger 
                  value="results" 
                  disabled={!hasResults} 
                  className="data-[state=active]:bg-white data-[state=active]:text-black rounded-md data-[state=active]:shadow-sm">
                  3. Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="input" className="space-y-6 mt-4 animate-fade-in">                <InputSection
                  onSubmit={handleSubmit}
                  onInputChange={handleInputChange}
                  onInputDataChange={handleInputDataChange}
                  onChangeTab={() => setActiveTab("processing")}
                  isProcessing={isProcessing}
                />                <FormatSelection
                  onFormatChange={setSelectedFormats}
                  onLanguageChange={setSelectedLanguage}
                  selectedFormats={selectedFormats}
                  selectedLanguage={selectedLanguage}
                  videoCount={videoCount}
                  isPlaylist={isPlaylist}
                />
                
                {/* Insufficient Coins Warning */}
                {hasInsufficientCoins && !isLoadingCoins && (
                  <Alert variant="destructive" className="mb-2 shadow-md animate-pulse">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Insufficient Coins</AlertTitle>
                    <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span>You need {coinCostEstimate} coins, but you have {userCoinBalance || 0}.</span>
                      <Button variant="outline" size="sm" className="mt-2 sm:mt-0 bg-white" asChild>
                        <Link href="/coins">
                          Add Coins
                        </Link>
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Added back the Start Processing button */}
                <div className="flex justify-end">                  <Button
                    onClick={handleStartProcessing}
                    disabled={isProcessing || hasInsufficientCoins || isLoadingCoins}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow px-4 py-2 w-full bg-black hover:bg-black/90 text-white h-11"
                  >
                    {isLoadingCoins ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Calculating cost...
                      </>
                    ) : (
                      'Start Processing'
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="processing" className="space-y-6 mt-4 animate-fade-in">
                <ProcessVisualization
                  progress={progress}
                  status={isProcessing ? "processing" : "completed"}
                  onCancel={handleCancel}
                  totalVideos={totalVideos}
                  processedVideos={processedVideos}
                  estimatedTimeRemaining={estimatedTimeRemaining}
                />
                
                {/* Friendly rotating messages for long running processes */}
                <ProcessingMessages
                  processingCount={processedVideos}
                  totalCount={totalVideos}
                  isProcessing={isProcessing}
                />
              </TabsContent>

              <TabsContent value="results" className="space-y-6 mt-4 animate-fade-in">
                <ResultsDisplay
                  subtitles={subtitles}
                  onDownloadAll={handleDownloadZip}
                  isProcessComplete={true}
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleDownloadZip} 
                    size="lg" 
                    className="gap-2 bg-black hover:bg-black/90 text-white shadow-lg transition-all hover:scale-105"
                  >
                    <Download size={18} />
                    Download ZIP Archive
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground pt-4">
          {new Date().getFullYear()} FetchSub. All rights reserved.
        </div>
      </div>
    </main>
  );
}
