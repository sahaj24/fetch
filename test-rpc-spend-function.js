const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnqnnqibveaxbnmwhehv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucW5ucWlidmVheGJubXdoZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI1MTMsImV4cCI6MjA2MTk5ODUxM30.6hMgQMmiBV2vcnP0vUYUI4qMwPLhws47Jdbb7yiUnJY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSpendFunction() {
  console.log('🧪 Testing spend_user_coins RPC function behavior...\n');
  
  // Test with a fake user ID to see what the function does
  const testUserId = '00000000-0000-0000-0000-000000000001';
  
  try {
    console.log('1️⃣ Creating test user with 100 coins...');
    
    // First add some coins
    const { error: addError } = await supabase.rpc('add_user_coins', {
      p_user_id: testUserId,
      p_amount: 100,
      p_transaction_id: `test_add_${Date.now()}`,
      p_description: 'Test add coins',
      p_created_at: new Date().toISOString()
    });
    
    if (addError) {
      console.log('❌ Error adding coins:', addError.message);
      return;
    }
    
    console.log('✅ Added 100 coins to test user');
    
    // Check balance
    const { data: beforeData } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', testUserId)
      .single();
    
    console.log('💰 Balance before spending:', beforeData?.balance || 'Not found');
    
    console.log('\n2️⃣ Spending 5 coins...');
    
    // Now spend some coins
    const { error: spendError } = await supabase.rpc('spend_user_coins', {
      p_user_id: testUserId,
      p_amount: 5,
      p_transaction_id: `test_spend_${Date.now()}`,
      p_description: 'Test spend coins',
      p_created_at: new Date().toISOString()
    });
    
    if (spendError) {
      console.log('❌ Error spending coins:', spendError.message);
      return;
    }
    
    console.log('✅ Spend operation completed');
    
    // Check balance after
    const { data: afterData } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', testUserId)
      .single();
    
    console.log('💰 Balance after spending:', afterData?.balance || 'Not found');
    
    if (beforeData && afterData) {
      const difference = beforeData.balance - afterData.balance;
      console.log(`📊 Difference: ${difference} coins (expected: 5)`);
      
      if (difference === 5) {
        console.log('🎉 ✅ RPC function working correctly!');
      } else if (difference === -5) {
        console.log('🚨 ❌ RPC function is ADDING coins instead of subtracting!');
      } else {
        console.log('❓ Unexpected behavior');
      }
    }
    
    // Clean up
    console.log('\n3️⃣ Cleaning up test user...');
    await supabase
      .from('user_coins')
      .delete()
      .eq('user_id', testUserId);
    
    await supabase
      .from('coin_transactions')
      .delete()
      .eq('user_id', testUserId);
    
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSpendFunction();
