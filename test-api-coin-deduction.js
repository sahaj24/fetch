#!/usr/bin/env node

// Test the YouTube extraction API with coin deduction
const http = require('http'); // Changed from https to http

async function testYouTubeExtraction() {
  console.log('🧪 TESTING YOUTUBE EXTRACTION WITH COIN DEDUCTION\n');

  // Test data
  const testUserId = crypto.randomUUID();
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll for testing
  
  console.log(`1️⃣ Test User ID: ${testUserId}`);
  console.log(`2️⃣ Test URL: ${testUrl}\n`);

  const postData = JSON.stringify({
    url: testUrl,
    inputType: 'url', // Changed from 'single' to 'url'
    formats: ['srt'],
    language: 'en'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/youtube/extract',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'X-Anonymous-User': 'false' // This will require authentication
    }
  };

  return new Promise((resolve, reject) => {
    console.log('3️⃣ Making API request...');
    
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`4️⃣ Response Status: ${res.statusCode}`);
        console.log(`5️⃣ Response Headers:`, res.headers);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('6️⃣ Response Body:', JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            console.log('\n✅ SUCCESS! Extraction completed with coin deduction');
          } else if (res.statusCode === 402) {
            console.log('\n❌ PAYMENT REQUIRED - This means coin deduction is being enforced');
          } else {
            console.log(`\n⚠️  Unexpected status code: ${res.statusCode}`);
          }
          
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          console.log('6️⃣ Response Body (raw):', data);
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Test with different scenarios
async function runTests() {
  try {
    console.log('🎯 SCENARIO 1: New user with automatic coin initialization\n');
    await testYouTubeExtraction();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('🎯 SCENARIO 2: Anonymous user (should be allowed without coins)\n');
    
    const anonPostData = JSON.stringify({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      inputType: 'url', // Changed from 'single' to 'url'
      formats: ['srt'],
      language: 'en',
      anonymousId: 'anonymous-user-test'
    });

    const anonOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/youtube/extract',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(anonPostData),
        'X-Anonymous-User': 'true' // This should allow access without auth
      }
    };

    const anonReq = http.request(anonOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`Anonymous user response status: ${res.statusCode}`);
        try {
          const jsonData = JSON.parse(data);
          console.log('Anonymous user response body:', JSON.stringify(jsonData, null, 2));
        } catch (error) {
          console.log('Anonymous user response body (raw):', data);
        }
        
        if (res.statusCode === 200) {
          console.log('✅ Anonymous users can extract without coins (correct behavior)');
        } else {
          console.log('❌ Anonymous user was blocked (unexpected)');
        }
      });
    });

    anonReq.write(anonPostData);
    anonReq.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();
