// Test cost calculation logic
const OPERATION_COSTS = {
  BASE_PLAYLIST_COST: 1, // Base cost for playlist
  BASE_CSV_COST: 1,      // Base cost for CSV file
  BASE_SINGLE_COST: 1,   // Base cost for single video
  SINGLE_SUBTITLE: 1,    // Cost per format for single video
  BATCH_SUBTITLE: 0.5,   // Cost per format for batch (discount)
};

function calculateCoinCost(videoCount, selectedFormats, isPlaylist) {
  console.log('=== COST CALCULATION DEBUG ===');
  console.log('Input params:', { videoCount, selectedFormatsLength: selectedFormats.length, isPlaylist });
  console.log('OPERATION_COSTS:', OPERATION_COSTS);
  
  // Base calculation
  let baseCost = 0;
  
  // Handle calculation based on input type
  if (isPlaylist) {
    // For playlists/channels - use batch rate
    baseCost = videoCount * OPERATION_COSTS.BATCH_SUBTITLE * selectedFormats.length;
    console.log(`[COST] Playlist mode: ${videoCount} videos × ${OPERATION_COSTS.BATCH_SUBTITLE} batch rate × ${selectedFormats.length} formats = ${baseCost}`);
  } else {
    // For single videos
    if (videoCount > 1) {
      // Multiple single videos (from CSV)
      baseCost = videoCount * OPERATION_COSTS.BATCH_SUBTITLE * selectedFormats.length;
      console.log(`[COST] Multiple videos: ${videoCount} videos × ${OPERATION_COSTS.BATCH_SUBTITLE} batch rate × ${selectedFormats.length} formats = ${baseCost}`);
    } else {
      // Just one video
      baseCost = OPERATION_COSTS.SINGLE_SUBTITLE * selectedFormats.length;
      console.log(`[COST] Single video: ${OPERATION_COSTS.SINGLE_SUBTITLE} single rate × ${selectedFormats.length} formats = ${baseCost}`);
    }
  }
  
  // Calculate total with minimum of 1 coin
  const total = Math.max(baseCost, 1);
  console.log(`[COST] Final cost calculation: ${baseCost} base = ${total} coins`);
  
  return total;
}

function coinCalculatorCost(videoCount, formatCount, isPlaylist) {
  console.log('\n=== COIN CALCULATOR DEBUG ===');
  console.log('Input params:', { videoCount, formatCount, isPlaylist });
  
  // Base cost calculation
  let cost = 0;
  
  // For multiple videos (either playlist or CSV), use batch cost
  if (isPlaylist || videoCount > 1) {
    cost = videoCount * formatCount * OPERATION_COSTS.BATCH_SUBTITLE;
    console.log(`[CALCULATOR] Batch mode: ${videoCount} videos × ${formatCount} formats × ${OPERATION_COSTS.BATCH_SUBTITLE} batch rate = ${cost}`);
  } else {
    // For single video, use single cost
    cost = formatCount * OPERATION_COSTS.SINGLE_SUBTITLE;
    console.log(`[CALCULATOR] Single mode: ${formatCount} formats × ${OPERATION_COSTS.SINGLE_SUBTITLE} single rate = ${cost}`);
  }
  
  // Minimum cost is 1 coin
  const total = Math.max(cost, 1);
  console.log(`[CALCULATOR] Final cost: ${cost} base = ${total} coins`);
  
  return total;
}

// Test scenarios
console.log('TEST SCENARIOS:');

console.log('\n1. Single video, 2 formats, not playlist:');
const selectedFormats = ['CLEAN_TEXT', 'SRT'];
const videoCount1 = 1;
const isPlaylist1 = false;
const cost1 = calculateCoinCost(videoCount1, selectedFormats, isPlaylist1);
const calc1 = coinCalculatorCost(videoCount1, selectedFormats.length, isPlaylist1);
console.log(`Page.tsx result: ${cost1}, Calculator result: ${calc1}, Match: ${cost1 === calc1}`);

console.log('\n2. Playlist, 5 videos, 2 formats:');
const videoCount2 = 5;
const isPlaylist2 = true;
const cost2 = calculateCoinCost(videoCount2, selectedFormats, isPlaylist2);
const calc2 = coinCalculatorCost(videoCount2, selectedFormats.length, isPlaylist2);
console.log(`Page.tsx result: ${cost2}, Calculator result: ${calc2}, Match: ${cost2 === calc2}`);

console.log('\n3. CSV file, 3 videos, 2 formats:');
const videoCount3 = 3;
const isPlaylist3 = false;
const cost3 = calculateCoinCost(videoCount3, selectedFormats, isPlaylist3);
const calc3 = coinCalculatorCost(videoCount3, selectedFormats.length, isPlaylist3);
console.log(`Page.tsx result: ${cost3}, Calculator result: ${calc3}, Match: ${cost3 === calc3}`);

console.log('\n=== SUMMARY ===');
console.log('If costs don\'t match, there\'s a discrepancy between page.tsx and CoinCalculator.tsx');
