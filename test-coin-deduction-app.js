#!/usr/bin/env node

// Test coin deduction in the actual application context
const path = require('path');

// Add the src directory to the module resolution path
require('module-alias/register');
require('module-alias').addAlias('@', path.join(__dirname, 'src'));

// Import the actual coin utils
const { deductCoinsForOperation } = require('./src/utils/coinUtils.ts');

async function testCoinDeduction() {
  console.log('🧪 TESTING COIN DEDUCTION WITH ACTUAL IMPLEMENTATION\n');

  // Generate a test user ID (UUID format)
  const testUserId = crypto.randomUUID();
  console.log(`1️⃣ Test User ID (UUID): ${testUserId}\n`);

  try {
    console.log('2️⃣ Testing coin deduction for subtitle extraction...');
    
    const result = await deductCoinsForOperation(testUserId, 'EXTRACT_SUBTITLES', 3);
    
    if (result.success) {
      console.log('✅ Coin deduction successful!');
      console.log('📊 Result:', result);
    } else {
      console.log('❌ Coin deduction failed:');
      console.log('📊 Error details:', result);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testCoinDeduction();
