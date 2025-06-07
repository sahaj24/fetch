#!/usr/bin/env node

// Test the new coin deduction function
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Testing coin deduction functionality...');

// Simple coin deduction function (copied from simple-deduction.ts)
async function deductUserCoins(userId, amount) {
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
      console.error("❌ Error fetching coins:", fetchError);
      
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
      console.log("🆕 Creating new coin record for user with 50 coins");
      
      const { data: insertedUser, error: insertError } = await supabase
        .from('user_coins')
        .insert({ 
          user_id: userId, 
          balance: currentBalance,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
        balance: newBalance,
        updated_at: new Date().toISOString()
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

// Test with a dummy user ID
async function runTest() {
  const testUserId = '12345678-1234-1234-1234-123456789012'; // Dummy UUID
  
  console.log('\n📋 Test 1: Check if table exists and function handles missing table gracefully');
  const result1 = await deductUserCoins(testUserId, 1);
  console.log('Result:', result1);
  
  console.log('\n🎯 Test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. If you see a "table not setup" error, run the SQL from create-user-coins-table.sql in your Supabase dashboard');
  console.log('2. If the function works, test with a real user login on the website');
  console.log('3. Monitor the browser console logs when processing videos as a logged-in user');
}

runTest().catch(console.error);
