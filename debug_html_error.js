#!/usr/bin/env node

const baseUrl = 'http://localhost:3003';

async function debugHTMLError() {
    console.log('🔍 Debugging HTML Response Error');
    console.log('=================================');
    
    const scenarios = [
        {
            name: 'Correct API endpoint (should work)',
            url: `${baseUrl}/api/youtube/extract`,
            method: 'POST',
            body: JSON.stringify({
                inputType: 'url',
                url: 'https://www.youtube.com/watch?v=MNeHshdyIoE',
                formats: ['CLEAN_TEXT'],
                language: 'en',
                anonymousId: 'test-debug'
            }),
            headers: {
                'Content-Type': 'application/json',
                'X-Anonymous-User': 'true'
            }
        },
        {
            name: 'Wrong endpoint path (will return HTML 404)',
            url: `${baseUrl}/api/youtube/wrong-endpoint`,
            method: 'POST',
            body: JSON.stringify({
                inputType: 'url',
                url: 'https://www.youtube.com/watch?v=MNeHshdyIoE',
                formats: ['CLEAN_TEXT'],
                language: 'en',
                anonymousId: 'test-debug'
            }),
            headers: {
                'Content-Type': 'application/json',
                'X-Anonymous-User': 'true'
            }
        },
        {
            name: 'GET request to POST endpoint (might return HTML)',
            url: `${baseUrl}/api/youtube/extract`,
            method: 'GET',
            body: null,
            headers: {}
        },
        {
            name: 'Missing Content-Type header',
            url: `${baseUrl}/api/youtube/extract`,
            method: 'POST',
            body: JSON.stringify({
                inputType: 'url',
                url: 'https://www.youtube.com/watch?v=MNeHshdyIoE',
                formats: ['CLEAN_TEXT'],
                language: 'en',
                anonymousId: 'test-debug'
            }),
            headers: {
                'X-Anonymous-User': 'true'
                // Missing Content-Type
            }
        }
    ];
    
    for (const scenario of scenarios) {
        console.log(`\n📋 Testing: ${scenario.name}`);
        console.log(`   URL: ${scenario.url}`);
        console.log(`   Method: ${scenario.method}`);
        
        try {
            const requestOptions = {
                method: scenario.method,
                headers: scenario.headers
            };
            
            if (scenario.body) {
                requestOptions.body = scenario.body;
            }
            
            const response = await fetch(scenario.url, requestOptions);
            
            console.log(`✅ Status: ${response.status}`);
            const contentType = response.headers.get('content-type');
            console.log(`📄 Content-Type: ${contentType}`);
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    const data = await response.json();
                    console.log(`✅ JSON Response: Success`);
                    if (data.error) {
                        console.log(`   🔍 API Error: ${data.error}`);
                    } else if (data.subtitles) {
                        console.log(`   🎬 Subtitles: ${data.subtitles.length} results`);
                    }
                } catch (jsonError) {
                    console.log(`❌ JSON Parse Error: ${jsonError.message}`);
                }
            } else {
                const text = await response.text();
                const preview = text.substring(0, 100);
                console.log(`⚠️  HTML Response (first 100 chars): ${preview}...`);
                
                if (text.includes('<!DOCTYPE html>')) {
                    console.log(`🔍 This is the HTML error that causes "Unexpected token '<'"!`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Network Error: ${error.message}`);
        }
    }
    
    console.log('\n🎯 Summary');
    console.log('==========');
    console.log('The "Unexpected token \'<\', "<html>" error occurs when:');
    console.log('1. Wrong API endpoint URL (returns HTML 404 page)');
    console.log('2. Wrong HTTP method (GET instead of POST)');
    console.log('3. Server not running on expected port');
    console.log('4. Request hits Next.js page router instead of API router');
    console.log('');
    console.log('✅ Solutions:');
    console.log('- Check the exact API endpoint: /api/youtube/extract');
    console.log('- Use POST method with Content-Type: application/json');
    console.log('- Verify server is running on the correct port');
    console.log('- Add error handling to check Content-Type before parsing JSON');
}

// Run the debug test
debugHTMLError().catch(console.error);
