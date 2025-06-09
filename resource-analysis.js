#!/usr/bin/env node

/**
 * Direct API Load Test for FetchSub
 * Tests specific API endpoints to understand resource usage
 */

const axios = require('axios');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function getNextjsMemoryUsage() {
  try {
    // Get all Node.js processes and find Next.js ones
    const { stdout } = await execAsync("ps aux | grep -E '(next-server|next dev|node.*3002)' | grep -v grep");
    const lines = stdout.trim().split('\n').filter(line => line.trim());
    
    let totalRSS = 0;
    let totalVSZ = 0;
    let processes = [];
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 11) {
        const pid = parseInt(parts[1]);
        const cpu = parseFloat(parts[2]);
        const mem = parseFloat(parts[3]);
        const rss = parseInt(parts[5]); // RSS in KB
        const vsz = parseInt(parts[4]); // VSZ in KB
        
        processes.push({
          pid,
          cpu,
          memPercent: mem,
          rssMB: Math.round(rss / 1024),
          vszMB: Math.round(vsz / 1024),
          command: parts.slice(10).join(' ')
        });
        
        totalRSS += rss;
        totalVSZ += vsz;
      }
    }
    
    return {
      processes,
      totalRSSMB: Math.round(totalRSS / 1024),
      totalVSZMB: Math.round(totalVSZ / 1024),
      processCount: processes.length
    };
  } catch (error) {
    return { processes: [], totalRSSMB: 0, totalVSZMB: 0, processCount: 0 };
  }
}

async function testAPIEndpoints() {
  console.log('🧪 Testing Individual API Endpoints');
  console.log('===================================\n');
  
  const baseUrl = 'http://localhost:3002';
  const results = {};
  
  // Test 1: Health endpoint
  console.log('📊 Test 1: Health Endpoint');
  try {
    const start = Date.now();
    const beforeMem = await getNextjsMemoryUsage();
    
    const response = await axios.get(`${baseUrl}/api/health`, { timeout: 10000 });
    
    const duration = Date.now() - start;
    const afterMem = await getNextjsMemoryUsage();
    
    results.health = {
      success: true,
      duration,
      status: response.status,
      memoryBefore: beforeMem.totalRSSMB,
      memoryAfter: afterMem.totalRSSMB,
      memoryDelta: afterMem.totalRSSMB - beforeMem.totalRSSMB
    };
    
    console.log(`   ✅ Success: ${duration}ms`);
    console.log(`   📊 Memory: ${beforeMem.totalRSSMB}MB → ${afterMem.totalRSSMB}MB (Δ${afterMem.totalRSSMB - beforeMem.totalRSSMB}MB)`);
    
  } catch (error) {
    results.health = { success: false, error: error.message };
    console.log(`   ❌ Failed: ${error.message}`);
  }
  
  // Test 2: YouTube transcript endpoint (direct)
  console.log('\n📊 Test 2: YouTube Transcript API (Direct)');
  try {
    const start = Date.now();
    const beforeMem = await getNextjsMemoryUsage();
    
    // Test the direct transcript endpoint
    const response = await axios.get(`${baseUrl}/api/youtube/transcript`, {
      params: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        format: 'txt',
        language: 'en'
      },
      timeout: 30000
    });
    
    const duration = Date.now() - start;
    const afterMem = await getNextjsMemoryUsage();
    
    results.transcript = {
      success: true,
      duration,
      status: response.status,
      responseSize: JSON.stringify(response.data).length,
      memoryBefore: beforeMem.totalRSSMB,
      memoryAfter: afterMem.totalRSSMB,
      memoryDelta: afterMem.totalRSSMB - beforeMem.totalRSSMB
    };
    
    console.log(`   ✅ Success: ${duration}ms`);
    console.log(`   📊 Memory: ${beforeMem.totalRSSMB}MB → ${afterMem.totalRSSMB}MB (Δ${afterMem.totalRSSMB - beforeMem.totalRSSMB}MB)`);
    console.log(`   📏 Response Size: ${Math.round(response.data.length / 1024)} KB`);
    
  } catch (error) {
    results.transcript = { success: false, error: error.message };
    console.log(`   ❌ Failed: ${error.message}`);
  }
  
  // Test 3: Playlist info endpoint
  console.log('\n📊 Test 3: Playlist Info API');
  try {
    const start = Date.now();
    const beforeMem = await getNextjsMemoryUsage();
    
    const response = await axios.get(`${baseUrl}/api/youtube/playlist-info`, {
      params: {
        id: 'PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP'
      },
      timeout: 20000
    });
    
    const duration = Date.now() - start;
    const afterMem = await getNextjsMemoryUsage();
    
    results.playlistInfo = {
      success: true,
      duration,
      status: response.status,
      videoCount: response.data.videoCount,
      memoryBefore: beforeMem.totalRSSMB,
      memoryAfter: afterMem.totalRSSMB,
      memoryDelta: afterMem.totalRSSMB - beforeMem.totalRSSMB
    };
    
    console.log(`   ✅ Success: ${duration}ms`);
    console.log(`   📊 Memory: ${beforeMem.totalRSSMB}MB → ${afterMem.totalRSSMB}MB (Δ${afterMem.totalRSSMB - beforeMem.totalRSSMB}MB)`);
    console.log(`   📹 Videos Found: ${response.data.videoCount}`);
    
  } catch (error) {
    results.playlistInfo = { success: false, error: error.message };
    console.log(`   ❌ Failed: ${error.message}`);
  }
  
  return results;
}

async function monitorResourcesWhileLoading(durationSeconds = 60) {
  console.log(`\n📊 Monitoring Resources During Load (${durationSeconds}s)`);
  console.log('=============================================\n');
  
  const measurements = [];
  const startTime = Date.now();
  
  // Start monitoring
  const monitoringInterval = setInterval(async () => {
    try {
      const memUsage = await getNextjsMemoryUsage();
      const systemLoad = os.loadavg()[0];
      const timestamp = new Date().toTimeString().split(' ')[0];
      
      measurements.push({
        timestamp,
        elapsed: Math.round((Date.now() - startTime) / 1000),
        memUsage,
        systemLoad
      });
      
      console.log(
        `${timestamp} | ${memUsage.totalRSSMB.toString().padStart(4)}MB | ` +
        `${memUsage.processCount} procs | Load: ${systemLoad.toFixed(2)}`
      );
      
    } catch (error) {
      console.error('Monitoring error:', error.message);
    }
  }, 2000);
  
  // Add some load during monitoring
  setTimeout(async () => {
    console.log('🔥 Adding load: Health checks...');
    for (let i = 0; i < 5; i++) {
      try {
        await axios.get('http://localhost:3002/api/health');
      } catch (e) { /* ignore */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, 5000);
  
  setTimeout(async () => {
    console.log('🔥 Adding load: Transcript requests...');
    const urls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=9bZkp7q19f0'
    ];
    
    for (const url of urls) {
      try {
        await axios.get('http://localhost:3002/api/youtube/transcript', {
          params: { url, format: 'txt', language: 'en' },
          timeout: 30000
        });
      } catch (e) { /* ignore */ }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }, 15000);
  
  // Stop monitoring after duration
  setTimeout(() => {
    clearInterval(monitoringInterval);
    console.log('\n📊 Monitoring completed');
  }, durationSeconds * 1000);
  
  return new Promise(resolve => {
    setTimeout(() => resolve(measurements), durationSeconds * 1000 + 1000);
  });
}

async function analyzeResults(apiResults, monitoringData) {
  console.log('\n📈 RESOURCE USAGE ANALYSIS');
  console.log('=========================\n');
  
  // System Information
  console.log('💻 System Configuration:');
  console.log(`   Platform: ${os.platform()} ${os.arch()}`);
  console.log(`   CPU: ${os.cpus()[0]?.model} (${os.cpus().length} cores)`);
  console.log(`   Total RAM: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`);
  console.log(`   Node.js: ${process.version}`);
  
  // API Performance Analysis
  console.log('\n🚀 API Performance:');
  Object.entries(apiResults).forEach(([endpoint, result]) => {
    if (result.success) {
      console.log(`   ${endpoint}: ${result.duration}ms (Memory: +${result.memoryDelta}MB)`);
    } else {
      console.log(`   ${endpoint}: FAILED`);
    }
  });
  
  // Memory Usage Analysis
  if (monitoringData.length > 0) {
    const memoryValues = monitoringData.map(m => m.memUsage.totalRSSMB);
    const loadValues = monitoringData.map(m => m.systemLoad);
    
    console.log('\n💾 Memory Usage During Load:');
    console.log(`   Baseline: ${memoryValues[0]} MB`);
    console.log(`   Peak: ${Math.max(...memoryValues)} MB`);
    console.log(`   Average: ${Math.round(memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length)} MB`);
    console.log(`   Memory Growth: ${Math.max(...memoryValues) - memoryValues[0]} MB`);
    
    console.log('\n🖥️  System Load:');
    console.log(`   Average Load: ${(loadValues.reduce((a, b) => a + b, 0) / loadValues.length).toFixed(2)}`);
    console.log(`   Peak Load: ${Math.max(...loadValues).toFixed(2)}`);
  }
  
  // Resource Requirements
  const baseMemory = monitoringData.length > 0 ? monitoringData[0].memUsage.totalRSSMB : 1500;
  const peakMemory = monitoringData.length > 0 ? Math.max(...monitoringData.map(m => m.memUsage.totalRSSMB)) : 1600;
  
  console.log('\n🎯 RESOURCE REQUIREMENTS:');
  console.log('========================');
  console.log('\n💾 Memory Requirements:');
  console.log(`   Idle State: ${baseMemory} MB`);
  console.log(`   Under Load: ${peakMemory} MB`);
  console.log(`   Recommended Minimum: ${Math.round(peakMemory * 1.5)} MB`);
  console.log(`   Production Recommended: ${Math.round(peakMemory * 2)} MB`);
  
  console.log('\n🖥️  CPU Requirements:');
  console.log(`   Minimum: 1 vCPU`);
  console.log(`   Recommended: 2+ vCPUs`);
  console.log(`   For Heavy Load: 4+ vCPUs`);
  
  console.log('\n📊 Server Sizing Recommendations:');
  console.log('\n🚀 Development/Testing:');
  console.log(`   CPU: 1-2 vCPUs`);
  console.log(`   RAM: ${Math.max(2048, Math.round(peakMemory * 1.5))} MB`);
  console.log(`   Storage: 5 GB SSD`);
  
  console.log('\n🏢 Production (Light Load):');
  console.log(`   CPU: 2 vCPUs`);
  console.log(`   RAM: ${Math.max(4096, Math.round(peakMemory * 2))} MB`);
  console.log(`   Storage: 10 GB SSD`);
  
  console.log('\n🏭 Production (Heavy Load):');
  console.log(`   CPU: 4+ vCPUs`);
  console.log(`   RAM: ${Math.max(8192, Math.round(peakMemory * 3))} MB`);
  console.log(`   Storage: 20 GB SSD`);
  
  console.log('\n⚡ Performance Characteristics:');
  if (apiResults.health?.success) {
    console.log(`   Health Check: ~${apiResults.health.duration}ms`);
  }
  if (apiResults.transcript?.success) {
    console.log(`   Single Video Processing: ~${apiResults.transcript.duration}ms`);
  }
  if (apiResults.playlistInfo?.success) {
    console.log(`   Playlist Analysis: ~${apiResults.playlistInfo.duration}ms`);
  }
}

async function main() {
  console.log('🚀 FetchSub Resource Usage Analysis');
  console.log('===================================');
  
  // Initial memory check
  const initialMem = await getNextjsMemoryUsage();
  console.log(`\n📊 Initial State: ${initialMem.totalRSSMB} MB (${initialMem.processCount} processes)`);
  
  // Test API endpoints
  const apiResults = await testAPIEndpoints();
  
  // Monitor resources under load
  const monitoringData = await monitorResourcesWhileLoading(45);
  
  // Analyze and present results
  await analyzeResults(apiResults, monitoringData);
}

main().catch(console.error);
