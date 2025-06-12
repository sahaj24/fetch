#!/usr/bin/env node

/**
 * Test script for the specific playlist provided by the user
 */

const axios = require('axios');

const BASE_URL = 'https://fetchsub.com';
const PLAYLIST_URL = 'https://youtube.com/playlist?list=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP&si=h5dbB3q7aBJOPVB7';

async function testSpecificPlaylist() {
    console.log('🧪 Testing specific playlist provided by user...\n');
    console.log(`🔗 Playlist URL: ${PLAYLIST_URL}\n`);

    const startTime = Date.now();
    
    try {
        console.log('⏳ Starting playlist processing...');
        
        const response = await axios.post(`${BASE_URL}/api/youtube/extract`, {
            inputType: 'url',
            url: PLAYLIST_URL,
            formats: ['CLEAN_TEXT'],
            language: 'en',
            anonymousId: 'test-specific-playlist'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Anonymous-User': 'true'
            },
            timeout: 300000 // 5 minutes timeout for testing
        });

        const duration = Date.now() - startTime;
        console.log(`✅ Playlist processing completed in ${duration}ms`);
        
        if (response.data && response.data.length > 0) {
            console.log(`📊 Results: ${response.data.length} items returned`);
            
            // Analyze results
            const successCount = response.data.filter(item => !item.error && !item.isGenerated).length;
            const errorCount = response.data.filter(item => item.error).length;
            const fallbackCount = response.data.filter(item => item.isGenerated).length;
            
            console.log(`🎯 Successful extractions: ${successCount}`);
            console.log(`⚠️  Errors: ${errorCount}`);
            console.log(`🔄 Fallbacks: ${fallbackCount}`);
            
            // Show first few items
            console.log('\n📋 First few results:');
            response.data.slice(0, 3).forEach((item, index) => {
                console.log(`${index + 1}. ${item.videoTitle || 'Unknown'} (${item.format})`);
                if (item.error) {
                    console.log(`   ❌ Error: ${item.error}`);
                } else if (item.content) {
                    console.log(`   📝 Content: ${item.content.substring(0, 100)}...`);
                }
            });
            
        } else if (response.data && response.data.error) {
            console.log(`⚠️  API Error: ${response.data.error}`);
        } else {
            console.log(`🤔 Unexpected response format: ${JSON.stringify(response.data).substring(0, 200)}`);
        }
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        if (error.code === 'ECONNABORTED') {
            console.log(`❌ Playlist processing timed out after ${duration}ms`);
            console.log(`🚨 The playlist processing is still hanging - 2-hour timeout not working`);
        } else if (error.response) {
            console.log(`⚠️  HTTP Error ${error.response.status}: ${error.response.data?.error || error.response.statusText}`);
            console.log(`⏱️  Completed in ${duration}ms`);
            
            if (error.response.status === 402) {
                console.log(`💰 This is expected - just means we need coins for processing`);
            }
        } else {
            console.log(`❌ Network Error: ${error.message}`);
            console.log(`⏱️  Failed after ${duration}ms`);
        }
    }
}

async function main() {
    try {
        await testSpecificPlaylist();
        console.log('\n🏁 Specific playlist test completed');
    } catch (error) {
        console.error('💥 Test script failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
