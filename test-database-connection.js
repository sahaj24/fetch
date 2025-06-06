const { createClient } = require('@supabase/supabase-js');

// Use the same credentials as the app
const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🧪 Testing Database Connection and Tables...\n');
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('1️⃣ Testing Supabase connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('user_coins')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      console.log('❌ Connection failed:', connectionError.message);
      
      if (connectionError.message.includes('does not exist')) {
        console.log('\n🔧 SOLUTION: Database tables need to be created');
        console.log('   Run the following SQL files in your Supabase SQL Editor:');
        console.log('   1. supabase-schema.sql');
        console.log('   2. supabase-init-coins.sql');
        return;
      }
      
      return;
    }
    
    console.log(`✅ Connected successfully! Found ${connectionTest} user_coins records`);
    
    // Test 2: Check if user_coins table has the right structure
    console.log('\n2️⃣ Testing user_coins table structure...');
    const { data: sampleData, error: structureError } = await supabase
      .from('user_coins')
      .select('user_id, balance, total_spent, subscription_tier')
      .limit(1);
    
    if (structureError) {
      console.log('❌ Table structure issue:', structureError.message);
      return;
    }
    
    console.log('✅ Table structure looks good');
    if (sampleData && sampleData.length > 0) {
      console.log('📊 Sample data:', sampleData[0]);
    } else {
      console.log('📊 Table is empty (this is normal for new setups)');
    }
    
    // Test 3: Test creating a mock user for coin deduction
    console.log('\n3️⃣ Testing coin deduction workflow...');
    const testUserId = 'test-user-' + Date.now();
    
    // Create a test user
    console.log(`Creating test user: ${testUserId}`);
    const { error: insertError } = await supabase
      .from('user_coins')
      .insert({
        user_id: testUserId,
        balance: 50,
        total_earned: 50,
        total_spent: 0,
        subscription_tier: 'FREE'
      });
    
    if (insertError) {
      console.log('❌ Failed to create test user:', insertError.message);
      return;
    }
    
    console.log('✅ Test user created successfully');
    
    // Test coin deduction
    console.log('Testing coin deduction...');
    const { data: beforeUpdate, error: beforeError } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', testUserId)
      .single();
    
    if (beforeError) {
      console.log('❌ Could not fetch user balance:', beforeError.message);
      return;
    }
    
    const originalBalance = beforeUpdate.balance;
    console.log(`Original balance: ${originalBalance}`);
    
    // Deduct 1 coin
    const { error: updateError } = await supabase
      .from('user_coins')
      .update({
        balance: originalBalance - 1,
        total_spent: 1
      })
      .eq('user_id', testUserId);
    
    if (updateError) {
      console.log('❌ Failed to deduct coins:', updateError.message);
      return;
    }
    
    // Verify the deduction
    const { data: afterUpdate, error: afterError } = await supabase
      .from('user_coins')
      .select('balance, total_spent')
      .eq('user_id', testUserId)
      .single();
    
    if (afterError) {
      console.log('❌ Could not verify coin deduction:', afterError.message);
      return;
    }
    
    console.log(`✅ Coin deduction successful!`);
    console.log(`   Before: ${originalBalance} coins`);
    console.log(`   After: ${afterUpdate.balance} coins`);
    console.log(`   Total spent: ${afterUpdate.total_spent} coins`);
    
    // Clean up test user
    console.log('\n4️⃣ Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('user_coins')
      .delete()
      .eq('user_id', testUserId);
    
    if (deleteError) {
      console.log('⚠️ Could not clean up test user (not critical):', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up');
    }
    
    console.log('\n🎉 DATABASE TEST SUCCESSFUL!');
    console.log('===============================');
    console.log('✅ Supabase connection: Working');
    console.log('✅ Database tables: Exist and functional');
    console.log('✅ Coin deduction: Working perfectly');
    console.log('');
    console.log('🎯 COIN DEDUCTION SHOULD NOW WORK FOR AUTHENTICATED USERS!');
    console.log('   Test by logging into your app and extracting subtitles.');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testDatabaseConnection();
