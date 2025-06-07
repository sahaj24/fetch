#!/usr/bin/env node

/**
 * Apply the missing INSERT policy for coin_transactions table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyPolicy() {
  console.log('🔧 Applying missing INSERT policy for coin_transactions...');
  
  try {
    // Note: RPC calls for schema changes need to be run with elevated privileges
    // This might not work with the anon key, but let's try
    console.log('Attempting to create INSERT policy...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.coin_transactions;
        CREATE POLICY "Users can insert their own transactions"
          ON public.coin_transactions FOR INSERT
          WITH CHECK (auth.uid() = user_id);
      `
    });
    
    if (error) {
      console.error('❌ Could not apply policy via RPC (expected - need admin access):', error.message);
      console.log('\n📋 Please run this SQL manually in your Supabase SQL Editor:');
      console.log('----------------------------------------');
      console.log(`DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.coin_transactions;
CREATE POLICY "Users can insert their own transactions"
  ON public.coin_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.coin_transactions;
CREATE POLICY "Users can update their own transactions"
  ON public.coin_transactions FOR UPDATE
  USING (auth.uid() = user_id);`);
      console.log('----------------------------------------');
    } else {
      console.log('✅ Policy applied successfully:', data);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n📋 Please run this SQL manually in your Supabase SQL Editor:');
    console.log('----------------------------------------');
    console.log(`DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.coin_transactions;
CREATE POLICY "Users can insert their own transactions"
  ON public.coin_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.coin_transactions;
CREATE POLICY "Users can update their own transactions"
  ON public.coin_transactions FOR UPDATE
  USING (auth.uid() = user_id);`);
    console.log('----------------------------------------');
  }
}

applyPolicy();
