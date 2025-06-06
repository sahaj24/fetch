import { supabase } from "@/supabase/config";

// Define operation types for coin transactions
export type OperationType = 'EXTRACT_SUBTITLES' | 'BATCH_EXTRACT' | 'DOWNLOAD' | 'OTHER';

/**
 * Initializes a user's coins account with 50 coins if they don't have one yet
 * Returns the user's coin balance 
 * Uses the secure add_user_coins RPC function that bypasses RLS policies
 */
export async function initializeUserCoins(userId: string): Promise<number | null> {
  try {
    if (!userId) {
      console.error('Cannot initialize coins: No user ID provided');
      return null;
    }

    console.log(`Initializing coins for user: ${userId}`);

    // First check if the user already has a coins record
    const { data: existingCoins, error: fetchError } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      // If the error is because no rows were returned, that's expected for new users
      if (fetchError.code !== 'PGRST116') {
        console.error('Error checking for existing coins:', fetchError);
        return null;
      }
    }

    // If there's no record, create one with 50 coins using the secure RPC function
    if (!existingCoins) {
      console.log('Creating new user coins record with 50 coins welcome bonus');
      
      const transactionId = `welcome_${Date.now()}`;
      const { error } = await supabase.rpc('add_user_coins', {
        p_user_id: userId,
        p_amount: 50,
        p_transaction_id: transactionId,
        p_description: 'Welcome bonus',
        p_created_at: new Date().toISOString()
      });
      
      if (error) {
        console.error('Error creating user coins record:', error);
        return null;
      }
      
      console.log('Successfully created user coins with welcome bonus');
      return 50; // Initial balance
    }
    
    // If the user already has a record, return their current balance
    console.log('User already has coins:', existingCoins.balance);
    return existingCoins.balance || 0;
  } catch (error) {
    console.error('Error in initializeUserCoins:', error);
    return null;
  }
}

/**
 * Gets a user's current coin balance
 */
export async function getUserCoinsBalance(userId: string | undefined): Promise<number | null> {
  try {
    if (!userId) {
      console.warn('getUserCoinsBalance: No user ID provided');
      return null;
    }

    // Get the user's coin balance
    const { data, error } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user coins data:', error);
      return null;
    }

    if (!data) {
      console.warn('User coins record not found');
      return null;
    }

    return data.balance || 0;
  } catch (error) {
    console.error('Error in getUserCoinsBalance:', error);
    return null;
  }
}

/**
 * Enhanced coin deduction result with detailed error information
 */
export interface CoinDeductionResult {
  success: boolean;
  error?: string;
  errorType?: 'INSUFFICIENT_COINS' | 'SYSTEM_ERROR' | 'AUTH_ERROR' | 'DATABASE_ERROR';
  currentBalance?: number;
  requiredAmount?: number;
  newBalance?: number;
}

/**
 * Deducts coins from a user's balance when they perform an operation
 * Returns detailed result with error information for better debugging
 * 
 * Uses the secure spend_user_coins RPC function that bypasses RLS policies
 */
export async function deductCoinsForOperation(userId: string, operationType: OperationType, coinsToDeduct: number): Promise<CoinDeductionResult> {
  try {
    if (!userId) {
      console.error('❌ Cannot deduct coins: No user ID provided');
      return {
        success: false,
        error: 'No user ID provided',
        errorType: 'AUTH_ERROR'
      };
    }
    
    console.log(`✅ deductCoinsForOperation called with userId=${userId}, operationType=${operationType}, coinsToDeduct=${coinsToDeduct}`);

    // 1. First check if user exists and get current balance
    const { data: currentData, error: fetchError } = await supabase
      .from('user_coins')
      .select('balance, subscription_tier')
      .eq('user_id', userId)
      .single();
      
    if (fetchError) {
      console.error('❌ Error fetching user coins data:', fetchError);
      
      // If user doesn't exist, try to create them with initial coins using the secure function
      if (fetchError.code === 'PGRST116') { // No rows returned
        console.log('✅ User not found, creating new user with initial coins');
        
        const transactionId = `signup_bonus_${Date.now()}`;
        const { error: addError } = await supabase.rpc('add_user_coins', {
          p_user_id: userId,
          p_amount: 50, // Initial bonus
          p_transaction_id: transactionId,
          p_description: 'Signup bonus',
          p_created_at: new Date().toISOString()
        });
        
        if (addError) {
          console.error('❌ Failed to create user with initial coins:', addError);
          return {
            success: false,
            error: `Failed to create user: ${addError.message}`,
            errorType: 'DATABASE_ERROR'
          };
        }
        
        // Now check if they have enough coins (50 initial - coinsToDeduct)
        if (50 < coinsToDeduct) {
          return {
            success: false,
            error: `Insufficient coins. Required: ${coinsToDeduct}, Available: 50`,
            errorType: 'INSUFFICIENT_COINS',
            currentBalance: 50,
            requiredAmount: coinsToDeduct
          };
        }
        
        // Proceed with deduction for new user
        const currentBalance = 50;
        const newBalance = currentBalance - coinsToDeduct;
        
        // Use the secure spend_user_coins function
        const spendTransactionId = `${operationType.toLowerCase()}_${Date.now()}`;
        const { error: spendError } = await supabase.rpc('spend_user_coins', {
          p_user_id: userId,
          p_amount: coinsToDeduct,
          p_transaction_id: spendTransactionId,
          p_description: `${operationType} operation`,
          p_created_at: new Date().toISOString()
        });
        
        if (spendError) {
          console.error('❌ Error spending coins for new user:', spendError);
          return {
            success: false,
            error: `Failed to spend coins: ${spendError.message}`,
            errorType: 'DATABASE_ERROR'
          };
        }
        
        console.log(`✅ Successfully deducted ${coinsToDeduct} coins from new user ${userId}. New balance: ${newBalance}`);
        return {
          success: true,
          currentBalance: newBalance,
          newBalance
        };
      }
      
      return {
        success: false,
        error: `Database error: ${fetchError.message}`,
        errorType: 'DATABASE_ERROR'
      };
    }
    
    if (!currentData) {
      console.error('❌ User coins record not found');
      return {
        success: false,
        error: 'User coins record not found',
        errorType: 'DATABASE_ERROR'
      };
    }

    const currentBalance = currentData.balance || 0;
    const subscriptionTier = currentData.subscription_tier || 'FREE';
    
    console.log(`📊 User ${userId} has subscription tier: ${subscriptionTier}, balance: ${currentBalance}`);
    
    // Check if user has enough coins
    if (currentBalance < coinsToDeduct) {
      console.error(`❌ User ${userId} doesn't have enough coins. Balance: ${currentBalance}, Required: ${coinsToDeduct}`);
      return {
        success: false,
        error: `Insufficient coins. Required: ${coinsToDeduct}, Available: ${currentBalance}`,
        errorType: 'INSUFFICIENT_COINS',
        currentBalance,
        requiredAmount: coinsToDeduct
      };
    }

    const newBalance = currentBalance - coinsToDeduct;

    console.log(`💰 Spending ${coinsToDeduct} coins for user ${userId}: balance ${currentBalance} -> ${newBalance}`);
    
    // 2. Use the secure spend_user_coins RPC function that bypasses RLS
    const transactionId = `${operationType.toLowerCase()}_${Date.now()}`;
    const { error: spendError } = await supabase.rpc('spend_user_coins', {
      p_user_id: userId,
      p_amount: coinsToDeduct,
      p_transaction_id: transactionId,
      p_description: `${operationType} operation`,
      p_created_at: new Date().toISOString()
    });
        
    if (spendError) {
      console.error('❌ Error spending user coins:', spendError);
      return {
        success: false,
        error: `Failed to spend coins: ${spendError.message}`,
        errorType: 'DATABASE_ERROR'
      };
    }
    
    console.log(`✅ Coin deduction successful for user ${userId}`);

    // 3. Verify the update worked
    const { data: verifyData } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', userId)
      .single();
      
    if (verifyData) {
      console.log(`✅ Verified new balance: ${verifyData.balance}`);
    }

    console.log(`✅ Successfully deducted ${coinsToDeduct} coins from user ${userId}. New balance: ${newBalance}`);
    return {
      success: true,
      currentBalance: newBalance,
      newBalance
    };
  } catch (error) {
    console.error('❌ Unexpected error in deductCoinsForOperation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: 'SYSTEM_ERROR'
    };
  }
}

/**
 * Updates a user's coin balance when they purchase a subscription
 * Adds the subscription coins to their balance and updates their subscription tier
 * Uses the secure add_user_coins RPC function that bypasses RLS policies
 */
export async function addSubscriptionCoins(userId: string, planName: string, coinsToAdd: number): Promise<boolean> {
  try {
    if (!userId) {
      console.error('Cannot add subscription coins: No user ID provided');
      return false;
    }

    console.log(`Adding ${coinsToAdd} coins for user ${userId} from ${planName} subscription`);

    // IMPORTANT: Normalize the subscription tier name to uppercase for consistency
    const normalizedTierName = planName.toUpperCase();
    
    // Use the secure add_user_coins RPC function
    const transactionId = `subscription_${Date.now()}`;
    const { error } = await supabase.rpc('add_user_coins', {
      p_user_id: userId,
      p_amount: coinsToAdd,
      p_transaction_id: transactionId,
      p_description: `${planName} subscription coins`,
      p_created_at: new Date().toISOString()
    });
    
    if (error) {
      console.error('Error adding subscription coins:', error);
      return false;
    }

    // Update subscription tier separately (the RPC function doesn't handle this)
    const { error: tierError } = await supabase
      .from('user_coins')
      .update({
        subscription_tier: normalizedTierName,
        last_coin_refresh: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (tierError) {
      console.error('Error updating subscription tier:', tierError);
      // Continue anyway since the coins were added
    }

    console.log(`Successfully added ${coinsToAdd} coins to user ${userId} for ${planName} subscription`);
    return true;
  } catch (error) {
    console.error('Error in addSubscriptionCoins:', error);
    return false;
  }
}