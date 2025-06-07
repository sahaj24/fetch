import { supabase } from "@/supabase/config";

/**
 * Simple, bulletproof coin deduction function
 */
export async function deductUserCoins(
  userId: string,
  amount: number
): Promise<{ 
  success: boolean; 
  remainingBalance: number;
  error?: string;
}> {
  if (!userId) {
    return { 
      success: false, 
      remainingBalance: 0,
      error: 'No user ID provided'
    };
  }
  
  console.log(`🪙 COIN DEDUCT: Attempting to deduct ${amount} coins for user ${userId}`);
  
  try {
    // Step 1: Try to get existing balance or create new record
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "no rows returned"
      console.error("❌ Error fetching coins:", fetchError);
      
      // If table doesn't exist, provide helpful message
      if (fetchError.code === '42P01') {
        return { 
          success: false, 
          remainingBalance: 0,
          error: 'Database table not setup. Please contact support.'
        };
      }
      
      return { 
        success: false, 
        remainingBalance: 0,
        error: 'Failed to fetch coin balance'
      };
    }
    
    let currentBalance = 50; // Default balance for new users
    
    if (!existingUser) {
      // User doesn't have a coin record, create one
      console.log("🆕 Creating new coin record for user with 50 coins");
      
      const { data: insertedUser, error: insertError } = await supabase
        .from('user_coins')
        .insert({ 
          user_id: userId, 
          balance: currentBalance
        })
        .select('balance')
        .single();
      
      if (insertError) {
        console.error("❌ Error creating coin record:", insertError);
        return { 
          success: false, 
          remainingBalance: 0,
          error: 'Failed to create coin record. Please try again.'
        };
      }
      
      currentBalance = insertedUser.balance || 50;
      console.log(`✅ Created coin record with balance: ${currentBalance}`);
    } else {
      currentBalance = existingUser.balance || 0;
      console.log(`📊 Found existing balance: ${currentBalance}`);
    }
    
    // Step 2: Check if user has enough coins
    if (currentBalance < amount) {
      console.error(`❌ Insufficient coins: Has ${currentBalance}, needs ${amount}`);
      return { 
        success: false, 
        remainingBalance: currentBalance,
        error: `Insufficient coins. You have ${currentBalance} coins, but need ${amount}.`
      };
    }
    
    // Step 3: Deduct the coins
    const newBalance = currentBalance - amount;
    console.log(`💰 Deducting ${amount} coins: ${currentBalance} → ${newBalance}`);
    
    const { error: updateError } = await supabase
      .from('user_coins')
      .update({ 
        balance: newBalance
      })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error("❌ Error updating balance:", updateError);
      return { 
        success: false, 
        remainingBalance: currentBalance,
        error: 'Failed to update coin balance. Please try again.'
      };
    }
    
    console.log(`✅ SUCCESS: Deducted ${amount} coins. New balance: ${newBalance}`);
    
    return { 
      success: true, 
      remainingBalance: newBalance
    };
  } catch (error) {
    console.error("❌ Unexpected error in coin deduction:", error);
    return { 
      success: false, 
      remainingBalance: 0,
      error: error instanceof Error ? error.message : 'Unexpected error occurred'
    };
  }
}
