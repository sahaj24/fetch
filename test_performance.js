async function testPerformance() {
  const testVideos = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll (should have subtitles)
    // 'https://www.youtube.com/watch?v=9bZkp7q19f0', // Popular Gangnam Style
    // 'https://www.youtube.com/watch?v=L_jWHffIx5E', // Smash Mouth - All Star
  ];

  console.log('Testing YouTube transcript extraction performance...\n');

  for (let i = 0; i < testVideos.length; i++) {
    const video = testVideos[i];
    console.log(`Test ${i + 1}: ${video}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3002/api/youtube/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Anonymous-User': 'true'
        },
        body: JSON.stringify({
          inputType: 'url',
          url: video,
          language: 'en',
          formats: ['TXT'],
          anonymousId: `test-user-${Date.now()}`
        })
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const data = await response.json();
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Duration: ${duration}ms`);
      console.log(`  Success: ${data.success || false}`);
      
      if (data.success && data.data && data.data.length > 0) {
        console.log(`  Video Title: ${data.data[0].videoTitle}`);
        console.log(`  Language: ${data.data[0].language}`);
        console.log(`  Content Length: ${data.data[0].content.length} characters`);
      } else if (data.error) {
        console.log(`  Error: ${data.error}`);
      }
      
      console.log(`  Target: ${duration < 5000 ? '✅ PASSED' : '❌ FAILED'} (< 5000ms)\n`);
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`  Duration: ${duration}ms`);
      console.log(`  Error: ${error.message}\n`);
    }
    
    // Wait a bit between requests to avoid overwhelming
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testPerformance().catch(console.error);
