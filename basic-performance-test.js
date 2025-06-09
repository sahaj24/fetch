#!/usr/bin/env node

/**
 * Basic Performance Test for FetchSub (bypasses authentication)
 * Tests the core functionality and resource usage
 */

const axios = require('axios');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function findNextjsProcess() {
  try {
    const { stdout } = await execAsync("ps aux | grep 'next-server\\|next dev' | grep -v grep");
    const lines = stdout.trim().split('\n');
    if (lines.length > 0 && lines[0].trim()) {
      const pid = parseInt(lines[0].trim().split(/\s+/)[1]);
      console.log(`🔍 Found Next.js process with PID: ${pid}`);
      return pid;
    }
  } catch (error) {
    console.log('⚠️  Could not find Next.js process. Will monitor system metrics only.');
  }
  return null;
}

async function getResourceUsage(pid) {
  try {
    if (pid) {
      const { stdout } = await execAsync(`ps -p ${pid} -o pid,pcpu,pmem,rss,vsz`);
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\s+/);
        return {
          pid: parseInt(parts[0]),
          cpuPercent: parseFloat(parts[1]),
          memPercent: parseFloat(parts[2]),
          rssMB: Math.round(parseInt(parts[3]) / 1024), // Convert KB to MB
          vszMB: Math.round(parseInt(parts[4]) / 1024)  // Convert KB to MB
        };
      }
    }
  } catch (error) {
    // Process monitoring failed
  }

  // System metrics
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    system: {
      totalMemoryMB: Math.round(totalMem / 1024 / 1024),
      usedMemoryMB: Math.round(usedMem / 1024 / 1024),
      memoryUsagePercent: Math.round((usedMem / totalMem) * 10000) / 100,
      loadAverage: os.loadavg()[0]
    }
  };
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing health endpoint...');
  const start = Date.now();
  
  try {
    const response = await axios.get('http://localhost:3002/api/health', { timeout: 10000 });
    const duration = Date.now() - start;
    
    console.log(`   ✅ Health check successful (${duration}ms)`);
    console.log(`   Status: ${response.status}`);
    return { success: true, duration, status: response.status };
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`   ❌ Health check failed (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function testVideoProcessing() {
  console.log('\n🎥 Testing video processing with anonymous user...');
  const start = Date.now();
  
  try {
    const response = await axios.post('http://localhost:3002/api/youtube/extract', {
      inputType: 'url',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
      formats: ['TXT'],
      language: 'en',
      anonymousId: `test-user-${Date.now()}`
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Anonymous-User': 'true'
      }
    });
    
    const duration = Date.now() - start;
    console.log(`   ✅ Video processing successful (${duration}ms)`);
    console.log(`   Status: ${response.status}`);
    
    if (response.data && response.data.data) {
      console.log(`   Videos processed: ${response.data.data.length}`);
      if (response.data.data[0]) {
        console.log(`   Video title: ${response.data.data[0].videoTitle}`);
        console.log(`   Content length: ${response.data.data[0].content.length} chars`);
      }
    }
    
    return { 
      success: true, 
      duration, 
      status: response.status,
      videoCount: response.data?.data?.length || 0,
      responseSize: JSON.stringify(response.data).length
    };
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`   ❌ Video processing failed (${duration}ms)`);
    console.log(`   Error: ${error.response?.status || 'Network'} - ${error.message}`);
    
    if (error.response?.data) {
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return { 
      success: false, 
      duration, 
      status: error.response?.status || 0,
      error: error.message 
    };
  }
}

async function stressTest(requests = 3) {
  console.log(`\n🔄 Running stress test with ${requests} concurrent requests...`);
  const start = Date.now();
  
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
    'https://www.youtube.com/watch?v=9bZkp7q19f0', // Gangnam Style
    'https://www.youtube.com/watch?v=L_jWHffIx5E'  // All Star
  ];
  
  const promises = testUrls.slice(0, requests).map(async (url, index) => {
    try {
      const response = await axios.post('http://localhost:3002/api/youtube/extract', {
        inputType: 'url',
        url: url,
        formats: ['TXT'],
        language: 'en',
        anonymousId: `stress-test-${index}-${Date.now()}`
      }, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'X-Anonymous-User': 'true'
        }
      });
      
      return {
        success: true,
        status: response.status,
        url: url,
        responseSize: JSON.stringify(response.data).length
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        url: url,
        error: error.message
      };
    }
  });
  
  const results = await Promise.all(promises);
  const duration = Date.now() - start;
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`   ✅ Stress test completed (${duration}ms)`);
  console.log(`   Successful: ${successful}/${requests}`);
  console.log(`   Failed: ${failed}/${requests}`);
  
  return {
    duration,
    totalRequests: requests,
    successful,
    failed,
    results
  };
}

async function monitorResources(durationSeconds = 60) {
  console.log(`\n📊 Monitoring resources for ${durationSeconds} seconds...`);
  
  const pid = await findNextjsProcess();
  const measurements = [];
  const interval = 2; // seconds
  const iterations = Math.floor(durationSeconds / interval);
  
  console.log('\nTime     CPU%   RAM(MB)  SysRAM%  Load');
  console.log('-------------------------------------');
  
  for (let i = 0; i < iterations; i++) {
    const usage = await getResourceUsage(pid);
    const timestamp = new Date().toTimeString().split(' ')[0];
    
    measurements.push({ timestamp, usage });
    
    if (usage.cpuPercent !== undefined) {
      console.log(
        `${timestamp} ${usage.cpuPercent.toString().padStart(4)}%  ` +
        `${usage.rssMB.toString().padStart(6)}   ` +
        `${usage.system?.memoryUsagePercent?.toFixed(1) || 'N/A'}%     ` +
        `${usage.system?.loadAverage?.toFixed(2) || 'N/A'}`
      );
    } else {
      console.log(
        `${timestamp}  N/A   N/A      ` +
        `${usage.system?.memoryUsagePercent?.toFixed(1) || 'N/A'}%     ` +
        `${usage.system?.loadAverage?.toFixed(2) || 'N/A'}`
      );
    }
    
    if (i < iterations - 1) {
      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }
  }
  
  return measurements;
}

async function runBasicPerformanceTest() {
  console.log('🚀 FetchSub Basic Performance Test');
  console.log('=================================');
  
  // System info
  console.log('\n💻 System Information:');
  console.log(`   Platform: ${os.platform()} ${os.arch()}`);
  console.log(`   CPU: ${os.cpus()[0]?.model || 'Unknown'} (${os.cpus().length} cores)`);
  console.log(`   Total Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100} GB`);
  console.log(`   Node.js: ${process.version}`);
  console.log(`   Load Average: ${os.loadavg().map(l => l.toFixed(2)).join(', ')}`);
  
  const results = {};
  
  // Test 1: Health check
  results.health = await testHealthEndpoint();
  
  // Test 2: Single video processing
  results.singleVideo = await testVideoProcessing();
  
  // Test 3: Stress test (if single video worked)
  if (results.singleVideo.success) {
    results.stress = await stressTest(3);
  }
  
  // Test 4: Resource monitoring during idle
  console.log('\n📊 Starting idle resource monitoring...');
  const idleMeasurements = await monitorResources(30);
  
  // Test 5: Resource monitoring during load
  if (results.singleVideo.success) {
    console.log('\n📊 Starting load testing with monitoring...');
    
    // Start monitoring in background
    const monitorPromise = monitorResources(60);
    
    // Add some load
    setTimeout(() => testVideoProcessing(), 5000);
    setTimeout(() => testVideoProcessing(), 15000);
    setTimeout(() => testVideoProcessing(), 25000);
    setTimeout(() => stressTest(2), 35000);
    
    const loadMeasurements = await monitorPromise;
    results.loadMonitoring = loadMeasurements;
  }
  
  // Generate summary
  console.log('\n📈 PERFORMANCE TEST SUMMARY');
  console.log('===========================');
  
  if (results.health.success) {
    console.log(`✅ Health Check: ${results.health.duration}ms`);
  } else {
    console.log(`❌ Health Check: Failed`);
  }
  
  if (results.singleVideo.success) {
    console.log(`✅ Single Video: ${results.singleVideo.duration}ms`);
    console.log(`   Video Count: ${results.singleVideo.videoCount}`);
    console.log(`   Response Size: ${Math.round(results.singleVideo.responseSize / 1024)} KB`);
  } else {
    console.log(`❌ Single Video: Failed - ${results.singleVideo.error}`);
  }
  
  if (results.stress) {
    console.log(`🔄 Stress Test: ${results.stress.successful}/${results.stress.totalRequests} successful`);
    console.log(`   Total Duration: ${results.stress.duration}ms`);
    console.log(`   Avg per request: ${Math.round(results.stress.duration / results.stress.totalRequests)}ms`);
  }
  
  // Resource usage analysis
  const pid = await findNextjsProcess();
  if (pid && idleMeasurements.length > 0) {
    const idleUsage = idleMeasurements
      .filter(m => m.usage.cpuPercent !== undefined)
      .map(m => m.usage);
      
    if (idleUsage.length > 0) {
      const avgCpu = idleUsage.reduce((sum, u) => sum + u.cpuPercent, 0) / idleUsage.length;
      const avgRam = idleUsage.reduce((sum, u) => sum + u.rssMB, 0) / idleUsage.length;
      const maxRam = Math.max(...idleUsage.map(u => u.rssMB));
      const minRam = Math.min(...idleUsage.map(u => u.rssMB));
      
      console.log('\n💾 Resource Usage Analysis:');
      console.log(`   Average CPU: ${avgCpu.toFixed(1)}%`);
      console.log(`   Memory Range: ${minRam} - ${maxRam} MB`);
      console.log(`   Average Memory: ${Math.round(avgRam)} MB`);
      
      console.log('\n🎯 Server Requirements:');
      console.log(`   Minimum RAM: ${Math.max(512, Math.round(maxRam * 1.5))} MB`);
      console.log(`   Recommended RAM: ${Math.max(1024, Math.round(maxRam * 2))} MB`);
      console.log(`   CPU Cores: ${os.cpus().length >= 2 ? '2+' : '1+'} (current: ${os.cpus().length})`);
    }
  }
  
  return results;
}

// Run the test
runBasicPerformanceTest().catch(console.error);
