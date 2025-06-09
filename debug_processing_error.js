#!/usr/bin/env node

/**
 * Debug script to identify the "Processing Error" issue
 */

const axios = require('axios');

async function testAPI() {
  console.log('🔍 Debugging Processing Error');
  console.log('=====================================\n');

  // Test data - let's try both a working video and a disabled subtitles video
  const testCases = [
    {
      name: 'Working Video (Kurzgesagt)',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      shouldWork: true
    },
    {
      name: 'Another Working Video (Popular)',
      url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      shouldWork: true
    },
    {
      name: 'Disabled Subtitles Video',
      url: 'https://www.youtube.com/watch?v=MNeHshdyIoE',
      shouldWork: false
    }
  ];

  for (const testCase of testCases) {
    console.log(`📹 Testing: ${testCase.name}`);
    console.log(`🔗 URL: ${testCase.url}\n`);

    try {
      const response = await axios.post('http://localhost:3000/api/youtube/extract', {
        inputType: 'url',
        url: testCase.url,
        formats: ['vtt'],
        language: 'en',
        anonymousId: 'debug-test-user'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Anonymous-User': 'true'
        },
        timeout: 30000,
        validateStatus: function (status) {
          return status < 500; // Accept any status below 500
        }
      });

      console.log(`✅ Response Status: ${response.status}`);
      console.log(`📋 Content-Type: ${response.headers['content-type']}`);
      
      if (response.headers['content-type']?.includes('application/json')) {
        console.log('📄 Response Data:');
        console.log(JSON.stringify(response.data, null, 2));
      } else {
        console.log('❌ Non-JSON Response:');
        console.log(response.data.substring(0, 500) + '...');
      }

    } catch (error) {
      console.log('❌ Request Failed:');
      
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Content-Type: ${error.response.headers['content-type']}`);
        
        if (error.response.headers['content-type']?.includes('application/json')) {
          console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
          console.log('HTML Error Response:', error.response.data.substring(0, 500));
        }
      } else if (error.request) {
        console.log('Network Error:', error.message);
      } else {
        console.log('Error:', error.message);
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');
  }
}

testAPI().catch(console.error);
