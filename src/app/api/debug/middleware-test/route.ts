import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return NextResponse.json({
    success: true,
    message: 'This API endpoint should return JSON, not HTML',
    timestamp,
    userAgent,
    environment: process.env.NODE_ENV || 'unknown',
    url: request.url,
    pathname: request.nextUrl.pathname,
    isCloudEnvironment: !!(
      process.env.VERCEL || 
      process.env.NETLIFY || 
      process.env.HEROKU || 
      process.env.RAILWAY
    ),
    middlewareTest: {
      description: 'If you see this JSON response, middleware is working correctly',
      expectedBehavior: 'API routes should bypass middleware and return JSON',
      problemIfHTML: 'If this returns HTML instead of JSON, middleware is still intercepting API routes'
    }
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Middleware-Test': 'passed',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
