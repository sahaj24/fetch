#!/usr/bin/env node

// Let's test the actual browser localStorage manually
const script = `
console.log('🧪 Manual localStorage Test');
console.log('============================');

// Clear existing state
localStorage.clear();

// Set test state
localStorage.setItem('fetchsub_activeTab', 'results');
localStorage.setItem('fetchsub_hasResults', 'true');
localStorage.setItem('fetchsub_subtitles', '[{"id":"test","title":"Test"}]');

console.log('💾 Test state set, now reload the page and check console');

// Function to check state after page loads
window.checkState = function() {
  console.log('📋 Checking current state...');
  console.log('activeTab from localStorage:', localStorage.getItem('fetchsub_activeTab'));
  console.log('hasResults from localStorage:', localStorage.getItem('fetchsub_hasResults'));
  
  const activeTab = document.querySelector('[data-state="active"]');
  console.log('Current active tab element:', activeTab);
  console.log('Current active tab text:', activeTab ? activeTab.textContent : 'not found');
  
  const resultsTab = document.querySelector('[value="results"]');
  console.log('Results tab element:', resultsTab);
  console.log('Results tab disabled:', resultsTab ? resultsTab.disabled : 'not found');
  
  return {
    localStorageTab: localStorage.getItem('fetchsub_activeTab'),
    localStorageResults: localStorage.getItem('fetchsub_hasResults'),
    currentActiveTab: activeTab ? activeTab.textContent : 'not found',
    resultsTabExists: !!resultsTab,
    resultsTabDisabled: resultsTab ? resultsTab.disabled : true
  };
};

console.log('✅ Test setup complete. After page reload, run: checkState()');
`;

console.log('📋 Browser Console Test Script');
console.log('==============================');
console.log('Copy and paste this into your browser console:');
console.log('');
console.log(script);
console.log('');
console.log('📝 Instructions:');
console.log('1. Open http://localhost:3000 in your browser');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Paste the script above and press Enter');
console.log('5. Reload the page (Ctrl+R / Cmd+R)');
console.log('6. In console, type: checkState() and press Enter');
console.log('7. Share the output with me');
