const fetch = require('node-fetch');

async function testAuthenticatedCoinDeduction() {
  console.log('Testing coin deduction for authenticated user...\n');
  
  // Use a real YouTube URL for testing
  const testData = {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    format: 'txt',
    language: 'en'
  };
  
  // You'll need to provide a real authentication token here
  // This should be a JWT token from Supabase for a logged-in user
  const authToken = 'REPLACE_WITH_REAL_TOKEN'; // Replace this with actual token
  
  console.log('Making request to extract API with auth token...');
  
  try {
    const response = await fetch('http://localhost:3000/api/youtube/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log('Response:', responseText);
    
    if (response.status === 200) {
      console.log('\n✅ Request successful - check server logs for coin deduction details');
    } else {
      console.log('\n❌ Request failed');
    }
    
  } catch (error) {
    console.error('Error making request:', error);
  }
}

// Note: You need to replace 'REPLACE_WITH_REAL_TOKEN' with an actual JWT token
if (process.argv[2] && process.argv[2] !== 'REPLACE_WITH_REAL_TOKEN') {
  console.log('Running test with provided token...');
  testAuthenticatedCoinDeduction();
} else {
  console.log('❌ Please provide a real JWT token as a command line argument:');
  console.log('node test-real-auth.js YOUR_JWT_TOKEN');
  console.log('\nTo get a JWT token:');
  console.log('1. Log into your app in the browser');
  console.log('2. Open browser dev tools');
  console.log('3. Check localStorage or check the Authorization header in network requests');
  console.log('4. Copy the JWT token and use it as the argument');
}
