import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth';
import { getMemoryService } from '@/lib/memory';
import type { ConsolidateResponse, ApiError } from '@/lib/types';

async function handler(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse<ConsolidateResponse | ApiError>> {
  const memory = getMemoryService(auth.userId);
  const result = await memory.consolidate();
  
  return NextResponse.json(result);
}

export const POST = withAuth(handler);
