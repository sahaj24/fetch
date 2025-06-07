/**
 * Production Debugging Utility
 * Helps identify and debug API routing issues in production environments
 */

export interface ProductionDebugInfo {
  timestamp: string;
  environment: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    userAgent?: string;
  };
  runtime: {
    nodeVersion: string;
    platform: string;
    memory: NodeJS.MemoryUsage;
  };
  nextjs: {
    version: string;
    apiRouteHandler: boolean;
  };
}

export function captureProductionDebugInfo(request: Request): ProductionDebugInfo {
  const headers: Record<string, string> = {};
  
  // Safely extract headers
  try {
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
  } catch (error) {
    headers['error'] = 'Failed to extract headers';
  }

  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    request: {
      url: request.url,
      method: request.method,
      headers,
      userAgent: headers['user-agent'] || 'unknown'
    },
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage()
    },
    nextjs: {
      version: process.env.npm_package_version || 'unknown',
      apiRouteHandler: true
    }
  };
}

export function logProductionDebug(context: string, data: any): void {
  if (process.env.NODE_ENV === 'production') {
    const logEntry = {
      level: 'DEBUG',
      context,
      timestamp: new Date().toISOString(),
      data: typeof data === 'object' ? JSON.stringify(data) : data
    };
    
    console.log('[PROD DEBUG]', JSON.stringify(logEntry));
  }
}

export function createDebugResponse(debugInfo: ProductionDebugInfo, additionalInfo?: any) {
  return {
    debug: true,
    production: process.env.NODE_ENV === 'production',
    ...debugInfo,
    additional: additionalInfo || null
  };
}

// Middleware function to add debug info to responses in production
export function withProductionDebug<T>(
  handler: (request: Request, debugInfo: ProductionDebugInfo) => Promise<T>
) {
  return async (request: Request): Promise<T> => {
    const debugInfo = captureProductionDebugInfo(request);
    
    logProductionDebug('API Request', {
      url: debugInfo.request.url,
      method: debugInfo.request.method,
      userAgent: debugInfo.request.userAgent
    });
    
    try {
      const result = await handler(request, debugInfo);
      
      logProductionDebug('API Success', {
        url: debugInfo.request.url,
        method: debugInfo.request.method
      });
      
      return result;
    } catch (error) {
      logProductionDebug('API Error', {
        url: debugInfo.request.url,
        method: debugInfo.request.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  };
}
