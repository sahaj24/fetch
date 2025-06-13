#!/usr/bin/env node

/**
 * Production Deployment Test Script
 * 
 * This script tests the production deployment to ensure the JSON parsing bug fix
 * is working correctly in the cloud environment.
 * 
 * Usage: node production-deployment-test.js [PRODUCTION_URL]
 * Example: node production-deployment-test.js https://your-app.vercel.app
 */

const https = require('https');
const http = require('http');

// Configuration
const PRODUCTION_URL = process.argv[2] || process.env.PRODUCTION_URL;
const TEST_PLAYLIST_ID = 'PLrZ_-wrg8HJNYhGSWEtyxOKemn9NeIgf5'; // Reliable test playlist

// ANSI colors for better output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Production-Test-Script/1.0',
                'Accept': 'application/json',
                ...options.headers
            },
            timeout: 30000
        };

        const req = client.request(requestOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

async function testEndpoint(name, url, expectedStatus = 200) {
    try {
        log(colors.blue, `\n🧪 Testing ${name}...`);
        log(colors.cyan, `   URL: ${url}`);
        
        const startTime = Date.now();
        const response = await makeRequest(url);
        const duration = Date.now() - startTime;
        
        log(colors.yellow, `   Status: ${response.statusCode} (${duration}ms)`);
        log(colors.yellow, `   Content-Type: ${response.headers['content-type'] || 'Not specified'}`);
        
        // Check if response is JSON
        let isValidJSON = false;
        let jsonData = null;
        
        try {
            jsonData = JSON.parse(response.body);
            isValidJSON = true;
            log(colors.green, `   ✅ Valid JSON response received`);
        } catch (error) {
            log(colors.red, `   ❌ Invalid JSON: ${error.message}`);
            log(colors.red, `   Response body preview: ${response.body.substring(0, 200)}...`);
        }
        
        // Check for the specific error we're trying to fix
        if (response.body.includes("Unexpected token '<'") || 
            response.body.includes('<!DOCTYPE html>') ||
            response.body.includes('<html>')) {
            log(colors.red, `   🚨 CRITICAL: HTML content detected in response!`);
            log(colors.red, `   This indicates the JSON parsing bug is still present.`);
            return { success: false, error: 'HTML_IN_JSON_RESPONSE', response };
        }
        
        // Check status code
        if (response.statusCode === expectedStatus) {
            log(colors.green, `   ✅ Expected status code: ${expectedStatus}`);
        } else {
            log(colors.yellow, `   ⚠️  Unexpected status: ${response.statusCode} (expected ${expectedStatus})`);
        }
        
        // Additional checks for specific endpoints
        if (name.includes('Playlist Info') && isValidJSON && jsonData) {
            if (jsonData.title && jsonData.videos) {
                log(colors.green, `   ✅ Playlist data structure is correct`);
                log(colors.cyan, `   Playlist: "${jsonData.title}" (${jsonData.videos.length} videos)`);
            } else {
                log(colors.yellow, `   ⚠️  Playlist structure may be unexpected`);
            }
        }
        
        if (name.includes('Debug Status') && isValidJSON && jsonData) {
            if (jsonData.status === 'PRODUCTION_SAFE_ENABLED') {
                log(colors.green, `   ✅ Production-safe mode is enabled`);
            } else {
                log(colors.yellow, `   ⚠️  Production-safe status: ${jsonData.status}`);
            }
        }
        
        return { success: true, response, jsonData };
        
    } catch (error) {
        log(colors.red, `   ❌ Request failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runProductionTests() {
    if (!PRODUCTION_URL) {
        log(colors.red, '❌ Production URL not provided!');
        log(colors.yellow, 'Usage: node production-deployment-test.js https://your-app.vercel.app');
        process.exit(1);
    }
    
    log(colors.bold + colors.magenta, '🚀 PRODUCTION DEPLOYMENT TEST');
    log(colors.cyan, `Target: ${PRODUCTION_URL}`);
    log(colors.cyan, `Time: ${new Date().toISOString()}`);
    
    const tests = [
        {
            name: 'Debug Status Check',
            url: `${PRODUCTION_URL}/api/debug/json-fix-status`,
            expectedStatus: 200
        },
        {
            name: 'Playlist Info Endpoint',
            url: `${PRODUCTION_URL}/api/youtube/playlist-info?id=${TEST_PLAYLIST_ID}`,
            expectedStatus: 200
        },
        {
            name: 'Single Video Extract',
            url: `${PRODUCTION_URL}/api/youtube/extract?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ`,
            expectedStatus: 402 // Expected coin error
        },
        {
            name: 'Playlist Extract',
            url: `${PRODUCTION_URL}/api/youtube/extract?url=https://www.youtube.com/playlist?list=${TEST_PLAYLIST_ID}`,
            expectedStatus: 402 // Expected coin error
        },
        {
            name: 'Middleware Test',
            url: `${PRODUCTION_URL}/api/debug/middleware-test`,
            expectedStatus: 200
        }
    ];
    
    const results = [];
    
    for (const test of tests) {
        const result = await testEndpoint(test.name, test.url, test.expectedStatus);
        results.push({ ...test, ...result });
        
        // Add small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    log(colors.bold + colors.magenta, '\n📊 TEST SUMMARY');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const criticalErrors = results.filter(r => r.error === 'HTML_IN_JSON_RESPONSE');
    
    log(colors.green, `✅ Successful: ${successful.length}/${results.length}`);
    
    if (failed.length > 0) {
        log(colors.red, `❌ Failed: ${failed.length}/${results.length}`);
        failed.forEach(test => {
            log(colors.red, `   - ${test.name}: ${test.error}`);
        });
    }
    
    if (criticalErrors.length > 0) {
        log(colors.red, '\n🚨 CRITICAL ISSUES DETECTED:');
        log(colors.red, 'The JSON parsing bug is still present in production!');
        log(colors.red, 'HTML content is being returned instead of JSON.');
        log(colors.red, 'The deployment may not have included the latest fixes.');
        process.exit(1);
    }
    
    if (successful.length === results.length) {
        log(colors.green, '\n🎉 ALL TESTS PASSED!');
        log(colors.green, 'The JSON parsing bug fix is working correctly in production.');
        log(colors.green, 'The webapp should now handle playlist processing without errors.');
    } else {
        log(colors.yellow, '\n⚠️  SOME TESTS FAILED');
        log(colors.yellow, 'Please review the results above and investigate any issues.');
    }
    
    // Detailed diagnostic info
    log(colors.cyan, '\n🔍 Diagnostic Information:');
    results.forEach(result => {
        if (result.success && result.jsonData) {
            log(colors.cyan, `${result.name}: Structure looks good`);
        }
    });
}

// Run the tests
runProductionTests().catch(error => {
    log(colors.red, `\n💥 Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
});
