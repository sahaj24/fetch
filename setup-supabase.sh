#!/bin/bash

echo "🚀 QUICK SUPABASE SETUP FOR COIN DEDUCTION"
echo "==========================================="
echo ""
echo "📋 STEP-BY-STEP SETUP GUIDE:"
echo ""

echo "1️⃣ CREATE SUPABASE PROJECT"
echo "   • Go to https://supabase.com"
echo "   • Sign up/login"
echo "   • Click 'New Project'"
echo "   • Create your project"
echo ""

echo "2️⃣ GET API CREDENTIALS" 
echo "   • Go to Settings > API in your Supabase dashboard"
echo "   • Copy the Project URL"
echo "   • Copy the anon/public key"
echo ""

echo "3️⃣ ADD TO ENVIRONMENT FILE"
echo "   • Edit .env.local in this directory"
echo "   • Add these lines:"
echo ""
echo "   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here"
echo ""

echo "4️⃣ SET UP DATABASE TABLES"
echo "   • Go to SQL Editor in your Supabase dashboard"
echo "   • Run the contents of: supabase-schema.sql"
echo "   • Run the contents of: supabase-init-coins.sql"
echo ""

echo "5️⃣ RESTART THE SERVER"
echo "   • Stop the current server (Ctrl+C)"
echo "   • Run: npm run dev"
echo ""

echo "6️⃣ TEST COIN DEDUCTION"
echo "   • Go to your app (usually http://localhost:3000)" 
echo "   • Sign up for a new account"
echo "   • Extract subtitles from a YouTube video"
echo "   • Check server logs for coin deduction messages"
echo ""

echo "🎯 WHAT TO EXPECT AFTER SETUP:"
echo ""
echo "✅ Anonymous users: Continue working (no coin deduction)"
echo "✅ Authenticated users: Coins properly deducted"
echo "✅ Server logs: 'Successfully deducted X coins from user...'"
echo "✅ Database: User coin balances decrease correctly"
echo ""

echo "🆘 NEED HELP?"
echo "   • Check SUPABASE_SETUP_REQUIRED.md for detailed instructions"
echo "   • Verify your .env.local file has the correct credentials"
echo "   • Ensure database tables are created properly"
echo "   • Check server logs for any error messages"
echo ""

echo "🔍 Current .env.local status:"
if [ -f ".env.local" ]; then
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo "   ✅ Supabase URL found"
    else
        echo "   ❌ Supabase URL missing - ADD THIS"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
        echo "   ✅ Supabase Anon Key found"
    else
        echo "   ❌ Supabase Anon Key missing - ADD THIS"
    fi
else
    echo "   ❌ .env.local file not found"
fi

echo ""
echo "📁 Database setup files available:"
echo "   • supabase-schema.sql (main database structure)"
echo "   • supabase-init-coins.sql (coin system initialization)"
echo ""
echo "🎉 Once configured, coin deduction will work perfectly!"
