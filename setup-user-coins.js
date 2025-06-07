const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔗 Connecting to Supabase...');
console.log('URL:', supabaseUrl ? 'Set ✓' : 'Missing ✗');
console.log('Key:', supabaseKey ? 'Set ✓' : 'Missing ✗');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTable() {
  try {
    console.log('📋 Checking if user_coins table exists...');
    
    // First test if we can connect
    const { data: testData, error: testError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log('⚠️ Connection test failed:', testError.message);
    } else {
      console.log('✅ Supabase connection works!');
    }
    
    // Try to query the user_coins table
    const { data, error } = await supabase
      .from('user_coins')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') { // table does not exist
        console.log('🔧 Table does not exist, creating...');
        
        // Read SQL file and execute
        const sqlContent = fs.readFileSync(path.join(__dirname, 'create-user-coins-table.sql'), 'utf8');
        
        // Note: This won't work with anon key, need service role key
        console.log('📝 SQL to execute:');
        console.log(sqlContent);
        console.log('\n❗ Please run this SQL in your Supabase dashboard SQL editor!');
        
      } else {
        console.error('❌ Error checking table:', error);
      }
    } else {
      console.log('✅ user_coins table exists!', data);
    }
    
    console.log('🎯 Setup complete! If the table doesn\'t exist, run the SQL from create-user-coins-table.sql in your Supabase dashboard.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setupTable();
