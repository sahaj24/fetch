import { NextRequest, NextResponse } from 'next/server';
import { captureProductionDebugInfo, createDebugResponse } from '@/lib/productionDebug';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const debugInfo = captureProductionDebugInfo(request);
    
    // Test various aspects of the system
    const systemTests = {
      environmentVariables: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT
      },
      imports: {
        apiUtils: false,
        supabaseConfig: false,
        coinUtils: false
      },
      filesystem: {
        canWriteTemp: false,
        tempDirExists: false
      }
    };

    // Test imports
    try {
      await import('@/lib/apiUtils');
      systemTests.imports.apiUtils = true;
    } catch (error) {
      console.error('Failed to import apiUtils:', error);
    }

    try {
      await import('@/supabase/config');
      systemTests.imports.supabaseConfig = true;
    } catch (error) {
      console.error('Failed to import supabaseConfig:', error);
    }

    try {
      await import('@/utils/coinUtils');
      systemTests.imports.coinUtils = true;
    } catch (error) {
      console.error('Failed to import coinUtils:', error);
    }

    // Test filesystem access
    try {
      const fs = await import('fs');
      const os = await import('os');
      const path = await import('path');
      
      const tempDir = os.tmpdir();
      systemTests.filesystem.tempDirExists = fs.existsSync(tempDir);
      
      const testFile = path.join(tempDir, `debug-test-${Date.now()}.txt`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      systemTests.filesystem.canWriteTemp = true;
    } catch (error) {
      console.error('Filesystem test failed:', error);
    }

    const response = createDebugResponse(debugInfo, {
      message: 'Production debug endpoint',
      systemTests,
      apiRouteWorking: true,
      currentPath: request.nextUrl.pathname,
      searchParams: Object.fromEntries(request.nextUrl.searchParams.entries())
    });

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Endpoint': 'true',
        'X-Timestamp': new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[DEBUG API] Error:', error);
    
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      production: process.env.NODE_ENV === 'production'
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Endpoint': 'true'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const debugInfo = captureProductionDebugInfo(request);
    
    console.log('[DEBUG API] POST request received:', body);
    
    const response = createDebugResponse(debugInfo, {
      message: 'POST debug endpoint',
      receivedBody: body,
      bodyType: typeof body,
      bodyKeys: Object.keys(body || {})
    });

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[DEBUG API] POST Error:', error);
    
    return NextResponse.json({
      error: 'Debug POST endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
