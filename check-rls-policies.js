#!/usr/bin/env node

/**
 * Check RLS policies on user_coins table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies on user_coins table...');
  
  try {
    // Try to query the policies table
    const { data, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'user_coins');
    
    if (error) {
      console.error('❌ Error checking policies:', error);
    } else {
      console.log('✅ Policies found:', data);
    }
    
    // Also try to see what we can do with a basic query
    console.log('\n🧪 Testing basic user_coins access...');
    const { data: testData, error: testError } = await supabase
      .from('user_coins')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.error('❌ Error accessing user_coins:', testError);
    } else {
      console.log('✅ Can read user_coins:', testData?.length || 0, 'records');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkRLSPolicies();
