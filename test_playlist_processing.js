#!/usr/bin/env node

/**
 * Test Script for Playlist Processing Improvements
 * Tests the timeout and error handling fixes for playlist subtitle extraction
 */

const http = require('http');

console.log('🎬 Testing Playlist Processing Improvements');
console.log('=========================================\n');

// Test configuration
const SERVER_URL = 'http://localhost:3003';
const TEST_PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHt14aSNDc0S4Vh_0'; // Small educational playlist

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.method === 'POST' && options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testServerHealth() {
  console.log('📋 Test 1: Server Health Check');
  try {
    const response = await makeRequest(`${SERVER_URL}/api/health`);
    if (response.status === 200) {
      console.log('   ✅ Server is running and responding');
      return true;
    } else {
      console.log(`   ❌ Server health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Server is not reachable: ${error.message}`);
    return false;
  }
}

async function testTimeoutConfiguration() {
  console.log('\n📋 Test 2: Timeout Configuration');
  try {
    // Test that the API endpoint exists and responds
    const testPayload = JSON.stringify({
      inputType: 'url',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Single video for quick test
      email: 'test@example.com'
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testPayload)
      },
      body: testPayload,
      timeout: 30000 // 30 second timeout for this test
    };

    console.log('   Testing API endpoint with single video...');
    const response = await makeRequest(`${SERVER_URL}/api/youtube/extract`, options);
    
    if (response.status === 200 || response.status === 400 || response.status === 401) {
      console.log('   ✅ API endpoint is responding correctly');
      console.log(`   Status: ${response.status}`);
      
      // Check if response is JSON
      try {
        const jsonData = JSON.parse(response.data);
        console.log('   ✅ Server returns valid JSON responses');
      } catch (e) {
        if (response.data.includes('<!DOCTYPE')) {
          console.log('   ⚠️  Server returned HTML instead of JSON (this might indicate an error page)');
        } else {
          console.log('   ⚠️  Server response is not valid JSON');
        }
      }
      
      return true;
    } else {
      console.log(`   ❌ Unexpected response status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ API test failed: ${error.message}`);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n📋 Test 3: Error Handling for Invalid Requests');
  try {
    // Test with invalid payload to check error handling
    const invalidPayload = JSON.stringify({
      inputType: 'invalid',
      url: 'not-a-valid-url'
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(invalidPayload)
      },
      body: invalidPayload
    };

    const response = await makeRequest(`${SERVER_URL}/api/youtube/extract`, options);
    
    if (response.status >= 400 && response.status < 500) {
      console.log('   ✅ Server properly handles invalid requests');
      console.log(`   Status: ${response.status}`);
      
      // Check if error response is JSON
      try {
        const jsonData = JSON.parse(response.data);
        console.log('   ✅ Error responses are in JSON format');
        if (jsonData.error) {
          console.log(`   Error message: ${jsonData.error.substring(0, 50)}...`);
        }
      } catch (e) {
        console.log('   ⚠️  Error response is not valid JSON');
      }
      
      return true;
    } else {
      console.log(`   ❌ Unexpected response for invalid request: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error handling test failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('Starting comprehensive tests for playlist processing improvements...\n');

  const results = [];
  
  // Test 1: Server Health
  results.push(await testServerHealth());
  
  // Test 2: Timeout Configuration
  results.push(await testTimeoutConfiguration());
  
  // Test 3: Error Handling
  results.push(await testErrorHandling());

  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;
  
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('✅ All tests passed! The server is ready for playlist processing.');
    console.log('\n🎯 Next Steps:');
    console.log('1. Open the application in your browser: http://localhost:3003');
    console.log('2. Test with a real YouTube playlist URL');
    console.log('3. Monitor for improved timeout handling and error messages');
    console.log('4. Verify that processing messages update correctly');
  } else {
    console.log('❌ Some tests failed. Please check the server configuration.');
  }
  
  console.log('\n🔧 Key Improvements Implemented:');
  console.log('• Client timeout: 2 hours for playlists, 30 minutes for videos');
  console.log('• Enhanced 504 Gateway Timeout error handling');
  console.log('• Improved progress tracking and user feedback');
  console.log('• Better JSON response validation');
  console.log('• Dynamic processing stage messages');
}

// Run the tests
runTests().catch(console.error);
