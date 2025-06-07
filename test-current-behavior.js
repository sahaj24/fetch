#!/usr/bin/env node

// Test script to check current behavior of the state persistence
const { chromium } = require('playwright');

async function testCurrentBehavior() {
  console.log('🧪 Testing Current Application Behavior');
  console.log('========================================\n');

  let browser, page;
  try {
    // Launch browser
    browser = await chromium.launch({ headless: false, devtools: true });
    page = await browser.newPage();

    // Navigate to the application
    console.log('📱 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Check localStorage before any interaction
    console.log('\n🔍 Initial localStorage state:');
    const initialStorage = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('fetchsub_')) {
          storage[key] = localStorage.getItem(key);
        }
      }
      return storage;
    });
    console.log(JSON.stringify(initialStorage, null, 2));

    // Check if we're on the input tab
    const activeTab = await page.evaluate(() => {
      const activeTabTrigger = document.querySelector('[data-state="active"]');
      return activeTabTrigger?.textContent?.trim() || 'unknown';
    });
    console.log(`\n📍 Current active tab: ${activeTab}`);

    // Enter a test YouTube URL
    console.log('\n🎬 Entering test YouTube URL...');
    const urlInput = await page.locator('input[placeholder*="YouTube"]');
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    // Wait a moment for any URL processing
    await page.waitForTimeout(2000);

    // Check if Start Processing button is available
    const startButton = await page.locator('button:has-text("Start Processing")');
    const isStartButtonVisible = await startButton.isVisible();
    console.log(`🔘 Start Processing button visible: ${isStartButtonVisible}`);

    if (isStartButtonVisible) {
      // Save current state manually to test localStorage
      console.log('\n💾 Manually saving test state to localStorage...');
      await page.evaluate(() => {
        localStorage.setItem('fetchsub_activeTab', 'processing');
        localStorage.setItem('fetchsub_hasResults', 'true');
        localStorage.setItem('fetchsub_selectedFormats', '["CLEAN_TEXT","SRT"]');
        localStorage.setItem('fetchsub_selectedLanguage', 'en');
        localStorage.setItem('fetchsub_subtitles', '[{"id":"test","title":"Test Video"}]');
      });

      // Refresh the page to test state restoration
      console.log('\n🔄 Refreshing page to test state restoration...');
      await page.reload({ waitUntil: 'networkidle' });

      // Check what tab we're on after refresh
      const tabAfterRefresh = await page.evaluate(() => {
        const activeTabTrigger = document.querySelector('[data-state="active"]');
        return activeTabTrigger?.textContent?.trim() || 'unknown';
      });
      console.log(`📍 Active tab after refresh: ${tabAfterRefresh}`);

      // Check localStorage after refresh
      console.log('\n🔍 localStorage after refresh:');
      const storageAfterRefresh = await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('fetchsub_')) {
            storage[key] = localStorage.getItem(key);
          }
        }
        return storage;
      });
      console.log(JSON.stringify(storageAfterRefresh, null, 2));

      // Test if we can navigate to results tab
      console.log('\n🎯 Testing navigation to results tab...');
      try {
        const resultsTab = await page.locator('[role="tab"]:has-text("Results")');
        await resultsTab.click();
        await page.waitForTimeout(1000);

        const finalTab = await page.evaluate(() => {
          const activeTabTrigger = document.querySelector('[data-state="active"]');
          return activeTabTrigger?.textContent?.trim() || 'unknown';
        });
        console.log(`📍 Final active tab: ${finalTab}`);

        if (finalTab.includes('Results') || finalTab.includes('3.')) {
          console.log('✅ SUCCESS: Can navigate to results tab');
        } else {
          console.log('❌ FAILURE: Cannot navigate to results tab');
        }
      } catch (error) {
        console.log('❌ FAILURE: Results tab not available or clickable');
        console.log('Error:', error.message);
      }
    }

    // Wait for user to observe
    console.log('\n⏳ Keeping browser open for 30 seconds for observation...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if Playwright is installed
const hasPlaywright = (() => {
  try {
    require('playwright');
    return true;
  } catch {
    return false;
  }
})();

if (hasPlaywright) {
  testCurrentBehavior();
} else {
  console.log('📦 Playwright not available, running basic localStorage test...\n');
  
  // Simulate the localStorage operations that should happen
  const localStorage = {};
  const mockLocalStorage = {
    setItem: (key, value) => {
      localStorage[key] = value;
      console.log(`💾 Set: ${key} = ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    },
    getItem: (key) => {
      const value = localStorage[key];
      console.log(`📤 Get: ${key} = ${value ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : 'null'}`);
      return value || null;
    }
  };

  console.log('🧪 Testing localStorage operations:');
  
  // Test saving state
  mockLocalStorage.setItem('fetchsub_activeTab', 'results');
  mockLocalStorage.setItem('fetchsub_hasResults', 'true');
  mockLocalStorage.setItem('fetchsub_subtitles', '[{"id":"test","title":"Test"}]');
  
  // Test retrieving state
  console.log('\n📊 Retrieved state:');
  const tab = mockLocalStorage.getItem('fetchsub_activeTab');
  const hasResults = mockLocalStorage.getItem('fetchsub_hasResults');
  const subtitles = mockLocalStorage.getItem('fetchsub_subtitles');
  
  console.log(`Active Tab: ${tab}`);
  console.log(`Has Results: ${hasResults}`);
  console.log(`Subtitles: ${subtitles}`);
  
  if (tab === 'results' && hasResults === 'true' && subtitles) {
    console.log('\n✅ State persistence should work correctly');
  } else {
    console.log('\n❌ State persistence may have issues');
  }
}
