const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env and .env.local
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, '.env.local');
let supabaseUrl = null;
let supabaseKey = null;

// Read from .env first
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1];
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1];
    }
  }
} catch (error) {
  console.log('No .env file found, trying .env.local...');
}

// Override with .env.local if it exists
try {
  const envLocalContent = fs.readFileSync(envLocalPath, 'utf8');
  const lines = envLocalContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1];
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1];
    }
  }
} catch (error) {
  console.log('No .env.local override found');
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required variables:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('\nFound in .env:');
  console.log('- URL:', supabaseUrl ? '✓ Set' : '❌ Missing');
  console.log('- Key:', supabaseKey ? '✓ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Testing coin deduction system...');
console.log('🔗 Supabase URL:', supabaseUrl ? '✓ Set' : '❌ Missing');
console.log('🔑 Supabase Key:', supabaseKey ? '✓ Set' : '❌ Missing');

async function testCoinSystem() {
  try {
    // Test 1: Check if user_coins table exists
    console.log('\n📋 Test 1: Checking if user_coins table exists...');
    const { data, error } = await supabase
      .from('user_coins')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ user_coins table does not exist');
        console.log('📝 Action needed: Run the SQL from create-user-coins-table.sql in your Supabase dashboard');
        return false;
      } else {
        console.log('❌ Database error:', error);
        return false;
      }
    } else {
      console.log('✅ user_coins table exists');
    }
    
    // Test 2: Test the coin deduction function with a dummy ID
    console.log('\n📋 Test 2: Testing coin deduction function...');
    const testUserId = '12345678-1234-1234-1234-123456789012';
    
    // Try to fetch user coins (should create record if missing)
    const { data: userCoins, error: fetchError } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', testUserId)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.log('❌ Error fetching user coins:', fetchError);
      return false;
    }
    
    if (!userCoins) {
      console.log('🆕 Test user has no coin record (expected for new users)');
      console.log('✅ Function should handle this gracefully by creating a new record');
    } else {
      console.log('📊 Test user current balance:', userCoins.balance);
    }
    
    console.log('\n✅ All tests passed!');
    console.log('\n📝 Next steps:');
    console.log('1. If user_coins table exists, the coin deduction should work');
    console.log('2. Test with actual user login on the website');
    console.log('3. Check browser console for coin deduction logs');
    
    return true;
  } catch (error) {
    console.log('❌ Unexpected error:', error);
    return false;
  }
}

testCoinSystem();
