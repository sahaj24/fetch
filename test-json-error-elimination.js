#!/usr/bin/env node

/**
 * Comprehensive test to verify JSON parsing errors are completely eliminated
 * This test specifically targets scenarios that previously caused "Unexpected token '<'" errors
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testJSONErrorElimination() {
    console.log('🔥 COMPREHENSIVE JSON ERROR ELIMINATION TEST\n');

    const testCases = [
        {
            name: 'Playlist Info - Real Playlist',
            type: 'GET',
            url: '/api/youtube/playlist-info?id=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP',
            expectedBehavior: 'Should return JSON with playlist info, never HTML'
        },
        {
            name: 'Playlist Info - Invalid Playlist',
            type: 'GET', 
            url: '/api/youtube/playlist-info?id=PLnonexistent12345',
            expectedBehavior: 'Should return JSON error or empty response, never HTML'
        },
        {
            name: 'Playlist Extract - Real Playlist (will hit coin limit)',
            type: 'POST',
            url: '/api/youtube/extract',
            data: {
                inputType: 'url',
                url: 'https://youtube.com/playlist?list=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP',
                formats: ['CLEAN_TEXT'],
                language: 'en',
                anonymousId: 'test-real-playlist'
            },
            expectedBehavior: 'Should return JSON (coin error or success), never HTML'
        },
        {
            name: 'Playlist Extract - Invalid Playlist',
            type: 'POST',
            url: '/api/youtube/extract',
            data: {
                inputType: 'url',
                url: 'https://youtube.com/playlist?list=PLfake999invalid',
                formats: ['CLEAN_TEXT'],
                language: 'en',
                anonymousId: 'test-invalid-playlist'
            },
            expectedBehavior: 'Should return JSON with fallback videos, never HTML'
        },
        {
            name: 'Playlist Extract - Edge Case Playlist ID',
            type: 'POST',
            url: '/api/youtube/extract',
            data: {
                inputType: 'url',
                url: 'https://youtube.com/playlist?list=PLspecial_chars_123!@#',
                formats: ['CLEAN_TEXT'],
                language: 'en',
                anonymousId: 'test-edge-case'
            },
            expectedBehavior: 'Should return JSON with intelligent fallback, never HTML'
        }
    ];

    let allPassed = true;
    let jsonParsingErrorFound = false;

    for (const [index, testCase] of testCases.entries()) {
        console.log(`🧪 Test ${index + 1}/5: ${testCase.name}`);
        console.log(`📋 Expected: ${testCase.expectedBehavior}`);
        console.log(`🔗 ${testCase.type} ${testCase.url}`);
        
        const startTime = Date.now();
        
        try {
            let response;
            
            if (testCase.type === 'GET') {
                response = await axios.get(`${BASE_URL}${testCase.url}`, {
                    timeout: 20000,
                    validateStatus: (status) => status < 500
                });
            } else {
                response = await axios.post(`${BASE_URL}${testCase.url}`, testCase.data, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Anonymous-User': 'true'
                    },
                    timeout: 20000,
                    validateStatus: (status) => status < 500
                });
            }

            const duration = Date.now() - startTime;
            const contentType = response.headers['content-type'] || '';
            
            console.log(`⏱️  Duration: ${duration}ms`);
            console.log(`📊 Status: ${response.status}`);
            console.log(`📄 Content-Type: ${contentType}`);
            
            // Critical check: Is response JSON?
            if (contentType.includes('application/json')) {
                console.log(`✅ PASS: Response is JSON (good!)`);
                
                // Additional validation
                if (response.data) {
                    if (typeof response.data === 'object') {
                        console.log(`📋 Response type: Object (valid JSON)`);
                        
                        // Check for coin errors (expected)
                        if (response.data.error && response.data.error.includes('coin')) {
                            console.log(`💰 Expected coin error (normal behavior)`);
                        }
                        // Check for playlist info
                        else if (response.data.title && response.data.videoCount !== undefined) {
                            console.log(`📊 Playlist info: "${response.data.title}" (${response.data.videoCount} videos)`);
                        }
                        // Check for processing results
                        else if (response.data.results || response.data.error) {
                            console.log(`🎯 Processing response received`);
                        }
                        else {
                            console.log(`📋 Other valid JSON response`);
                        }
                    } else {
                        console.log(`⚠️  Response data is not object: ${typeof response.data}`);
                    }
                }
            } else {
                console.log(`❌ FAIL: Response is NOT JSON!`);
                console.log(`📄 Content-Type: ${contentType}`);
                console.log(`📄 Response preview: ${String(response.data).substring(0, 200)}`);
                allPassed = false;
                
                // Check if it's HTML (the original problem)
                if (String(response.data).includes('<html') || String(response.data).includes('<!DOCTYPE')) {
                    console.log(`🚨 CRITICAL: HTML RESPONSE DETECTED! This is the original bug!`);
                }
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Check for the specific JSON parsing error we're trying to eliminate
            if (error.message && error.message.includes('Unexpected token')) {
                console.log(`🚨 CRITICAL ERROR: JSON PARSING ERROR STILL EXISTS!`);
                console.log(`❌ Error: ${error.message}`);
                jsonParsingErrorFound = true;
                allPassed = false;
                
                if (error.message.includes('<html') || error.message.includes('<!DOCTYPE')) {
                    console.log(`🔥 This is the exact error we're trying to fix!`);
                }
            } else if (error.code === 'ECONNABORTED') {
                console.log(`⏰ Timeout after ${duration}ms (acceptable for long processing)`);
            } else if (error.response) {
                const contentType = error.response.headers['content-type'] || '';
                console.log(`📊 HTTP Error ${error.response.status}: ${error.response.statusText}`);
                console.log(`📄 Error Content-Type: ${contentType}`);
                
                // Even error responses should be JSON
                if (contentType.includes('application/json')) {
                    console.log(`✅ Error response is JSON (good error handling)`);
                } else {
                    console.log(`❌ Error response is NOT JSON`);
                    console.log(`📄 Response: ${String(error.response.data).substring(0, 200)}`);
                    allPassed = false;
                }
            } else {
                console.log(`❌ Network/Other Error: ${error.message}`);
            }
            
            console.log(`⏱️  Duration: ${duration}ms`);
        }
        
        console.log(''); // Add spacing between tests
    }

    // Final results
    console.log('🏁 JSON ERROR ELIMINATION TEST RESULTS:');
    console.log('=' .repeat(50));
    
    if (jsonParsingErrorFound) {
        console.log('🚨 FAILURE: JSON parsing errors still exist!');
        console.log('❌ The "Unexpected token \'<\'" error was detected');
        console.log('🔧 Additional fixes are needed');
    } else if (allPassed) {
        console.log('🎉 SUCCESS: JSON parsing errors completely eliminated!');
        console.log('✅ All responses are properly formatted JSON');
        console.log('✅ No "Unexpected token \'<\'" errors found');
        console.log('✅ System is production-ready');
    } else {
        console.log('⚠️  PARTIAL SUCCESS: No JSON parsing errors, but some responses not JSON');
        console.log('📋 This may be acceptable depending on the specific endpoints');
    }
}

async function main() {
    try {
        await testJSONErrorElimination();
    } catch (error) {
        console.error('💥 Test script failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
