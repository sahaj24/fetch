#!/usr/bin/env node

/**
 * Test INSERT operation on coin_transactions table to diagnose the exact error
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCoinTransactionInsert() {
  console.log('🧪 Testing coin_transactions INSERT operation...');
  
  try {
    // First, try to read from coin_transactions to check basic access
    console.log('1. Testing SELECT access to coin_transactions...');
    const { data: readData, error: readError } = await supabase
      .from('coin_transactions')
      .select('*')
      .limit(1);
      
    if (readError) {
      console.error('❌ Error reading coin_transactions:', {
        error: readError,
        message: readError.message,
        details: readError.details,
        hint: readError.hint,
        code: readError.code
      });
    } else {
      console.log('✅ Can read coin_transactions:', readData?.length || 0, 'records');
    }
    
    // Now try to INSERT a test transaction
    console.log('\n2. Testing INSERT access to coin_transactions...');
    const testTransaction = {
      user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      transaction_id: `test_${Date.now()}`,
      type: 'SUBSCRIPTION',
      amount: 100,
      description: 'Test subscription transaction',
      created_at: new Date().toISOString()
    };
    
    console.log('Attempting to insert:', testTransaction);
    
    const { data: insertData, error: insertError } = await supabase
      .from('coin_transactions')
      .insert(testTransaction);
      
    if (insertError) {
      console.error('❌ Error inserting into coin_transactions:', {
        error: insertError,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
    } else {
      console.log('✅ Successfully inserted transaction:', insertData);
    }
    
    // Check current RLS policies if possible
    console.log('\n3. Checking table information...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_coin_transaction_columns');
      
    if (tableError) {
      console.log('Could not get table info:', tableError.message);
    } else {
      console.log('Table structure:', tableInfo);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testCoinTransactionInsert();
