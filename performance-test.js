#!/usr/bin/env node

/**
 * Comprehensive Performance Testing Suite for FetchSub YouTube Subtitle Extractor
 * Tests CPU and RAM usage under various load conditions
 */

const axios = require('axios');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class PerformanceMonitor {
  constructor() {
    this.measurements = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.processId = null;
  }

  startMonitoring(processId) {
    this.processId = processId;
    this.isMonitoring = true;
    this.measurements = [];
    
    console.log(`📊 Starting performance monitoring for PID: ${processId}`);
    
    this.monitoringInterval = setInterval(async () => {
      if (!this.isMonitoring) return;
      
      try {
        const measurement = await this.getMeasurement();
        this.measurements.push(measurement);
      } catch (error) {
        console.error('Error taking measurement:', error.message);
      }
    }, 1000); // Take measurement every second
  }

  async getMeasurement() {
    const timestamp = Date.now();
    
    // System-wide metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;
    
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Process-specific metrics (if we have a PID)
    let processMetrics = null;
    if (this.processId) {
      try {
        // Use ps command to get process-specific metrics
        const { stdout } = await execAsync(`ps -p ${this.processId} -o pid,pcpu,pmem,rss,vsz,time`);
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].trim().split(/\s+/);
          processMetrics = {
            pid: parseInt(parts[0]),
            cpuPercent: parseFloat(parts[1]),
            memPercent: parseFloat(parts[2]),
            rss: parseInt(parts[3]), // Resident Set Size in KB
            vsz: parseInt(parts[4]), // Virtual Size in KB
            time: parts[5]
          };
        }
      } catch (error) {
        // Process might not exist or ps command failed
      }
    }

    return {
      timestamp,
      system: {
        totalMemoryMB: Math.round(totalMem / 1024 / 1024),
        freeMemoryMB: Math.round(freeMem / 1024 / 1024),
        usedMemoryMB: Math.round(usedMem / 1024 / 1024),
        memoryUsagePercent: Math.round(memUsagePercent * 100) / 100,
        cpuCount: cpus.length,
        loadAverage: {
          '1min': Math.round(loadAvg[0] * 100) / 100,
          '5min': Math.round(loadAvg[1] * 100) / 100,
          '15min': Math.round(loadAvg[2] * 100) / 100
        }
      },
      process: processMetrics
    };
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log(`📊 Stopped performance monitoring. Collected ${this.measurements.length} measurements.`);
  }

  getStats() {
    if (this.measurements.length === 0) {
      return null;
    }

    const systemMemoryMB = this.measurements.map(m => m.system.usedMemoryMB);
    const systemCpuLoad = this.measurements.map(m => m.system.loadAverage['1min']);
    
    const processMetrics = this.measurements
      .filter(m => m.process)
      .map(m => m.process);

    const stats = {
      duration: this.measurements.length,
      system: {
        memory: {
          minMB: Math.min(...systemMemoryMB),
          maxMB: Math.max(...systemMemoryMB),
          avgMB: Math.round(systemMemoryMB.reduce((a, b) => a + b, 0) / systemMemoryMB.length),
          totalSystemMB: this.measurements[0].system.totalMemoryMB
        },
        cpu: {
          minLoad: Math.min(...systemCpuLoad),
          maxLoad: Math.max(...systemCpuLoad),
          avgLoad: Math.round(systemCpuLoad.reduce((a, b) => a + b, 0) * 100 / systemCpuLoad.length) / 100,
          cores: this.measurements[0].system.cpuCount
        }
      }
    };

    if (processMetrics.length > 0) {
      const processCpu = processMetrics.map(p => p.cpuPercent);
      const processMemMB = processMetrics.map(p => p.rss / 1024); // Convert KB to MB
      const processMemPercent = processMetrics.map(p => p.memPercent);

      stats.process = {
        cpu: {
          minPercent: Math.min(...processCpu),
          maxPercent: Math.max(...processCpu),
          avgPercent: Math.round(processCpu.reduce((a, b) => a + b, 0) * 100 / processCpu.length) / 100
        },
        memory: {
          minMB: Math.round(Math.min(...processMemMB) * 100) / 100,
          maxMB: Math.round(Math.max(...processMemMB) * 100) / 100,
          avgMB: Math.round(processMemMB.reduce((a, b) => a + b, 0) * 100 / processMemMB.length) / 100,
          minPercent: Math.min(...processMemPercent),
          maxPercent: Math.max(...processMemPercent),
          avgPercent: Math.round(processMemPercent.reduce((a, b) => a + b, 0) * 100 / processMemPercent.length) / 100
        }
      };
    }

    return stats;
  }

  saveReport(filename, testResults) {
    const report = {
      timestamp: new Date().toISOString(),
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
        cpuCount: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        nodeVersion: process.version
      },
      testResults,
      rawMeasurements: this.measurements
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`📄 Performance report saved to: ${filename}`);
  }
}

class LoadTester {
  constructor(baseUrl = 'http://localhost:3002') {
    this.baseUrl = baseUrl;
    this.monitor = new PerformanceMonitor();
  }

  async findNextjsProcess() {
    try {
      const { stdout } = await execAsync("ps aux | grep 'next-server' | grep -v grep");
      const lines = stdout.trim().split('\n');
      if (lines.length > 0 && lines[0].trim()) {
        const pid = parseInt(lines[0].trim().split(/\s+/)[1]);
        console.log(`🔍 Found Next.js process with PID: ${pid}`);
        return pid;
      }
    } catch (error) {
      console.log('⚠️  Could not find Next.js process. Process-specific metrics will not be available.');
    }
    return null;
  }

  async testSingleVideo(videoUrl, formats = ['TXT']) {
    console.log(`\n🎥 Testing single video: ${videoUrl}`);
    console.log(`📝 Formats: ${formats.join(', ')}`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${this.baseUrl}/api/youtube/extract`, {
        inputType: 'url',
        url: videoUrl,
        formats: formats,
        language: 'en',
        anonymousId: `test-user-${Date.now()}`
      }, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'X-Anonymous-User': 'true'
        }
      });

      const duration = Date.now() - startTime;
      const success = response.status === 200 && response.data.success;
      
      return {
        success,
        duration,
        status: response.status,
        videoCount: success ? response.data.data.length / formats.length : 0,
        responseSize: JSON.stringify(response.data).length,
        error: success ? null : response.data.error
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        duration,
        status: error.response?.status || 0,
        videoCount: 0,
        responseSize: 0,
        error: error.message
      };
    }
  }

  async testPlaylist(playlistUrl, formats = ['TXT']) {
    console.log(`\n📋 Testing playlist: ${playlistUrl}`);
    console.log(`📝 Formats: ${formats.join(', ')}`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${this.baseUrl}/api/youtube/extract`, {
        inputType: 'url',
        url: playlistUrl,
        formats: formats,
        language: 'en',
        anonymousId: `test-user-${Date.now()}`
      }, {
        timeout: 300000, // 5 minutes for playlists
        headers: {
          'Content-Type': 'application/json',
          'X-Anonymous-User': 'true'
        }
      });

      const duration = Date.now() - startTime;
      const success = response.status === 200 && response.data.success;
      
      return {
        success,
        duration,
        status: response.status,
        videoCount: success ? Math.ceil(response.data.data.length / formats.length) : 0,
        responseSize: JSON.stringify(response.data).length,
        error: success ? null : response.data.error
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        duration,
        status: error.response?.status || 0,
        videoCount: 0,
        responseSize: 0,
        error: error.message
      };
    }
  }

  async testConcurrentRequests(videoUrls, concurrency = 3) {
    console.log(`\n🔄 Testing ${concurrency} concurrent requests with ${videoUrls.length} videos`);
    
    const promises = videoUrls.slice(0, concurrency).map((url, index) => 
      this.testSingleVideo(url, ['TXT']).catch(error => ({
        success: false,
        duration: 0,
        error: error.message,
        index
      }))
    );

    const results = await Promise.all(promises);
    
    return {
      totalRequests: concurrency,
      successfulRequests: results.filter(r => r.success).length,
      failedRequests: results.filter(r => !r.success).length,
      avgDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      maxDuration: Math.max(...results.map(r => r.duration)),
      minDuration: Math.min(...results.map(r => r.duration)),
      results
    };
  }

  async runComprehensiveTest() {
    console.log('🚀 Starting Comprehensive Performance Test for FetchSub');
    console.log('====================================================\n');
    
    // Display system information
    console.log('💻 System Information:');
    console.log(`   Platform: ${os.platform()} ${os.arch()}`);
    console.log(`   CPU: ${os.cpus()[0]?.model || 'Unknown'} (${os.cpus().length} cores)`);
    console.log(`   Total Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100} GB`);
    console.log(`   Node.js: ${process.version}`);
    console.log(`   Load Average: ${os.loadavg().map(l => Math.round(l * 100) / 100).join(', ')}`);

    // Find Next.js process
    const nextjsPid = await this.findNextjsProcess();
    
    // Start monitoring
    this.monitor.startMonitoring(nextjsPid);

    const testResults = {
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100,
        cpuCount: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        nodeVersion: process.version
      },
      tests: {}
    };

    try {
      // Test 1: Idle state baseline
      console.log('\n📊 Test 1: Idle State Baseline (30 seconds)');
      await this.sleep(30000);
      const idleStats = this.monitor.getStats();
      testResults.tests.idle = {
        description: 'Application idle state for 30 seconds',
        stats: idleStats
      };

      // Test 2: Single video processing
      console.log('\n📊 Test 2: Single Video Processing');
      const singleVideoResult = await this.testSingleVideo(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
        ['TXT']
      );
      await this.sleep(5000); // Cool down
      const singleVideoStats = this.monitor.getStats();
      testResults.tests.singleVideo = {
        description: 'Single video subtitle extraction',
        result: singleVideoResult,
        stats: singleVideoStats
      };

      // Test 3: Multiple formats for single video
      console.log('\n📊 Test 3: Multiple Formats Processing');
      const multiFormatResult = await this.testSingleVideo(
        'https://www.youtube.com/watch?v=9bZkp7q19f0', // Gangnam Style
        ['TXT', 'SRT', 'VTT']
      );
      await this.sleep(5000);
      const multiFormatStats = this.monitor.getStats();
      testResults.tests.multiFormat = {
        description: 'Single video with multiple format extraction',
        result: multiFormatResult,
        stats: multiFormatStats
      };

      // Test 4: Small playlist processing
      console.log('\n📊 Test 4: Small Playlist Processing');
      const playlistResult = await this.testPlaylist(
        'https://youtube.com/playlist?list=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP', // Small test playlist
        ['TXT']
      );
      await this.sleep(5000);
      const playlistStats = this.monitor.getStats();
      testResults.tests.playlist = {
        description: 'Small playlist processing (multiple videos)',
        result: playlistResult,
        stats: playlistStats
      };

      // Test 5: Concurrent requests
      console.log('\n📊 Test 5: Concurrent Requests');
      const concurrentVideos = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=9bZkp7q19f0',
        'https://www.youtube.com/watch?v=L_jWHffIx5E'
      ];
      const concurrentResult = await this.testConcurrentRequests(concurrentVideos, 3);
      await this.sleep(5000);
      const concurrentStats = this.monitor.getStats();
      testResults.tests.concurrent = {
        description: '3 concurrent single video requests',
        result: concurrentResult,
        stats: concurrentStats
      };

      // Test 6: Heavy load test (if playlist was successful)
      if (playlistResult.success) {
        console.log('\n📊 Test 6: Heavy Load Test');
        const heavyLoadResult = await this.testPlaylist(
          'https://youtube.com/playlist?list=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP',
          ['TXT', 'SRT'] // Multiple formats for more load
        );
        await this.sleep(5000);
        const heavyLoadStats = this.monitor.getStats();
        testResults.tests.heavyLoad = {
          description: 'Playlist with multiple formats (heavy load)',
          result: heavyLoadResult,
          stats: heavyLoadStats
        };
      }

    } catch (error) {
      console.error('❌ Test execution error:', error.message);
      testResults.error = error.message;
    } finally {
      // Stop monitoring
      this.monitor.stopMonitoring();
    }

    // Generate final report
    this.generateReport(testResults);
    
    // Save detailed report
    const reportFilename = `performance-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    this.monitor.saveReport(reportFilename, testResults);

    return testResults;
  }

  generateReport(testResults) {
    console.log('\n📈 PERFORMANCE TEST RESULTS');
    console.log('==========================\n');

    console.log('💻 System Configuration:');
    console.log(`   Platform: ${testResults.systemInfo.platform} ${testResults.systemInfo.arch}`);
    console.log(`   CPU: ${testResults.systemInfo.cpuModel} (${testResults.systemInfo.cpuCount} cores)`);
    console.log(`   Memory: ${testResults.systemInfo.totalMemoryGB} GB`);

    console.log('\n📊 Resource Usage Summary:');
    
    Object.entries(testResults.tests).forEach(([testName, testData]) => {
      console.log(`\n🔹 ${testName.toUpperCase()} TEST:`);
      console.log(`   Description: ${testData.description}`);
      
      if (testData.result) {
        console.log(`   Success: ${testData.result.success ? '✅' : '❌'}`);
        console.log(`   Duration: ${Math.round(testData.result.duration / 1000 * 100) / 100}s`);
        if (testData.result.videoCount) {
          console.log(`   Videos Processed: ${testData.result.videoCount}`);
        }
        if (testData.result.error) {
          console.log(`   Error: ${testData.result.error}`);
        }
      }

      if (testData.stats) {
        const stats = testData.stats;
        console.log(`   System Memory Usage: ${stats.system.memory.minMB} - ${stats.system.memory.maxMB} MB (avg: ${stats.system.memory.avgMB} MB)`);
        console.log(`   System CPU Load: ${stats.system.cpu.minLoad} - ${stats.system.cpu.maxLoad} (avg: ${stats.system.cpu.avgLoad})`);
        
        if (stats.process) {
          console.log(`   Process CPU Usage: ${stats.process.cpu.minPercent}% - ${stats.process.cpu.maxPercent}% (avg: ${stats.process.cpu.avgPercent}%)`);
          console.log(`   Process Memory Usage: ${stats.process.memory.minMB} - ${stats.process.memory.maxMB} MB (avg: ${stats.process.memory.avgMB} MB)`);
        }
      }
    });

    // Calculate overall resource requirements
    console.log('\n🎯 RESOURCE REQUIREMENTS ANALYSIS:');
    console.log('=====================================');

    let minMemoryMB = 100; // Base Node.js app
    let maxMemoryMB = 100;
    let minCpuPercent = 1;
    let maxCpuPercent = 1;

    Object.values(testResults.tests).forEach(testData => {
      if (testData.stats?.process) {
        minMemoryMB = Math.max(minMemoryMB, testData.stats.process.memory.minMB);
        maxMemoryMB = Math.max(maxMemoryMB, testData.stats.process.memory.maxMB);
        minCpuPercent = Math.max(minCpuPercent, testData.stats.process.cpu.minPercent);
        maxCpuPercent = Math.max(maxCpuPercent, testData.stats.process.cpu.maxPercent);
      }
    });

    console.log(`\n💾 MEMORY REQUIREMENTS:`);
    console.log(`   Minimum (idle): ${Math.round(minMemoryMB)} MB`);
    console.log(`   Maximum (heavy load): ${Math.round(maxMemoryMB)} MB`);
    console.log(`   Recommended: ${Math.round(maxMemoryMB * 1.5)} MB (with 50% buffer)`);

    console.log(`\n🖥️  CPU REQUIREMENTS:`);
    console.log(`   Minimum (idle): ${minCpuPercent}% of 1 core`);
    console.log(`   Maximum (heavy load): ${maxCpuPercent}% of 1 core`);
    console.log(`   Recommended: ${testResults.systemInfo.cpuCount >= 2 ? '2+' : '1+'} CPU cores`);

    console.log(`\n⚡ PERFORMANCE CHARACTERISTICS:`);
    const singleVideoTest = testResults.tests.singleVideo;
    if (singleVideoTest?.result?.success) {
      console.log(`   Single video processing: ~${Math.round(singleVideoTest.result.duration / 1000)}s`);
    }
    
    const playlistTest = testResults.tests.playlist;
    if (playlistTest?.result?.success) {
      const videosPerSecond = playlistTest.result.videoCount / (playlistTest.result.duration / 1000);
      console.log(`   Playlist processing: ~${Math.round(videosPerSecond * 100) / 100} videos/second`);
    }

    console.log(`\n🎯 DEPLOYMENT RECOMMENDATIONS:`);
    console.log(`   Minimum Server Specs:`);
    console.log(`     - CPU: 1 vCPU (2+ recommended)`);
    console.log(`     - RAM: ${Math.max(512, Math.round(maxMemoryMB * 2))} MB`);
    console.log(`     - Storage: 1GB+ (for temp files and caching)`);
    
    console.log(`   Production Server Specs:`);
    console.log(`     - CPU: 2+ vCPUs`);
    console.log(`     - RAM: ${Math.max(1024, Math.round(maxMemoryMB * 3))} MB`);
    console.log(`     - Storage: 5GB+ SSD`);
    
    console.log(`   High-Load Server Specs:`);
    console.log(`     - CPU: 4+ vCPUs`);
    console.log(`     - RAM: ${Math.max(2048, Math.round(maxMemoryMB * 4))} MB`);
    console.log(`     - Storage: 10GB+ SSD`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const tester = new LoadTester('http://localhost:3002');
  
  // Check if server is running
  try {
    await axios.get('http://localhost:3002');
    console.log('✅ Server is running on http://localhost:3002');
  } catch (error) {
    console.log('❌ Server is not running on http://localhost:3002');
    console.log('   Please start the server with: npm run dev');
    process.exit(1);
  }

  await tester.runComprehensiveTest();
}

// Run the test if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { LoadTester, PerformanceMonitor };
