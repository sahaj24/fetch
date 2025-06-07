#!/usr/bin/env node

const { chromium } = require('playwright');

async function testStatePersistenceFix() {
  console.log('🧪 Testing State Persistence Fix with startTransition');
  console.log('=================================================');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('📱 Opening application at http://localhost:3003...');
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });

    // Set up localStorage with results state manually
    console.log('💾 Setting up localStorage with results state...');
    await page.evaluate(() => {
      localStorage.setItem('fetchsub_activeTab', 'results');
      localStorage.setItem('fetchsub_hasResults', 'true');
      localStorage.setItem('fetchsub_subtitles', JSON.stringify([
        {
          id: 'test-1',
          videoTitle: 'Test Video',
          language: 'English', 
          format: 'CLEAN_TEXT',
          content: 'This is test content',
          url: 'https://youtube.com/watch?v=test',
          fileSize: '1KB'
        }
      ]));
      localStorage.setItem('fetchsub_selectedFormats', JSON.stringify(['CLEAN_TEXT', 'SRT']));
      localStorage.setItem('fetchsub_selectedLanguage', 'en');
    });

    // Force refresh to trigger state restoration
    console.log('🔄 Refreshing page to trigger state restoration...');
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for state restoration to complete
    await page.waitForTimeout(2000);

    // Check which tab is active
    const activeTab = await page.evaluate(() => {
      const activeTabTrigger = document.querySelector('[data-state="active"]');
      return activeTabTrigger ? activeTabTrigger.textContent.trim() : 'unknown';
    });

    console.log(`📍 Active tab after refresh: "${activeTab}"`);

    // Check if results tab is enabled
    const resultsTabEnabled = await page.evaluate(() => {
      const resultsTab = document.querySelector('[value="results"]');
      return resultsTab ? !resultsTab.disabled : false;
    });

    console.log(`📍 Results tab enabled: ${resultsTabEnabled}`);

    // Check console logs for our debug messages
    console.log('📜 Checking browser console logs...');
    const logs = await page.evaluate(() => {
      return window.console.history || [];
    });

    // Listen for console messages during restoration
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.text().includes('restoreState') || msg.text().includes('startTransition')) {
        consoleMessages.push(msg.text());
      }
    });

    // Test results
    console.log('\n📊 TEST RESULTS');
    console.log('===============');
    
    if (activeTab === '3. Results') {
      console.log('✅ SUCCESS: State restoration working correctly!');
      console.log('   ✓ Active tab is Results');
      console.log('   ✓ User would see their processing results');
    } else {
      console.log('❌ FAILURE: State restoration not working');
      console.log(`   ✗ Expected: "3. Results", Got: "${activeTab}"`);
      console.log(`   ✗ Results tab enabled: ${resultsTabEnabled}`);
    }

    if (consoleMessages.length > 0) {
      console.log('\n🔍 Console messages captured:');
      consoleMessages.forEach(msg => console.log(`   ${msg}`));
    }

    // Check final localStorage state
    const finalState = await page.evaluate(() => {
      return {
        activeTab: localStorage.getItem('fetchsub_activeTab'),
        hasResults: localStorage.getItem('fetchsub_hasResults'),
        subtitles: localStorage.getItem('fetchsub_subtitles')
      };
    });

    console.log('\n📦 Final localStorage state:');
    console.log(`  activeTab: ${finalState.activeTab}`);
    console.log(`  hasResults: ${finalState.hasResults}`);
    console.log(`  subtitles: ${finalState.subtitles ? 'Present' : 'Missing'}`);

    // Keep browser open for manual inspection
    console.log('\n⏳ Keeping browser open for 20 seconds for manual verification...');
    console.log('   Check the UI to confirm the results tab is active and accessible');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testStatePersistenceFix().catch(console.error);
