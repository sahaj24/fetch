#!/usr/bin/env node

/**
 * Test the updated coin initialization using the add_user_coins function
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseKey);

const testUserId = 'd4539379-f3d4-4b7e-9012-30fd88680c25';

async function testCoinInitializationWithFunction() {
  console.log('🧪 Testing coin initialization using add_user_coins function for user:', testUserId);
  
  try {
    // First, check if the user exists in user_coins
    console.log('1. Checking if user has coin record...');
    const { data: existingCoins, error: fetchError } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('❌ User has no coin record (PGRST116 error as expected)');
      } else {
        console.error('❌ Unexpected error:', fetchError);
        return;
      }
    } else {
      console.log('✅ User already has coin record:', existingCoins);
      return;
    }
    
    // Try to use the add_user_coins function
    console.log('2. Attempting to initialize user coins using add_user_coins function...');
    
    const transactionId = `test_welcome_${Date.now()}`;
    const { error } = await supabase.rpc('add_user_coins', {
      p_user_id: testUserId,
      p_amount: 50,
      p_transaction_id: transactionId,
      p_description: 'Test welcome bonus',
      p_created_at: new Date().toISOString()
    });
    
    if (error) {
      console.error('❌ Error calling add_user_coins function:', error);
      return;
    }
    
    console.log('✅ Successfully called add_user_coins function');
    
    // Verify the record was created
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', testUserId)
      .single();
      
    if (verifyError) {
      console.error('❌ Error verifying coin record:', verifyError);
    } else {
      console.log('✅ Verified coin record:', verifyData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testCoinInitializationWithFunction();
