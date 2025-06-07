"use client";

import { useState, useEffect, useRef } from "react";
import { formatCoins } from "@/app/coins/utils";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { useCoinStore } from "@/app/coins/hooks";
import { supabase } from "@/supabase/config";

// Helper functions for anonymous user coin management
export const getAnonymousCoins = (): number => {
  if (typeof window === 'undefined') return 15;
  try {
    const storedCoins = localStorage.getItem('anonymousCoins');
    return storedCoins ? parseInt(storedCoins, 10) : 15; // Default is 15 free coins
  } catch (error) {
    console.error('Error getting anonymous coins:', error);
    return 15;
  }
};

export const deductAnonymousCoins = (amount: number): { success: boolean, remainingCoins: number } => {
  if (typeof window === 'undefined') return { success: false, remainingCoins: 15 };
  
  try {
    const currentCoins = getAnonymousCoins();
    if (currentCoins < amount) {
      return { success: false, remainingCoins: currentCoins };
    }
    
    const remainingCoins = currentCoins - amount;
    localStorage.setItem('anonymousCoins', remainingCoins.toString());
    
    // Also update any UI that's watching this
    const coinChangeEvent = new CustomEvent('anonymousCoinChange', { 
      detail: { balance: remainingCoins } 
    });
    window.dispatchEvent(coinChangeEvent);
    
    return { success: true, remainingCoins };
  } catch (error) {
    console.error('Error deducting anonymous coins:', error);
    return { success: false, remainingCoins: getAnonymousCoins() };
  }
};

export function QuietCoinBalance() {
  // Use the global coin store with Zustand
  const { userCoins, refreshCoins } = useCoinStore();
  
  // Prevent hydration mismatches
  const [mounted, setMounted] = useState(false);
  
  // Keep previous balance for smooth transitions
  const [prevBalance, setPrevBalance] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const firstLoadRef = useRef(true);
  
  // For non-logged in users, show actual anonymous coin count from localStorage
  // Otherwise use the user's actual balance or previous state
  const [anonymousBalance, setAnonymousBalance] = useState(15);

  // Set mounted state after component mounts to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize and listen for changes to anonymous coins
  useEffect(() => {
    if (!mounted) return; // Don't access localStorage until mounted
    
    // Only set up listeners if not logged in
    if (!isLoggedIn) {
      // Initialize anonymous balance
      setAnonymousBalance(getAnonymousCoins());

      // Listen for coin change events
      const handleCoinChange = (event: any) => {
        if (event.detail && typeof event.detail.balance === 'number') {
          setAnonymousBalance(event.detail.balance);
        }
      };

      // Add event listener
      window.addEventListener('anonymousCoinChange', handleCoinChange);

      // Clean up
      return () => {
        window.removeEventListener('anonymousCoinChange', handleCoinChange);
      };
    }
  }, [isLoggedIn, mounted]);
  
  // Real-time update handling
  useEffect(() => {
    if (!mounted) return; // Don't set up auth listeners until mounted
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // User signed in or token refreshed
        setIsLoggedIn(true);
        refreshCoins();
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        setIsLoggedIn(false);
      }
    });
    
    // Check initial auth state
    const checkAuthState = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
      
      // Only refresh on first load if logged in
      if (data.session && firstLoadRef.current) {
        refreshCoins();
        firstLoadRef.current = false;
      }
    };
    
    checkAuthState();
    
    // Background refresh timer - very quiet, no UI updates during refresh
    const quietRefreshTimer = setInterval(() => {
      if (isLoggedIn) {
        // Don't update state if we're just checking
        refreshCoins();
      }
    }, 30000); // Every 30 seconds
    
    return () => {
      subscription.unsubscribe();
      clearInterval(quietRefreshTimer);
    };
  }, [refreshCoins, isLoggedIn, mounted]);
  
  // Smooth visual transition when balance changes
  useEffect(() => {
    if (userCoins?.balance !== undefined) {
      // Only update previous balance when we have a valid new balance
      setPrevBalance(userCoins.balance);
    }
  }, [userCoins?.balance]);  
  // Get balance based on auth state
  const displayBalance = !mounted 
    ? 15 // Default value during SSR/hydration
    : !isLoggedIn 
      ? anonymousBalance // Use tracked anonymous coins
      : (userCoins?.balance ?? prevBalance ?? 0);
  
  // Don't render until mounted to prevent hydration mismatches
  if (!mounted) {
    return (
      <div className="flex items-center h-9 px-3 rounded-md">
        <span className="flex items-center gap-1">
          <Coins className="h-4 w-4" />
          <span className="text-sm">15 🪙</span>
        </span>
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center h-9 px-3 rounded-md hover:bg-accent transition-colors cursor-pointer">
            <span className="flex items-center gap-1">
              <Coins className="h-4 w-4" />
              <span className="text-sm">
                {displayBalance} 🪙
                {!isLoggedIn && (
                  <span className="ml-1 bg-green-100 text-green-800 text-xs font-medium px-1.5 py-0.5 rounded">FREE</span>
                )}
              </span>
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-80 p-0 overflow-hidden">
          <div className="bg-card p-4">
            <h4 className="font-medium mb-2">Your Coin Balance</h4>
            
            <div className="text-3xl font-bold mb-4">
              <span>
                {formatCoins(displayBalance)}
              </span>
            </div>
            
            {!isLoggedIn && (
              <div className="text-sm mb-3 p-2 bg-green-50 border border-green-100 rounded">
                <p className="font-medium text-green-800">🎁 Free Trial Mode</p>
                <p className="text-green-700">You have 15 free coins to use without an account! Create an account to earn more coins.</p>
              </div>
            )}
            
            <Link href="/coins" className="w-full">
              <Button size="sm" className="w-full">
                <Coins className="h-4 w-4 mr-2" />
                Manage Coins
              </Button>
            </Link>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
