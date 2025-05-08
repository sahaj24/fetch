import { supabase } from "@/supabase/config";

// Create coins for a new user
export async function createUserCoins(userId: string, initialCoins: number = 10) {
  try {
    if (!userId) {
      console.error('Cannot create coins: Missing user ID');
      return false;
    }
    
    // Check if the user already has coins
    const { data: existingCoins } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // If they already have coins, don't create a new record
    if (existingCoins) {
      console.log('User already has coins, skipping creation');
      return true;
    }
    
    // Insert new user_coins record
    const { error } = await supabase
      .from('user_coins')
      .insert({
        user_id: userId,
        coin_balance: initialCoins,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error creating user coins:', error);
      return false;
    }
    
    console.log(`Created initial ${initialCoins} coins for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Unexpected error creating user coins:', error);
    return false;
  }
}

// Ensure a user has coins (create if not exists)
export async function ensureUserCoins(userId: string, initialCoins: number = 10) {
  try {
    if (!userId) {
      console.error('Cannot ensure coins: Missing user ID');
      return false;
    }
    
    // Check if the user already has coins
    const { data: existingCoins, error: queryError } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // If they have coins, we're done
    if (existingCoins) {
      return true;
    }
    
    // If there was a not found error, create coins
    if (queryError && queryError.code === 'PGRST116') {
      return await createUserCoins(userId, initialCoins);
    }
    
    // If there was another error, report it
    if (queryError) {
      console.error('Error checking user coins:', queryError);
      return false;
    }
    
    // No error but no coins - create them
    return await createUserCoins(userId, initialCoins);
  } catch (error) {
    console.error('Unexpected error ensuring user coins:', error);
    return false;
  }
}
