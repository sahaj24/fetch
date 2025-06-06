// Test the improved parsing with real VTT data
const fs = require('fs');

// Read the VTT file we downloaded earlier
const vttPath = "/tmp/Rick Astley - Never Gonna Give You Up (Official Music Video).en.vtt";
const vttContent = fs.readFileSync(vttPath, 'utf8');

// Copy the improved parsing functions
function parseVttContent(vttContent) {
  const lines = vttContent.split(/\r?\n/);
  const transcript = [];
  
  let currentText = '';
  let currentStart = 0;
  let currentDuration = 0;
  let inSubtitleBlock = false;
  
  // Skip the header lines (WEBVTT and other metadata)
  let i = 0;
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }
  
  // Process each subtitle block
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Time line (start --> end)
    if (line.includes('-->')) {
      // Save previous block if it exists
      if (inSubtitleBlock && currentText) {
        transcript.push({
          text: cleanVttText(currentText),
          offset: currentStart,
          duration: currentDuration
        });
      }
      
      // Parse timing, ignoring VTT positioning attributes
      const timePart = line.split('-->');
      if (timePart.length >= 2) {
        const startTime = timePart[0].trim();
        const endTimePart = timePart[1].trim().split(' ')[0]; // Remove positioning attributes
        currentStart = parseVttTime(startTime);
        const end = parseVttTime(endTimePart);
        currentDuration = end - currentStart;
      }
      
      // Reset for new block
      currentText = '';
      inSubtitleBlock = true;
    }
    // Text line
    else if (line && !line.match(/^\d+$/) && !line.match(/^WEBVTT/) && !line.match(/^Kind:|^Language:/)) {
      // Skip lines that are just whitespace or positioning info
      if (line.match(/^align:|^position:|^\s*$/)) {
        continue;
      }
      
      // For auto-generated subtitles, prefer lines without inline timing tags
      const hasTimingTags = line.includes('<') && line.includes('>');
      const cleanedLine = cleanVttText(line);
      
      if (!hasTimingTags && cleanedLine) {
        // Prefer clean lines without timing tags
        currentText = cleanedLine;
      } else if (!currentText && cleanedLine) {
        // Use tagged line if it's the only option
        currentText = cleanedLine;
      }
    }
    // Empty line - end of a subtitle block
    else if (!line && inSubtitleBlock && currentText) {
      transcript.push({
        text: cleanVttText(currentText),
        offset: currentStart,
        duration: currentDuration
      });
      currentText = '';
      inSubtitleBlock = false;
    }
  }
  
  // Handle the last block if it exists
  if (inSubtitleBlock && currentText) {
    transcript.push({
      text: cleanVttText(currentText),
      offset: currentStart,
      duration: currentDuration
    });
  }
  
  return transcript;
}

function cleanVttText(text) {
  if (!text) return '';
  
  return text
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
    .replace(/<\/?[cv][^>]*>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/align:start position:\d+%/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseVttTime(timeString) {
  let match;
  let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;
  
  match = timeString.match(/(\d+):(\d+):(\d+)\.(\d+)/);
  if (match) {
    hours = parseInt(match[1]);
    minutes = parseInt(match[2]);
    seconds = parseInt(match[3]);
    milliseconds = parseInt(match[4]);
  } else {
    match = timeString.match(/(\d+):(\d+)\.(\d+)/);
    if (match) {
      minutes = parseInt(match[1]);
      seconds = parseInt(match[2]);
      milliseconds = parseInt(match[3]);
    }
  }
  
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
}

// Test the improved parsing
console.log('Testing improved VTT parsing:');
console.log('==============================');

const transcript = parseVttContent(vttContent);
console.log('Transcript items found:', transcript.length);

if (transcript.length > 0) {
  console.log('\nFirst 10 items:');
  transcript.slice(0, 10).forEach((item, i) => {
    console.log(`${i + 1}. [${item.offset}ms-${item.offset + item.duration}ms]: "${item.text}"`);
  });
  
  // Test clean text generation
  console.log('\nCombined text (first 300 chars):');
  const combinedText = transcript.map(item => item.text).join(' ');
  console.log(combinedText.substring(0, 300) + '...');
  
  // Show improvement comparison
  console.log('\nBefore/After comparison for complex items:');
  const complexItems = vttContent.split('\n').filter(line => 
    line.includes('<') && line.includes('>')
  ).slice(0, 3);
  
  complexItems.forEach((rawLine, i) => {
    console.log(`\n${i + 1}. Raw: "${rawLine}"`);
    console.log(`   Cleaned: "${cleanVttText(rawLine)}"`);
  });
}
