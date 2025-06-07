const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
const envPath = path.join(__dirname, '.env');
let supabaseUrl = null;
let supabaseKey = null;

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1];
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1];
    }
  }
} catch (error) {
  console.error('❌ Could not read .env file:', error.message);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Copy the exact deductUserCoins function from simple-deduction.ts
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

async function testCoinDeduction() {
  console.log('🧪 Testing Coin Deduction Function...\n');
  
  const testUserId = '12345678-1234-1234-1234-123456789012'; // Valid UUID format
  
  // Test 1: Create new user and deduct coins
  console.log('📋 Test 1: New user coin deduction...');
  const result1 = await deductUserCoins(testUserId, 5);
  console.log('Result:', result1);
  
  if (result1.success) {
    console.log('✅ Test 1 PASSED: Successfully created user and deducted coins\n');
    
    // Test 2: Deduct more coins from existing user
    console.log('📋 Test 2: Existing user coin deduction...');
    const result2 = await deductUserCoins(testUserId, 10);
    console.log('Result:', result2);
    
    if (result2.success) {
      console.log('✅ Test 2 PASSED: Successfully deducted more coins\n');
      
      // Test 3: Try to deduct more coins than available
      console.log('📋 Test 3: Insufficient coins test...');
      const result3 = await deductUserCoins(testUserId, 100);
      console.log('Result:', result3);
      
      if (!result3.success && result3.error.includes('Insufficient coins')) {
        console.log('✅ Test 3 PASSED: Correctly handled insufficient coins\n');
        
        // Cleanup: Delete test user
        console.log('🧹 Cleaning up test user...');
        const { error: deleteError } = await supabase
          .from('user_coins')
          .delete()
          .eq('user_id', testUserId);
        
        if (deleteError) {
          console.log('⚠️ Could not cleanup test user:', deleteError);
        } else {
          console.log('✅ Test user cleaned up');
        }
        
        console.log('\n🎉 ALL TESTS PASSED! Coin deduction function is working correctly.');
      } else {
        console.log('❌ Test 3 FAILED: Should have failed with insufficient coins');
      }
    } else {
      console.log('❌ Test 2 FAILED:', result2.error);
    }
  } else {
    console.log('❌ Test 1 FAILED:', result1.error);
  }
}

testCoinDeduction();
