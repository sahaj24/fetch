import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// This middleware handles authentication for protected routes
export async function middleware(req: NextRequest) {
  // Skip API routes entirely to prevent HTML responses
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Also skip static files and Next.js internal routes
  if (
    req.nextUrl.pathname.startsWith('/_next/') ||
    req.nextUrl.pathname.startsWith('/favicon.ico') ||
    req.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }
  
  // Create supabase server client
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh session if expired - required for server components
  const { data: { session } } = await supabase.auth.getSession();
  
  // Check authentication for protected routes
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth');
  const isProtectedRoute = 
    req.nextUrl.pathname.startsWith('/dashboard') || 
    req.nextUrl.pathname.startsWith('/settings') ||
    req.nextUrl.pathname.startsWith('/profile') ||
    req.nextUrl.pathname.startsWith('/subtitles/manage');
    
  // Handle unauthenticated access to protected routes
  if (isProtectedRoute && !session) {
    // Redirect to login page
    const redirectUrl = new URL('/auth/login', req.url);
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Handle authenticated users trying to access auth pages
  if (isAuthRoute && session) {
    // Don't allow authenticated users to access login/signup pages
    // Exception: Allow access to the auth callback route
    if (!req.nextUrl.pathname.includes('/auth/callback')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
  
  return res;
}

// Configure which paths this middleware applies to
export const config = {
  matcher: [
    // Only apply to specific protected and auth routes - NO API ROUTES
    '/dashboard/:path*',
    '/settings/:path*', 
    '/profile/:path*',
    '/subtitles/manage/:path*',
    '/auth/:path*'
  ],
}