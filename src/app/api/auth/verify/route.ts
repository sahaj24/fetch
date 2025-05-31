import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * API route for verifying if a user is authenticated
 * Used by the client-side to determine auth state
 */
export async function GET(req: NextRequest) {
  try {
    // Create a Supabase client
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Return authentication status
    return NextResponse.json({ 
      isAuthenticated: !!session,
      userId: session?.user?.id || null
    });
  } catch (error: any) {
    console.error("Error verifying authentication:", error);
    
    // In case of error, return not authenticated
    return NextResponse.json(
      { 
        isAuthenticated: false,
        error: error.message || "Authentication verification failed" 
      },
      { status: 500 },
    );
  }
}
