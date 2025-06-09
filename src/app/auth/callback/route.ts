import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  // Get the URL and code from the request
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    try {
      // Create a Supabase client for the route handler
      const supabase = createRouteHandlerClient({ cookies });
      
      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code);
      
      // Get the URL to redirect to after authentication
      const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';
      
      // Redirect to the specified URL or dashboard
      return NextResponse.redirect(new URL(redirectTo, request.url));
    } catch (error) {
      console.error('Error in auth callback:', error);
      // If there's an error, redirect to the login page
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // If no code is present, redirect to login page
  return NextResponse.redirect(new URL('/auth/login', request.url));
}