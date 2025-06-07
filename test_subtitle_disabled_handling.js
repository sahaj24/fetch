#!/usr/bin/env node

const baseUrl = 'http://localhost:3001';

async function testSubtitleDisabledHandling() {
    console.log('🧪 Testing Subtitle Disabled Error Handling');
    console.log('============================================');
    
    // Test with the video that has disabled subtitles
    const testVideoUrl = 'https://www.youtube.com/watch?v=MNeHshdyIoE';
    
    const requestBody = {
        inputType: 'url',
        url: testVideoUrl,
        formats: ['CLEAN_TEXT'],
        language: 'en',
        anonymousId: 'test-anonymous-user'
    };
    
    try {
        console.log(`\n📹 Testing video: ${testVideoUrl}`);
        console.log('   Expected: Should return graceful error result, not throw exception');
        
        const response = await fetch(`${baseUrl}/api/youtube/extract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Anonymous-User': 'true'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.text();
        
        console.log(`\n✅ Response Status: ${response.status}`);
        console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);
        
        // Check if response is JSON
        let isJson = false;
        let data = null;
        try {
            data = JSON.parse(result);
            isJson = true;
        } catch (e) {
            isJson = false;
        }
        
        console.log(`📄 Is JSON: ${isJson ? '✅' : '❌'}`);
        
        if (isJson) {
            console.log(`\n📊 Response Preview:`);
            
            if (data.error && response.status === 401) {
                console.log(`   ⚠️  Authentication Error: ${data.error}`);
                console.log(`   ℹ️  This is expected - we're testing without proper auth`);
                console.log(`   ✅ API returned JSON error response (not HTML)`);
            } else if (data.results && Array.isArray(data.results)) {
                console.log(`   📝 Results Count: ${data.results.length}`);
                
                // Check if any results have the expected error handling
                const errorResults = data.results.filter(r => r.error);
                const subtitleDisabledResults = data.results.filter(r => 
                    r.notice === 'Subtitles disabled by creator' || 
                    r.error?.includes('disabled subtitles')
                );
                
                console.log(`   ❌ Error Results: ${errorResults.length}`);
                console.log(`   🚫 Subtitle Disabled Results: ${subtitleDisabledResults.length}`);
                
                if (subtitleDisabledResults.length > 0) {
                    console.log(`\n✅ SUCCESS: Subtitle disabled error handled gracefully!`);
                    console.log(`   📝 Error Message: ${subtitleDisabledResults[0].error}`);
                    console.log(`   🏷️  Notice: ${subtitleDisabledResults[0].notice}`);
                } else if (errorResults.length > 0) {
                    console.log(`\n⚠️  General Error Result:`);
                    console.log(`   📝 Error: ${errorResults[0].error}`);
                }
            } else {
                console.log(`   📝 Unexpected Response Format`);
                console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');
            }
        } else {
            console.log(`\n❌ Non-JSON Response:`);
            console.log(result.substring(0, 300) + '...');
        }
        
    } catch (error) {
        console.log(`\n❌ Test Failed with Exception:`);
        console.log(`   Error: ${error.message}`);
        console.log(`   This suggests the error is still being thrown instead of handled gracefully`);
    }
    
    console.log(`\n🎯 Test Summary`);
    console.log(`==============`);
    console.log(`The test verifies that videos with disabled subtitles return graceful error results`);
    console.log(`instead of throwing exceptions that crash the entire request.`);
}

testSubtitleDisabledHandling().catch(console.error);
