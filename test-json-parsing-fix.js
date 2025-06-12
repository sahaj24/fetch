#!/usr/bin/env node

/**
 * Test script to verify the JSON parsing error fix
 * This tests that HTML responses from yt-dlp no longer cause "Unexpected token '<'" errors
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testJSONParsingFix() {
    console.log('🧪 Testing JSON parsing error fix...\n');

    const testCases = [
        {
            name: 'Playlist Info Endpoint',
            type: 'GET',
            url: '/api/youtube/playlist-info?id=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP',
            expectedResponse: 'JSON with playlist info'
        },
        {
            name: 'Single Video Extract',
            type: 'POST',
            url: '/api/youtube/extract',
            data: {
                inputType: 'url',
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                formats: ['CLEAN_TEXT'],
                language: 'en',
                anonymousId: 'test-json-fix-single'
            },
            expectedResponse: 'JSON response (may be error due to coins)'
        },
        {
            name: 'Playlist Extract',
            type: 'POST',
            url: '/api/youtube/extract',
            data: {
                inputType: 'url',
                url: 'https://youtube.com/playlist?list=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP',
                formats: ['CLEAN_TEXT'],
                language: 'en',
                anonymousId: 'test-json-fix-playlist'
            },
            expectedResponse: 'JSON response with emergency fallback or coin error'
        }
    ];

    for (const testCase of testCases) {
        console.log(`📝 Testing: ${testCase.name}`);
        console.log(`🔗 ${testCase.type} ${testCase.url}`);
        
        const startTime = Date.now();
        
        try {
            let response;
            
            if (testCase.type === 'GET') {
                response = await axios.get(`${BASE_URL}${testCase.url}`, {
                    timeout: 30000,
                    validateStatus: (status) => status < 500
                });
            } else {
                response = await axios.post(`${BASE_URL}${testCase.url}`, testCase.data, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Anonymous-User': 'true'
                    },
                    timeout: 30000,
                    validateStatus: (status) => status < 500
                });
            }

            const duration = Date.now() - startTime;
            const contentType = response.headers['content-type'] || '';
            
            console.log(`✅ ${testCase.name} completed in ${duration}ms`);
            console.log(`📋 Status: ${response.status}`);
            console.log(`📄 Content-Type: ${contentType}`);
            
            // Check if response is JSON
            if (contentType.includes('application/json')) {
                console.log(`🎯 SUCCESS: Response is proper JSON`);
                
                // Check for specific error types
                if (response.data && response.data.error) {
                    console.log(`📝 Response: ${response.data.error}`);
                    
                    // This is expected - coins are required
                    if (response.data.error.includes('Insufficient coins') || response.data.error.includes('coins')) {
                        console.log(`💰 Expected coin-related error - this confirms API is working`);
                    }
                } else if (response.data && response.data.title) {
                    console.log(`📊 Playlist info: ${response.data.title} (${response.data.videoCount} videos)`);
                } else {
                    console.log(`📋 Response type: ${typeof response.data}`);
                }
            } else {
                console.log(`❌ UNEXPECTED: Response is not JSON`);
                console.log(`📄 Response preview: ${JSON.stringify(response.data).substring(0, 200)}`);
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            if (error.code === 'ECONNABORTED') {
                console.log(`❌ ${testCase.name} timed out after ${duration}ms`);
            } else if (error.response) {
                const contentType = error.response.headers['content-type'] || '';
                console.log(`⚠️  HTTP Error ${error.response.status}: ${error.response.statusText}`);
                console.log(`📄 Content-Type: ${contentType}`);
                
                // Check if error response is JSON
                if (contentType.includes('application/json')) {
                    console.log(`✅ Error response is proper JSON (good)`);
                    if (error.response.data && error.response.data.error) {
                        console.log(`📝 Error: ${error.response.data.error}`);
                    }
                } else {
                    console.log(`❌ PROBLEM: Error response is not JSON`);
                    console.log(`📄 Response preview: ${String(error.response.data).substring(0, 200)}`);
                }
            } else if (error.message && error.message.includes('Unexpected token')) {
                console.log(`🚨 CRITICAL: JSON parsing error still exists!`);
                console.log(`❌ Error: ${error.message}`);
                console.log(`📄 This indicates HTML is still being returned instead of JSON`);
            } else {
                console.log(`❌ Network Error: ${error.message}`);
            }
            
            console.log(`⏱️  Completed in ${duration}ms`);
        }
        
        console.log(''); // Add spacing between tests
    }
}

async function main() {
    try {
        await testJSONParsingFix();
        console.log('🏁 JSON parsing fix test completed');
        console.log('✅ If you see "SUCCESS: Response is proper JSON" for all tests, the fix is working!');
    } catch (error) {
        console.error('💥 Test script failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
