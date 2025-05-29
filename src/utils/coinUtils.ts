import { supabase } from "@/supabase/config";

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
export async function getUserCoinsBalance(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Error getting user coins balance:', error);
      return null;
    }
    
    return data?.balance || 0;
  } catch (error) {
    console.error('Error in getUserCoinsBalance:', error);
    return null;
  }
}