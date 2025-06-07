const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
const envPath = path.join(__dirname, '.env');
let supabaseUrl = null;
let supabaseKey = null;

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
  console.error('❌ Could not read .env file:', error.message);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 Checking user_coins table structure...\n');
  
  // Method 1: Try to get table info by selecting all columns from an empty result
  try {
    const { data, error } = await supabase
      .from('user_coins')
      .select('*')
      .limit(0);
    
    if (error) {
      console.log('❌ Error accessing table:', error);
    } else {
      console.log('✅ Table accessible, but schema not visible from this query');
    }
  } catch (error) {
    console.log('❌ Table access error:', error);
  }
  
  // Method 2: Try to insert a minimal record to see what's required
  console.log('\n🧪 Testing minimal insert to understand schema...');
  const testUserId = '12345678-1234-1234-1234-123456789012';
  
  try {
    const { data, error } = await supabase
      .from('user_coins')
      .insert({ 
        user_id: testUserId, 
        balance: 50
      })
      .select();
    
    if (error) {
      console.log('❌ Insert error (expected):', error);
      if (error.message.includes('duplicate key')) {
        console.log('✅ User already exists - that\'s fine');
      }
    } else {
      console.log('✅ Insert successful:', data);
      
      // Clean up
      await supabase
        .from('user_coins')
        .delete()
        .eq('user_id', testUserId);
      console.log('🧹 Cleaned up test record');
    }
  } catch (error) {
    console.log('❌ Insert test error:', error);
  }
  
  // Method 3: Check if there are any existing records to see the structure
  console.log('\n📊 Checking existing records...');
  try {
    const { data, error } = await supabase
      .from('user_coins')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error fetching records:', error);
    } else {
      if (data && data.length > 0) {
        console.log('✅ Sample record structure:', Object.keys(data[0]));
        console.log('Sample record:', data[0]);
      } else {
        console.log('📋 No existing records found');
      }
    }
  } catch (error) {
    console.log('❌ Records fetch error:', error);
  }
}

checkTableStructure();
