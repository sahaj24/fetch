#!/usr/bin/env node

/**
 * Production Debug Script - JSON Parsing Error Elimination
 * This script helps debug production issues by testing all code paths
 */

const axios = require('axios');

const PRODUCTION_URL = 'https://fetchsub.com'; // Change this to your production URL
const LOCAL_URL = 'http://localhost:3001';

async function testProductionDebug() {
    console.log('🔍 PRODUCTION DEBUG: JSON Parsing Error Analysis\n');
    
    // Test both environments
    const environments = [
        { name: 'Local', url: LOCAL_URL },
        { name: 'Production', url: PRODUCTION_URL }
    ];
    
    for (const env of environments) {
        console.log(`\n🌍 Testing ${env.name} Environment (${env.url})`);
        console.log('=' .repeat(60));
        
        await testEnvironment(env.name, env.url);
    }
}

async function testEnvironment(envName, baseUrl) {
    const testCases = [
        {
            name: 'Playlist Info - Real Playlist',
            type: 'GET',
            url: '/api/youtube/playlist-info?id=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP',
            description: 'Tests the playlist-info endpoint that was fixed'
        },
        {
            name: 'Playlist Info - Invalid Playlist',
            type: 'GET', 
            url: '/api/youtube/playlist-info?id=PLnonexistent12345',
            description: 'Tests error handling with invalid playlist'
        },
        {
            name: 'Middleware Test',
            type: 'GET',
            url: '/api/debug/middleware-test',
            description: 'Tests if middleware is working correctly'
        },
        {
            name: 'Health Check',
            type: 'GET',
            url: '/api/health',
            description: 'Basic API health check'
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n📝 ${testCase.name}`);
        console.log(`📋 ${testCase.description}`);
        console.log(`🔗 ${testCase.type} ${testCase.url}`);
        
        const startTime = Date.now();
        
        try {
            const response = await axios.get(`${baseUrl}${testCase.url}`, {
                timeout: 30000,
                validateStatus: (status) => status < 500,
                headers: {
                    'User-Agent': 'Production-Debug-Script/1.0',
                    'Accept': 'application/json'
                }
            });

            const duration = Date.now() - startTime;
            const contentType = response.headers['content-type'] || '';
            
            console.log(`⏱️  Duration: ${duration}ms`);
            console.log(`📊 Status: ${response.status}`);
            console.log(`📄 Content-Type: ${contentType}`);
            
            // Critical check: Is response JSON?
            if (contentType.includes('application/json')) {
                console.log(`✅ PASS: Response is JSON`);
                
                // Check response structure
                if (response.data) {
                    if (typeof response.data === 'object') {
                        if (response.data.error) {
                            console.log(`📝 Error: ${response.data.error}`);
                        } else if (response.data.title && response.data.videoCount !== undefined) {
                            console.log(`📊 Playlist: "${response.data.title}" (${response.data.videoCount} videos)`);
                        } else if (response.data.status) {
                            console.log(`📋 Status: ${response.data.status}`);
                        } else {
                            console.log(`📋 Response keys: ${Object.keys(response.data).join(', ')}`);
                        }
                    } else {
                        console.log(`📋 Response type: ${typeof response.data}`);
                    }
                }
            } else if (contentType.includes('text/html')) {
                console.log(`❌ CRITICAL: Response is HTML instead of JSON!`);
                console.log(`📄 This indicates the JSON parsing error is still occurring`);
                
                // Check if it's an error page
                const htmlSnippet = String(response.data).substring(0, 300);
                console.log(`📄 HTML preview: ${htmlSnippet}...`);
                
                if (htmlSnippet.includes('500') || htmlSnippet.includes('Internal Server Error')) {
                    console.log(`🚨 This appears to be a 500 error page - server crash detected`);
                } else if (htmlSnippet.includes('504') || htmlSnippet.includes('Gateway Timeout')) {
                    console.log(`⏰ This appears to be a 504 timeout - processing took too long`);
                } else if (htmlSnippet.includes('502') || htmlSnippet.includes('Bad Gateway')) {
                    console.log(`🔌 This appears to be a 502 error - gateway/proxy issue`);
                }
            } else {
                console.log(`⚠️  Unexpected Content-Type: ${contentType}`);
                console.log(`📄 Response preview: ${String(response.data).substring(0, 200)}`);
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Check for the specific JSON parsing error we're trying to eliminate
            if (error.message && error.message.includes('Unexpected token')) {
                console.log(`🚨 CRITICAL: JSON PARSING ERROR DETECTED!`);
                console.log(`❌ Error: ${error.message}`);
                
                if (error.message.includes('<html') || error.message.includes('<!DOCTYPE')) {
                    console.log(`🔥 This is the exact error we're trying to fix - HTML being parsed as JSON!`);
                }
            } else if (error.code === 'ECONNABORTED') {
                console.log(`⏰ Timeout after ${duration}ms`);
            } else if (error.code === 'ECONNREFUSED') {
                console.log(`🔌 Connection refused - server not running`);
            } else if (error.response) {
                const contentType = error.response.headers['content-type'] || '';
                console.log(`📊 HTTP Error ${error.response.status}: ${error.response.statusText}`);
                console.log(`📄 Error Content-Type: ${contentType}`);
                
                if (contentType.includes('text/html')) {
                    console.log(`❌ Error response is HTML (bad)`);
                    const htmlSnippet = String(error.response.data).substring(0, 200);
                    console.log(`📄 Error HTML: ${htmlSnippet}...`);
                } else if (contentType.includes('application/json')) {
                    console.log(`✅ Error response is JSON (good)`);
                    if (error.response.data && error.response.data.error) {
                        console.log(`📝 Error message: ${error.response.data.error}`);
                    }
                }
            } else {
                console.log(`❌ Network/Other Error: ${error.message}`);
            }
            
            console.log(`⏱️  Duration: ${duration}ms`);
        }
    }
    
    console.log(`\n📊 ${envName} Environment Test Complete`);
}

// Additional utility to test specific production endpoints
async function testSpecificPlaylist() {
    console.log('\n🎯 Testing Specific Playlist that Previously Failed');
    console.log('=' .repeat(60));
    
    const problematicPlaylists = [
        'PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP', // Known working playlist
        'PLnonexistent123', // Invalid playlist
        'PLrGCNSLrfzF-EXAMPLE' // Example invalid playlist
    ];
    
    for (const playlistId of problematicPlaylists) {
        console.log(`\n🔍 Testing playlist: ${playlistId}`);
        
        try {
            const response = await axios.get(`${PRODUCTION_URL}/api/youtube/playlist-info?id=${playlistId}`, {
                timeout: 20000,
                validateStatus: (status) => status < 500
            });
            
            const contentType = response.headers['content-type'] || '';
            
            if (contentType.includes('application/json')) {
                console.log(`✅ Playlist ${playlistId}: JSON response (good)`);
                if (response.data.videoCount) {
                    console.log(`📊 Videos: ${response.data.videoCount}`);
                }
            } else {
                console.log(`❌ Playlist ${playlistId}: Non-JSON response`);
                console.log(`📄 Content-Type: ${contentType}`);
            }
            
        } catch (error) {
            if (error.message && error.message.includes('Unexpected token')) {
                console.log(`🚨 Playlist ${playlistId}: JSON PARSING ERROR STILL EXISTS!`);
            } else {
                console.log(`⚠️  Playlist ${playlistId}: ${error.message}`);
            }
        }
    }
}

async function main() {
    try {
        await testProductionDebug();
        
        // Only test specific playlists if production URL is configured
        if (PRODUCTION_URL !== 'https://fetchsub.com') {
            await testSpecificPlaylist();
        }
        
        console.log('\n🏁 Production Debug Complete');
        console.log('✅ If all responses show "JSON response (good)", the fix is working!');
        console.log('❌ If you see "JSON PARSING ERROR", additional fixes are needed.');
        
    } catch (error) {
        console.error('💥 Debug script failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
