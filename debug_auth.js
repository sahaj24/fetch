#!/usr/bin/env node

/**
 * Debug script to see actual 402 error responses
 */

const axios = require('axios');

const API_ENDPOINT = 'http://localhost:3003/api/youtube/extract';

async function debugAuth() {
  console.log('🔍 Debugging Authentication Issues');
  console.log(`📡 Testing against: ${API_ENDPOINT}`);
  
  const requestBody = {
    inputType: "url",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    formats: ["txt"],
    language: "en",
    anonymousId: `test-anonymous-${Date.now()}`
  };
  
  const requestHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Test-Client/1.0',
    'X-Anonymous-User': 'true'
  };
  
  console.log('\n📦 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  
  console.log('\n📋 Request Headers:');
  console.log(JSON.stringify(requestHeaders, null, 2));
  
  try {
    const response = await axios.post(API_ENDPOINT, requestBody, {
      headers: requestHeaders,
      timeout: 30000,
      validateStatus: () => true // Accept all status codes
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    console.log('📄 Response Headers:');
    console.log(JSON.stringify(response.headers, null, 2));
    
    console.log('\n📝 Response Body:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    if (error.response) {
      console.log(`📊 Error Status: ${error.response.status}`);
      console.log('📝 Error Response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugAuth().catch(console.error);
