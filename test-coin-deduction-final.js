#!/usr/bin/env node

/**
 * Comprehensive test to debug coin deduction issues
 * This will test the entire flow step by step
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 FINAL COIN DEDUCTION DEBUG TEST\n');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDirectDatabaseAccess() {
  console.log('1️⃣ Testing direct database access...');
  
  try {
    // Test if we can read the user_coins table
    const { data, error } = await supabase
      .from('user_coins')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Cannot read user_coins table:', error.message);
      return false;
    }
    
    console.log(`✅ Successfully read user_coins table. Found ${data.length} records`);
    if (data.length > 0) {
      console.log('📊 Sample record:', JSON.stringify(data[0], null, 2));
    }
    return true;
  } catch (err) {
    console.error('❌ Database access failed:', err.message);
    return false;
  }
}

async function testCreateTestUser() {
  console.log('\n2️⃣ Testing user creation...');
  
  const testUserId = `test-uuid-${Date.now()}`;
  console.log(`Creating test user: ${testUserId}`);
  
  try {
    // Try to create a user record directly
    const { data, error } = await supabase
      .from('user_coins')
      .insert({
        user_id: testUserId,
        balance: 100,
        total_earned: 100,
        total_spent: 0,
        subscription_tier: 'FREE'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Failed to create test user:', error.message);
      return null;
    }
    
    console.log('✅ Test user created successfully:', JSON.stringify(data, null, 2));
    return testUserId;
  } catch (err) {
    console.error('❌ User creation failed:', err.message);
    return null;
  }
}

async function testCoinDeduction(userId) {
  console.log('\n3️⃣ Testing coin deduction...');
  
  try {
    // Get current balance
    const { data: currentData, error: fetchError } = await supabase
      .from('user_coins')
      .select('balance, total_spent')
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      console.error('❌ Failed to fetch current balance:', fetchError.message);
      return false;
    }
    
    console.log(`📊 Current balance: ${currentData.balance}, total_spent: ${currentData.total_spent}`);
    
    const coinsToDeduct = 5;
    const newBalance = currentData.balance - coinsToDeduct;
    const newTotalSpent = currentData.total_spent + coinsToDeduct;
    
    // Try to update the balance
    const { error: updateError } = await supabase
      .from('user_coins')
      .update({
        balance: newBalance,
        total_spent: newTotalSpent
      })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('❌ Failed to update coins:', updateError.message);
      return false;
    }
    
    console.log(`✅ Successfully deducted ${coinsToDeduct} coins. New balance: ${newBalance}`);
    
    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_coins')
      .select('balance, total_spent')
      .eq('user_id', userId)
      .single();
    
    if (verifyError) {
      console.error('❌ Failed to verify update:', verifyError.message);
      return false;
    }
    
    console.log(`✅ Verified new balance: ${verifyData.balance}, total_spent: ${verifyData.total_spent}`);
    return true;
  } catch (err) {
    console.error('❌ Coin deduction test failed:', err.message);
    return false;
  }
}

async function testTransactionLogging(userId) {
  console.log('\n4️⃣ Testing transaction logging...');
  
  try {
    const transactionId = `test_${Date.now()}`;
    
    const { error } = await supabase
      .from('coin_transactions')
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        type: 'SPENT',
        amount: -5,
        description: 'Test extraction',
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('❌ Failed to log transaction:', error.message);
      return false;
    }
    
    console.log(`✅ Successfully logged transaction: ${transactionId}`);
    return true;
  } catch (err) {
    console.error('❌ Transaction logging failed:', err.message);
    return false;
  }
}

async function testAPIEndpoint() {
  console.log('\n5️⃣ Testing API endpoint with mock auth...');
  
  try {
    const response = await fetch('http://localhost:3000/api/youtube/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token-for-testing'
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        formats: ['txt'],
        language: 'en'
      })
    });
    
    console.log(`📊 API Response Status: ${response.status}`);
    console.log(`📊 API Response Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📋 API Response (first 200 chars): ${responseText.substring(0, 200)}...`);
    
    if (response.status === 401) {
      console.log('✅ Expected - Invalid auth token rejected');
    } else if (response.status === 200) {
      console.log('✅ Request succeeded');
    } else {
      console.log(`❓ Unexpected status: ${response.status}`);
    }
    
    return true;
  } catch (err) {
    console.error('❌ API endpoint test failed:', err.message);
    return false;
  }
}

async function cleanupTestUser(userId) {
  console.log('\n6️⃣ Cleaning up test user...');
  
  try {
    // Delete transactions first (foreign key constraint)
    await supabase
      .from('coin_transactions')
      .delete()
      .eq('user_id', userId);
    
    // Delete user coins record
    await supabase
      .from('user_coins')
      .delete()
      .eq('user_id', userId);
    
    console.log('✅ Test user cleaned up successfully');
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive coin deduction tests...\n');
  
  let testUserId = null;
  
  try {
    // Test 1: Database access
    const dbAccessOk = await testDirectDatabaseAccess();
    if (!dbAccessOk) {
      console.log('❌ Database access failed - stopping tests');
      return;
    }
    
    // Test 2: User creation
    testUserId = await testCreateTestUser();
    if (!testUserId) {
      console.log('❌ User creation failed - stopping tests');
      return;
    }
    
    // Test 3: Coin deduction
    const coinDeductionOk = await testCoinDeduction(testUserId);
    if (!coinDeductionOk) {
      console.log('❌ Coin deduction failed');
    }
    
    // Test 4: Transaction logging
    const transactionOk = await testTransactionLogging(testUserId);
    if (!transactionOk) {
      console.log('❌ Transaction logging failed');
    }
    
    // Test 5: API endpoint
    const apiOk = await testAPIEndpoint();
    if (!apiOk) {
      console.log('❌ API endpoint test failed');
    }
    
    console.log('\n🎯 TEST SUMMARY:');
    console.log(`Database Access: ${dbAccessOk ? '✅' : '❌'}`);
    console.log(`User Creation: ${testUserId ? '✅' : '❌'}`);
    console.log(`Coin Deduction: ${coinDeductionOk ? '✅' : '❌'}`);
    console.log(`Transaction Logging: ${transactionOk ? '✅' : '❌'}`);
    console.log(`API Endpoint: ${apiOk ? '✅' : '❌'}`);
    
    if (dbAccessOk && testUserId && coinDeductionOk && transactionOk) {
      console.log('\n🎉 ALL CORE TESTS PASSED! Coin deduction should be working.');
      console.log('💡 If users are still having issues, it might be an authentication problem.');
    } else {
      console.log('\n❌ Some tests failed. Check the errors above.');
    }
    
  } finally {
    // Always clean up
    if (testUserId) {
      await cleanupTestUser(testUserId);
    }
  }
}

// Install required dependencies if not present
async function checkDependencies() {
  try {
    require('@supabase/supabase-js');
    require('dotenv');
  } catch (err) {
    console.log('📦 Installing required dependencies...');
    const { execSync } = require('child_process');
    execSync('npm install @supabase/supabase-js dotenv', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  }
}

async function main() {
  await checkDependencies();
  await runAllTests();
}

main().catch(console.error);
