import { NextRequest, NextResponse } from 'next/server';

// Tell Next.js this route is dynamic and shouldn't be statically optimized
export const dynamic = 'force-dynamic';

// GET handler for retrieving the processing status of a YouTube video/playlist extract
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Process ID is required' }, { status: 400 });
    }
    
    // This would typically connect to a database or state store to check processing status
    // For demo purposes, returning a mock response
    return NextResponse.json({
      id,
      status: 'completed',
      progress: 100,
      message: 'Processing completed successfully' 
    });
  } catch (error) {
    console.error('Error checking processing status:', error);
    return NextResponse.json(
      { error: 'Failed to check processing status' },
      { status: 500 }
    );
  }
}