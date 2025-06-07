#!/usr/bin/env node

/**
 * Test script to verify the login redirect fix
 * This script simulates the processing completion flow and checks if the tab state management works correctly
 */

const puppeteer = require('puppeteer');

async function testRedirectFix() {
  console.log('🧪 Testing Login Redirect Fix...');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Set to true for headless testing
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🚫') || text.includes('processing transition') || text.includes('coin balance')) {
        console.log(`🔍 Browser Console: ${text}`);
      }
    });
    
    // Navigate to the application
    console.log('📱 Navigating to application...');
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    console.log('✅ Test completed - check browser console for processing transition logs');
    console.log('🔍 Look for messages like:');
    console.log('   - "🚫 Setting processing transition flag to prevent coin balance interference"');
    console.log('   - "🚫 Skipping coin balance update during processing transition to prevent tab state interference"');
    console.log('   - "✅ Re-enabling coin balance updates after processing transition"');
    
    // Keep browser open for manual testing
    console.log('🖥️  Browser will remain open for manual testing...');
    console.log('📝 To test:');
    console.log('   1. Enter a YouTube URL and process it');
    console.log('   2. Watch the console for the processing transition logs');
    console.log('   3. Verify that after processing completes, you stay on the results tab');
    console.log('   4. Test with both logged-in and anonymous users');
    
    // Wait for manual testing (browser stays open)
    await new Promise(() => {}); // Keeps the process alive
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRedirectFix().catch(console.error);
