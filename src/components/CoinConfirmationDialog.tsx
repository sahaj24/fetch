"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Coins, AlertTriangle, RefreshCw } from "lucide-react";
import { formatCoins } from "@/app/coins/utils";
import { useCoins, useCoinStore } from "@/app/coins/hooks";
import { supabase } from "@/supabase/config";
import { toast } from "@/components/ui/use-toast";

interface CoinConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  estimatedCost: number;
  videoCount: number;
  formatCount: number;
}

export function CoinConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  estimatedCost,
  videoCount,
  formatCount
}: CoinConfirmationDialogProps) {
  const { coins: userCoinsData, isLoading: loading, error: hasError, refreshCoins } = useCoins(0); // No auto-refresh, we'll control it manually
  const userCoins = userCoinsData?.balance || 0;

  // Refresh coins when dialog opens
  useEffect(() => {
    if (isOpen) {
      refreshCoins();
    }
  }, [isOpen, refreshCoins]);

  if (!isOpen) return null;

  // Check if the user has enough coins
  const hasEnoughCoins = userCoins >= estimatedCost;
  
  // Calculate how many more coins are needed
  const coinsNeeded = Math.max(0, estimatedCost - userCoins);
  
  // Navigate to coins page
  const navigateToCoins = () => {
    window.location.href = "/coins";
  };

  // Handle confirmation with balance check
  const [isDeducting, setIsDeducting] = useState(false);

  const handleConfirm = async () => {
    if (!hasEnoughCoins || isDeducting) return;

    try {
      setIsDeducting(true);

      // Get current logged-in user to send header for the API route
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        toast({
          title: "Not authenticated",
          description: "Please sign in again to perform this action.",
          variant: "destructive"
        });
        setIsDeducting(false);
        return;
      }

      // Call the coin deduction API
      const res = await fetch("/api/coins/deduct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({
          amount: estimatedCost,
          description: `Service charge for processing ${videoCount} video${videoCount !== 1 ? "s" : ""}`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Failed to deduct coins");
      }

      // Update global store with remaining balance from backend for immediate UI feedback
      const store = useCoinStore.getState();
      if (store.userCoins) {
        const updatedCoins = {
          ...store.userCoins,
          balance: data.remainingBalance,
          totalSpent: (store.userCoins.totalSpent || 0) + estimatedCost,
        } as any;
        store.setCoins(updatedCoins);
      }

      // Proceed with original confirm action
      onConfirm();
    } catch (err: any) {
      console.error("Coin deduction error:", err);
      toast({
        title: "Coin deduction failed",
        description: err.message || "Unable to deduct coins. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsDeducting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <div className={`h-12 w-12 rounded-full ${hasEnoughCoins ? 'bg-amber-50' : 'bg-red-50'} flex items-center justify-center`}>
            {hasEnoughCoins ? (
              <Coins className="h-6 w-6 text-amber-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
          </div>
          
          <h2 className="text-xl font-bold text-center">
            {hasEnoughCoins ? "Confirm Coin Deduction" : "Insufficient Coins"}
          </h2>
          
          <div className="w-full p-4 bg-amber-50 rounded-md border border-amber-100 relative">
            {!loading && (
              <button 
                onClick={refreshCoins} 
                className="absolute top-2 right-2 text-amber-600 hover:text-amber-800"
                title="Refresh balance"
              >
                <RefreshCw size={16} />
              </button>
            )}
            
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-amber-800">Videos to process:</span>
              <span className="font-medium text-right">{videoCount}</span>
              
              <span className="text-amber-800">Format count:</span>
              <span className="font-medium text-right">{formatCount}</span>
              
              <span className="text-amber-800 font-medium">Total cost:</span>
              <span className="font-bold text-right">{formatCoins(estimatedCost)}</span>

              {!loading ? (
                <>
                  <span className="text-amber-800">Your balance:</span>
                  <span className={`font-medium text-right ${hasEnoughCoins ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCoins(userCoins)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-amber-800">Your balance:</span>
                  <span className="font-medium text-right text-gray-600">Loading...</span>
                </>
              )}
              
              {!hasEnoughCoins && (
                <>
                  <span className="text-red-600 font-medium">Need more:</span>
                  <span className="font-bold text-right text-red-600">
                    {formatCoins(coinsNeeded)}
                  </span>
                </>
              )}
            </div>

            {loading && (
              <div className="w-full mt-2 flex justify-center">
                <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-amber-600 animate-spin"></div>
              </div>
            )}
          </div>
          
          {!hasEnoughCoins && !loading && (
            <div className="w-full p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700 font-medium text-center mb-3">
                You need {formatCoins(coinsNeeded)} more to complete this operation.
              </p>
              <Button 
                onClick={navigateToCoins}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Get More Coins
              </Button>
            </div>
          )}
          
          {hasEnoughCoins && (
            <p className="text-sm text-gray-600 text-center">
              This will deduct {formatCoins(estimatedCost)} from your account to process {videoCount} {videoCount === 1 ? 'video' : 'videos'} 
              with {formatCount} {formatCount === 1 ? 'format' : 'formats'}.
            </p>
          )}
          
          <div className="flex gap-3 w-full mt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
            >
              Cancel
            </Button>
            
            {hasEnoughCoins ? (
              <Button 
                onClick={handleConfirm} 
                disabled={loading || isDeducting} 
                className="flex-1 bg-black hover:bg-black/90"
              >
                {isDeducting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </Button>
            ) : (
              <Button 
                onClick={navigateToCoins} 
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                Buy Tokens
              </Button>
            )}
          </div>

          {hasError && (
            <p className="text-xs text-red-600">
              Error fetching your coin balance. The operation may still work if you have enough coins.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}