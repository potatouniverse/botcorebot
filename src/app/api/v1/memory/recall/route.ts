import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth';
import { getMemoryService } from '@/lib/memory';
import type { RecallRequest, RecallResponse, ApiError, MemoryType } from '@/lib/types';

async function handler(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse<RecallResponse | ApiError>> {
  // Parse request body
  let body: RecallRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }
  
  // Validate required fields
  if (!body.query || typeof body.query !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid "query" field', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }
  
  // Validate optional fields
  const limit = body.limit ?? 10;
  if (typeof limit !== 'number' || limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: '"limit" must be a number between 1 and 100', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }
  
  const validTypes: MemoryType[] = ['factual', 'relational', 'procedural', 'episodic', 'semantic'];
  if (body.types) {
    if (!Array.isArray(body.types)) {
      return NextResponse.json(
        { error: '"types" must be an array', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    for (const t of body.types) {
      if (!validTypes.includes(t)) {
        return NextResponse.json(
          { error: `Invalid type "${t}". Valid types: ${validTypes.join(', ')}`, code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
    }
  }
  
  // Execute recall
  const memory = getMemoryService(auth.userId);
  const result = await memory.recall(body.query, limit, body.types);
  
  return NextResponse.json(result);
}

export const POST = withAuth(handler);
