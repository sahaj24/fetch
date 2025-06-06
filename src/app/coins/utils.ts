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
  return new Promise((resolve) => {
    // Check if there's a session in Supabase
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        console.log('User already authenticated:', data.session.user.id);
        resolve(data.session.user.id);
      } else {
        // Set up an auth state listener to wait for authentication
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            console.log('User authenticated:', session.user.id);
            subscription.unsubscribe(); // Unsubscribe to avoid memory leaks
            resolve(session.user.id);
          } else if (event === 'SIGNED_OUT') {
            console.log('No user authenticated');
            subscription.unsubscribe(); // Unsubscribe to avoid memory leaks
            resolve(null);
          }
        });
        
        // If no auth change event happens after a timeout, resolve with null
        setTimeout(() => {
          subscription.unsubscribe();
          console.log('Auth check timed out');
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
  BATCH_SUBTITLE: 0.5,   // Cost per format for batch (discount)
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

// Create a cache to track documents we've already verified or created
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

  try {
    // First check if the document already exists
    const { data: existingCoins, error: fetchError } = await supabase
      .from('userCoins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw fetchError;
    }
    
    if (existingCoins) {
      // Document exists - return its data and cache it
      console.log(`FOUND: User ${userId} already has a coins document`);
      saveCachedUserCoins(userId, existingCoins as UserCoins);
      return existingCoins as UserCoins;
    }
    
    // Document doesn't exist - create a new one using upsert
    console.log(`CREATING: New coins document for user ${userId} using upsert pattern`);
    
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
      subscriptionTier: 'FREE',
      lastCoinRefresh: now,
      transactionHistory: [welcomeTransaction]
    };
    
    // Use upsert pattern (insert with onConflict do nothing)
    const { data: insertedData, error: insertError } = await supabase
      .from('userCoins')
      .upsert([{ user_id: userId, ...newCoins }])
      .select('*')
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    const finalData = insertedData as UserCoins;
    
    // Cache the data
    saveCachedUserCoins(userId, finalData);
    
    console.log(`CREATED: Coins document for user ${userId}`);
    return finalData;
  } catch (error) {
    console.error(`ERROR: Failed to get/create coins for user ${userId}:`, error);
    
    // Final fallback - try once more to get the document
    // This handles the case where another process created it after we checked
    try {
      console.log("FALLBACK: Checking if document exists after error");
      const { data: fallbackData } = await supabase
        .from('userCoins')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (fallbackData) {
        console.log("FALLBACK: Document exists, returning data");
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
    console.log(`Initialization already in progress for user ${userId}, waiting...`);
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
        console.log(`Document for user ${userId} was already verified/created this session`);
        
        // Still try to get the latest data
        const { data } = await supabase
          .from('userCoins')
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
        .from('userCoins')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw existingError;
      }
      
      if (existingData) {
        // Mark the document as verified for this session
        verifiedDocuments.add(userId);
        saveCachedUserCoins(userId, existingData as UserCoins);
        return existingData as UserCoins;
      }
      
      // Document doesn't exist, create it
      console.log(`Creating new coins document for user ${userId}`);
      
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
        .from('userCoins')
        .insert([{ user_id: userId, ...newCoins }]) // Changed 'id' to 'user_id' to be consistent
        .select('*')
        .single();
      
      if (insertError) {
        throw insertError;
      }
      
      // Mark the document as verified for this session
      verifiedDocuments.add(userId);
      
      return insertedData as UserCoins;
    } catch (error) {
      console.error("Error initializing user coins:", error);
      
      // Attempt to get from cache as a fallback
      const cachedCoins = getCachedUserCoins(userId);
      if (cachedCoins) {
        console.log("Using cached coins data due to initialization error");
        return cachedCoins;
      }
      
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
    console.log('⭐ getUserCoins called with providedUserId:', providedUserId);
    
    // Check if Supabase is initialized
    if (!supabase) {
      console.warn('❌ Supabase not initialized, returning anonymous coins');
      return getDefaultUserCoins(true); // Give 15 free coins
    }
    
    // Use provided user ID or get current user's ID
    let userId = providedUserId;
    if (!userId) {
      console.log('🔍 No userId provided, fetching from current session');
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        // No authenticated user - return anonymous coins with free starter balance
        console.log('👤 No authenticated user, returning anonymous coins with 15 free coins');
        return getAnonymousUserCoins(); // Anonymous users get 15 free coins
      }
    }
    console.log('🏁 Proceeding to getCoinsForUser with userId:', userId);
    // Get the user's coins document
    const result = await getCoinsForUser(userId);
    console.log('💰 getCoinsForUser result:', result);
    return result;
  } catch (error) {
    console.error("Error getting user coins:", error);
    if (error instanceof Error && 
        (error.message.includes('offline') || 
         error.message.includes('network'))) {
      // Network error - try to get from local cache
      console.log("Network error, trying to use cached coins");
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (userId) {
        const cachedCoins = getCachedUserCoins(userId);
        if (cachedCoins) {
          return cachedCoins;
        }
      }
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
 * Try to get cached coins from localStorage
 */
export function getCachedUserCoins(userId: string): UserCoins | null {
  if (typeof window === 'undefined') {
    return null; // Not in browser
  }
  
  try {
    const cacheKey = `userCoins_${userId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!cachedData) {
      return null;
    }
    
    const coins = JSON.parse(cachedData);
    
    // Add a flag so we know this is from cache
    return {
      ...coins,
      _fromCache: true
    };
  } catch (error) {
    console.error("Error getting cached coins:", error);
    return null;
  }
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
    
    console.log(`Successfully added ${amount} coins to user ${userId}`);
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
    
    console.log(`Successfully spent ${amount} coins from user ${userId}`);
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
    
    console.log(`Successfully updated subscription for user ${userId} to ${tier}`);
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
  
  console.log(`SUPABASE LOG: Direct coin deduction attempt for user ${userId}: ${amount} coins for ${description}`);
  
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
      };
    }
    
    // Create a new transaction
    const transaction = {
      id: generateId(),
      type: 'SPENT' as const,
      amount,
      description,
      timestamp: serverTimestamp()
    };
    
    console.log("SUPABASE LOG: Attempting to update coin balance", {
      userId,
      currentBalance: userCoins.balance,
      amountToSpend: amount,
      newBalance: userCoins.balance - amount,
      transaction
    });
    
    // Update the user's coins with a transaction
    const { error } = await supabase.rpc('spend_coins', {
      user_id: userId,
      amount_to_spend: amount,
      transaction_data: transaction
    });
    
    if (error) {
      throw error;
    }
    
    console.log(`SUPABASE LOG: Successfully deducted ${amount} coins from user ${userId}`);
    
    // Get the updated balance
    const updatedCoins = await getCoinsForUser(userId);
    const remainingBalance = updatedCoins?.balance || (userCoins.balance - amount);
    
    return { 
      success: true, 
      remainingBalance,
      currentBalance: remainingBalance
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
 * Ensure the userCoins table exists in the database
 */
async function ensureUserCoinsTable(): Promise<boolean> {
  try {
    console.log("🏗️ Checking if userCoins table exists...");
    
    // First check if the table exists
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error("❌ Error checking tables:", tablesError);
      return false;
    }
    
    // Check for different case variations of the table name
    const tableExists = tables && tables.some(t => 
      t.tablename === 'userCoins' || 
      t.tablename === 'user_coins' || 
      t.tablename === 'usercoins'
    );
    
    // Log all available tables to help with debugging
    console.log("📊 Available tables:", tables ? tables.map(t => t.tablename).join(', ') : 'none');
    console.log("📋 Coin table exists:", tableExists);
    
    if (!tableExists) {
      console.log("🔧 Creating userCoins table...");
      
      // We need to use a service role key or SQL to create tables
      // For now, let's just make sure we handle the case when the table doesn't exist
      console.log("⚠️ Cannot automatically create table. Please create the userCoins table manually with the following structure:");
      console.log(`
        CREATE TABLE public."userCoins" (
          user_id UUID PRIMARY KEY,
          balance INTEGER DEFAULT 0,
          "totalEarned" INTEGER DEFAULT 0,
          "totalSpent" INTEGER DEFAULT 0,
          "subscriptionTier" TEXT DEFAULT 'FREE',
          "lastCoinRefresh" TIMESTAMP WITH TIME ZONE,
          "subscriptionStart" TIMESTAMP WITH TIME ZONE,
          "subscriptionEnd" TIMESTAMP WITH TIME ZONE,
          "transactionHistory" JSONB DEFAULT '[]'::jsonb
        );
      `);
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error ensuring userCoins table:", error);
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
    console.log(`🔍 DEBUG: Getting coins for user ${userId}`);
    
    // Try to get from database directly - the table exists in production
    console.log(`💾 DEBUG: Querying table with user_id=${userId}`);
    
    // Try 'user_coins' (snake_case - most common convention in PostgreSQL)
    const { data: data1, error: error1 } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!error1 && data1) {
      console.log('✅ Found coins in user_coins table');
      return data1 as UserCoins;
    }
    
    // Try 'usercoins' (all lowercase - PostgreSQL default for unquoted identifiers)
    const { data: data2, error: error2 } = await supabase
      .from('usercoins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!error2 && data2) {
      console.log('✅ Found coins in usercoins table');
      return data2 as UserCoins;
    }
    
    // Try original 'userCoins' (camelCase - what was in the code)
    const { data, error } = await supabase
      .from('userCoins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    console.log("🔄 DEBUG: Query completed, data:", data, "error:", error);
    
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
      
      // Try to get cached data if Supabase fails
      const cachedCoins = getCachedUserCoins(userId);
      if (cachedCoins) {
        console.log("📦 Using cached coin data due to Supabase error");
        return cachedCoins;
      }
      
      // If no coins found, create them
      if (error.code === "PGRST116") { // No rows returned
        console.log("🆕 No coins found for user, creating new coins document");
        try {
          return await getOrCreateUserCoinsDocument(userId);
        } catch (err) {
          console.error("❌ Firestore error getting user coins:", err);
          return getDefaultUserCoins();
        }
      }
      
      // For any other error, return default coins
      console.log("⚠️ Using default coins due to error");
      return getDefaultUserCoins();
    }
    
    // Successfully retrieved user coins
    console.log("✅ Successfully retrieved coins:", data);
    
    // Save in cache
    saveCachedUserCoins(userId, data as UserCoins);
    
    return data as UserCoins;
  } catch (error: any) {
    console.error("❌ Error getting coins for user:", error);
    
    // Check for permission errors (user not logged in)
    if (error.code === "permission-denied") {
      console.log("🔒 User not authorized to access coins");
      return getAnonymousUserCoins(); // Give anonymous users 15 free coins
    }
    
    // Try to get cached data if Supabase fails
    const cachedCoins = getCachedUserCoins(userId);
    if (cachedCoins) {
      return cachedCoins;
    }
    
    // Return anonymous coins with 15 free coins as a fallback
    return getAnonymousUserCoins();
  }
}

/**
 * Save coins to localStorage
 */
export function saveCachedUserCoins(userId: string, coins: UserCoins): void {
  if (typeof window === 'undefined') {
    return; // Not in browser
  }
  
  try {
    const cacheKey = `userCoins_${userId}`;
    localStorage.setItem(cacheKey, JSON.stringify(coins));
  } catch (error) {
    console.error("Error saving coins to cache:", error);
  }
}
