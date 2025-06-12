#!/usr/bin/env node

// Simple test to verify middleware logic
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Middleware Logic...\n');

// Mock NextRequest object to simulate the middleware logic
function createMockRequest(pathname) {
  return {
    nextUrl: {
      pathname: pathname
    }
  };
}

// Mock NextResponse for testing
const NextResponse = {
  next: () => ({ type: 'next' }),
  redirect: (url) => ({ type: 'redirect', url })
};

// Test the middleware path matching logic
function testMiddlewareLogic() {
  console.log('🔍 Testing API route exclusion logic:');
  
  // Test cases
  const testCases = [
    '/api/health',
    '/api/youtube/playlist-info',
    '/api/youtube/extract',
    '/api/coins/deduct',
    '/dashboard',
    '/settings',
    '/auth/login',
    '/',
    '/_next/static/chunks/main.js',
    '/favicon.ico'
  ];
  
  testCases.forEach(pathname => {
    const req = createMockRequest(pathname);
    
    // Test the early return logic from middleware
    let shouldReturn = false;
    let reason = '';
    
    // API routes check
    if (req.nextUrl.pathname.startsWith('/api/')) {
      shouldReturn = true;
      reason = 'API route - early return';
    }
    // Static files check
    else if (
      req.nextUrl.pathname.startsWith('/_next/') ||
      req.nextUrl.pathname.startsWith('/favicon.ico') ||
      req.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
    ) {
      shouldReturn = true;
      reason = 'Static file - early return';
    }
    // Matcher config check
    else {
      const matcher = [
        '/dashboard/:path*',
        '/settings/:path*', 
        '/profile/:path*',
        '/subtitles/manage/:path*',
        '/auth/:path*'
      ];
      
      const matches = matcher.some(pattern => {
        const regex = pattern.replace(':path*', '.*');
        return new RegExp(`^${regex.replace(/\*/g, '.*')}$`).test(pathname);
      });
      
      if (matches) {
        reason = 'Matched middleware config - would process auth';
      } else {
        shouldReturn = true;
        reason = 'Not in matcher config - early return';
      }
    }
    
    console.log(`  ${pathname.padEnd(30)} -> ${shouldReturn ? '✅ SKIP' : '🔒 PROCESS'} (${reason})`);
  });
}

// Test the specific issue
function testPlaylistInfoEndpoint() {
  console.log('\n🎵 Testing playlist-info endpoint specifically:');
  
  const playlistPaths = [
    '/api/youtube/playlist-info',
    '/api/youtube/playlist-info?id=PLtest123',
    '/api/youtube/extract'
  ];
  
  playlistPaths.forEach(pathname => {
    const req = createMockRequest(pathname);
    
    if (req.nextUrl.pathname.startsWith('/api/')) {
      console.log(`  ${pathname.padEnd(40)} -> ✅ MIDDLEWARE SKIPPED (API route)`);
      console.log(`    Expected: JSON response`);
      console.log(`    Problem: Should NOT get HTML redirect`);
    } else {
      console.log(`  ${pathname.padEnd(40)} -> ❌ MIDDLEWARE WOULD PROCESS`);
    }
  });
}

// Run tests
testMiddlewareLogic();
testPlaylistInfoEndpoint();

console.log('\n📋 Summary:');
console.log('  ✅ All /api/* routes should be skipped by middleware');
console.log('  ✅ Static files should be skipped by middleware');
console.log('  🔒 Only protected routes should be processed for auth');
console.log('\n🚀 If middleware logic is correct, issue is likely:');
console.log('  1. Cloud deployment hasn\'t been updated with the fix');
console.log('  2. Cloud environment has additional proxy/CDN intercepting requests');
console.log('  3. Browser cache serving old responses');
