// Direct test of yt-dlp performance to isolate the issue
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');

const execPromise = promisify(exec);

async function testYtDlpPerformance() {
  const videoId = 'dQw4w9WgXcQ'; // Rick Roll
  
  console.log(`Testing yt-dlp performance for video ID: ${videoId}`);
  
  // Create temp directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fetchsub-test-'));
  const subtitlePath = path.join(tempDir, 'subtitle');
  
  try {
    console.log('\n1. Testing regular subtitles extraction...');
    const regularStartTime = Date.now();
    
    try {
      const regularSubCommand = `yt-dlp --no-warnings --skip-download --write-sub --sub-format vtt --no-check-certificate --socket-timeout 3 --retries 1 --concurrent-fragments 3 --no-playlist --no-write-description --no-write-info-json --no-write-thumbnail --no-write-annotations --output "${subtitlePath}" -- ${videoId}`;
      
      await Promise.race([
        execPromise(regularSubCommand),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT: Regular subtitles timed out')), 4000)
        )
      ]);
      
      const regularEndTime = Date.now();
      const regularDuration = regularEndTime - regularStartTime;
      
      // Check for VTT files
      const vttFiles = fs.readdirSync(tempDir).filter(file => file.endsWith('.vtt'));
      
      if (vttFiles.length > 0) {
        console.log(`✅ Regular subtitles SUCCESS! Duration: ${regularDuration}ms`);
        console.log(`Found VTT files: ${vttFiles.join(', ')}`);
        
        // Read and check content
        const vttFilePath = path.join(tempDir, vttFiles[0]);
        const vttContent = fs.readFileSync(vttFilePath, 'utf8');
        console.log(`Content length: ${vttContent.length} characters`);
        console.log(`First 200 characters: ${vttContent.substring(0, 200)}...`);
        
        return; // Success, no need to test auto-generated
      } else {
        console.log(`⚠️ Regular subtitles completed but no VTT files found. Duration: ${regularDuration}ms`);
      }
      
    } catch (regularError) {
      const regularEndTime = Date.now();
      const regularDuration = regularEndTime - regularStartTime;
      console.log(`❌ Regular subtitles FAILED! Duration: ${regularDuration}ms`);
      console.log(`Error: ${regularError.message}`);
    }
    
    console.log('\n2. Testing auto-generated subtitles extraction...');
    const autoStartTime = Date.now();
    
    try {
      const autoSubCommand = `yt-dlp --no-warnings --skip-download --write-auto-sub --sub-format vtt --no-check-certificate --socket-timeout 3 --retries 1 --concurrent-fragments 3 --no-playlist --no-write-description --no-write-info-json --no-write-thumbnail --no-write-annotations --output "${subtitlePath}" -- ${videoId}`;
      
      await Promise.race([
        execPromise(autoSubCommand),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT: Auto-generated subtitles timed out')), 4000)
        )
      ]);
      
      const autoEndTime = Date.now();
      const autoDuration = autoEndTime - autoStartTime;
      
      // Check for auto-generated VTT files
      const autoFiles = fs.readdirSync(tempDir);
      const autoVttFiles = autoFiles.filter(file => file.endsWith('.vtt'));
      
      if (autoVttFiles.length > 0) {
        console.log(`✅ Auto-generated subtitles SUCCESS! Duration: ${autoDuration}ms`);
        console.log(`Found VTT files: ${autoVttFiles.join(', ')}`);
        
        // Read and check content
        const vttFilePath = path.join(tempDir, autoVttFiles[0]);
        const vttContent = fs.readFileSync(vttFilePath, 'utf8');
        console.log(`Content length: ${vttContent.length} characters`);
        console.log(`First 200 characters: ${vttContent.substring(0, 200)}...`);
      } else {
        console.log(`❌ Auto-generated subtitles completed but no VTT files found. Duration: ${autoDuration}ms`);
      }
      
    } catch (autoError) {
      const autoEndTime = Date.now();
      const autoDuration = autoEndTime - autoStartTime;
      console.log(`❌ Auto-generated subtitles FAILED! Duration: ${autoDuration}ms`);
      console.log(`Error: ${autoError.message}`);
    }
    
  } finally {
    // Clean up
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`\n🧹 Cleaned up temp directory: ${tempDir}`);
    } catch (cleanupError) {
      console.log(`⚠️ Cleanup error: ${cleanupError.message}`);
    }
  }
}

testYtDlpPerformance().catch(console.error);
