#!/bin/bash

echo "🔍 COIN DEDUCTION DIAGNOSTIC TOOL"
echo "=================================="
echo ""

echo "📋 Checking Supabase Configuration..."
echo "-------------------------------------"

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL is NOT SET"
    SUPABASE_MISSING=true
else
    echo "✅ NEXT_PUBLIC_SUPABASE_URL is configured"
    echo "   URL: $(echo $NEXT_PUBLIC_SUPABASE_URL | cut -c1-30)..."
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is NOT SET" 
    SUPABASE_MISSING=true
else
    echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is configured"
    echo "   Key: $(echo $NEXT_PUBLIC_SUPABASE_ANON_KEY | cut -c1-20)..."
fi

echo ""
echo "📁 Checking Configuration Files..."
echo "----------------------------------"

if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    echo "   Contents preview:"
    grep -v "SECRET\|KEY" .env.local | head -3 | sed 's/^/   /'
    
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo "✅ Supabase URL found in .env.local"
    else
        echo "❌ Supabase URL missing from .env.local"
        SUPABASE_MISSING=true
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
        echo "✅ Supabase Anon Key found in .env.local"
    else
        echo "❌ Supabase Anon Key missing from .env.local"
        SUPABASE_MISSING=true
    fi
else
    echo "❌ .env.local file does not exist"
    SUPABASE_MISSING=true
fi

echo ""

if [ "$SUPABASE_MISSING" = true ]; then
    echo "🚨 PROBLEM IDENTIFIED: SUPABASE NOT CONFIGURED"
    echo "=============================================="
    echo ""
    echo "💡 This is why coin deduction isn't working:"
    echo "   • No database connection to store/update coins"
    echo "   • No authentication system to verify users"
    echo "   • All coin operations fail with database errors"
    echo ""
    echo "🔧 TO FIX THIS ISSUE:"
    echo "---------------------"
    echo "1. Create a Supabase project at https://supabase.com"
    echo "2. Get your project URL and anon key from Settings > API"
    echo "3. Add them to your .env.local file:"
    echo ""
    echo "   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here"
    echo ""
    echo "4. Set up the database tables using the provided SQL files:"
    echo "   • supabase-schema.sql"
    echo "   • supabase-init-coins.sql"
    echo ""
    echo "5. Restart the development server"
    echo ""
    echo "📚 For detailed setup instructions, see:"
    echo "   • README.md in this project"
    echo "   • Supabase documentation: https://supabase.com/docs"
else
    echo "✅ SUPABASE CONFIGURATION LOOKS GOOD"
    echo "===================================="
    echo ""
    echo "🎯 Coin deduction should work with proper authentication."
    echo "   Test with a real user account to verify functionality."
fi

echo ""
echo "🔄 Testing Anonymous User Flow..."
echo "---------------------------------"
node test-coin-flow.js

echo ""
echo "📊 DIAGNOSTIC COMPLETE"
echo "====================="
