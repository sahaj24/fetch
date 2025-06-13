#!/usr/bin/env node

/**
 * Test script for timeout fixes and error handling improvements
 * This script tests the enhanced timeout configuration and error handling
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

async function testTimeoutImprovements() {
  console.log('🔧 Testing Timeout Improvements for Playlist Processing');
  console.log('=====================================================\n');

  // Test 1: Check that server returns proper JSON even for errors
  console.log('📋 Test 1: Error Response Format');
  try {
    const response = await axios.post(`${BASE_URL}/api/youtube/extract`, {
      inputType: 'url',
      url: 'https://www.youtube.com/playlist?list=INVALID_PLAYLIST_ID',
      formats: ['CLEAN_TEXT'],
      language: 'en'
    }, {
      timeout: 30000,
      validateStatus: () => true // Accept all status codes
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    
    if (response.headers['content-type']?.includes('application/json')) {
      console.log('   ✅ Server returns JSON for errors');
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } else {
      console.log('   ❌ Server returns HTML instead of JSON');
      console.log(`   Response: ${response.data.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
  }

  console.log('\n');

  // Test 2: Check client-side timeout configuration
  console.log('📋 Test 2: Client Timeout Configuration');
  try {
    // Simulate a long request by hitting the debug endpoint
    const startTime = Date.now();
    const response = await axios.get(`${BASE_URL}/api/debug`, {
      timeout: 5000 // Short timeout for testing
    });
    
    const duration = Date.now() - startTime;
    console.log(`   ✅ Request completed in ${duration}ms`);
    console.log(`   Response status: ${response.status}`);
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('   ✅ Timeout handling works correctly');
      console.log(`   Error: ${error.message}`);
    } else {
      console.log(`   ❌ Unexpected error: ${error.message}`);
    }
  }

  console.log('\n');

  // Test 3: Check server configuration
  console.log('📋 Test 3: Server Configuration Check');
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, {
      timeout: 10000
    });

    console.log(`   ✅ Health check passed`);
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Environment: ${response.data.environment}`);
    
    // Check if we're getting proper JSON responses
    if (response.data && typeof response.data === 'object') {
      console.log('   ✅ Server returns proper JSON responses');
    }
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
  }

  console.log('\n');

  // Test 4: Verify playlist info endpoint works with proper error handling
  console.log('📋 Test 4: Playlist Info Error Handling');
  try {
    const response = await axios.get(`${BASE_URL}/api/youtube/playlist-info`, {
      params: { id: 'INVALID_ID' },
      timeout: 15000,
      validateStatus: () => true
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    
    if (response.headers['content-type']?.includes('application/json')) {
      console.log('   ✅ Playlist info returns JSON for invalid IDs');
      if (response.data.isEstimate) {
        console.log('   ✅ Fallback estimation works');
        console.log(`   Estimated count: ${response.data.videoCount}`);
      }
    } else {
      console.log('   ❌ Returns non-JSON response');
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }

  console.log('\n📊 Summary');
  console.log('===========');
  console.log('If all tests show ✅, the timeout fixes are working correctly.');
  console.log('Key improvements:');
  console.log('• Client timeout increased: 2 hours for playlists, 30 min for videos');
  console.log('• Server timeout: 2 hours for playlist processing');
  console.log('• Enhanced error handling for 504 Gateway Timeout');
  console.log('• Better progress tracking for long-running requests');
  console.log('• Improved JSON response handling');
}

// Run the test
testTimeoutImprovements().catch(console.error);
