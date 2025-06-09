#!/usr/bin/env node

/**
 * Production Debug Script for YouTube Transcript Extraction
 * Run this on your production server to diagnose issues
 */

const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

console.log('🔍 Starting Production Environment Debug...\n');

// Test 1: Check Node.js and npm versions
console.log('1. Checking Node.js Environment:');
console.log(`   Node.js version: ${process.version}`);
console.log(`   Platform: ${process.platform}`);
console.log(`   Architecture: ${process.arch}`);
console.log(`   Current working directory: ${process.cwd()}\n`);

// Test 2: Check if yt-dlp is installed and accessible
console.log('2. Testing yt-dlp installation:');
exec('which yt-dlp', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ yt-dlp not found in PATH');
    console.log(`   Error: ${error.message}`);
  } else {
    console.log(`   ✅ yt-dlp found at: ${stdout.trim()}`);
  }
  
  // Test yt-dlp version
  exec('yt-dlp --version', (error, stdout, stderr) => {
    if (error) {
      console.log('   ❌ yt-dlp version check failed');
      console.log(`   Error: ${error.message}`);
    } else {
      console.log(`   ✅ yt-dlp version: ${stdout.trim()}`);
    }
    
    // Test yt-dlp with a simple YouTube video
    testYtDlp();
  });
});

function testYtDlp() {
  console.log('\n3. Testing yt-dlp with YouTube video:');
  const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll - should always be available
  const cmd = `yt-dlp --no-warnings --skip-download --print title -- ${testVideoId}`;
  
  exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.log('   ❌ yt-dlp test failed');
      console.log(`   Error: ${error.message}`);
      console.log(`   Stderr: ${stderr}`);
    } else {
      console.log(`   ✅ yt-dlp working! Title: ${stdout.trim()}`);
    }
    
    testPython();
  });
}

// Test 3: Check Python installation
function testPython() {
  console.log('\n4. Testing Python installation:');
  
  exec('python3 --version', (error, stdout, stderr) => {
    if (error) {
      console.log('   ❌ python3 not found');
      exec('python --version', (error2, stdout2, stderr2) => {
        if (error2) {
          console.log('   ❌ python not found either');
        } else {
          console.log(`   ⚠️  python found: ${stdout2.trim()}`);
        }
        testTempDirectory();
      });
    } else {
      console.log(`   ✅ python3 found: ${stdout.trim()}`);
      testTempDirectory();
    }
  });
}

// Test 4: Check temp directory permissions
function testTempDirectory() {
  console.log('\n5. Testing temp directory access:');
  
  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fetchsub-test-'));
    console.log(`   ✅ Temp directory created: ${tempDir}`);
    
    // Test file creation
    const testFile = path.join(tempDir, 'test.txt');
    fs.writeFileSync(testFile, 'test content');
    console.log('   ✅ File creation successful');
    
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('   ✅ Cleanup successful');
  } catch (error) {
    console.log('   ❌ Temp directory test failed');
    console.log(`   Error: ${error.message}`);
  }
  
  testEnvironmentVariables();
}

// Test 5: Check environment variables
function testEnvironmentVariables() {
  console.log('\n6. Checking environment variables:');
  
  const requiredEnvVars = [
    'NODE_ENV',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Set (${process.env[envVar].substring(0, 10)}...)`);
    } else {
      console.log(`   ⚠️  ${envVar}: Not set`);
    }
  });
  
  testNetworkAccess();
}

// Test 6: Test network access to YouTube
function testNetworkAccess() {
  console.log('\n7. Testing network access to YouTube:');
  
  const https = require('https');
  
  const testUrl = 'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&format=json';
  
  https.get(testUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log(`   ✅ YouTube oEmbed API accessible: ${parsed.title}`);
      } catch (error) {
        console.log('   ❌ YouTube oEmbed API response invalid');
        console.log(`   Response: ${data.substring(0, 100)}...`);
      }
      
      testModuleImports();
    });
  }).on('error', (error) => {
    console.log('   ❌ Network access to YouTube failed');
    console.log(`   Error: ${error.message}`);
    testModuleImports();
  });
}

// Test 7: Test required Node.js modules
function testModuleImports() {
  console.log('\n8. Testing Node.js module imports:');
  
  const requiredModules = [
    'axios',
    'youtube-transcript',
    'csv-parse'
  ];
  
  requiredModules.forEach(moduleName => {
    try {
      require(moduleName);
      console.log(`   ✅ ${moduleName}: Available`);
    } catch (error) {
      console.log(`   ❌ ${moduleName}: Missing or broken`);
      console.log(`   Error: ${error.message}`);
    }
  });
  
  console.log('\n🎯 Debug Summary:');
  console.log('If you see any ❌ errors above, those need to be fixed in your production environment.');
  console.log('\nMost common issues:');
  console.log('1. yt-dlp not installed: pip3 install yt-dlp');
  console.log('2. Python not available: install python3');
  console.log('3. Missing npm packages: npm install');
  console.log('4. Network restrictions blocking YouTube access');
  console.log('\nRun this script on your production server to identify the exact issue.');
}
