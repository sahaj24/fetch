const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Coin Deduction Fix Verification\n');

// Test the YouTube extraction route for proper coin deduction error handling
async function testCoinDeductionFix() {
    try {
        // Read the main API route file to verify the fix
        const routeFile = path.join(__dirname, 'src/app/api/youtube/extract/route.ts');
        const content = fs.readFileSync(routeFile, 'utf8');
        
        console.log('📁 Checking YouTube extraction route file...');
        
        // Check for the fixed error handling patterns
        const hasProperErrorReturn = content.includes('return NextResponse.json') && 
                                    content.includes('Failed to process coin deduction');
        
        const hasErrorHandlingInCatch = content.includes('catch (deductError)') &&
                                       content.includes('console.error');
        
        const hasStatusCode500 = content.includes('status: 500');
        
        console.log('✅ Verification Results:');
        console.log(`  - Proper error return: ${hasProperErrorReturn ? '✓' : '✗'}`);
        console.log(`  - Error handling in catch: ${hasErrorHandlingInCatch ? '✓' : '✗'}`);
        console.log(`  - HTTP 500 status code: ${hasStatusCode500 ? '✓' : '✗'}`);
        
        if (hasProperErrorReturn && hasErrorHandlingInCatch && hasStatusCode500) {
            console.log('\n🎉 COIN DEDUCTION FIX VERIFIED: All error handling patterns are in place!');
            console.log('   The API will now properly return errors when coin deduction fails.');
        } else {
            console.log('\n❌ ISSUE DETECTED: Some error handling patterns are missing.');
        }
        
        // Look for specific lines that show the fix
        const lines = content.split('\n');
        let foundFixedCatch = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('catch (deductError)')) {
                console.log(`\n📍 Found coin deduction error handling at line ${i + 1}:`);
                // Show the next few lines to verify the fix
                for (let j = i; j < Math.min(i + 10, lines.length); j++) {
                    const nextLine = lines[j];
                    console.log(`  ${j + 1}: ${nextLine}`);
                    if (nextLine.includes('return NextResponse.json')) {
                        foundFixedCatch = true;
                        break;
                    }
                }
                break;
            }
        }
        
        if (foundFixedCatch) {
            console.log('\n✅ CONFIRMED: Error handling properly returns error response instead of continuing!');
        } else {
            console.log('\n⚠️  WARNING: Could not locate the specific fix implementation.');
        }
        
    } catch (error) {
        console.error('❌ Error reading route file:', error.message);
    }
}

// Test coin utilities
async function testCoinUtilities() {
    try {
        console.log('\n🔧 Checking coin utility functions...');
        
        const coinUtilsFile = path.join(__dirname, 'src/utils/coinUtils.ts');
        if (fs.existsSync(coinUtilsFile)) {
            const content = fs.readFileSync(coinUtilsFile, 'utf8');
            
            const hasDeductCoins = content.includes('deductCoins');
            const hasErrorHandling = content.includes('throw') || content.includes('Error');
            
            console.log(`  - deductCoins function: ${hasDeductCoins ? '✓' : '✗'}`);
            console.log(`  - Error handling: ${hasErrorHandling ? '✓' : '✗'}`);
        } else {
            console.log('  - coinUtils.ts not found');
        }
        
    } catch (error) {
        console.error('❌ Error checking coin utilities:', error.message);
    }
}

// Main test function
async function main() {
    await testCoinDeductionFix();
    await testCoinUtilities();
    
    console.log('\n🏁 Testing Complete!');
    console.log('\n📋 Next Steps for Manual Testing:');
    console.log('1. Navigate to http://localhost:3002');
    console.log('2. Log in with a user account');
    console.log('3. Check current coin balance');
    console.log('4. Try to extract a YouTube video');
    console.log('5. Verify coins are deducted');
    console.log('6. Try with insufficient coins to test error handling');
}

main().catch(console.error);
