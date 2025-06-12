#!/usr/bin/env node

/**
 * Test script to verify the playlist processing timeout fix
 */

const axios = require('axios');

const BASE_URL = 'https://fetchsub.com';

async function testPlaylistProcessing() {
    console.log('🧪 Testing playlist processing timeout fix...\n');

    const testCases = [
        {
            name: 'Your Specific Playlist',
            url: 'https://youtube.com/playlist?list=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP&si=h5dbB3q7aBJOPVB7',
            expectedTimeout: 120000 // Should complete within 2 minutes
        },
        {
            name: 'Small Test Playlist',
            url: 'https://www.youtube.com/playlist?list=PLkqz3S84Tw-S7FsHHCHWU6Q5vyHDi6rw4',
            expectedTimeout: 120000 // Should complete within 2 minutes
        },
        {
            name: 'Single Video (Control)',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            expectedTimeout: 30000 // Should complete within 30 seconds
        }
    ];

    for (const testCase of testCases) {
        console.log(`📝 Testing: ${testCase.name}`);
        console.log(`🔗 URL: ${testCase.url}`);
        
        const startTime = Date.now();
        
        try {
            const response = await axios.post(`${BASE_URL}/api/youtube/extract`, {
                inputType: 'url',
                url: testCase.url,
                formats: ['CLEAN_TEXT'],
                language: 'en',
                anonymousId: 'test-playlist-fix'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Anonymous-User': 'true'
                },
                timeout: testCase.expectedTimeout
            });

            const duration = Date.now() - startTime;
            console.log(`✅ ${testCase.name} completed in ${duration}ms`);
            
            if (response.data && response.data.length > 0) {
                console.log(`📊 Results: ${response.data.length} items returned`);
                
                // Check for fallback indicators
                const fallbackItems = response.data.filter(item => 
                    item.content && item.content.includes('fallback') ||
                    item.notice && item.notice.includes('fallback')
                );
                
                if (fallbackItems.length > 0) {
                    console.log(`⚠️  Fallback used: ${fallbackItems.length} items`);
                } else {
                    console.log(`🎯 Real data extracted successfully`);
                }
            } else if (response.data && response.data.error) {
                console.log(`⚠️  API Error: ${response.data.error}`);
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            if (error.code === 'ECONNABORTED') {
                console.log(`❌ ${testCase.name} timed out after ${duration}ms (expected < ${testCase.expectedTimeout}ms)`);
                console.log(`🚨 TIMEOUT FIX FAILED - Playlist processing is still hanging`);
            } else if (error.response) {
                console.log(`⚠️  HTTP Error ${error.response.status}: ${error.response.data?.error || error.response.statusText}`);
                console.log(`⏱️  Completed in ${duration}ms`);
            } else {
                console.log(`❌ Network Error: ${error.message}`);
                console.log(`⏱️  Failed after ${duration}ms`);
            }
        }
        
        console.log(''); // Add spacing between tests
    }
}

async function main() {
    try {
        await testPlaylistProcessing();
        console.log('🏁 Playlist processing test completed');
    } catch (error) {
        console.error('💥 Test script failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
