import { NextRequest, NextResponse } from 'next/server';

// Production health check route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  version: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail';
      message?: string;
      responseTime?: number;
    };
  };
}

async function performHealthChecks(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const checks: HealthCheckResult['checks'] = {};

  // Check if we can access environment variables
  try {
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    checks.environment = {
      status: hasSupabaseUrl && hasSupabaseKey ? 'pass' : 'fail',
      message: hasSupabaseUrl && hasSupabaseKey ? 'Environment variables present' : 'Missing environment variables'
    };
  } catch (error) {
    checks.environment = {
      status: 'fail',
      message: 'Failed to check environment variables'
    };
  }

  // Check if we can import critical utilities
  try {
    await import('../../../lib/apiUtils');
    checks.utilities = {
      status: 'pass',
      message: 'API utilities loaded successfully'
    };
  } catch (error) {
    checks.utilities = {
      status: 'fail',
      message: 'Failed to load API utilities'
    };
  }

  // Check file system access (for subtitle generation)
  try {
    const fs = await import('fs');
    checks.filesystem = {
      status: 'pass',
      message: 'File system access available'
    };
  } catch (error) {
    checks.filesystem = {
      status: 'fail',
      message: 'File system access failed'
    };
  }

  // Determine overall health status
  const failedChecks = Object.values(checks).filter(check => check.status === 'fail');
  let status: HealthCheckResult['status'] = 'healthy';
  
  if (failedChecks.length > 0) {
    status = failedChecks.length >= Object.keys(checks).length / 2 ? 'unhealthy' : 'degraded';
  }

  const responseTime = Date.now() - startTime;

  return {
    status,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      ...checks,
      responseTime: {
        status: responseTime < 1000 ? 'pass' : 'fail',
        message: `Response time: ${responseTime}ms`,
        responseTime
      }
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('[HEALTH CHECK] Performing comprehensive health check...');
    
    const healthResult = await performHealthChecks();
    
    // Log the result for monitoring
    console.log('[HEALTH CHECK] Result:', JSON.stringify(healthResult, null, 2));
    
    // Return appropriate HTTP status based on health
    const statusCode = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(healthResult, {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'true'
      }
    });
    
  } catch (error) {
    console.error('[HEALTH CHECK] Failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        healthCheck: {
          status: 'fail',
          message: 'Health check itself failed'
        }
      }
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Health-Check': 'true'
      }
    });
  }
}
