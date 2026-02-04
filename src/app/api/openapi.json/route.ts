import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'BotCoreBot Memory API',
    description: 'Memory-as-a-Service API for AI bots. Add persistent memory to any bot via HTTP.',
    version: '1.0.0',
    contact: {
      name: 'BotCoreBot Support',
      url: 'https://botcorebot.com',
    },
  },
  servers: [
    {
      url: 'https://api.botcorebot.com',
      description: 'Production server',
    },
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/v1/memory/recall': {
      post: {
        summary: 'Recall memories',
        description: 'Search and retrieve relevant memories using semantic search.',
        operationId: 'recallMemories',
        tags: ['Memory'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RecallRequest' },
              example: {
                query: 'user preferences',
                limit: 5,
                types: ['relational', 'factual'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Memories retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RecallResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/api/v1/memory/store': {
      post: {
        summary: 'Store a memory',
        description: 'Store a new memory with optional type and importance.',
        operationId: 'storeMemory',
        tags: ['Memory'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StoreRequest' },
              example: {
                content: 'User prefers Python over JavaScript',
                type: 'relational',
                importance: 0.8,
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Memory stored successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StoreResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/api/v1/memory/consolidate': {
      post: {
        summary: 'Consolidate memories',
        description: 'Apply memory consolidation (decay, forgetting, merging).',
        operationId: 'consolidateMemories',
        tags: ['Memory'],
        responses: {
          '200': {
            description: 'Consolidation complete',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ConsolidateResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/api/v1/memory/stats': {
      get: {
        summary: 'Get memory statistics',
        description: 'Retrieve statistics about stored memories.',
        operationId: 'getMemoryStats',
        tags: ['Memory'],
        responses: {
          '200': {
            description: 'Statistics retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StatsResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/api/health': {
      get: {
        summary: 'Health check',
        description: 'Check API health status.',
        operationId: 'healthCheck',
        tags: ['System'],
        security: [],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    version: { type: 'string', example: '0.1.0' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API key in format: Bearer bcb_xxxxx',
      },
    },
    schemas: {
      Memory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          type: { $ref: '#/components/schemas/MemoryType' },
          importance: { type: 'number', minimum: 0, maximum: 1 },
          activation: { type: 'number', minimum: 0, maximum: 1 },
          created_at: { type: 'string', format: 'date-time' },
          last_accessed: { type: 'string', format: 'date-time', nullable: true },
          metadata: { type: 'object', additionalProperties: true },
        },
        required: ['id', 'content', 'type', 'importance', 'activation', 'created_at'],
      },
      MemoryType: {
        type: 'string',
        enum: ['factual', 'relational', 'procedural', 'episodic', 'semantic'],
      },
      RecallRequest: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          types: {
            type: 'array',
            items: { $ref: '#/components/schemas/MemoryType' },
          },
        },
        required: ['query'],
      },
      RecallResponse: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: { $ref: '#/components/schemas/Memory' },
          },
          took_ms: { type: 'integer', description: 'Query time in milliseconds' },
        },
        required: ['results', 'took_ms'],
      },
      StoreRequest: {
        type: 'object',
        properties: {
          content: { type: 'string', maxLength: 10000 },
          type: { $ref: '#/components/schemas/MemoryType' },
          importance: { type: 'number', minimum: 0, maximum: 1, default: 0.5 },
          metadata: { type: 'object', additionalProperties: true },
        },
        required: ['content'],
      },
      StoreResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          success: { type: 'boolean' },
        },
        required: ['id', 'success'],
      },
      ConsolidateResponse: {
        type: 'object',
        properties: {
          consolidated: { type: 'boolean' },
          stats: {
            type: 'object',
            properties: {
              memories_before: { type: 'integer' },
              memories_after: { type: 'integer' },
              merged: { type: 'integer' },
              forgotten: { type: 'integer' },
            },
          },
        },
        required: ['consolidated', 'stats'],
      },
      StatsResponse: {
        type: 'object',
        properties: {
          total_memories: { type: 'integer' },
          by_type: {
            type: 'object',
            additionalProperties: { type: 'integer' },
          },
          oldest_memory: { type: 'string', format: 'date-time', nullable: true },
          newest_memory: { type: 'string', format: 'date-time', nullable: true },
          avg_importance: { type: 'number' },
        },
        required: ['total_memories', 'by_type', 'avg_importance'],
      },
      ApiError: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          details: { type: 'object' },
        },
        required: ['error', 'code'],
      },
    },
    responses: {
      BadRequest: {
        description: 'Invalid request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
          },
        },
      },
      Unauthorized: {
        description: 'Missing or invalid API key',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: { error: 'Invalid API key', code: 'UNAUTHORIZED' },
          },
        },
      },
      RateLimited: {
        description: 'Rate limit exceeded',
        headers: {
          'X-RateLimit-Remaining': {
            schema: { type: 'integer' },
            description: 'Remaining requests in current window',
          },
          'Retry-After': {
            schema: { type: 'integer' },
            description: 'Seconds until rate limit resets',
          },
        },
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: {
              error: 'Rate limit exceeded',
              code: 'RATE_LIMITED',
              details: { retry_after_seconds: 60 },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Memory',
      description: 'Memory operations (recall, store, consolidate)',
    },
    {
      name: 'System',
      description: 'System endpoints',
    },
  ],
};

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
