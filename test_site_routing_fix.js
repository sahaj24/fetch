#!/usr/bin/env node

/**
 * Comprehensive test for site routing fixes
 * Tests playlist processing with different routing scenarios
 */

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3003';
const API_ENDPOINT = `${BASE_URL}/api/youtube/extract`;

// Test data
const TEST_CASES = {
  SINGLE_VIDEO: {
    inputType: "url",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    formats: ["txt"],
    language: "en"
  },
  SMALL_PLAYLIST: {
    inputType: "url", 
    url: "https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLviYrk7wJNADIZj2F7",
    formats: ["txt"],
    language: "en"
  },
  LARGE_PLAYLIST: {
    inputType: "url",
    url: "https://www.youtube.com/playlist?list=PLmpmyPywZ443PFI8YF3ZMmoEcRO5FvK6N", 
    formats: ["txt"],
    language: "en"
  }
};

// Site routing simulation headers
const ROUTING_SCENARIOS = {
  DIRECT_ACCESS: {
    name: "Direct Access",
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Test-Client/1.0'
    }
  },
  SITE_ROUTED_BASIC: {
    name: "Site Routed (Basic Proxy)",
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Test-Client/1.0',
      'X-Forwarded-For': '192.168.1.100',
      'X-Real-IP': '192.168.1.100',
      'Host': 'yoursite.com'
    }
  },
  SITE_ROUTED_CDN: {
    name: "Site Routed (CDN/Cloudflare)",
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Test-Client/1.0',
      'X-Forwarded-For': '192.168.1.100, 104.16.0.1',
      'X-Real-IP': '192.168.1.100',
      'CF-Ray': '123456789abcdef0-LAX',
      'CF-Connecting-IP': '192.168.1.100',
      'Host': 'yoursite.com',
      'Referer': 'https://yoursite.com/dashboard'
    }
  },
  SITE_ROUTED_NETLIFY: {
    name: "Site Routed (Netlify)",
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Test-Client/1.0',
      'X-Forwarded-For': '192.168.1.100',
      'X-Forwarded-Proto': 'https',
      'X-Country': 'US',
      'Host': 'yoursite.netlify.app',
      'Referer': 'https://yoursite.netlify.app'
    }
  },
  SITE_ROUTED_VERCEL: {
    name: "Site Routed (Vercel)",
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Test-Client/1.0',
      'X-Forwarded-For': '192.168.1.100',
      'X-Forwarded-Host': 'yoursite.vercel.app',
      'X-Vercel-Id': 'sfo1::abcde-1234567890',
      'Host': 'yoursite.vercel.app',
      'Referer': 'https://yoursite.vercel.app'
    }
  }
};

// Test results storage
const testResults = [];

// Utility functions
function formatTime(ms) {
  return `${ms.toFixed(0)}ms`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Main test function
async function runTest(testName, testCase, routingScenario) {
  console.log(`\n🧪 Running test: ${testName} - ${routingScenario.name}`);
  console.log(`📝 URL: ${testCase.url.substring(0, 80)}...`);
  
  const startTime = Date.now();
  
  try {
    // Make the request with specific headers to simulate routing
    const requestBody = {
      ...testCase,
      anonymousId: `test-anonymous-${Date.now()}`
    };
    
    const requestHeaders = {
      ...routingScenario.headers,
      'X-Anonymous-User': 'true'
    };
    
    const response = await axios.post(API_ENDPOINT, requestBody, {
      headers: requestHeaders,
      timeout: 30000, // 30 second timeout
      validateStatus: (status) => status < 500 // Accept 4xx errors
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const result = {
      testName,
      routingScenario: routingScenario.name,
      status: response.status,
      duration,
      success: response.status === 200,
      dataSize: JSON.stringify(response.data).length,
      error: null,
      subtitleCount: 0,
      videoCount: 0,
      errorCount: 0,
      routing_detected: false
    };
    
    // Analyze response data
    if (response.data && Array.isArray(response.data)) {
      result.subtitleCount = response.data.length;
      result.videoCount = Math.ceil(response.data.length / testCase.formats.length);
      result.errorCount = response.data.filter(item => item.error).length;
      
      // Check if routing was properly detected
      const firstItem = response.data[0];
      if (firstItem && firstItem.notice && firstItem.notice.includes('site')) {
        result.routing_detected = true;
      }
    }
    
    console.log(`✅ Success: ${response.status} - ${formatTime(duration)} - ${result.videoCount} videos - ${formatBytes(result.dataSize)}`);
    
    testResults.push(result);
    return result;
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const result = {
      testName,
      routingScenario: routingScenario.name,
      status: error.response?.status || 0,
      duration,
      success: false,
      dataSize: 0,
      error: error.message,
      subtitleCount: 0,
      videoCount: 0,
      errorCount: 1,
      routing_detected: false
    };
    
    console.log(`❌ Failed: ${error.response?.status || 'Network Error'} - ${formatTime(duration)} - ${error.message}`);
    
    testResults.push(result);
    return result;
  }
}

// Performance comparison function
function analyzeResults() {
  console.log(`\n📊 TEST RESULTS ANALYSIS`);
  console.log(`${'='.repeat(80)}`);
  
  // Group results by test case
  const testGroups = {};
  testResults.forEach(result => {
    if (!testGroups[result.testName]) {
      testGroups[result.testName] = [];
    }
    testGroups[result.testName].push(result);
  });
  
  // Analyze each test group
  Object.entries(testGroups).forEach(([testName, results]) => {
    console.log(`\n🎯 ${testName}`);
    console.log(`${'-'.repeat(50)}`);
    
    results.forEach(result => {
      const statusIcon = result.success ? '✅' : '❌';
      const routingIcon = result.routing_detected ? '🔄' : '🔗';
      
      console.log(`${statusIcon} ${routingIcon} ${result.routingScenario.padEnd(25)} | ` +
        `${formatTime(result.duration).padEnd(8)} | ` +
        `${result.videoCount.toString().padEnd(3)} videos | ` +
        `${result.success ? 'SUCCESS' : result.error?.substring(0, 30) || 'FAILED'}`);
    });
    
    // Calculate averages for successful tests
    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
      const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      const avgVideoCount = successful.reduce((sum, r) => sum + r.videoCount, 0) / successful.length;
      
      console.log(`📈 Averages: ${formatTime(avgDuration)} | ${avgVideoCount.toFixed(1)} videos`);
    }
  });
  
  // Site routing effectiveness analysis
  console.log(`\n🔄 SITE ROUTING ANALYSIS`);
  console.log(`${'-'.repeat(50)}`);
  
  const directResults = testResults.filter(r => r.routingScenario === 'Direct Access');
  const routedResults = testResults.filter(r => r.routingScenario !== 'Direct Access');
  
  const directSuccess = directResults.filter(r => r.success).length;
  const routedSuccess = routedResults.filter(r => r.success).length;
  
  console.log(`📍 Direct Access: ${directSuccess}/${directResults.length} successful`);
  console.log(`🌐 Site Routed: ${routedSuccess}/${routedResults.length} successful`);
  
  if (directResults.length > 0 && routedResults.length > 0) {
    const directAvgTime = directResults.filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / directResults.filter(r => r.success).length || 0;
    const routedAvgTime = routedResults.filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / routedResults.filter(r => r.success).length || 0;
    
    if (directAvgTime && routedAvgTime) {
      const timeDiff = routedAvgTime - directAvgTime;
      const timeDiffPercent = ((timeDiff / directAvgTime) * 100).toFixed(1);
      
      console.log(`⏱️  Performance impact: ${timeDiff > 0 ? '+' : ''}${formatTime(timeDiff)} (${timeDiffPercent}%)`);
    }
  }
  
  // Configuration effectiveness
  const routingDetected = testResults.filter(r => r.routing_detected).length;
  const shouldDetectRouting = testResults.filter(r => r.routingScenario !== 'Direct Access').length;
  
  console.log(`🎯 Routing detection: ${routingDetected}/${shouldDetectRouting} correctly identified`);
}

// Main execution
async function main() {
  console.log(`🚀 Starting Site Routing Fix Test Suite`);
  console.log(`📡 Testing against: ${API_ENDPOINT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  
  // Test each case with each routing scenario
  for (const [testName, testCase] of Object.entries(TEST_CASES)) {
    for (const [scenarioKey, scenario] of Object.entries(ROUTING_SCENARIOS)) {
      await runTest(testName, testCase, scenario);
      
      // Add small delay between tests to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Analyze and display results
  analyzeResults();
  
  // Save detailed results
  const resultFile = `site-routing-test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const fs = require('fs');
  fs.writeFileSync(resultFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    testCases: TEST_CASES,
    routingScenarios: ROUTING_SCENARIOS,
    results: testResults,
    summary: {
      totalTests: testResults.length,
      successful: testResults.filter(r => r.success).length,
      failed: testResults.filter(r => !r.success).length,
      routingDetected: testResults.filter(r => r.routing_detected).length
    }
  }, null, 2));
  
  console.log(`\n💾 Detailed results saved to: ${resultFile}`);
  console.log(`\n🏁 Test suite completed at: ${new Date().toISOString()}`);
}

// Run the tests
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runTest, analyzeResults };
