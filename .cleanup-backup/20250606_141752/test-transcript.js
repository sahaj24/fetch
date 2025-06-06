// Test script to directly test transcript extraction
const { YoutubeTranscript } = require('youtube-transcript');

async function testTranscript() {
  try {
    // Test with multiple videos to see which ones work
    const videoUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Astley
      'https://www.youtube.com/watch?v=LDU_Txk06tM', // Celine Dion
      'https://www.youtube.com/watch?v=kJQP7kiw5Fk', // Luis Fonsi - Despacito
      'https://www.youtube.com/watch?v=9bZkp7q19f0'  // PSY - Gangnam Style
    ];
    
    for (const videoUrl of videoUrls) {
      console.log('\nTesting transcript extraction for:', videoUrl);
      console.log('=====================================');
      
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
        
        console.log('Raw transcript items:');
        console.log('First 5 items:', transcript.slice(0, 5));
        console.log('Total items:', transcript.length);
        
        if (transcript.length > 0) {
          // Test different processing scenarios
          console.log('\n1. Basic text extraction:');
          const basicText = transcript.map(item => item.text).join(' ');
          console.log(basicText.substring(0, 200) + '...');
          
          console.log('\n2. With HTML entities:');
          const withEntities = transcript.find(item => item.text.includes('&'));
          if (withEntities) {
            console.log('Found item with entities:', withEntities.text);
          } else {
            console.log('No HTML entities found in this transcript');
          }
          
          console.log('\n3. Multi-line items:');
          const multiLine = transcript.find(item => item.text.includes('\n'));
          if (multiLine) {
            console.log('Found multi-line item:', JSON.stringify(multiLine.text));
          } else {
            console.log('No multi-line items found');
          }
          
          console.log('\n4. Time information:');
          console.log('Sample timing:', {
            text: transcript[0].text,
            offset: transcript[0].offset,
            duration: transcript[0].duration
          });
          
          break; // Found working video, exit loop
        } else {
          console.log('No transcript items found for this video');
        }
        
      } catch (videoError) {
        console.error('Error with this video:', videoError.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTranscript();
