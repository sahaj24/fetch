// Test script to authenticate and test coin deduction with real token
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test credentials (you'll need to update these with valid credentials)
// UPDATE THESE WITH YOUR REAL CREDENTIALS FOR TESTING:
const TEST_EMAIL = 'YOUR_EMAIL@example.com';  // Replace with your email
const TEST_PASSWORD = 'YOUR_PASSWORD';         // Replace with your password

async function testWithRealAuth() {
  console.log('🔐 TESTING COIN DEDUCTION WITH REAL AUTHENTICATION\n');
  
  // Check if credentials are updated
  if (TEST_EMAIL === 'YOUR_EMAIL@example.com' || TEST_PASSWORD === 'YOUR_PASSWORD') {
    console.log('❌ Please update TEST_EMAIL and TEST_PASSWORD in the script with your real credentials');
    console.log('📝 Open test-real-auth-coin-deduction.js and replace:');
    console.log('   - YOUR_EMAIL@example.com with your actual email');
    console.log('   - YOUR_PASSWORD with your actual password');
    console.log('\n💡 Make sure your account is confirmed and has some coins!');
    return;
  }
  
  try {
    console.log('1️⃣ Signing in with your credentials...');
    
    // Sign in with provided credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (error) {
      console.error('❌ Sign-in failed:', error.message);
      console.log('\n💡 Troubleshooting:');
      console.log('   - Make sure your email is confirmed');
      console.log('   - Check your password is correct');
      console.log('   - Make sure you have an account at https://fetch-sub.vercel.app/');
      return;
    }
    
    if (!data.session || !data.user) {
      console.error('❌ No session or user data after authentication');
      return;
    }
    
    console.log('✅ Successfully authenticated!');
    console.log('👤 User ID:', data.user.id);
    console.log('📧 Email:', data.user.email);
    console.log('🎫 Access Token:', data.session.access_token.substring(0, 20) + '...');
    
    // Check user coins before the operation
    console.log('\n2️⃣ Checking your coin balance BEFORE operation...');
    const { data: coinsBefore, error: coinsBeforeError } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', data.user.id)
      .single();
    
    if (coinsBeforeError) {
      console.log('⚠️ Could not fetch coins before operation:', coinsBeforeError.message);
      console.log('💡 This might mean you need to add coins to your account first');
    } else {
      console.log('💰 Your coin balance BEFORE extraction:', coinsBefore.balance);
      
      if (coinsBefore.balance < 1) {
        console.log('❌ Insufficient coins! You need at least 1 coin to test');
        console.log('💡 Please add coins to your account and try again');
        return;
      }
    }
    
    // Test the API with real authentication
    console.log('\n3️⃣ Testing YouTube extraction API with authentication...');
    
    const response = await fetch('http://localhost:3002/api/youtube/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({
        inputType: 'url',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        formats: ['srt'],
        language: 'en',
        coinCostEstimate: 1
      })
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers));
    
    const result = await response.json();
    console.log('\n📄 Full API Response:');
    console.log(JSON.stringify(result, null, 2));
    
    if (response.status === 200) {
      console.log('\n✅ API call successful!');
      console.log('📝 Subtitles received:', result.subtitles?.length || 0);
      console.log('📊 Processing stats:', result.stats);
      console.log('💰 Coin deduction result:', result.coinDeductionResult);
      
      // Check user coins after the operation
      console.log('\n4️⃣ Checking your coin balance AFTER operation...');
      
      const { data: coinsAfter, error: coinsAfterError } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', data.user.id)
        .single();
      
      if (coinsAfterError) {
        console.log('⚠️ Could not fetch coins after operation:', coinsAfterError.message);
      } else {
        console.log('💰 Your coin balance AFTER extraction:', coinsAfter.balance);
        
        if (coinsBefore && coinsAfter) {
          const difference = coinsBefore.balance - coinsAfter.balance;
          console.log('📉 Coins deducted:', difference);
          
          if (difference === 1) {
            console.log('🎉 ✅ COIN DEDUCTION WORKING CORRECTLY!');
            console.log('🔧 The authenticated coin deduction system is functioning properly!');
          } else if (difference === 0) {
            console.log('⚠️ NO COINS WERE DEDUCTED - SYSTEM ISSUE DETECTED');
            console.log('🔧 This indicates a problem with the coin deduction logic');
          } else {
            console.log('❓ UNEXPECTED COIN CHANGE - INVESTIGATE FURTHER');
            console.log(`🔧 Expected 1 coin deduction, got ${difference}`);
          }
        }
      }
      
    } else {
      console.log('\n❌ API call failed');
      console.log('🔍 Error details:', result);
      
      if (response.status === 402) {
        console.log('💳 Payment required - insufficient coins');
      } else if (response.status === 401) {
        console.log('🔐 Authentication failed');
      } else if (response.status === 400) {
        console.log('📝 Bad request - check input parameters');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('🔍 Full error:', error);
  } finally {
    // Sign out
    await supabase.auth.signOut();
    console.log('\n🚪 Signed out');
  }
}

testWithRealAuth();
