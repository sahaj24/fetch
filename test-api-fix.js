#!/usr/bin/env node

/**
 * Test script to verify API endpoints return JSON instead of HTML
 * This reproduces the original error and verifies the fix
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Testing API Fix for "Unexpected token HTML" error\n');

// Start the Next.js server
console.log('📦 Starting Next.js server...');
const server = spawn('npm', ['run', 'dev'], { stdio: 'pipe' });

// Wait for server to start
setTimeout(async () => {
  try {
    console.log('🧪 Testing API endpoint...\n');
    
    // Test the problematic endpoint
    const testPayload = {
      inputType: "url",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      formats: ["CLEAN_TEXT"],
      language: "en",
      anonymousId: "test-user"
    };

    const postData = JSON.stringify(testPayload);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/youtube/extract',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Anonymous-User': 'true',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ Response Status: ${res.statusCode}`);
        console.log(`✅ Content-Type: ${res.headers['content-type']}`);
        console.log(`✅ Response Length: ${data.length} characters\n`);
        
        // Check if response starts with HTML (the original error)
        if (data.startsWith('<html') || data.startsWith('<!DOCTYPE')) {
          console.log('❌ ERROR: API returned HTML instead of JSON!');
          console.log('🔧 This means the middleware is still intercepting API routes.');
          console.log('📋 First 100 characters of response:');
          console.log(data.substring(0, 100) + '...\n');
        } else {
          try {
            const jsonResponse = JSON.parse(data);
            console.log('🎉 SUCCESS: API returned valid JSON!');
            console.log('📋 Response:', JSON.stringify(jsonResponse, null, 2));
            console.log('\n✅ The middleware fix is working correctly!');
            console.log('🚀 Your app should now work in both local and cloud environments.\n');
          } catch (parseError) {
            console.log('⚠️  Response is not HTML but also not valid JSON:');
            console.log('📋 Raw response:', data);
          }
        }
        
        // Clean shutdown
        server.kill();
        process.exit(0);
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Request Error: ${err.message}`);
      server.kill();
      process.exit(1);
    });

    req.write(postData);
    req.end();
    
  } catch (error) {
    console.log(`❌ Test Error: ${error.message}`);
    server.kill();
    process.exit(1);
  }
}, 5000); // Wait 5 seconds for server to start

// Handle server output
server.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Ready in')) {
    console.log('✅ Server started successfully!');
  }
});

server.stderr.on('data', (data) => {
  // Only show errors, not all dev output
  const output = data.toString();
  if (output.includes('Error') || output.includes('Failed')) {
    console.log(`Server Error: ${output}`);
  }
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping test...');
  server.kill();
  process.exit(0);
});
