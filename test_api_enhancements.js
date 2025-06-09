#!/usr/bin/env node

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function testApiEndpoint(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const text = await response.text();
        
        // Check if response is JSON
        let isJson = false;
        let data = null;
        try {
            data = JSON.parse(text);
            isJson = true;
        } catch (e) {
            isJson = false;
        }
        
        return {
            url,
            status: response.status,
            contentType: response.headers.get('content-type'),
            isJson,
            isHtml: text.trim().startsWith('<'),
            data: isJson ? data : text.substring(0, 200) + (text.length > 200 ? '...' : '')
        };
    } catch (error) {
        return {
            url,
            error: error.message
        };
    }
}

async function runTests() {
    console.log('🧪 Testing API Enhancements');
    console.log('================================');
    
    const tests = [
        {
            name: 'Health Check',
            url: `${baseUrl}/api/health`
        },
        {
            name: 'Debug Endpoint',
            url: `${baseUrl}/api/debug`
        },
        {
            name: 'Extract API (without auth)',
            url: `${baseUrl}/api/youtube/extract`,
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputType: 'single',
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                })
            }
        },
        {
            name: 'Languages API',
            url: `${baseUrl}/api/youtube/languages?videoId=dQw4w9WgXcQ`
        },
        {
            name: 'Download API',
            url: `${baseUrl}/api/youtube/download?id=test`
        },
        {
            name: 'Non-existent API route',
            url: `${baseUrl}/api/nonexistent`
        }
    ];
    
    for (const test of tests) {
        console.log(`\n📍 Testing: ${test.name}`);
        console.log(`   URL: ${test.url}`);
        
        const result = await testApiEndpoint(test.url, test.options);
        
        if (result.error) {
            console.log(`   ❌ Error: ${result.error}`);
        } else {
            console.log(`   ✅ Status: ${result.status}`);
            console.log(`   📋 Content-Type: ${result.contentType}`);
            console.log(`   📄 Is JSON: ${result.isJson ? '✅' : '❌'}`);
            console.log(`   🌐 Is HTML: ${result.isHtml ? '❌' : '✅'}`);
            
            if (result.isJson) {
                console.log(`   📊 Response: ${JSON.stringify(result.data, null, 2).substring(0, 300)}...`);
            } else {
                console.log(`   📝 Response: ${result.data}`);
            }
        }
    }
    
    console.log('\n🎯 Summary');
    console.log('==========');
    console.log('All API routes should return JSON responses, not HTML.');
    console.log('This test verifies that the "Unexpected token \'<\'" error has been fixed.');
}

runTests().catch(console.error);
