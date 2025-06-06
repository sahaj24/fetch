const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthenticatedCoinDeduction() {
  console.log('🧪 Testing authenticated user coin deduction flow...\n');
  
  try {
    // Step 1: Create a test user with proper UUID format
    const testUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Valid UUID format
    console.log(`1️⃣ Setting up test user: ${testUserId}`);
    
    // Step 2: Ensure user has coins (create or update)
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', fetchError);
      return;
    }
    
    if (!existingUser) {
      console.log('📝 Creating new user with 100 coins...');
      const { error: insertError } = await supabase
        .from('user_coins')
        .insert({
          user_id: testUserId,
          balance: 100,
          total_earned: 100,
          total_spent: 0,
          subscription_tier: 'FREE'
        });
      
      if (insertError) {
        console.error('❌ Failed to create user:', insertError);
        return;
      }
      console.log('✅ User created successfully');
    } else {
      console.log(`✅ User exists with ${existingUser.balance} coins`);
    }
    
    // Step 3: Get initial balance
    const { data: initialBalance } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', testUserId)
      .single();
    
    console.log(`💰 Initial balance: ${initialBalance?.balance} coins\n`);
    
    // Step 4: Create a mock JWT token for testing
    // Note: This is a fake token for testing purposes only
    const mockToken = 'Bearer fake-jwt-token-for-testing';
    
    // Step 5: Test the YouTube extraction endpoint with authentication
    console.log('📤 Making authenticated request to YouTube extraction API...');
    
    const response = await fetch('http://localhost:3000/api/youtube/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': mockToken,
        'x-user-id': testUserId // Pass user ID directly for testing
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        formats: ['txt'],
        language: 'auto'
      })
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Status Text: ${response.statusText}`);
    
    if (response.status === 200) {
      console.log('✅ Request successful!');
      const result = await response.text();
      console.log(`📋 Response length: ${result.length} characters`);
      
      // Step 6: Check final balance
      const { data: finalBalance } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', testUserId)
        .single();
      
      console.log(`\n💰 Final balance: ${finalBalance?.balance} coins`);
      console.log(`📉 Coins deducted: ${initialBalance?.balance - finalBalance?.balance}`);
      
      if (initialBalance?.balance > finalBalance?.balance) {
        console.log('🎉 SUCCESS: Coins were properly deducted!');
      } else {
        console.log('⚠️  WARNING: No coins were deducted - checking if this is expected...');
      }
      
    } else if (response.status === 401) {
      console.log('🔒 Authentication failed (expected with fake token)');
      const errorText = await response.text();
      console.log(`📋 Error response: ${errorText}`);
      
    } else if (response.status === 402) {
      console.log('💳 Payment required - insufficient coins');
      const errorText = await response.text();
      console.log(`📋 Error response: ${errorText}`);
      
    } else {
      console.log('❌ Unexpected response');
      const errorText = await response.text();
      console.log(`📋 Error response: ${errorText}`);
    }
    
    // Step 7: Check transaction history
    console.log('\n📜 Checking transaction history...');
    const { data: transactions, error: txError } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (txError) {
      console.log('⚠️ No transaction history table or error:', txError.message);
    } else if (transactions && transactions.length > 0) {
      console.log(`📊 Found ${transactions.length} recent transactions:`);
      transactions.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.operation_type}: ${tx.amount} coins (${tx.created_at})`);
      });
    } else {
      console.log('📊 No transactions found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAuthenticatedCoinDeduction();
