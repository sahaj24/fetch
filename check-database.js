const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Using service key for admin access

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('Checking database state...\n');
  
  try {
    // Check if we can connect to user_coins table
    const { data: coins, error: coinsError } = await supabase
      .from('user_coins')
      .select('*')
      .limit(5);
      
    if (coinsError) {
      console.error('❌ Error accessing user_coins table:', coinsError);
    } else {
      console.log('✅ Found', coins.length, 'users in user_coins table:');
      coins.forEach(user => {
        console.log(`  User ID: ${user.user_id}, Balance: ${user.balance}, Tier: ${user.subscription_tier}`);
      });
    }
    
    // Check users table if it exists
    const { data: users, error: usersError } = await supabase
      .from('users') // This might be 'profiles' or similar
      .select('*')
      .limit(5);
      
    if (usersError) {
      console.log('ℹ️ Users table access:', usersError.message);
    } else {
      console.log('\n✅ Found', users.length, 'users in users table');
    }
    
    // Try to create a test user for coin deduction testing
    const testUserId = 'test-user-' + Date.now();
    console.log('\n🔧 Creating test user with ID:', testUserId);
    
    const { data: newUser, error: insertError } = await supabase
      .from('user_coins')
      .insert({
        user_id: testUserId,
        balance: 100,
        total_earned: 100,
        total_spent: 0,
        subscription_tier: 'FREE'
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('❌ Error creating test user:', insertError);
    } else {
      console.log('✅ Test user created:', newUser);
      console.log('\n📋 Use this user ID for testing:');
      console.log(`User ID: ${testUserId}`);
      console.log('Balance: 100 coins');
      
      // Also create a simple auth token for this user (this is a mock, in real app this would come from Supabase Auth)
      console.log('\n📝 For testing, you can manually set the userId in the API or create a test JWT token');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDatabase();
