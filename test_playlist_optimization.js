#!/usr/bin/env node

/**
 * Test script to verify the playlist processing optimizations
 * Tests the specific playlist: https://youtube.com/playlist?list=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP&si=h5dbB3q7aBJOPVB7
 */

const axios = require('axios');

async function testPlaylistOptimization() {
  console.log('🧪 Testing Playlist Processing Optimizations...\n');
  
  const testUrl = 'https://youtube.com/playlist?list=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP&si=h5dbB3q7aBJOPVB7';
  
  console.log(`📋 Testing playlist: ${testUrl}`);
  console.log('⏱️  Testing timeout optimizations (8s vs 15s)...\n');
  
  const startTime = Date.now();
  
  try {
    // Test the API endpoint with the playlist (anonymous user)
    const response = await axios.post('http://localhost:3004/api/youtube/extract', {
      inputType: 'url',
      url: testUrl,
      formats: ['SRT'],
      language: 'en',
      coinCostEstimate: 5
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-ID': 'anonymous-test-user-12345' // Use anonymous user ID
      },
      timeout: 60000 // 60 second timeout for the test
    });
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log(`✅ Playlist processing completed in ${totalTime.toFixed(2)} seconds`);
    console.log(`📊 Results: ${response.data.subtitles?.length || 0} subtitle entries`);
    
    // Analyze the results
    const subtitles = response.data.subtitles || [];
    const successCount = subtitles.filter(s => !s.error && !s.isGenerated).length;
    const errorCount = subtitles.filter(s => s.error).length;
    const generatedCount = subtitles.filter(s => s.isGenerated).length;
    
    console.log(`\n📈 Processing Statistics:`);
    console.log(`   ✅ Successful extractions: ${successCount}`);
    console.log(`   ⚠️  Generated fallbacks: ${generatedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Check for specific error types from our optimizations
    const timeoutErrors = subtitles.filter(s => s.error?.includes('TIMEOUT')).length;
    const disabledErrors = subtitles.filter(s => s.error?.includes('SUBTITLES_DISABLED')).length;
    const unavailableErrors = subtitles.filter(s => s.error?.includes('UNAVAILABLE')).length;
    
    console.log(`\n🔍 Error Classification (New Optimization):`);
    console.log(`   ⏱️  Timeout errors: ${timeoutErrors}`);
    console.log(`   🚫 Subtitles disabled: ${disabledErrors}`);
    console.log(`   🔒 Unavailable videos: ${unavailableErrors}`);
    
    // Performance metrics
    console.log(`\n⚡ Performance Metrics:`);
    console.log(`   🕐 Total time: ${totalTime.toFixed(2)}s`);
    console.log(`   📊 Videos per second: ${(successCount / totalTime).toFixed(2)}`);
    console.log(`   🎯 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
    
    return {
      success: true,
      totalTime,
      successCount,
      errorCount,
      generatedCount,
      timeoutErrors,
      disabledErrors,
      unavailableErrors
    };
    
  } catch (error) {
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.error(`❌ Test failed after ${totalTime.toFixed(2)} seconds:`);
    console.error(`   Error: ${error.message}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return {
      success: false,
      error: error.message,
      totalTime
    };
  }
}

// Run the test
if (require.main === module) {
  testPlaylistOptimization()
    .then(result => {
      console.log('\n' + '='.repeat(50));
      if (result.success) {
        console.log('🎉 Optimization test completed successfully!');
        console.log(`📋 Summary: ${result.successCount} successful, ${result.errorCount} errors in ${result.totalTime.toFixed(2)}s`);
      } else {
        console.log('💥 Optimization test failed');
        console.log(`❌ Error: ${result.error}`);
      }
      console.log('='.repeat(50));
    })
    .catch(err => {
      console.error('💥 Unexpected error:', err);
      process.exit(1);
    });
}

module.exports = { testPlaylistOptimization };
