#!/bin/bash

# Cloud Environment Middleware Test Script
# This script helps verify if the middleware fix is working in your cloud environment

echo "🔍 Testing Middleware Fix in Cloud Environment"
echo "=============================================="

# Get the domain from user input
read -p "Enter your cloud domain (e.g., https://your-app.vercel.app): " DOMAIN

# Remove trailing slash if present
DOMAIN=${DOMAIN%/}

echo ""
echo "🧪 Testing $DOMAIN..."
echo ""

# Test 1: Debug endpoint
echo "📋 Test 1: Debug Middleware Endpoint"
echo "Endpoint: $DOMAIN/api/debug/middleware-test"
echo ""

response1=$(curl -s -i "$DOMAIN/api/debug/middleware-test")
content_type1=$(echo "$response1" | grep -i "content-type" | head -1)
status1=$(echo "$response1" | head -1)

echo "Status: $status1"
echo "Content-Type: $content_type1"

if echo "$response1" | grep -q '"success":true'; then
    echo "✅ PASS: Debug endpoint returns JSON"
else
    echo "❌ FAIL: Debug endpoint returns HTML (middleware still intercepting)"
fi

echo ""
echo "----------------------------------------"
echo ""

# Test 2: Playlist info endpoint
echo "📋 Test 2: Playlist Info Endpoint"
echo "Endpoint: $DOMAIN/api/youtube/playlist-info?id=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP"
echo ""

response2=$(curl -s -i "$DOMAIN/api/youtube/playlist-info?id=PL7BImOT2srcFYmdpnrQthlkfg7IPvdyPP")
content_type2=$(echo "$response2" | grep -i "content-type" | head -1)
status2=$(echo "$response2" | head -1)

echo "Status: $status2"
echo "Content-Type: $content_type2"

if echo "$response2" | grep -q '"title":'; then
    echo "✅ PASS: Playlist endpoint returns JSON"
else
    echo "❌ FAIL: Playlist endpoint returns HTML (middleware still intercepting)"
fi

echo ""
echo "=============================================="
echo "📊 SUMMARY:"

# Check if both tests passed
if echo "$response1" | grep -q '"success":true' && echo "$response2" | grep -q '"title":'; then
    echo "🎉 SUCCESS: Middleware fix is working in cloud!"
    echo "   API routes are returning JSON properly."
    echo "   Your playlist processing should now work correctly."
else
    echo "⚠️  ISSUE: Middleware fix not yet active in cloud."
    echo ""
    echo "🔧 Possible solutions:"
    echo "   1. Wait 5-10 minutes for deployment to complete"
    echo "   2. Clear CDN cache if you're using one"
    echo "   3. Force redeploy your application"
    echo "   4. Check if there are multiple middleware files"
fi

echo ""
echo "🚀 Next steps:"
echo "   - If successful: Test playlist functionality in your app"
echo "   - If failing: Check deployment status and try again"
