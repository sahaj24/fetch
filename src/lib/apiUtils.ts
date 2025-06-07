// Production API Route Validator
// This utility helps ensure API routes work correctly in production environments

export function validateApiRoute(request: Request): boolean {
  const url = new URL(request.url);
  
  // Check if this is actually an API route
  if (!url.pathname.startsWith('/api/')) {
    return false;
  }
  
  return true;
}

export function createApiResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-API-Handler': 'nextjs',
    'X-Environment': process.env.NODE_ENV || 'development',
    ...headers
  };
  
  return new Response(JSON.stringify(data), {
    status,
    headers: defaultHeaders
  });
}

export function createApiErrorResponse(error: string | Error, status: number = 500, context?: string): Response {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  const errorData = {
    error: errorMessage,
    status,
    context: context || 'API Error',
    timestamp: new Date().toISOString(),
    production: process.env.NODE_ENV === 'production'
  };
  
  return createApiResponse(errorData, status);
}

export function logApiRequest(request: Request, context: string): void {
  if (process.env.NODE_ENV === 'production') {
    console.log(`[API] ${context}:`, {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });
  }
}
