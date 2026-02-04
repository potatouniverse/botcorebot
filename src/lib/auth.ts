import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, checkQuota, logUsage } from './supabase';
import type { ApiKey, ApiError } from './types';

export interface AuthContext {
  userId: string;
  tier: ApiKey['tier'];
}

// Extract bearer token from Authorization header
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  
  return token;
}

// Authenticate request and check rate limits
export async function authenticateRequest(
  request: NextRequest
): Promise<{ auth: AuthContext } | { error: NextResponse<ApiError> }> {
  // Extract API key
  const apiKey = extractBearerToken(request);
  
  if (!apiKey) {
    return {
      error: NextResponse.json(
        {
          error: 'Missing or invalid Authorization header',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      )
    };
  }
  
  // Validate API key
  const validation = await validateApiKey(apiKey);
  
  if (!validation.valid || !validation.user) {
    return {
      error: NextResponse.json(
        {
          error: validation.error || 'Invalid API key',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      )
    };
  }
  
  // Check rate limit
  const quota = await checkQuota(validation.user.id, validation.user.tier);
  
  if (!quota.allowed) {
    return {
      error: NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMITED',
          details: {
            retry_after_seconds: 60,
            tier: validation.user.tier
          }
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + 60).toString(),
            'Retry-After': '60'
          }
        }
      )
    };
  }
  
  return {
    auth: {
      userId: validation.user.id,
      tier: validation.user.tier
    }
  };
}

// Wrapper for authenticated API handlers
export function withAuth(
  handler: (
    request: NextRequest,
    auth: AuthContext
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = await authenticateRequest(request);
    
    if ('error' in result) {
      return result.error;
    }
    
    // Log usage (endpoint will be extracted from URL)
    const endpoint = new URL(request.url).pathname;
    await logUsage(result.auth.userId, endpoint);
    
    // Call the actual handler
    try {
      const response = await handler(request, result.auth);
      
      // Add rate limit headers to response
      const quota = await checkQuota(result.auth.userId, result.auth.tier);
      response.headers.set('X-RateLimit-Remaining', quota.remaining.toString());
      
      return response;
    } catch (error) {
      console.error('Handler error:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        },
        { status: 500 }
      );
    }
  };
}
