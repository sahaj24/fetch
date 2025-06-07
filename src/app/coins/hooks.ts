"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabase/config";
import { getUserCoins, UserCoins } from "./utils";
import { create } from "zustand";

// Track active listeners to avoid duplicates
const activeSubscriptions = new Map<string, () => void>();

// Global coin state management with Zustand
interface CoinState {
  userCoins: UserCoins | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  refreshCoins: () => Promise<void>;
  setCoins: (coins: UserCoins) => void;
}

// Create store for managing global coin state
export const useCoinStore = create<CoinState>((set) => ({
  userCoins: null,
  isLoading: false,
  error: null,
  lastUpdated: 0,
  refreshCoins: async () => {
    try {
      // Get current user ID from Supabase session
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      
      set({ isLoading: true });
      
      if (!userId) {
        // No authenticated user - use anonymous coins with 15 free coins
        const anonymousCoins = await getUserCoins(); // This will return anonymous coins
        if (anonymousCoins) {
          set({ userCoins: anonymousCoins, error: null, lastUpdated: Date.now() });
        } else {
          set({ error: "Failed to load anonymous coins" });
        }
        return;
      }
      
      // Get user coins for authenticated user
      const userCoins = await getUserCoins(userId);
      
      if (userCoins) {
        set({ userCoins, error: null, lastUpdated: Date.now() });
      } else {
        set({ error: "Failed to load coins" });
      }
    } catch (err) {
      console.error("Error refreshing coins:", err);
      // Try to get anonymous coins as fallback
      try {
        const anonymousCoins = await getUserCoins();
        if (anonymousCoins) {
          set({ userCoins: anonymousCoins, error: null, lastUpdated: Date.now() });
          return;
        }
      } catch (e) {
        console.error("Could not get anonymous coins as fallback:", e);
      }
      set({ error: "Error loading coin data" });
    } finally {
      set({ isLoading: false });
    }
  },
  setCoins: (coins: UserCoins) => {
    set({ userCoins: coins, lastUpdated: Date.now(), isLoading: false, error: null });
  }
}));

// Simplified function to manually refresh coin data instead of using real-time subscription
function manualCoinRefresh(userId: string, onUpdate: (data: UserCoins) => void): () => void {
  if (!userId) return () => {};
  
  
  // Function to fetch the latest coin data
  const fetchCoins = async () => {
    try {    const userCoins = await getUserCoins(userId);
      if (userCoins) {
        onUpdate(userCoins);
      }
    } catch (error) {
      console.error("Error manually refreshing coins:", error);
    }
  };
  
  // Perform initial fetch
  fetchCoins();
  
  // Set up a simple interval to check for updates
  const intervalId = setInterval(fetchCoins, 5000);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}

// React hook for accessing coin data with auto-refresh
export function useCoins(autoRefreshInterval = 30000) {
  const { userCoins, isLoading, error, refreshCoins, lastUpdated, setCoins } = useCoinStore();
  const [initialized, setInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [localLastUpdate, setLocalLastUpdate] = useState(0);

  // Initial load when component mounts
  useEffect(() => {
    const loadCoins = async () => {
      if (!initialized) {
        await refreshCoins();
        setInitialized(true);
      }
    };

    // Get current user ID from Supabase session
    const getUserId = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
        } else {
          setUserId(null);
        }
      } catch (error) {
        console.error("Error getting user session:", error);
        setUserId(null);
      }
    };

    // Load user and coins
    getUserId().then(() => loadCoins());
    
    // Listen for auth state changes with Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // When user logs out, load anonymous coins with 15 free coins
        setUserId(null);
        try {
          // Get anonymous coins with 15 free coins
          const anonymousCoins = await getUserCoins();
          if (anonymousCoins) {
            useCoinStore.setState({
              userCoins: anonymousCoins,
              isLoading: false,
              error: null,
              lastUpdated: Date.now()
            });
          }
        } catch (error) {
          console.error('Error loading anonymous coins after logout:', error);
          useCoinStore.setState({
            userCoins: null,
            isLoading: false,
            error: null,
            lastUpdated: Date.now()
          });
        }
      } else if (session?.user) {
        setUserId(session.user.id);
        refreshCoins();
      } else {
        setUserId(null);
        // Also load anonymous coins if not authenticated
        try {
          const anonymousCoins = await getUserCoins();
          if (anonymousCoins) {
            useCoinStore.setState({
              userCoins: anonymousCoins,
              isLoading: false,
              error: null,
              lastUpdated: Date.now()
            });
          }
        } catch (error) {
          console.error('Error loading anonymous coins for non-authenticated user:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [initialized, refreshCoins]);

  // Set up manual coin refresh interval
  useEffect(() => {
    if (!userId) {
      return () => {};
    }
    
    const unsubscribe = manualCoinRefresh(userId, setCoins);

    // Return cleanup function
    return () => {
      unsubscribe();
    };
  }, [userId, setCoins]);

  // Force refresh when lastUpdated changes
  useEffect(() => {
    if (lastUpdated > localLastUpdate && localLastUpdate > 0) {
      setLocalLastUpdate(lastUpdated);
    }
  }, [lastUpdated, localLastUpdate]);

  // Set up auto-refresh interval with shorter polling during active use
  useEffect(() => {
    if (!autoRefreshInterval) return;

    // More frequent refreshes for first minute of component mount
    const initialRefreshInterval = Math.min(5000, autoRefreshInterval / 2);
    let useShortInterval = true;
    
    // Initial shorter interval for quick updates
    const shortIntervalId = setInterval(() => {
      if (userId && useShortInterval) {
        refreshCoins();
        setLocalLastUpdate(Date.now());
      }
    }, initialRefreshInterval);
    
    // After a minute, switch to the longer interval
    const timeoutId = setTimeout(() => {
      useShortInterval = false;
      clearInterval(shortIntervalId);
      
      // Regular interval for background updates
      const intervalId = setInterval(() => {
        if (userId) {
          refreshCoins();
          setLocalLastUpdate(Date.now());
        }
      }, autoRefreshInterval);
      
      return () => clearInterval(intervalId);
    }, 60000);
    
    return () => {
      clearInterval(shortIntervalId);
      clearTimeout(timeoutId);
    };
  }, [autoRefreshInterval, refreshCoins, userId]);

  // Force refresh method for components to call
  const forceRefresh = async () => {
    await refreshCoins();
  };

  return {
    coins: userCoins,
    isLoading,
    error,
    refreshCoins: forceRefresh,
    lastUpdated
  };
}

// Utility hook for accessing just the coin balance with minimal overhead
export function useCoinBalance() {
  const { coins, isLoading, error, refreshCoins } = useCoins();
  return {
    balance: coins?.balance || 0, 
    isLoading, 
    error, 
    refreshBalance: refreshCoins
  };
}