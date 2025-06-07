#!/usr/bin/env node

// Simple test to verify what's happening by testing the actual API endpoints
const https = require('https');
const http = require('http');

async function testAPI() {
  console.log('🔍 Testing Application APIs');
  console.log('============================\n');

  // Test 1: Check if the main page loads
  console.log('1. Testing main page...');
  try {
    const response = await fetch('http://localhost:3000');
    console.log(`✅ Main page status: ${response.status}`);
    
    const html = await response.text();
    
    // Check if state persistence code is present
    if (html.includes('fetchsub_activeTab')) {
      console.log('✅ State persistence code found in HTML');
    } else {
      console.log('❌ State persistence code NOT found in HTML');
    }
    
    // Check if tabs are present
    if (html.includes('Results') && html.includes('Processing')) {
      console.log('✅ Tab structure found');
    } else {
      console.log('❌ Tab structure missing');
    }
    
  } catch (error) {
    console.log(`❌ Main page failed: ${error.message}`);
  }

  // Test 2: Check language API
  console.log('\n2. Testing language API...');
  try {
    const response = await fetch('http://localhost:3000/api/youtube/languages?url=https://www.youtube.com/watch?v=test');
    console.log(`✅ Language API status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Language API returned: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`❌ Language API failed: ${error.message}`);
  }

  // Test 3: Test anonymous extraction (should fail with auth error)
  console.log('\n3. Testing extraction API (anonymous)...');
  try {
    const response = await fetch('http://localhost:3000/api/youtube/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Anonymous-User': 'true'
      },
      body: JSON.stringify({
        inputType: 'url',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        formats: ['CLEAN_TEXT'],
        language: 'en',
        videoCount: 1,
        coinCostEstimate: 1,
        anonymousId: 'test-user'
      })
    });
    
    console.log(`Extract API status: ${response.status}`);
    const data = await response.json();
    console.log(`Extract API response: ${JSON.stringify(data, null, 2)}`);
    
  } catch (error) {
    console.log(`❌ Extract API failed: ${error.message}`);
  }
}

// Add fetch polyfill for Node.js if needed
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options = {}) => {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https:');
      const lib = isHttps ? https : http;
      
      const parsedUrl = new URL(url);
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = lib.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data))
          });
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  };
}

testAPI().catch(console.error);
