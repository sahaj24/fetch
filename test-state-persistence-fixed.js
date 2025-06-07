#!/usr/bin/env node

// Simple test to verify state persistence after the fixes
console.log('🧪 Testing State Persistence Fixes');
console.log('==================================\n');

const { chromium } = require('playwright');

async function testStatePersistence() {
  let browser, page;
  
  try {
    // Launch browser with visible window for debugging
    browser = await chromium.launch({ 
      headless: false, 
      devtools: true,
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    page = await browser.newPage();

    // Navigate to the application
    console.log('📱 Opening application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for the page to fully load
    await page.waitForTimeout(2000);

    // Step 1: Test manual state persistence
    console.log('\n🧪 TEST 1: Manual State Persistence');
    console.log('=====================================');

    // Set state manually in localStorage
    console.log('💾 Setting test state in localStorage...');
    await page.evaluate(() => {
      localStorage.clear(); // Clear any existing state
      localStorage.setItem('fetchsub_activeTab', 'results');
      localStorage.setItem('fetchsub_hasResults', 'true');
      localStorage.setItem('fetchsub_subtitles', JSON.stringify([
        {
          id: 'test-1',
          videoTitle: 'Test Video',
          language: 'English',
          format: 'CLEAN_TEXT',
          content: 'This is test content'
        }
      ]));
      localStorage.setItem('fetchsub_selectedFormats', '["CLEAN_TEXT", "SRT"]');
      localStorage.setItem('fetchsub_selectedLanguage', 'en');
      console.log('✅ Test state set in localStorage');
    });

    // Refresh the page to test restoration
    console.log('🔄 Refreshing page to test state restoration...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check if we're on the results tab
    const activeTabAfterRefresh = await page.evaluate(() => {
      const activeTab = document.querySelector('[data-state="active"]');
      return activeTab ? activeTab.textContent.trim() : 'not found';
    });

    console.log(`📍 Active tab after refresh: "${activeTabAfterRefresh}"`);

    // Check console logs for our debug messages
    console.log('\n📜 Checking browser console logs...');
    page.on('console', msg => {
      if (msg.text().includes('🚀') || msg.text().includes('🔄') || msg.text().includes('💾') || msg.text().includes('✅')) {
        console.log(`Browser: ${msg.text()}`);
      }
    });

    // Wait a bit to collect logs
    await page.waitForTimeout(2000);

    // Step 2: Check localStorage after restoration
    const finalState = await page.evaluate(() => {
      const state = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fetchsub_')) {
          state[key] = localStorage.getItem(key);
        }
      }
      return state;
    });

    console.log('\n📦 Final localStorage state:');
    Object.entries(finalState).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    // Step 3: Test if Results tab is accessible
    console.log('\n🧪 TEST 2: Results Tab Accessibility');
    console.log('====================================');

    try {
      const resultsTabButton = await page.locator('[value="results"]');
      const isResultsTabEnabled = await resultsTabButton.isEnabled();
      console.log(`🎯 Results tab enabled: ${isResultsTabEnabled}`);

      if (isResultsTabEnabled) {
        await resultsTabButton.click();
        await page.waitForTimeout(1000);
        
        const finalActiveTab = await page.evaluate(() => {
          const activeTab = document.querySelector('[data-state="active"]');
          return activeTab ? activeTab.textContent.trim() : 'not found';
        });
        
        console.log(`📍 After clicking results tab: "${finalActiveTab}"`);
        
        if (finalActiveTab.includes('Results') || finalActiveTab.includes('3.')) {
          console.log('✅ SUCCESS: Results tab is accessible and working!');
        } else {
          console.log('❌ FAILURE: Results tab click did not work properly');
        }
      } else {
        console.log('❌ FAILURE: Results tab is not enabled');
      }
    } catch (error) {
      console.log('❌ FAILURE: Could not test results tab -', error.message);
    }

    // Step 4: Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('===============');

    const expectedTab = 'results';
    const actualTabText = activeTabAfterRefresh.toLowerCase();
    const isOnResultsTab = actualTabText.includes('results') || actualTabText.includes('3.');

    if (isOnResultsTab) {
      console.log('✅ SUCCESS: State persistence is working!');
      console.log('   ✓ Page restored to results tab after refresh');
      console.log('   ✓ localStorage state was properly restored');
    } else {
      console.log('❌ FAILURE: State persistence is not working');
      console.log(`   ✗ Expected: results tab, Got: "${activeTabAfterRefresh}"`);
      console.log('   ✗ State restoration failed');
    }

    // Keep browser open for manual inspection
    console.log('\n⏳ Keeping browser open for 30 seconds for manual inspection...');
    console.log('   Check the browser console for debug logs');
    console.log('   Verify the current tab and localStorage state');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if Playwright is available
try {
  require('playwright');
  testStatePersistence();
} catch (error) {
  console.log('❌ Playwright not available. Please install it:');
  console.log('   npm install playwright');
  console.log('   npx playwright install');
}
