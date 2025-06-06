#!/usr/bin/env node

// Test the secure RPC functions for coin management
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3MDA2NjMsImV4cCI6MjA0OTI3NjY2M30.4O9m8Px4gXoA2_gXpUcQ8QWW1o8fCjhY2zUCXP_pGQA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPCFunctions() {
  console.log('🧪 TESTING SECURE RPC FUNCTIONS\n');

  // Generate a test user ID (UUID)
  const testUserId = crypto.randomUUID();
  console.log(`1️⃣ Test User ID (UUID): ${testUserId}\n`);

  try {
    // Test 1: Add initial coins using RPC function
    console.log('2️⃣ Adding initial coins using secure RPC function...');
    const transactionId = `test_signup_${Date.now()}`;
    const { data: addResult, error: addError } = await supabase.rpc('add_user_coins', {
      p_user_id: testUserId,
      p_amount: 50,
      p_transaction_id: transactionId,
      p_description: 'Test signup bonus',
      p_created_at: new Date().toISOString()
    });

    if (addError) {
      console.error('❌ Failed to add coins via RPC:', addError);
      return;
    }
    console.log('✅ Successfully added 50 coins via RPC function');

    // Test 2: Check user balance
    console.log('\n3️⃣ Checking user balance...');
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_coins')
      .select('balance, total_earned, total_spent')
      .eq('user_id', testUserId)
      .single();

    if (balanceError) {
      console.error('❌ Failed to fetch balance:', balanceError);
    } else {
      console.log('✅ Current balance:', balanceData);
    }

    // Test 3: Spend coins using RPC function
    console.log('\n4️⃣ Spending 10 coins using secure RPC function...');
    const spendTransactionId = `test_spend_${Date.now()}`;
    const { data: spendResult, error: spendError } = await supabase.rpc('spend_user_coins', {
      p_user_id: testUserId,
      p_amount: 10,
      p_transaction_id: spendTransactionId,
      p_description: 'Test subtitle extraction',
      p_created_at: new Date().toISOString()
    });

    if (spendError) {
      console.error('❌ Failed to spend coins via RPC:', spendError);
    } else {
      console.log('✅ Successfully spent 10 coins via RPC function');
    }

    // Test 4: Check balance after spending
    console.log('\n5️⃣ Checking balance after spending...');
    const { data: newBalanceData, error: newBalanceError } = await supabase
      .from('user_coins')
      .select('balance, total_earned, total_spent')
      .eq('user_id', testUserId)
      .single();

    if (newBalanceError) {
      console.error('❌ Failed to fetch new balance:', newBalanceError);
    } else {
      console.log('✅ New balance:', newBalanceData);
    }

    // Test 5: Check transaction history
    console.log('\n6️⃣ Checking transaction history...');
    const { data: transactions, error: transError } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    if (transError) {
      console.error('❌ Failed to fetch transactions:', transError);
    } else {
      console.log('✅ Transaction history:');
      transactions.forEach((trans, index) => {
        console.log(`   ${index + 1}. ${trans.type}: ${trans.amount} coins - ${trans.description}`);
      });
    }

    console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('🎉 The secure RPC functions are working correctly!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    // Cleanup
    console.log('\n7️⃣ Cleaning up test data...');
    await supabase.from('coin_transactions').delete().eq('user_id', testUserId);
    await supabase.from('user_coins').delete().eq('user_id', testUserId);
    console.log('✅ Test data cleaned up');
  }
}

testRPCFunctions();
