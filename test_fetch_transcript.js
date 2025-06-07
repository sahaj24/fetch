// Direct test of the fetchTranscript function to isolate performance issues
const { fetchTranscript } = require('./src/app/api/youtube/extract/utils.ts');

async function testFetchTranscript() {
  const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll
  
  console.log(`Testing fetchTranscript for video ID: ${testVideoId}`);
  
  const startTime = Date.now();
  
  try {
    const transcript = await fetchTranscript(testVideoId, 'en');
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Success! Duration: ${duration}ms`);
    console.log(`Transcript items: ${transcript.length}`);
    console.log(`First item: ${transcript[0]?.text?.substring(0, 100)}...`);
    console.log(`Performance target: ${duration < 5000 ? '✅ PASSED' : '❌ FAILED'} (< 5000ms)`);
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`❌ Failed! Duration: ${duration}ms`);
    console.log(`Error: ${error.message}`);
  }
}

testFetchTranscript().catch(console.error);
