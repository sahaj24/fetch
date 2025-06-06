// Direct test of improved functions without API authentication
const fs = require('fs');

// Test data - simulate what we'd get from improved VTT parsing
const mockTranscript = [
  { text: "We're no strangers to love", offset: 18800, duration: 3000 },
  { text: "You know the rules and so do I", offset: 22000, duration: 4000 },
  { text: "A full commitment's what I'm thinking of", offset: 27000, duration: 4000 },
  { text: "You wouldn't get this from any other guy", offset: 31000, duration: 4000 },
  { text: "I just wanna tell you how I'm feeling", offset: 35000, duration: 3500 },
  { text: "Gotta make you understand", offset: 38500, duration: 3000 },
  { text: "Never gonna give you up", offset: 42000, duration: 2500 },
  { text: "Never gonna let you down", offset: 44500, duration: 2500 },
  { text: "Never gonna run around and desert you", offset: 47000, duration: 3500 },
  { text: "Never gonna make you cry", offset: 50500, duration: 2500 },
  { text: "Never gonna say goodbye", offset: 53000, duration: 2500 },
  { text: "Never gonna tell a lie and hurt you", offset: 55500, duration: 3500 }
];

// Improved HTML entity decoder
const decodeHtmlEntities = (text) => {
  return text
    .replace(/&amp;#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)))
    .replace(/&amp;#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
};

// Test format generation
function testFormats() {
  console.log('Testing improved format generation:');
  console.log('===================================');
  
  // Clean transcript
  const cleanTranscript = mockTranscript.map(item => ({
    ...item,
    text: decodeHtmlEntities(item.text)
  }));
  
  // Test SRT format
  console.log('\n1. SRT Format:');
  console.log('==============');
  const srtContent = cleanTranscript.map((item, index) => {
    const startTime = formatSRTTime(item.offset / 1000);
    const endTime = formatSRTTime((item.offset + item.duration) / 1000);
    return `${index + 1}\n${startTime} --> ${endTime}\n${item.text}`;
  }).join('\n\n');
  console.log(srtContent.substring(0, 300) + '...');
  
  // Test CLEAN_TEXT format
  console.log('\n2. CLEAN_TEXT Format:');
  console.log('====================');
  let rawText = cleanTranscript.map(item => {
    let cleanedText = item.text
      .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '') 
      .replace(/<\/?[cv][^>]*>/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/align:start position:\d+%/g, '')
      .replace(/\[Music\]/gi, '')
      .replace(/\[Applause\]/gi, '')
      .replace(/\[Laughter\]/gi, '')
      .replace(/\[Silence\]/gi, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ');
    
    return cleanedText.trim();
  }).filter(text => text.length > 0).join(' ');
  
  // Fix punctuation and capitalization
  rawText = rawText
    .replace(/\s+([.!?,:;])/g, '$1')
    .replace(/([.!?])\s*([a-z])/g, '$1 $2')
    .replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())
    .replace(/\bwont\b/g, "won't")
    .replace(/\bdont\b/g, "don't")
    .replace(/\bcant\b/g, "can't")
    .replace(/\bweve\b/g, "we've")
    .replace(/\btheyre\b/g, "they're")
    .replace(/\byoure\b/g, "you're")
    .replace(/\bits\b/g, "it's")
    .replace(/\bim\b/gi, "I'm")
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log(rawText);
  
  // Test JSON format
  console.log('\n3. JSON Format (first 2 entries):');
  console.log('=================================');
  const jsonEntries = cleanTranscript.slice(0, 2).map((item, index) => ({
    id: index + 1,
    startTime: formatVTTTime(item.offset / 1000),
    endTime: formatVTTTime((item.offset + item.duration) / 1000),
    startSeconds: item.offset / 1000,
    endSeconds: (item.offset + item.duration) / 1000,
    text: item.text
  }));
  console.log(JSON.stringify(jsonEntries, null, 2));
}

// Helper functions
function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatVTTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

testFormats();
