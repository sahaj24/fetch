// Test script to verify coin deduction functionality
// This script tests the enhanced coin deduction function

const { deductCoinsForOperation } = require('./src/utils/coinUtils.ts');

async function testCoinDeduction() {
  console.log('🧪 Testing Enhanced Coin Deduction Function...\n');
  
  // Test 1: Valid user with sufficient coins
  console.log('Test 1: Valid user with sufficient coins');
  try {
    const result = await deductCoinsForOperation('test-user-1', 'EXTRACT_SUBTITLES', 5);
    console.log('Result:', result);
    console.log('Expected: success=true or detailed error info\n');
  } catch (error) {
    console.log('Error:', error.message, '\n');
  }
  
  // Test 2: User with insufficient coins
  console.log('Test 2: User with insufficient coins');
  try {
    const result = await deductCoinsForOperation('test-user-2', 'EXTRACT_SUBTITLES', 1000);
    console.log('Result:', result);
    console.log('Expected: success=false, errorType=INSUFFICIENT_COINS\n');
  } catch (error) {
    console.log('Error:', error.message, '\n');
  }
  
  // Test 3: Invalid user
  console.log('Test 3: Invalid user');
  try {
    const result = await deductCoinsForOperation('', 'EXTRACT_SUBTITLES', 5);
    console.log('Result:', result);
    console.log('Expected: success=false, errorType=AUTH_ERROR\n');
  } catch (error) {
    console.log('Error:', error.message, '\n');
  }
}

if (require.main === module) {
  testCoinDeduction();
}
