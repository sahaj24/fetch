import { supabase } from "@/supabase/config";

// Helper function to get current timestamp in ISO format
function serverTimestamp(): string {
  return new Date().toISOString();
}

// Helper function to generate a unique ID
function generateId(): string {
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

// Helper function to ensure user is authenticated
export async function ensureAuthenticated(): Promise<string | null> {
  return new Promise((resolve) => {    // Check if there's a session in Supabase
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        resolve(data.session.user.id);
      } else {
        // Set up an auth state listener to wait for authentication
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe(); // Unsubscribe to avoid memory leaks
            resolve(session.user.id);
          } else if (event === 'SIGNED_OUT') {
            subscription.unsubscribe(); // Unsubscribe to avoid memory leaks
            resolve(null);
          }
        });
          // If no auth change event happens after a timeout, resolve with null
        setTimeout(() => {
          subscription.unsubscribe();
          resolve(null);
        }, 3000);
      }
    });
  });
}

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    monthlyCoins: 50,
    price: 0
  },
  BASIC: {
    name: 'Basic',
    monthlyCoins: 200,
    price: 4.99
  },
  STANDARD: {
    name: 'Standard',
    monthlyCoins: 500,
    price: 9.99
  },
  PREMIUM: {
    name: 'Premium',
    monthlyCoins: 1000,
    price: 19.99
  }
};

// Define operation costs
export const OPERATION_COSTS = {
  BASE_PLAYLIST_COST: 1, // Base cost for playlist
  BASE_CSV_COST: 1,      // Base cost for CSV file
  BASE_SINGLE_COST: 1,   // Base cost for single video
  SINGLE_SUBTITLE: 1,    // Cost per format for single video
  BATCH_SUBTITLE: 1,   // Cost per format for batch (discount)
};

// Type definitions
export interface UserCoins {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  subscriptionTier: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  lastCoinRefresh?: string;
  transactionHistory: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'EARNED' | 'SPENT' | 'REFUNDED';
  amount: number;
  description: string;
  timestamp: string;
}

// Track initialization attempts to prevent duplicates
const initializationInProgress = new Map<string, Promise<UserCoins>>();

// Track documents we've already verified or created in this session
// This prevents duplicate initialization attempts in a single session
const verifiedDocuments = new Set<string>();

/**
 * DEFINITIVE VERSION: Get or create user coins document
 * Uses upsert to ensure only one document can ever exist
 */
export async function getOrCreateUserCoinsDocument(userId: string): Promise<UserCoins> {
  if (!userId) {
    throw new Error('Cannot get/create coins without a user ID');
  }

  try {    // First check if the document already exists
    const { data: existingCoins, error: fetchError } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw fetchError;
    }
      if (existingCoins) {
      // Document exists - return its data
      return existingCoins as UserCoins;
    }
    
    // Document doesn't exist - create a new one using upsert
    
    // Create basic structure
    const now = serverTimestamp();
    const welcomeTransaction = {
      id: `welcome_${Date.now()}`,
      type: 'EARNED' as const,
      amount: 50,
      description: 'Welcome bonus',
      timestamp: now
    };
    
    const newCoins: UserCoins = {
      balance: 50,
      totalEarned: 50,
      totalSpent: 0,
      subscriptionTier: 'FREE',      lastCoinRefresh: now,
      transactionHistory: [welcomeTransaction]
    };
    
    // Use upsert pattern (insert with onConflict do nothing)
    const { data: insertedData, error: insertError } = await supabase
      .from('user_coins')
      .upsert([{ user_id: userId, ...newCoins }])
      .select('*')
      .single();
    
    if (insertError) {
      throw insertError;
    }
      const finalData = insertedData as UserCoins;
    
    return finalData;
  } catch (error) {    console.error(`ERROR: Failed to get/create coins for user ${userId}:`, error);
    
    // Final fallback - try once more to get the document
    // This handles the case where another process created it after we checked
    try {
      const { data: fallbackData } = await supabase
        .from('user_coins')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (fallbackData) {
        return fallbackData as UserCoins;
      }
    } catch (fallbackError) {
      console.error("FALLBACK ERROR:", fallbackError);
    }
    
    // If all else fails, throw the original error
    throw error;
  }
}

/**
 * Initialize coins for a new user or get existing coins - with locking mechanism
 */
export async function initializeUserCoins(userId: string): Promise<UserCoins> {
  // If initialization is already in progress for this user, wait for it to complete
  if (initializationInProgress.has(userId)) {
    try {
      return await initializationInProgress.get(userId)!;
    } catch (error) {
      console.error("Error while waiting for existing initialization:", error);
      // Continue with new initialization attempt if previous one failed
    }
  }

  // Create a promise for this initialization and store it in the tracking map
  const initPromise = (async () => {
    try {
      if (!userId) {
        throw new Error('Cannot initialize coins without a user ID');
      }
      
      // If we've already verified this document exists in this session, skip the check
      if (verifiedDocuments.has(userId)) {
          // Still try to get the latest data
        const { data } = await supabase
          .from('user_coins')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (data) {
          return data as UserCoins;
        }
        
        // Should never happen if document was verified
        throw new Error('Verified document not found');
      }
        // Check if user already has a coins document
      const { data: existingData, error: existingError } = await supabase
        .from('user_coins')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw existingError;
      }
        if (existingData) {
        // Mark the document as verified for this session
        verifiedDocuments.add(userId);
        return existingData as UserCoins;
      }
      
      // Document doesn't exist, create it
      
      // Create a welcome transaction
      const now = serverTimestamp();
      const welcomeTransaction = {
        id: `welcome_${Date.now()}`,
        type: 'EARNED' as const,
        amount: 50,
        description: 'Welcome bonus',
        timestamp: now
      };
      
      const newCoins: UserCoins = {
        balance: 50,
        totalEarned: 50,
        totalSpent: 0,
        subscriptionTier: 'FREE',
        lastCoinRefresh: now,
        transactionHistory: [welcomeTransaction]
      };
        // Insert the new document
      const { data: insertedData, error: insertError } = await supabase
        .from('user_coins')
        .insert([{ user_id: userId, ...newCoins }]) // Changed 'id' to 'user_id' to be consistent
        .select('*')
        .single();
      
      if (insertError) {
        throw insertError;
      }
      
      // Mark the document as verified for this session
      verifiedDocuments.add(userId);
      
      return insertedData as UserCoins;
    } catch (error) {      console.error("Error initializing user coins:", error);
      
      // If all else fails, return a default
      console.warn("Returning default coins due to initialization failure");
      return getDefaultUserCoins();
    } finally {
      // Remove the promise from the tracking map when done
      initializationInProgress.delete(userId);
    }
  })();

  // Store the promise in the tracking map
  initializationInProgress.set(userId, initPromise);
  
  // Return the promise
  return initPromise;
}

/**
 * Get current user's coins
 */
export async function getUserCoins(providedUserId?: string): Promise<UserCoins | null> {
  try {
    
    // Check if Supabase is initialized
    if (!supabase) {
      console.warn('❌ Supabase not initialized, returning anonymous coins');
      return getDefaultUserCoins(true); // Give 15 free coins
    }
    
    // Use provided user ID or get current user's ID
    let userId = providedUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        // No authenticated user - return anonymous coins with free starter balance
        return getAnonymousUserCoins(); // Anonymous users get 15 free coins
      }
    }
    // Get the user's coins document
    const result = await getCoinsForUser(userId);
    return result;
  } catch (error) {
    console.error("Error getting user coins:", error);
    if (error instanceof Error && 
        (error.message.includes('offline') || 
         error.message.includes('network'))) {      // Network error - return anonymous coins as fallback
    }
    // On any error for a non-logged in user, return anonymous coins
    if (!providedUserId) {
      return getAnonymousUserCoins(); // 15 free coins for anonymous users
    }
    throw error;
  }
}

/**
 * Get anonymous user coins from localStorage or create new ones with 15 free coins
 */
export function getAnonymousUserCoins(): UserCoins {
  if (typeof window === 'undefined') {
    return getDefaultUserCoins(true);
  }
  
  try {
    const cacheKey = 'anonymousUserCoins';
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      const coins = JSON.parse(cachedData);
      return coins;
    }
    
    // No cached coins found, create new ones with 15 free coins
    const newCoins = getDefaultUserCoins(true);
    localStorage.setItem(cacheKey, JSON.stringify(newCoins));
    return newCoins;
  } catch (error) {
    console.error("Error getting anonymous coins:", error);
    return getDefaultUserCoins(true);
  }
}

/**
 * Get default coins for fallback
 * @param isAnonymous Whether these coins are for an anonymous (non-logged in) user
 */
export function getDefaultUserCoins(isAnonymous: boolean = false): UserCoins {
  // Anonymous users get 15 free coins
  const startingBalance = isAnonymous ? 15 : 5;
  const now = serverTimestamp();
  
  return {
    balance: startingBalance,
    totalEarned: startingBalance,
    totalSpent: 0,
    subscriptionTier: 'FREE',
    lastCoinRefresh: now,
    transactionHistory: isAnonymous ? [
      {
        id: `anonymous_gift_${Date.now()}`,
        type: 'EARNED' as const,
        amount: startingBalance,
        description: 'Free starter coins for anonymous users',
        timestamp: now
      }
    ] : [
      {
        id: 'default',
        type: 'EARNED' as const,
        amount: 5,
        description: 'Default offline balance',
        timestamp: now
      }
    ],
    _anonymous: isAnonymous
  } as UserCoins;
}



/**
 * Add coins to user's balance
 */
export async function addCoins(amount: number, description: string): Promise<boolean> {
  try {
    // Make sure we have a user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (!userId) {
      console.warn('No authenticated user found when adding coins');
      return false;
    }
    
    // Get the user's coins document first
    await getOrCreateUserCoinsDocument(userId);
    
    // Create a new transaction
    const transaction = {
      id: generateId(),
      type: 'EARNED' as const,
      amount,
      description,
      timestamp: serverTimestamp()
    };
    
    // Update the user's coins document
    const { error } = await supabase.rpc('add_coins', {
      user_id: userId,
      amount_to_add: amount,
      transaction_data: transaction
    });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error adding coins:", error);
    return false;
  }
}

/**
 * Spend coins from user's balance
 */
export async function spendCoins(amount: number, description: string): Promise<boolean> {
  try {
    // Make sure we have a user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (!userId) {
      console.warn('No authenticated user found when spending coins');
      return false;
    }
    
    // Get the user's coins document
    const userCoins = await getCoinsForUser(userId);
    
    if (!userCoins) {
      console.warn('No coins document found when spending coins');
      return false;
    }
    
    // Make sure the user has enough coins
    if (userCoins.balance < amount) {
      console.warn(`Not enough coins. User ${userId} has ${userCoins.balance} coins, needs ${amount}`);
      return false;
    }
    
    // Create a new transaction
    const transaction = {
      id: generateId(),
      type: 'SPENT' as const,
      amount,
      description,
      timestamp: serverTimestamp()
    };
    
    // Update the user's coins document
    const { error } = await supabase.rpc('spend_coins', {
      user_id: userId,
      amount_to_spend: amount,
      transaction_data: transaction
    });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error spending coins:", error);
    return false;
  }
}

/**
 * Update user's subscription tier
 */
export async function updateSubscription(tier: keyof typeof SUBSCRIPTION_TIERS): Promise<boolean> {
  try {
    // Make sure we have a user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (!userId) {
      console.warn('No authenticated user found when updating subscription');
      return false;
    }
    
    // Get the user's coins document
    const userCoins = await getCoinsForUser(userId);
    
    if (!userCoins) {
      console.warn('No coins document found when updating subscription');
      return false;
    }
    
    // Calculate subscription dates
    const now = new Date();
    const subscriptionStart = now.toISOString();
    
    // Add one month to the current date
    const subscriptionEnd = new Date(now);
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    
    // Update the user's subscription
    const { error } = await supabase
      .from('userCoins')
      .update({
        subscriptionTier: tier,
        subscriptionStart,
        subscriptionEnd: subscriptionEnd.toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error updating subscription:", error);
    return false;
  }
}

/**
 * Check if a user has enough coins for an operation
 */
export async function hasEnoughCoins(amount: number): Promise<boolean> {
  const userCoins = await getUserCoins();
  if (!userCoins) return false;
  
  return userCoins.balance >= amount;
}

/**
 * Format a number as a coin value
 */
export function formatCoins(amount: number): string {
  return `${amount.toLocaleString()} ${amount === 1 ? 'coin' : 'coins'}`;
}

/**
 * Direct coin deduction with explicit user ID
 * This function should be used in the page component when auth state is already known
 */
export async function directCoinDeduction(
  userId: string,
  amount: number, 
  description: string
): Promise<{ 
  success: boolean; 
  remainingBalance: number; 
  currentBalance?: number;
  error?: string;
}> {
  if (!userId) {
    console.error("SUPABASE ERROR: Cannot deduct coins: No user ID provided");
    return { 
      success: false, 
      remainingBalance: 0,
      error: 'No user ID provided'
    };
  }
  
  try {
    // Get the user's current coins
    const userCoins = await getCoinsForUser(userId);
    
    if (!userCoins) {
      return { 
        success: false, 
        remainingBalance: 0,
        error: 'User coins not found' 
      };
    }
    
    // Make sure the user has enough coins
    if (userCoins.balance < amount) {
      console.error(`SUPABASE ERROR: Not enough coins. Balance: ${userCoins?.balance || 0}, Required: ${amount}`);
      return { 
        success: false, 
        remainingBalance: userCoins.balance,
        currentBalance: userCoins.balance,
        error: `Not enough coins. You have ${userCoins.balance} coins, but this operation requires ${amount} coins.`
      };    }
    
    // Directly update the user's coin balance (simplified approach)
    const newBalance = userCoins.balance - amount;
    const { error: updateError } = await supabase
      .from('user_coins')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error("SUPABASE ERROR: Failed to update coin balance:", updateError);
      throw updateError;
    }
    
    
    return { 
      success: true, 
      remainingBalance: newBalance,
      currentBalance: newBalance
    };
  } catch (error) {
    console.error("SUPABASE ERROR: Failed to deduct coins:", error);
    return { 
      success: false, 
      remainingBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Ensure the user_coins table exists in the database
 */
async function ensureUserCoinsTable(): Promise<boolean> {try {
    
    // Simple check: try to query the table directly
    const { data, error } = await supabase
      .from('user_coins')
      .select('user_id')
      .limit(1);
    
    if (error) {
      // If error contains "relation does not exist", the table doesn't exist
      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        return false;
      } else {
        // Some other error, but table likely exists
        return true;
      }
    }    
    return true;
  } catch (error) {
    console.error("❌ Error ensuring user_coins table:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      fullError: error
    });
    return false;
  }
}

/**
 * Get user coins directly with user ID
 */
export async function getCoinsForUser(userId: string): Promise<UserCoins | null> {
  if (!userId) {
    console.error("🚨 CRITICAL: Cannot get coins: No user ID provided");
    return null;
  }
  
  try {
    
    // Check if the table exists first
    await ensureUserCoinsTable();
    
    // Try to get from database
    // Note: PostgreSQL treats quoted identifiers as case-sensitive
    // Try with different case variations of the table name
    
    // Try 'user_coins' (snake_case - most common convention in PostgreSQL)
    const { data: data1, error: error1 } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!error1 && data1) {
      return data1 as UserCoins;
    }
    
    // Try 'usercoins' (all lowercase - PostgreSQL default for unquoted identifiers)
    const { data: data2, error: error2 } = await supabase
      .from('usercoins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!error2 && data2) {
      return data2 as UserCoins;
    }
    
    // Try original 'userCoins' (camelCase - what was in the code)
    const { data, error } = await supabase
      .from('userCoins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    
    if (error) {
      console.error("❌ ERROR in getCoinsForUser:", error);
      
      // Log more detailed error information
      console.error("📝 ERROR details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId
      });
        // If no coins found, handle gracefully to prevent infinite loops
      if (error.code === "PGRST116") { // No rows returned
        
        // TEMPORARY FIX: Return anonymous coins to prevent UI breaking
        // This prevents the infinite loop while database issues are resolved
        return getAnonymousUserCoins(); // 15 free coins
      }
      
      // For any other error, return default coins
      return getDefaultUserCoins();
    }
      // Successfully retrieved user coins
    
    return data as UserCoins;
  } catch (error: any) {
    console.error("❌ Error getting coins for user:", error);
      // Check for permission errors (user not logged in)
    if (error.code === "permission-denied") {
      return getAnonymousUserCoins(); // Give anonymous users 15 free coins
    }
    
    // Return anonymous coins with 15 free coins as a fallback
    return getAnonymousUserCoins();
  }
}


