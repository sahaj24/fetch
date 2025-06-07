#!/usr/bin/env node

/**
 * Test script to verify coin deduction works for user d4539379-f3d4-4b7e-9012-30fd88680c25
 * This will test the automatic initialization logic
 */

const { createClient } = require('@supabase/supabase-js');

// Use the same credentials from .env
const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseKey);

const testUserId = 'd4539379-f3d4-4b7e-9012-30fd88680c25';

async function testCoinInitialization() {
  console.log('🧪 Testing coin initialization for user:', testUserId);
  
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
    
    // Try to create a coin record using the same logic as initializeUserCoins
    console.log('2. Attempting to initialize user coins...');
    
    const { error: insertError } = await supabase
      .from('user_coins')
      .insert({
        user_id: testUserId,
        balance: 50,
        total_earned: 50,
        total_spent: 0,
        subscription_tier: 'FREE',
        last_coin_refresh: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('❌ Error creating user coins record:', insertError);
      return;
    }
    
    console.log('✅ Successfully created user coins record');
    
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

testCoinInitialization();
