#!/usr/bin/env node

/**
 * Test if the record was actually created by checking without RLS restrictions
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseKey);

const testUserId = 'd4539379-f3d4-4b7e-9012-30fd88680c25';

async function checkRecordExists() {
  console.log('🔍 Checking if the user_coins record exists...');
  
  try {
    // Try to get count of all user_coins records (should work without RLS issues)
    console.log('1. Checking total user_coins records...');
    const { count, error: countError } = await supabase
      .from('user_coins')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error getting count:', countError);
    } else {
      console.log('✅ Total user_coins records:', count);
    }
    
    // Try to check coin transactions for this user
    console.log('2. Checking coin transactions for user...');
    const { data: transactions, error: transError } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', testUserId);
    
    if (transError) {
      console.error('❌ Error getting transactions:', transError);
    } else {
      console.log('✅ Transactions found:', transactions?.length || 0);
      if (transactions && transactions.length > 0) {
        console.log('📄 Latest transaction:', transactions[transactions.length - 1]);
      }
    }
    
    // Try to call a function to get user balance
    console.log('3. Testing with getUserCoinsBalance equivalent...');
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', testUserId);
    
    if (balanceError) {
      console.error('❌ Error getting balance (without single()):', balanceError);
    } else {
      console.log('✅ Balance query result:', balanceData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkRecordExists();
