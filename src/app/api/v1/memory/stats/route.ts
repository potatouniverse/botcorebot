import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth';
import { getMemoryService } from '@/lib/memory';
import type { StatsResponse, ApiError } from '@/lib/types';

async function handler(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse<StatsResponse | ApiError>> {
  const memory = getMemoryService(auth.userId);
  const result = await memory.stats();
  
  return NextResponse.json(result);
}

export const GET = withAuth(handler);
