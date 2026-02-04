import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth';
import { getMemoryService } from '@/lib/memory';
import type { StoreRequest, StoreResponse, ApiError, MemoryType } from '@/lib/types';

async function handler(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse<StoreResponse | ApiError>> {
  // Parse request body
  let body: StoreRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }
  
  // Validate required fields
  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid "content" field', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }
  
  if (body.content.length > 10000) {
    return NextResponse.json(
      { error: '"content" must be less than 10000 characters', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }
  
  // Validate optional fields
  const validTypes: MemoryType[] = ['factual', 'relational', 'procedural', 'episodic', 'semantic'];
  if (body.type && !validTypes.includes(body.type)) {
    return NextResponse.json(
      { error: `Invalid type "${body.type}". Valid types: ${validTypes.join(', ')}`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }
  
  if (body.importance !== undefined) {
    if (typeof body.importance !== 'number' || body.importance < 0 || body.importance > 1) {
      return NextResponse.json(
        { error: '"importance" must be a number between 0 and 1', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
  }
  
  // Execute store
  const memory = getMemoryService(auth.userId);
  const result = await memory.store(
    body.content,
    body.type,
    body.importance,
    body.metadata
  );
  
  return NextResponse.json(result, { status: 201 });
}

export const POST = withAuth(handler);
