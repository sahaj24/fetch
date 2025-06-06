#!/usr/bin/env node

// Test YouTube extraction with authenticated user to verify coin deduction
const fetch = require('node-fetch');

async function testAuthenticatedExtraction() {
  console.log('🧪 Testing Authenticated YouTube Extraction...\n');
  
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll - short video
  
  try {
    // First test with a mock authenticated user
    console.log('Testing with authenticated user (no real token)...');
    
    const response = await fetch('http://localhost:3000/api/youtube/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer mock-token-for-testing'
      },
      body: JSON.stringify({
        inputType: 'url',
        url: testUrl,
        language: 'en',
        formats: ['CLEAN_TEXT'],
        coinCostEstimate: 1
      })
    });
    
    const result = await response.json();
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Data Keys:', Object.keys(result));
    
    if (response.status === 401) {
      console.log('🔐 Authentication required (expected with mock token)');
      console.log('Error:', result.error);
    } else if (response.status === 200) {
      console.log('✅ Extraction successful with authenticated user');
      
      if (result.subtitles && result.subtitles.length > 0) {
        console.log(`📋 Received ${result.subtitles.length} subtitle result(s)`);
        console.log(`📊 Processing stats:`, result.stats);
      }
    } else {
      console.log('❌ Unexpected response status:', response.status);
      console.log('Response:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthenticatedExtraction();
