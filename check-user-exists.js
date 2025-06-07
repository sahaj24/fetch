#!/usr/bin/env node

/**
 * Check if the user exists in the auth.users table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseKey);

const testUserId = 'd4539379-f3d4-4b7e-9012-30fd88680c25';

async function checkUserExists() {
  console.log('🔍 Checking if user exists in auth system and related tables...');
  
  try {
    // Check profiles table first (this is usually accessible)
    console.log('1. Checking profiles table...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId);
    
    if (profileError) {
      console.error('❌ Error accessing profiles:', profileError);
    } else {
      console.log('✅ Profile data:', profileData);
    }
    
    // Check what users we can see in profiles
    console.log('2. Checking total profiles count...');
    const { count: profileCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error getting profile count:', countError);
    } else {
      console.log('✅ Total profiles:', profileCount);
    }
    
    // Check coin transactions to see if there are any users
    console.log('3. Checking existing coin transactions...');
    const { data: transactionData, error: transError } = await supabase
      .from('coin_transactions')
      .select('user_id, count(*)')
      .limit(5);
    
    if (transError) {
      console.error('❌ Error getting transactions:', transError);
    } else {
      console.log('✅ Sample transactions:', transactionData);
    }
    
    // Check if we can see any user_coins records at all
    console.log('4. Checking all user_coins records...');
    const { data: allCoinsData, error: allCoinsError } = await supabase
      .from('user_coins')
      .select('user_id, balance')
      .limit(5);
    
    if (allCoinsError) {
      console.error('❌ Error getting all coins:', allCoinsError);
    } else {
      console.log('✅ Sample user_coins:', allCoinsData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkUserExists();
