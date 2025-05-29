import { getUserCoins, spendCoins, OPERATION_COSTS, directCoinDeduction, getCoinsForUser } from './utils';
import { supabase } from "@/supabase/config"; // Use Supabase instead of Firebase
import { useCoinStore } from './hooks'; // Import the coin store for state management

// Helper to safely update the client-side state without breaking SSR or API routes
const safeUpdateCoinStore = (updatedCoins: any) => {
  try {
    // Check if we're in a browser environment to prevent SSR issues
    if (typeof window !== 'undefined') {
      // Only execute this client-side
      const coinStore = useCoinStore.getState();
      if (coinStore && coinStore.setCoins) {
        coinStore.setCoins(updatedCoins);
        coinStore.refreshCoins();
        console.log("Global coin state updated with new balance:", updatedCoins.balance);
      }
    }
  } catch (error) {
    // Silently catch errors but don't interrupt the flow
    console.log("Info: Coin state update skipped (likely server-side)");
  }
};

// Calculate estimated cost based on request type
export async function calculateEstimatedCost(
  inputType: string,
  url: string | undefined,
  csvContent: string | undefined
): Promise<number> {
  let estimatedVideoCount = 1;
  
  // Estimate video count
  if (inputType === "url" && url) {
    // Check if it's a playlist/channel (costs more)
    if (url.includes("playlist?list=") || 
        url.includes("&list=") || 
        url.includes("/channel/") || 
        url.includes("@")) {
      // For playlists, use a minimum estimated count
      estimatedVideoCount = 5;
    } else {
      // Single video
      estimatedVideoCount = 1;
    }
  } else if (inputType === "file" && csvContent) {
    // Count lines with URLs in the CSV
    const lines = csvContent.split('\n').filter(line => 
      line.trim().length > 0 && 
      (line.includes('youtube.com') || line.includes('youtu.be'))
    );
    
    estimatedVideoCount = lines.length || 1;
  }
  
  // Calculate base cost
  let baseCost = 0;
  if (inputType === "url") {
    if (estimatedVideoCount > 1) {
      // Batch rate for playlists/channels
      baseCost = estimatedVideoCount * OPERATION_COSTS.BATCH_SUBTITLE;
    } else {
      // Single video rate
      baseCost = OPERATION_COSTS.SINGLE_SUBTITLE;
    }
  } else if (inputType === "file") {
    // CSV files always use batch rate
    baseCost = estimatedVideoCount * OPERATION_COSTS.BATCH_SUBTITLE;
  }
  
  return Math.max(baseCost, 1); // Minimum cost is 1 coin
}

// Check if user has enough coins for an operation
export async function checkUserBalance(estimatedAmount: number): Promise<{
  hasEnoughCoins: boolean;
  currentBalance: number;
}> {
  try {
    const userCoins = await getUserCoins();
    const currentBalance = userCoins?.balance || 0;
    
    console.log(`Checking balance: Need ${estimatedAmount}, has ${currentBalance}`);
    
    return {
      hasEnoughCoins: currentBalance >= estimatedAmount,
      currentBalance: currentBalance
    };
  } catch (error) {
    console.error('Error checking user balance:', error);
    return {
      hasEnoughCoins: false,
      currentBalance: 0
    };
  }
}

// Deduct coins based on actual processing results with direct approach
export async function directDeductCoinsForProcessing(
  userId: string,
  inputType: string,
  processedVideoCount: number,
  overrideEstimatedCost?: number
): Promise<{ 
  success: boolean; 
  coinsUsed: number; 
  remainingBalance: number;
  error?: string;
}> {
  try {
    console.log(`Deducting coins for processing: userId=${userId}, type=${inputType}, videos=${processedVideoCount}`);
    
    // Calculate actual cost
    let cost = 0;
    
    if (overrideEstimatedCost !== undefined) {
      // Use override cost if provided (for pre-calculated values)
      cost = overrideEstimatedCost;
    } else {
      // Calculate cost based on type and count
      if (inputType === "url") {
        if (processedVideoCount > 1) {
          // Batch rate for playlists/channels
          cost = processedVideoCount * OPERATION_COSTS.BATCH_SUBTITLE;
        } else {
          // Single video rate
          cost = OPERATION_COSTS.SINGLE_SUBTITLE;
        }
      } else if (inputType === "file") {
        // CSV files always use batch rate
        cost = processedVideoCount * OPERATION_COSTS.BATCH_SUBTITLE;
      }
      
      // Translation functionality has been removed
    }
    
    // Minimum cost is 1 coin
    cost = Math.max(cost, 1);
    
    // Log the exact cost calculation to help with debugging
    console.log(`Final cost calculation for ${processedVideoCount} videos: ${cost} coins`);
    
    // Deduct coins directly with userId
    const deductionResult = await directCoinDeduction(userId, cost, `Processed ${processedVideoCount} video${processedVideoCount !== 1 ? 's' : ''}`);
    
    if (deductionResult.success) {
      // Update the global coin store with the deduction result
      // No need to call getCoinsForUser again as directCoinDeduction already has the latest data
      try {
        if (typeof window !== 'undefined') {
          // Create a coins object with the structure expected by the store
          const updatedCoins = {
            balance: deductionResult.remainingBalance,
            // Include other fields that might be needed by the UI
            lastUpdated: new Date()
          };
          
          // Update the global coin store with this data
          safeUpdateCoinStore(updatedCoins);
          console.log("Global coin state updated with balance:", deductionResult.remainingBalance);
        }
      } catch (error) {
        console.error("Error updating coin state:", error);
        // Transaction still succeeded even if UI update fails
      }
      
      return {
        success: true,
        coinsUsed: cost,
        remainingBalance: deductionResult.remainingBalance
      };
    } else {
      console.error("Failed to deduct coins:", deductionResult.error);
      return {
        success: false,
        coinsUsed: 0,
        remainingBalance: deductionResult.currentBalance || 0,
        error: deductionResult.error
      };
    }
  } catch (error) {
    console.error("Error deducting coins for processing:", error);
    return {
      success: false,
      coinsUsed: 0,
      remainingBalance: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}