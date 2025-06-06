// Test the fetchTranscript function directly
const path = require('path');

// Since we can't directly import TypeScript, let's test the youtube-transcript vs yt-dlp approach
const { YoutubeTranscript } = require('youtube-transcript');
const { execSync } = require('child_process');

async function testBothMethods() {
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  
  console.log('Testing both transcript methods:');
  console.log('================================');
  
  // Method 1: youtube-transcript library
  try {
    console.log('\n1. Testing youtube-transcript library:');
    const transcriptAPI = await YoutubeTranscript.fetchTranscript(testUrl);
    console.log('- Items found:', transcriptAPI.length);
    if (transcriptAPI.length > 0) {
      console.log('- Sample item:', {
        text: transcriptAPI[0].text,
        offset: transcriptAPI[0].offset,
        duration: transcriptAPI[0].duration
      });
      console.log('- First text preview:', transcriptAPI.slice(0, 3).map(i => i.text).join(' '));
    }
  } catch (error) {
    console.log('- youtube-transcript failed:', error.message);
  }
  
  // Method 2: yt-dlp fallback
  try {
    console.log('\n2. Testing yt-dlp fallback:');
    
    // Check if yt-dlp is available
    try {
      execSync('which yt-dlp', { stdio: 'ignore' });
    } catch {
      console.log('- yt-dlp not found, installing...');
      try {
        execSync('pip3 install yt-dlp', { stdio: 'inherit' });
      } catch {
        console.log('- Failed to install yt-dlp');
        return;
      }
    }
    
    // Extract video ID
    const videoId = testUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (!videoId) {
      console.log('- Invalid video ID');
      return;
    }
    
    console.log('- Video ID:', videoId);
    
    // Try to get subtitles with yt-dlp
    const command = `yt-dlp --write-auto-subs --sub-lang en --sub-format vtt --skip-download --output "/tmp/%(title)s.%(ext)s" "${testUrl}"`;
    console.log('- Running command:', command);
    
    try {
      const output = execSync(command, { encoding: 'utf8', timeout: 30000 });
      console.log('- yt-dlp output:', output.substring(0, 200) + '...');
      
      // Look for generated VTT files
      const fs = require('fs');
      const files = fs.readdirSync('/tmp').filter(f => f.includes('.en.vtt'));
      console.log('- VTT files found:', files.length);
      
      if (files.length > 0) {
        const vttPath = `/tmp/${files[0]}`;
        const vttContent = fs.readFileSync(vttPath, 'utf8');
        console.log('- VTT content preview (first 500 chars):');
        console.log(vttContent.substring(0, 500) + '...');
        
        // Clean up
        fs.unlinkSync(vttPath);
      }
      
    } catch (ytDlpError) {
      console.log('- yt-dlp command failed:', ytDlpError.message);
    }
    
  } catch (error) {
    console.log('- yt-dlp method failed:', error.message);
  }
}

testBothMethods();
