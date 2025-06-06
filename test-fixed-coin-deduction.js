#!/usr/bin/env node

// Test the FIXED coin deduction function

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFixedCoinDeduction() {
  console.log('🧪 TESTING FIXED COIN DEDUCTION LOGIC\n');

  // Test with a fake user ID to see what happens now
  const testUserId = crypto.randomUUID();
  console.log(`📋 Test User ID: ${testUserId}\n`);

  try {
    // STEP 1: Create a test user with coins (simulate existing user scenario)
    console.log('1️⃣ Creating test user with 50 coins (simulating signup trigger)...');
    
    const { error: setupError } = await supabase.rpc('add_user_coins', {
      p_user_id: testUserId,
      p_amount: 50,
      p_transaction_id: `setup_${Date.now()}`,
      p_description: 'Setup test user',
      p_created_at: new Date().toISOString()
    });

    if (setupError) {
      console.error('❌ Failed to set up test user:', setupError.message);
      return;
    }

    console.log('✅ Test user created with 50 coins');

    // STEP 2: Check initial balance
    const { data: initialData, error: initialError } = await supabase
      .from('user_coins')
      .select('balance, total_earned, total_spent')
      .eq('user_id', testUserId)
      .maybeSingle();

    if (initialError) {
      console.error('❌ Failed to check initial balance:', initialError.message);
      return;
    }

    console.log(`💰 Initial balance: ${initialData?.balance || 0}`);
    console.log(`📊 Total earned: ${initialData?.total_earned || 0}`);
    console.log(`📊 Total spent: ${initialData?.total_spent || 0}\n`);

    // STEP 3: Test the FIXED deduction function logic (simulate what would happen)
    console.log('2️⃣ Testing coin deduction (spending 3 coins)...');
    
    const deductAmount = 3;
    const expectedNewBalance = (initialData?.balance || 0) - deductAmount;
    
    const { error: deductError } = await supabase.rpc('spend_user_coins', {
      p_user_id: testUserId,
      p_amount: deductAmount,
      p_transaction_id: `test_deduction_${Date.now()}`,
      p_description: 'Test deduction - extract subtitles',
      p_created_at: new Date().toISOString()
    });

    if (deductError) {
      console.error('❌ Deduction failed:', deductError.message);
      return;
    }

    console.log('✅ Coin deduction completed');

    // STEP 4: Verify final balance
    const { data: finalData, error: finalError } = await supabase
      .from('user_coins')
      .select('balance, total_earned, total_spent')
      .eq('user_id', testUserId)
      .maybeSingle();

    if (finalError) {
      console.error('❌ Failed to check final balance:', finalError.message);
      return;
    }

    console.log(`\n💰 Final balance: ${finalData?.balance || 0} (expected: ${expectedNewBalance})`);
    console.log(`📊 Total earned: ${finalData?.total_earned || 0} (should still be 50)`);
    console.log(`📊 Total spent: ${finalData?.total_spent || 0} (should be ${deductAmount})`);

    // STEP 5: Analyze results
    const actualBalance = finalData?.balance || 0;
    const actualSpent = finalData?.total_spent || 0;
    const actualEarned = finalData?.total_earned || 0;

    console.log('\n🔍 ANALYSIS:');
    
    if (actualBalance === expectedNewBalance) {
      console.log('✅ BALANCE: Correct! Coins were properly deducted');
    } else {
      console.log(`❌ BALANCE: Wrong! Expected ${expectedNewBalance}, got ${actualBalance}`);
    }

    if (actualSpent === deductAmount) {
      console.log('✅ SPENT: Correct! Total spent is accurate');
    } else {
      console.log(`❌ SPENT: Wrong! Expected ${deductAmount}, got ${actualSpent}`);
    }

    if (actualEarned === 50) {
      console.log('✅ EARNED: Correct! No extra signup bonuses given');
    } else {
      console.log(`❌ EARNED: Wrong! Expected 50, got ${actualEarned} (possible duplicate signup bonus)`);
    }

    console.log('\n🎯 EXPECTED BEHAVIOR:');
    console.log('- Balance should go from 50 → 47 (50 - 3)');
    console.log('- Total earned should stay at 50 (no extra signup bonuses)');
    console.log('- Total spent should be 3');
    console.log('- NO additional welcome bonuses should be given');

    // Clean up
    console.log('\n3️⃣ Cleaning up test user...');
    await supabase
      .from('user_coins')
      .delete()
      .eq('user_id', testUserId);

    await supabase
      .from('coin_transactions')
      .delete()
      .eq('user_id', testUserId);

    console.log('✅ Test completed and cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFixedCoinDeduction().catch(console.error);
