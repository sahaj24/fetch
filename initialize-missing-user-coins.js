#!/usr/bin/env node

/**
 * Script to initialize missing user coins for existing users
 * This fixes the issue where users created before the trigger was in place don't have coin records
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initializeUserCoins(userId, initialBalance = 50) {
  try {
    console.log(`🔄 Initializing coins for user: ${userId}`);
    
    // Check if user already has coins
    const { data: existingCoins, error: fetchError } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existingCoins) {
      console.log(`✅ User ${userId} already has coins: ${existingCoins.balance}`);
      return true;
    }
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error(`❌ Error checking existing coins for ${userId}:`, fetchError);
      return false;
    }
    
    // Create new coin record
    const { error: insertError } = await supabase
      .from('user_coins')
      .insert({
        user_id: userId,
        balance: initialBalance,
        total_earned: initialBalance,
        total_spent: 0,
        subscription_tier: 'FREE',
        last_coin_refresh: new Date().toISOString()
      });
    
    if (insertError) {
      console.error(`❌ Error creating coins for ${userId}:`, insertError);
      return false;
    }
    
    // Record welcome transaction
    const transactionId = `welcome_${Date.now()}`;
    const { error: transError } = await supabase
      .from('coin_transactions')
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        type: 'EARNED',
        amount: initialBalance,
        description: 'Welcome bonus (retroactive)',
        created_at: new Date().toISOString()
      });
    
    if (transError) {
      console.warn(`⚠️ Error recording transaction for ${userId}:`, transError);
      // Continue anyway since the coins were created
    }
    
    console.log(`✅ Successfully initialized ${initialBalance} coins for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ Unexpected error initializing coins for ${userId}:`, error);
    return false;
  }
}

async function initializeSpecificUser() {
  const targetUserId = 'd4539379-f3d4-4b7e-9012-30fd88680c25';
  
  console.log('🚀 Initializing coins for specific user...');
  const success = await initializeUserCoins(targetUserId);
  
  if (success) {
    console.log('✅ User coin initialization completed successfully!');
  } else {
    console.log('❌ User coin initialization failed!');
  }
}

async function initializeAllMissingUsers() {
  try {
    console.log('🚀 Finding users without coin records...');
    
    // Get all users who don't have coin records
    const { data: usersWithoutCoins, error } = await supabase.rpc('get_users_without_coins');
    
    if (error) {
      console.error('❌ Error finding users without coins:', error);
      return;
    }
    
    if (!usersWithoutCoins || usersWithoutCoins.length === 0) {
      console.log('✅ All users already have coin records!');
      return;
    }
    
    console.log(`📊 Found ${usersWithoutCoins.length} users without coin records`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const user of usersWithoutCoins) {
      const success = await initializeUserCoins(user.id);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully initialized: ${successCount} users`);
    console.log(`❌ Failed to initialize: ${failureCount} users`);
    
  } catch (error) {
    console.error('❌ Error in batch initialization:', error);
  }
}

// Run the specific user initialization
if (require.main === module) {
  initializeSpecificUser().then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  initializeUserCoins,
  initializeSpecificUser,
  initializeAllMissingUsers
};
