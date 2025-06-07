// Test the cost estimation logic thoroughly
console.log('=== COMPREHENSIVE COST ESTIMATION TEST ===');

const OPERATION_COSTS = {
  BASE_PLAYLIST_COST: 1,
  BASE_CSV_COST: 1,
  BASE_SINGLE_COST: 1,
  SINGLE_SUBTITLE: 1,
  BATCH_SUBTITLE: 0.5,
};

console.log('OPERATION_COSTS:', OPERATION_COSTS);

function calculateCoinCost(videoCount, selectedFormats, isPlaylist) {
  console.log(`\n--- Testing: videoCount=${videoCount}, formats=${selectedFormats.length}, isPlaylist=${isPlaylist} ---`);
  
  let baseCost = 0;
  
  if (isPlaylist) {
    baseCost = videoCount * OPERATION_COSTS.BATCH_SUBTITLE * selectedFormats.length;
    console.log(`Playlist: ${videoCount} × ${OPERATION_COSTS.BATCH_SUBTITLE} × ${selectedFormats.length} = ${baseCost}`);
  } else {
    if (videoCount > 1) {
      baseCost = videoCount * OPERATION_COSTS.BATCH_SUBTITLE * selectedFormats.length;
      console.log(`Multiple videos: ${videoCount} × ${OPERATION_COSTS.BATCH_SUBTITLE} × ${selectedFormats.length} = ${baseCost}`);
    } else {
      baseCost = OPERATION_COSTS.SINGLE_SUBTITLE * selectedFormats.length;
      console.log(`Single video: ${OPERATION_COSTS.SINGLE_SUBTITLE} × ${selectedFormats.length} = ${baseCost}`);
    }
  }
  
  const total = Math.max(baseCost, 1);
  console.log(`Final: Math.max(${baseCost}, 1) = ${total}`);
  return total;
}

// Test all scenarios that might be problematic
const formats = ['CLEAN_TEXT', 'SRT'];

console.log('\n=== EDGE CASES THAT MIGHT CAUSE ISSUES ===');

// Edge case 1: Empty formats array
console.log('\n🔍 TEST: Empty formats array');
try {
  const result = calculateCoinCost(1, [], false);
  console.log(`Result: ${result} (should be 1 due to Math.max)`);
} catch (error) {
  console.log(`ERROR: ${error.message}`);
}

// Edge case 2: Zero video count
console.log('\n🔍 TEST: Zero video count');
try {
  const result = calculateCoinCost(0, formats, false);
  console.log(`Result: ${result} (should be 1 due to Math.max)`);
} catch (error) {
  console.log(`ERROR: ${error.message}`);
}

// Edge case 3: Negative values
console.log('\n🔍 TEST: Negative video count');
try {
  const result = calculateCoinCost(-1, formats, false);
  console.log(`Result: ${result} (should be 1 due to Math.max)`);
} catch (error) {
  console.log(`ERROR: ${error.message}`);
}

// Edge case 4: Very large numbers
console.log('\n🔍 TEST: Large video count');
try {
  const result = calculateCoinCost(1000, formats, true);
  console.log(`Result: ${result} (should be 1000 coins)`);
} catch (error) {
  console.log(`ERROR: ${error.message}`);
}

// Edge case 5: Non-integer video count
console.log('\n🔍 TEST: Decimal video count');
try {
  const result = calculateCoinCost(2.5, formats, false);
  console.log(`Result: ${result} (should handle decimals)`);
} catch (error) {
  console.log(`ERROR: ${error.message}`);
}

console.log('\n=== COMMON USER SCENARIOS ===');

// Common scenario 1: Default single video
console.log('\n🎯 SCENARIO: Default single video with 2 formats');
calculateCoinCost(1, formats, false);

// Common scenario 2: YouTube playlist
console.log('\n🎯 SCENARIO: YouTube playlist with 10 videos');
calculateCoinCost(10, formats, true);

// Common scenario 3: CSV file
console.log('\n🎯 SCENARIO: CSV file with 5 videos');
calculateCoinCost(5, formats, false);

// Common scenario 4: Single format
console.log('\n🎯 SCENARIO: Single video, single format');
calculateCoinCost(1, ['SRT'], false);

console.log('\n=== POTENTIAL ISSUE CHECKS ===');

// Check if OPERATION_COSTS values are correct
console.log('\n🔍 Checking OPERATION_COSTS values:');
console.log(`SINGLE_SUBTITLE: ${OPERATION_COSTS.SINGLE_SUBTITLE} (should be 1)`);
console.log(`BATCH_SUBTITLE: ${OPERATION_COSTS.BATCH_SUBTITLE} (should be 0.5)`);

if (OPERATION_COSTS.SINGLE_SUBTITLE !== 1) {
  console.log('❌ SINGLE_SUBTITLE is not 1!');
}
if (OPERATION_COSTS.BATCH_SUBTITLE !== 0.5) {
  console.log('❌ BATCH_SUBTITLE is not 0.5!');
}

// Check for common calculation errors
console.log('\n🔍 Testing calculation precision:');
const precisionTest1 = 3 * 0.5 * 2; // Should be 3
const precisionTest2 = Math.max(0.5, 1); // Should be 1
console.log(`3 × 0.5 × 2 = ${precisionTest1} (should be 3)`);
console.log(`Math.max(0.5, 1) = ${precisionTest2} (should be 1)`);

console.log('\n=== TEST COMPLETE ===');
console.log('If any of the above shows unexpected results, there may be an issue with the cost calculation logic.');
