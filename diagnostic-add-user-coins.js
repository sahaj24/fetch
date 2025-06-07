#!/usr/bin/env node

/**
 * Diagnostic script to understand why add_user_coins function isn't working
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseKey);

const testUserId = 'd4539379-f3d4-4b7e-9012-30fd88680c25';

async function diagnosticTest() {
  console.log('🔍 DIAGNOSTIC: Testing add_user_coins function behavior\n');
  
  try {
    // Step 1: Clear state - check if user already exists
    console.log('1. Checking current state...');
    const { data: existingData, error: existingError } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', testUserId);
    
    console.log('Existing user_coins:', existingData?.length || 0);
    if (existingData && existingData.length > 0) {
      console.log('Found existing record:', existingData[0]);
    }
    
    // Step 2: Test function with detailed logging
    console.log('\n2. Testing add_user_coins function...');
    const startTime = Date.now();
    const transactionId = `diagnostic_${startTime}`;
    
    const { data: functionResult, error: functionError } = await supabase.rpc('add_user_coins', {
      p_user_id: testUserId,
      p_amount: 25, // Use different amount to distinguish
      p_transaction_id: transactionId,
      p_description: 'Diagnostic test',
      p_created_at: new Date().toISOString()
    });
    
    const endTime = Date.now();
    console.log(`Function execution time: ${endTime - startTime}ms`);
    
    if (functionError) {
      console.error('❌ Function error:', {
        code: functionError.code,
        message: functionError.message,
        details: functionError.details,
        hint: functionError.hint
      });
    } else {
      console.log('✅ Function result:', functionResult);
    }
    
    // Step 3: Check if record was created
    console.log('\n3. Checking if record was created...');
    const { data: afterData, error: afterError } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', testUserId);
    
    if (afterError) {
      console.error('❌ Error checking after state:', afterError);
    } else {
      console.log('After function call - user_coins records:', afterData?.length || 0);
      if (afterData && afterData.length > 0) {
        console.log('Record found:', afterData[0]);
      }
    }
    
    // Step 4: Check transactions
    console.log('\n4. Checking coin_transactions...');
    const { data: transData, error: transError } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', testUserId)
      .eq('transaction_id', transactionId);
    
    if (transError) {
      console.error('❌ Error checking transactions:', transError);
    } else {
      console.log('Transactions found:', transData?.length || 0);
      if (transData && transData.length > 0) {
        console.log('Transaction record:', transData[0]);
      }
    }
    
    // Step 5: Test direct insert to compare
    console.log('\n5. Testing direct insert (will likely fail due to RLS)...');
    const { error: directError } = await supabase
      .from('user_coins')
      .insert({
        user_id: `test-${Date.now()}`,
        balance: 50,
        total_earned: 50,
        total_spent: 0,
        subscription_tier: 'FREE'
      });
    
    if (directError) {
      console.log('Expected direct insert error:', {
        code: directError.code,
        message: directError.message
      });
    } else {
      console.log('Unexpected: direct insert succeeded');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

diagnosticTest();
