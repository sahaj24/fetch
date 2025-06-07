#!/usr/bin/env node

// Comprehensive diagnosis of the current issues
console.log('🔬 COMPREHENSIVE DIAGNOSIS');
console.log('=========================\n');

const fs = require('fs');
const path = require('path');

// 1. Check if the state persistence code is actually in the file
console.log('1. 📁 Checking page.tsx file content...');
const pageTsxPath = '/Users/sahaj/Documents/fetch/src/app/page.tsx';

if (fs.existsSync(pageTsxPath)) {
  const content = fs.readFileSync(pageTsxPath, 'utf8');
  
  const checks = [
    { name: 'STORAGE_KEYS object', pattern: /STORAGE_KEYS\s*=\s*{/ },
    { name: 'saveState function', pattern: /const saveState = useCallback/ },
    { name: 'restoreState function', pattern: /const restoreState = useCallback/ },
    { name: 'clearSavedState function', pattern: /const clearSavedState = useCallback/ },
    { name: 'useEffect for restore', pattern: /useEffect\(\(\) => {\s*restoreState/ },
    { name: 'useEffect for save', pattern: /useEffect\(\(\) => {.*saveState/ },
    { name: 'handleTabChange function', pattern: /const handleTabChange = useCallback/ },
    { name: 'activeTab results switch', pattern: /setActiveTab\("results"\)/ },
    { name: 'localStorage operations', pattern: /localStorage\.setItem/ }
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.name} found`);
    } else {
      console.log(`❌ ${check.name} MISSING`);
    }
  });
  
  // Check the specific line where results tab is set
  const lines = content.split('\n');
  const resultsSwitchLines = lines.filter((line, index) => {
    if (line.includes('setActiveTab("results")')) {
      console.log(`📍 Line ${index + 1}: ${line.trim()}`);
      return true;
    }
    return false;
  });
  
  if (resultsSwitchLines.length > 0) {
    console.log(`✅ Found ${resultsSwitchLines.length} places where activeTab is set to "results"`);
  } else {
    console.log('❌ No places found where activeTab is set to "results"');
  }
  
} else {
  console.log('❌ page.tsx file not found!');
}

// 2. Check the key parts of the processing function
console.log('\n2. 🔄 Checking processing completion logic...');
if (fs.existsSync(pageTsxPath)) {
  const content = fs.readFileSync(pageTsxPath, 'utf8');
  
  // Look for the processing completion section
  const processCompletionRegex = /if \(extractedSubtitles.*?\{[\s\S]*?setActiveTab\("results"\)[\s\S]*?\}/;
  const match = content.match(processCompletionRegex);
  
  if (match) {
    console.log('✅ Processing completion section found:');
    console.log('---');
    console.log(match[0].split('\n').slice(0, 10).join('\n')); // First 10 lines
    console.log('...');
  } else {
    console.log('❌ Processing completion section not found or malformed');
  }
}

// 3. Check API route files
console.log('\n3. 🛜 Checking API routes...');
const apiRoutes = [
  '/Users/sahaj/Documents/fetch/src/app/api/youtube/extract/route.ts',
  '/Users/sahaj/Documents/fetch/src/app/api/youtube/languages/route.ts'
];

apiRoutes.forEach(routePath => {
  if (fs.existsSync(routePath)) {
    const content = fs.readFileSync(routePath, 'utf8');
    const routeName = path.basename(path.dirname(routePath));
    
    if (content.includes('Authentication required') || content.includes('401')) {
      console.log(`✅ ${routeName} has auth protection`);
    } else {
      console.log(`⚠️  ${routeName} may not have proper auth protection`);
    }
    
    if (content.includes('X-Anonymous-User')) {
      console.log(`✅ ${routeName} supports anonymous users`);
    } else {
      console.log(`❌ ${routeName} doesn't support anonymous users`);
    }
  } else {
    console.log(`❌ ${path.basename(path.dirname(routePath))} route not found`);
  }
});

// 4. Check dependencies and environment
console.log('\n4. 📦 Checking dependencies...');
const packageJsonPath = '/Users/sahaj/Documents/fetch/package.json';
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const importantDeps = ['next', 'react', '@supabase/supabase-js', 'zustand'];
  importantDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: not found`);
    }
  });
} else {
  console.log('❌ package.json not found');
}

// 5. Identify the likely root causes
console.log('\n5. 🎯 LIKELY ROOT CAUSES');
console.log('=======================');

console.log('\nBased on the tests performed, here are the most likely issues:');

console.log('\n📋 ISSUE 1: Authentication Flow');
console.log('- APIs require authentication (401/402 errors)');
console.log('- Anonymous mode may not be working properly');
console.log('- User gets redirected for auth but state persistence fails');

console.log('\n📋 ISSUE 2: State Timing');
console.log('- State might be saved too late in the process');
console.log('- Authentication redirect might clear localStorage');
console.log('- Page refresh during auth flow might reset state');

console.log('\n📋 ISSUE 3: Component Lifecycle');
console.log('- useEffect hooks might not be running at the right time');
console.log('- State restoration might be overridden by other code');
console.log('- Tab switching logic might conflict with state restoration');

console.log('\n🔧 RECOMMENDED FIXES');
console.log('====================');

console.log('\n1. 🔍 TEST STATE PERSISTENCE MANUALLY:');
console.log('   - Open browser DevTools → Application → Local Storage');
console.log('   - Manually set: fetchsub_activeTab = "results"');
console.log('   - Manually set: fetchsub_hasResults = "true"');
console.log('   - Refresh page and check if it goes to results tab');

console.log('\n2. 🔍 TEST WITHOUT AUTHENTICATION:');
console.log('   - Modify API routes to allow anonymous testing');
console.log('   - Test the complete flow without auth redirects');
console.log('   - Verify state persistence works in isolation');

console.log('\n3. 🔍 ADD MORE DETAILED LOGGING:');
console.log('   - Add console.log to every state persistence function');
console.log('   - Log when localStorage is read/written');
console.log('   - Log the complete state restoration process');

console.log('\n4. 🔍 TEST TIMING ISSUES:');
console.log('   - Add delays before/after state operations');
console.log('   - Test if setTimeout helps with timing');
console.log('   - Check if state is being overridden later');

console.log('\nTo help debug further, please:');
console.log('1. Try the manual localStorage test above');
console.log('2. Check browser DevTools console for any errors');
console.log('3. Describe the exact steps and what you see when you test');
console.log('4. Let me know if the manual localStorage test works or fails');
