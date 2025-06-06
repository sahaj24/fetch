// Test the actual API endpoint
async function testAPI() {
  try {
    const testPayload = {
      inputType: "url",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      formats: ["CLEAN_TEXT", "SRT"],
      language: "en",
      videoCount: 1,
      coinCostEstimate: 1
    };
    
    console.log('Testing API endpoint...');
    console.log('======================');
    
    const response = await fetch('http://localhost:3002/api/youtube/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      return;
    }
    
    const result = await response.json();
    console.log('API Response:');
    console.log('Subtitles found:', result.subtitles?.length || 0);
    
    if (result.subtitles && result.subtitles.length > 0) {
      result.subtitles.forEach((subtitle, index) => {
        console.log(`\n${index + 1}. Format: ${subtitle.format}, Language: ${subtitle.language}`);
        console.log('Content preview (first 200 chars):');
        console.log(subtitle.content.substring(0, 200) + '...');
        console.log('Content length:', subtitle.content.length);
      });
    } else {
      console.log('No subtitles returned');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAPI();
