#!/usr/bin/env node

/**
 * Simple Resource Monitor for FetchSub Application
 * Monitors CPU and RAM usage in real-time
 */

const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SimpleMonitor {
  constructor() {
    this.isRunning = false;
    this.measurements = [];
  }

  async findProcesses() {
    try {
      // Find Next.js processes
      const { stdout } = await execAsync("ps aux | grep -E '(next|node.*3000|npm.*dev)' | grep -v grep");
      const lines = stdout.trim().split('\n').filter(line => line.trim());
      
      const processes = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parseInt(parts[1]),
          cpu: parseFloat(parts[2]),
          mem: parseFloat(parts[3]),
          command: parts.slice(10).join(' ')
        };
      });

      return processes;
    } catch (error) {
      return [];
    }
  }

  async getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      timestamp: new Date().toISOString(),
      system: {
        totalMemoryMB: Math.round(totalMem / 1024 / 1024),
        freeMemoryMB: Math.round(freeMem / 1024 / 1024),
        usedMemoryMB: Math.round(usedMem / 1024 / 1024),
        memoryUsagePercent: Math.round((usedMem / totalMem) * 10000) / 100,
        cpuCores: os.cpus().length,
        loadAverage: os.loadavg().map(load => Math.round(load * 100) / 100)
      }
    };
  }

  async startMonitoring(intervalSeconds = 5) {
    console.log('🔍 FetchSub Resource Monitor Started');
    console.log('====================================');
    console.log(`📊 Monitoring every ${intervalSeconds} seconds`);
    console.log('💻 System Info:');
    console.log(`   Platform: ${os.platform()} ${os.arch()}`);
    console.log(`   CPU: ${os.cpus()[0]?.model || 'Unknown'} (${os.cpus().length} cores)`);
    console.log(`   Total RAM: ${Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100} GB`);
    console.log('\nPress Ctrl+C to stop monitoring\n');

    this.isRunning = true;

    // Print header
    console.log('Time'.padEnd(10) + 
                'Sys RAM %'.padEnd(12) + 
                'Sys RAM MB'.padEnd(12) + 
                'Load Avg'.padEnd(12) + 
                'Processes'.padEnd(15) + 
                'App CPU %'.padEnd(12) + 
                'App RAM MB');
    console.log('-'.repeat(85));

    while (this.isRunning) {
      try {
        const systemMetrics = await this.getSystemMetrics();
        const processes = await this.findProcesses();
        
        // Filter for likely Next.js/Node processes
        const appProcesses = processes.filter(p => 
          p.command.includes('next') || 
          p.command.includes('3000') || 
          (p.command.includes('node') && p.mem > 1)
        );

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        const sysRamPercent = systemMetrics.system.memoryUsagePercent.toFixed(1) + '%';
        const sysRamMB = systemMetrics.system.usedMemoryMB.toString();
        const loadAvg = systemMetrics.system.loadAverage[0].toString();
        const processCount = appProcesses.length.toString();
        
        let appCpuPercent = '0%';
        let appRamMB = '0';
        
        if (appProcesses.length > 0) {
          const totalCpu = appProcesses.reduce((sum, p) => sum + p.cpu, 0);
          const totalMem = appProcesses.reduce((sum, p) => sum + (p.mem * systemMetrics.system.totalMemoryMB / 100), 0);
          
          appCpuPercent = totalCpu.toFixed(1) + '%';
          appRamMB = Math.round(totalMem).toString();
        }

        console.log(
          timeStr.padEnd(10) +
          sysRamPercent.padEnd(12) +
          sysRamMB.padEnd(12) +
          loadAvg.padEnd(12) +
          processCount.padEnd(15) +
          appCpuPercent.padEnd(12) +
          appRamMB
        );

        // Store measurement
        this.measurements.push({
          ...systemMetrics,
          processes: appProcesses,
          appCpuPercent: parseFloat(appCpuPercent),
          appRamMB: parseInt(appRamMB)
        });

        // Keep only last 100 measurements
        if (this.measurements.length > 100) {
          this.measurements = this.measurements.slice(-100);
        }

      } catch (error) {
        console.error('Error collecting metrics:', error.message);
      }

      await this.sleep(intervalSeconds * 1000);
    }
  }

  stop() {
    this.isRunning = false;
    console.log('\n📊 Monitoring stopped');
    this.printSummary();
  }

  printSummary() {
    if (this.measurements.length === 0) return;

    console.log('\n📈 MONITORING SUMMARY');
    console.log('===================');

    const appCpuValues = this.measurements.map(m => m.appCpuPercent).filter(v => v > 0);
    const appRamValues = this.measurements.map(m => m.appRamMB).filter(v => v > 0);
    const sysRamValues = this.measurements.map(m => m.system.memoryUsagePercent);
    const loadValues = this.measurements.map(m => m.system.loadAverage[0]);

    if (appCpuValues.length > 0) {
      console.log(`\n🖥️  Application CPU Usage:`);
      console.log(`   Minimum: ${Math.min(...appCpuValues).toFixed(1)}%`);
      console.log(`   Maximum: ${Math.max(...appCpuValues).toFixed(1)}%`);
      console.log(`   Average: ${(appCpuValues.reduce((a, b) => a + b, 0) / appCpuValues.length).toFixed(1)}%`);
    }

    if (appRamValues.length > 0) {
      console.log(`\n💾 Application Memory Usage:`);
      console.log(`   Minimum: ${Math.min(...appRamValues)} MB`);
      console.log(`   Maximum: ${Math.max(...appRamValues)} MB`);
      console.log(`   Average: ${Math.round(appRamValues.reduce((a, b) => a + b, 0) / appRamValues.length)} MB`);
    }

    console.log(`\n🖥️  System Resources:`);
    console.log(`   Memory Usage: ${Math.min(...sysRamValues).toFixed(1)}% - ${Math.max(...sysRamValues).toFixed(1)}%`);
    console.log(`   Load Average: ${Math.min(...loadValues).toFixed(2)} - ${Math.max(...loadValues).toFixed(2)}`);
    console.log(`   Total Measurements: ${this.measurements.length}`);

    const firstMeasurement = this.measurements[0];
    const lastMeasurement = this.measurements[this.measurements.length - 1];
    const duration = (new Date(lastMeasurement.timestamp) - new Date(firstMeasurement.timestamp)) / 1000;
    console.log(`   Monitoring Duration: ${Math.round(duration)}s`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle Ctrl+C gracefully
const monitor = new SimpleMonitor();

process.on('SIGINT', () => {
  monitor.stop();
  process.exit(0);
});

// Start monitoring
const intervalSeconds = process.argv[2] ? parseInt(process.argv[2]) : 3;
monitor.startMonitoring(intervalSeconds).catch(console.error);
