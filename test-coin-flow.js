const fetch = require('node-fetch');

async function testCoinDeductionFlow() {
  console.log('🧪 Testing coin deduction flow with detailed logging...\n');
  
  // Test with a simple YouTube URL
  const testData = {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    formats: ['txt'],
    language: 'en',
    inputType: 'url'
  };
  
  console.log('📤 Making request to extract API (no auth - should create anonymous user)...');
  
  try {
    const response = await fetch('http://localhost:3002/api/youtube/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Anonymous-User': 'true'  // This should trigger anonymous user flow
      },
      body: JSON.stringify({
        ...testData,
        anonymousId: 'test-anonymous-' + Date.now()
      })
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log('📋 Response preview (first 500 chars):', responseText.substring(0, 500));
    
    if (response.status === 200) {
      console.log('\n✅ Anonymous request successful - this shows the API is working');
      console.log('👀 Check server logs above for coin deduction details');
    } else {
      console.log('\n❌ Request failed');
    }
    
  } catch (error) {
    console.error('💥 Error making request:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Now testing with a mock authenticated user...\n');
  
  // Test 2: Try with a fake but properly formatted auth token
  try {
    const fakeAuthToken = 'fake-auth-token-for-testing';
    
    console.log('📤 Making request with fake auth token (should fail auth but show flow)...');
    
    const response2 = await fetch('http://localhost:3002/api/youtube/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fakeAuthToken}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`📊 Auth Test Response Status: ${response2.status}`);
    console.log(`📊 Auth Test Response Status Text: ${response2.statusText}`);
    
    const authResponseText = await response2.text();
    console.log('📋 Auth Response:', authResponseText);
    
    if (response2.status === 401) {
      console.log('\n✅ Authentication properly rejected fake token - this is expected');
    }
    
  } catch (error) {
    console.error('💥 Error in auth test:', error);
  }
}

testCoinDeductionFlow();
