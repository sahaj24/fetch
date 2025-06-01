import { supabase } from "@/supabase/config";

// Define operation types for coin transactions
export type OperationType = 'EXTRACT_SUBTITLES' | 'BATCH_EXTRACT' | 'DOWNLOAD' | 'OTHER';

/**
 * Initializes a user's coins account with 50 coins if they don't have one yet
 * Returns the user's coin balance 
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

    // If there's no record, create one with 50 coins
    if (!existingCoins) {
      console.log('Creating new user coins record with 50 coins welcome bonus');
      
      // Direct insert to create the user_coins record
      const { error } = await supabase
        .from('user_coins')
        .insert({
          user_id: userId,
          balance: 50,
          total_earned: 50,
          total_spent: 0,
          subscription_tier: 'FREE',
          last_coin_refresh: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error creating user coins record:', error);
        return null;
      }
      
      // Also record the transaction
      const transactionId = `welcome_${Date.now()}`;
      const { error: transError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: userId,
          transaction_id: transactionId,
          type: 'EARNED',
          amount: 50,
          description: 'Welcome bonus',
          created_at: new Date().toISOString()
        });
        
      if (transError) {
        console.error('Error recording welcome transaction:', transError);
        // Continue anyway since the coins were added
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
 * Deducts coins from a user's balance when they perform an operation
 * Returns true if successful, false if the user doesn't have enough coins or if there's an error
 * 
 * IMPORTANT: This function handles deduction for ALL subscription tiers including Pro users
 */
export async function deductCoinsForOperation(userId: string, operationType: OperationType, coinsToDeduct: number): Promise<boolean> {
  try {
    if (!userId) {
      console.error('❌ Cannot deduct coins: No user ID provided');
      return false;
    }
    
    console.log(`✅ deductCoinsForOperation called with userId=${userId}, operationType=${operationType}, coinsToDeduct=${coinsToDeduct}`);

    // Define the user data type for clarity
    type UserCoinData = {
      balance: number;
      total_spent: number;
      subscription_tier: string;
    };

    // 1. FIRST: Get the current user data directly from the database
    const { data, error } = await supabase
      .from('user_coins')
      .select('balance, total_spent, subscription_tier')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('❌ Error fetching user coins data:', error);
      return false;
    }
    
    if (!data) {
      console.error('❌ User coins record not found for user_id:', userId);
      
      // Try to create a new record for the user
      console.log('✅ Creating new coin record for user');
      const { error: insertError } = await supabase
        .from('user_coins')
        .insert({
          user_id: userId,
          balance: 50, // Give them 50 starter coins
          total_earned: 50,
          total_spent: 0,
          subscription_tier: 'FREE'
        });
        
      if (insertError) {
        console.error('❌ Failed to create user coins record:', insertError);
        return false;
      }
      
      // Fetch the newly created record
      const { data: newUserData, error: newFetchError } = await supabase
        .from('user_coins')
        .select('balance, total_spent, subscription_tier')
        .eq('user_id', userId)
        .single();
        
      if (newFetchError || !newUserData) {
        console.error('❌ Still cannot find user coins record after creation attempt');
        return false;
      }
      
      // Use the new user data for coin operations
      console.log('✅ New user record created successfully:', newUserData);
      
      // Get values from the new record
      const currentBalance = newUserData.balance || 0;
      const totalSpent = newUserData.total_spent || 0;
      const subscriptionTier = (newUserData.subscription_tier || 'FREE').toUpperCase();
      
      // Check if new user has enough coins
      if (currentBalance < coinsToDeduct) {
        console.error(`❌ New user ${userId} doesn't have enough coins. Balance: ${currentBalance}, Required: ${coinsToDeduct}`);
        return false;
      }
      
      // Calculate new values
      const newBalance = currentBalance - coinsToDeduct;
      const newTotalSpent = totalSpent + coinsToDeduct;
      
      // Update the database with the new values
      const { error: updateError } = await supabase
        .from('user_coins')
        .update({
          balance: newBalance,
          total_spent: newTotalSpent,
          subscription_tier: subscriptionTier
        })
        .eq('user_id', userId);
        
      if (updateError) {
        console.error('❌ Error updating new user coins:', updateError);
        return false;
      }
      
      // Record the transaction
      await recordCoinTransaction(userId, operationType, -coinsToDeduct);
      
      console.log(`✅ Successfully deducted ${coinsToDeduct} coins from new user ${userId}. New balance: ${newBalance}`);
      return true;
    }
    
    // Process existing user
    const userCoinData = data as UserCoinData;
    console.log('✅ User data retrieved:', userCoinData);

    const currentBalance = userCoinData.balance || 0;
    const totalSpent = userCoinData.total_spent || 0;
    const subscriptionTier = userCoinData.subscription_tier || 'FREE';
    
    console.log(`📊 User ${userId} has subscription tier: ${subscriptionTier}, balance: ${currentBalance}`);
    
    // CRITICAL FIX: Force uppercase for subscription tier to ensure consistent comparison
    const normalizedTier = subscriptionTier.toUpperCase();
    
    // Always check if the user has enough coins, regardless of subscription tier
    if (currentBalance < coinsToDeduct) {
      console.error(`❌ User ${userId} doesn't have enough coins. Balance: ${currentBalance}, Required: ${coinsToDeduct}`);
      return false;
    }

    const newBalance = currentBalance - coinsToDeduct;
    const newTotalSpent = totalSpent + coinsToDeduct;

    console.log(`💰 Updating user ${userId} coins: balance ${currentBalance} -> ${newBalance}, total_spent ${totalSpent} -> ${newTotalSpent}`);
    
    // 2. DIRECT DATABASE UPDATE
    const { error: updateError } = await supabase
      .from('user_coins')
      .update({
        balance: newBalance,
        total_spent: newTotalSpent,
        subscription_tier: normalizedTier
      })
      .eq('user_id', userId);
        
    if (updateError) {
      console.error('❌ Error updating user coins:', updateError);
      return false;
    }
    
    console.log(`✅ Database update successful for user ${userId}`);

    // 3. RECORD THE TRANSACTION
    await recordCoinTransaction(userId, operationType, -coinsToDeduct);

    // 4. VERIFY THE UPDATE WORKED
    const { data: verifyData } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', userId)
      .single();
      
    if (verifyData) {
      console.log(`✅ Verified new balance: ${verifyData.balance}`);
    }

    console.log(`✅ Successfully deducted ${coinsToDeduct} coins from user ${userId}. New balance: ${newBalance}`);
    return true;
  } catch (error) {
    console.error('❌ Unexpected error in deductCoinsForOperation:', error);
    return false;
  }
}

// Helper function to record coin transactions
async function recordCoinTransaction(userId: string, operationType: OperationType, amount: number): Promise<boolean> {
  const transactionId = `${operationType.toLowerCase()}_${Date.now()}`;
  const transactionType = amount < 0 ? 'SPENT' : 'EARNED';
  
  const { error } = await supabase
    .from('coin_transactions')
    .insert({
      user_id: userId,
      transaction_id: transactionId,
      type: transactionType,
      amount: amount,
      description: `${operationType} operation`,
      created_at: new Date().toISOString()
    });
    
  if (error) {
    console.error('❌ Error recording transaction:', error);
    return false;
  }
  
  console.log(`✅ Recorded transaction ${transactionId}`);
  return true;
}

/**
 * Updates a user's coin balance when they purchase a subscription
 * Adds the subscription coins to their balance and updates their subscription tier
 */
export async function addSubscriptionCoins(userId: string, planName: string, coinsToAdd: number): Promise<boolean> {
  try {
    if (!userId) {
      console.error('Cannot add subscription coins: No user ID provided');
      return false;
    }

    console.log(`Adding ${coinsToAdd} coins for user ${userId} from ${planName} subscription`);

    // First get the current balance
    const { data: userData, error: fetchError } = await supabase
      .from('user_coins')
      .select('balance, total_earned')
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching user coins data:', fetchError);
      return false;
    }

    if (!userData) {
      console.error('User coins record not found');
      return false;
    }

    const currentBalance = userData.balance || 0;
    const totalEarned = userData.total_earned || 0;
    const newBalance = currentBalance + coinsToAdd;
    const newTotalEarned = totalEarned + coinsToAdd;

    // IMPORTANT: Normalize the subscription tier name to uppercase for consistency
    const normalizedTierName = planName.toUpperCase();
    
    // Update the user's coin balance and subscription tier
    const { error: updateError } = await supabase
      .from('user_coins')
      .update({
        balance: newBalance,
        total_earned: newTotalEarned,
        subscription_tier: normalizedTierName,
        last_coin_refresh: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Error updating user coins balance:', updateError);
      return false;
    }

    // Record the transaction
    const transactionId = `subscription_${Date.now()}`;
    const { error: transError } = await supabase
      .from('coin_transactions')
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        type: 'SUBSCRIPTION',
        amount: coinsToAdd,
        description: `${planName} subscription coins`,
        created_at: new Date().toISOString()
      });
      
    if (transError) {
      console.error('Error recording subscription transaction:', transError);
      // Continue anyway since the coins were added
    }

    console.log(`Successfully added ${coinsToAdd} coins to user ${userId}. New balance: ${newBalance}`);
    return true;
  } catch (error) {
    console.error('Error in addSubscriptionCoins:', error);
    return false;
  }
}