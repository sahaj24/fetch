#!/usr/bin/env node

/**
 * Test what functions are available and working in Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAvailableFunctions() {
  console.log('🔍 Testing available Supabase functions...');
  
  try {
    // Test 1: Try a simple function that should exist
    console.log('1. Testing simple function call...');
    const { data: testData, error: testError } = await supabase.rpc('version');
    
    if (testError) {
      console.error('❌ Error calling version():', testError);
    } else {
      console.log('✅ version() result:', testData);
    }
    
    // Test 2: List available functions (might not work with anon role)
    console.log('2. Checking what tables/functions we can access...');
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .limit(10);
    
    if (schemaError) {
      console.error('❌ Error accessing schema info:', schemaError);
    } else {
      console.log('✅ Available functions:', schemaData);
    }
    
    // Test 3: Try calling add_user_coins with better error handling
    console.log('3. Testing add_user_coins with detailed error info...');
    const testUserId = 'd4539379-f3d4-4b7e-9012-30fd88680c25';
    const { data: addCoinsData, error: addCoinsError } = await supabase.rpc('add_user_coins', {
      p_user_id: testUserId,
      p_amount: 50,
      p_transaction_id: `test_${Date.now()}`,
      p_description: 'Test coins',
      p_created_at: new Date().toISOString()
    });
    
    if (addCoinsError) {
      console.error('❌ Detailed add_user_coins error:', {
        message: addCoinsError.message,
        details: addCoinsError.details,
        hint: addCoinsError.hint,
        code: addCoinsError.code
      });
    } else {
      console.log('✅ add_user_coins result:', addCoinsData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testAvailableFunctions();
