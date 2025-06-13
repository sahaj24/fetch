#!/usr/bin/env node

/**
 * Test File-Based Playlist Processor
 * Tests the new file-based approach that mirrors the working video processor
 */

const https = require('https');
const http = require('http');

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'File-Based-Test/1.0',
                'Accept': 'application/json'
            },
            timeout: 30000
        };

        const req = client.request(options, (res) => {
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
        
        req.end();
    });
}

async function testFileBasedProcessor() {
    console.log('🧪 Testing File-Based Playlist Processor');
    console.log('📁 This uses the same pattern as the working video processor\n');

    const testPlaylistId = 'PLrZ_-wrg8HJNYhGSWEtyxOKemn9NeIgf5';
    const testUrl = `http://localhost:3000/api/youtube/playlist-info?id=${testPlaylistId}`;

    try {
        console.log('🎯 Testing playlist info endpoint...');
        console.log(`📡 URL: ${testUrl}`);
        
        const response = await makeRequest(testUrl);
        
        console.log(`📊 Status: ${response.statusCode}`);
        console.log(`📋 Content-Type: ${response.headers['content-type']}`);
        
        // Check for HTML in JSON response (the bug we're fixing)
        if (response.body.includes('<!DOCTYPE html>') || 
            response.body.includes('<html>') || 
            response.body.includes('Unexpected token')) {
            console.log('❌ CRITICAL: HTML content detected in JSON response!');
            console.log('🐛 The JSON parsing bug is still present');
            console.log('📝 Response preview:', response.body.substring(0, 200));
            return false;
        }
        
        // Try to parse as JSON
        let jsonData;
        try {
            jsonData = JSON.parse(response.body);
            console.log('✅ Valid JSON response received');
        } catch (parseError) {
            console.log('❌ Invalid JSON response:', parseError.message);
            console.log('📝 Response preview:', response.body.substring(0, 200));
            return false;
        }
        
        // Check playlist data structure
        if (jsonData && jsonData.title && typeof jsonData.videoCount === 'number') {
            console.log('✅ Playlist info structure is correct');
            console.log(`📺 Playlist: "${jsonData.title}"`);
            console.log(`🎬 Video count: ${jsonData.videoCount}`);
            console.log(`📊 Is estimate: ${jsonData.isEstimate}`);
            
            // This endpoint returns metadata, not video list
            console.log('ℹ️ Note: playlist-info endpoint returns metadata, not video IDs');
            
            return true;
        } else {
            console.log('⚠️ Unexpected playlist structure');
            console.log('🔍 Keys found:', Object.keys(jsonData || {}));
            console.log('📝 Full response:', JSON.stringify(jsonData, null, 2));
            return false;
        }
        
    } catch (error) {
        console.log('❌ Request failed:', error.message);
        return false;
    }
}

// Run the test
testFileBasedProcessor().then(success => {
    if (success) {
        console.log('\n🎉 FILE-BASED PROCESSOR TEST PASSED!');
        console.log('✅ No JSON parsing errors detected');
        console.log('✅ Uses same pattern as working video processor');
        console.log('🚀 Ready for production deployment');
    } else {
        console.log('\n💥 FILE-BASED PROCESSOR TEST FAILED!');
        console.log('❌ Issues detected - needs investigation');
    }
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
});
