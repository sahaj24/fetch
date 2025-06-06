#!/usr/bin/env node

// Simple test to check YouTube extraction coin deduction logic
const fetch = require('node-fetch');

async function testYouTubeExtraction() {
  console.log('🧪 Testing YouTube Extraction Coin Deduction...\n');
  
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll - short video
  const anonymousUserId = `anonymous-${Date.now()}`;
  
  try {
    console.log(`Testing with anonymous user ID: ${anonymousUserId}`);
    
    const response = await fetch('http://localhost:3000/api/youtube/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Anonymous-User': 'true'
      },
      body: JSON.stringify({
        inputType: 'url',
        url: testUrl,
        language: 'en',
        formats: ['CLEAN_TEXT'],
        coinCostEstimate: 1,
        anonymousId: anonymousUserId
      })
    });
    
    const result = await response.json();
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Headers:', Object.fromEntries(response.headers));
    console.log('✅ Response Data Keys:', Object.keys(result));
    
    if (result.subtitles && result.subtitles.length > 0) {
      console.log('✅ Extraction successful - received subtitles');
    } else {
      console.log('❌ No subtitles received');
    }
    
    if (result.error) {
      console.log('❌ Error in response:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testYouTubeExtraction();
