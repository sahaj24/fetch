// Test the current formatTranscript function
const { YoutubeTranscript } = require('youtube-transcript');

// Copy the current decodeHtmlEntities function
const decodeHtmlEntities = (text) => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

// Improved decodeHtmlEntities function
const improvedDecodeHtmlEntities = (text) => {
  return text
    // Handle named entities first
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Handle numbered entities like &#39; and &#x27;
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Handle double-encoded entities like &amp;#39;
    .replace(/&amp;#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&amp;#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
};

async function testDecoding() {
  try {
    const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
    
    console.log('Testing HTML entity decoding:');
    console.log('===============================');
    
    // Find items with HTML entities
    const itemsWithEntities = transcript.filter(item => 
      item.text.includes('&amp;') || item.text.includes('&#')
    );
    
    console.log(`Found ${itemsWithEntities.length} items with HTML entities:`);
    
    itemsWithEntities.slice(0, 5).forEach((item, index) => {
      console.log(`\n${index + 1}. Original:`, JSON.stringify(item.text));
      console.log(`   Current decoder:`, JSON.stringify(decodeHtmlEntities(item.text)));
      console.log(`   Improved decoder:`, JSON.stringify(improvedDecodeHtmlEntities(item.text)));
    });
    
    // Test with full CLEAN_TEXT formatting
    console.log('\n\nTesting CLEAN_TEXT format processing:');
    console.log('=====================================');
    
    // Simulate the CLEAN_TEXT processing from the current code
    let rawText = transcript.map(item => {
      let cleanedText = improvedDecodeHtmlEntities(item.text)
        .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '') 
        .replace(/<c>/g, '')
        .replace(/<\/c>/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\n/g, ' ');
      
      return cleanedText;
    }).join(' ');
    
    // Show first 300 characters
    console.log('Processed text (first 300 chars):');
    console.log(rawText.substring(0, 300));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDecoding();
