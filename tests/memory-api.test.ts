/**
 * Memory API Integration Tests
 * 
 * Run with: npm test
 * Requires: TEST_API_KEY environment variable or running server
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.TEST_API_KEY || 'test-key-for-development';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: message });
    console.log(`❌ ${name}: ${message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function apiCall(
  method: string,
  path: string,
  body?: unknown,
  expectStatus: number = 200
) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  assert(
    response.status === expectStatus,
    `Expected status ${expectStatus}, got ${response.status}: ${JSON.stringify(data)}`
  );
  
  return data;
}

// Tests
async function runTests() {
  console.log('\n🧪 Running Memory API Tests\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log('');
  
  // Health check (no auth)
  await test('Health check returns OK', async () => {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    assert(data.status === 'ok', 'Status should be ok');
    assert(data.version, 'Should have version');
  });
  
  // Store memory
  let storedId: string;
  await test('Store memory', async () => {
    const data = await apiCall('POST', '/api/v1/memory/store', {
      content: 'User prefers TypeScript over JavaScript',
      type: 'relational',
      importance: 0.8,
    }, 201);
    
    assert(data.success === true, 'Should succeed');
    assert(data.id, 'Should return ID');
    storedId = data.id;
  });
  
  await test('Store memory with metadata', async () => {
    const data = await apiCall('POST', '/api/v1/memory/store', {
      content: 'Meeting scheduled for Friday at 3pm',
      type: 'episodic',
      importance: 0.6,
      metadata: { event: 'meeting', day: 'Friday' },
    }, 201);
    
    assert(data.success === true, 'Should succeed');
  });
  
  // Store more memories for recall tests
  await test('Store multiple memories', async () => {
    const memories = [
      { content: 'User is allergic to peanuts', type: 'factual', importance: 0.9 },
      { content: 'Project deadline is next Monday', type: 'episodic', importance: 0.7 },
      { content: 'To deploy, run npm run build && npm start', type: 'procedural', importance: 0.5 },
    ];
    
    for (const m of memories) {
      await apiCall('POST', '/api/v1/memory/store', m, 201);
    }
  });
  
  // Recall memories
  await test('Recall memories by query', async () => {
    const data = await apiCall('POST', '/api/v1/memory/recall', {
      query: 'TypeScript',
      limit: 5,
    });
    
    assert(Array.isArray(data.results), 'Should return array');
    assert(typeof data.took_ms === 'number', 'Should include timing');
    assert(data.results.length > 0, 'Should find memories');
    assert(data.results[0].content.includes('TypeScript'), 'Should match query');
  });
  
  await test('Recall with type filter', async () => {
    const data = await apiCall('POST', '/api/v1/memory/recall', {
      query: 'peanuts allergic factual',
      types: ['factual'],
    });
    
    assert(Array.isArray(data.results), 'Should return array');
    for (const m of data.results) {
      assert(m.type === 'factual', 'Should only return factual memories');
    }
  });
  
  await test('Recall with limit', async () => {
    const data = await apiCall('POST', '/api/v1/memory/recall', {
      query: 'user project meeting',
      limit: 2,
    });
    
    assert(data.results.length <= 2, 'Should respect limit');
  });
  
  // Stats
  await test('Get memory stats', async () => {
    const data = await apiCall('GET', '/api/v1/memory/stats');
    
    assert(typeof data.total_memories === 'number', 'Should have total');
    assert(data.total_memories > 0, 'Should have some memories');
    assert(data.by_type, 'Should have by_type breakdown');
    assert(typeof data.avg_importance === 'number', 'Should have avg importance');
  });
  
  // Consolidate
  await test('Consolidate memories', async () => {
    const data = await apiCall('POST', '/api/v1/memory/consolidate');
    
    assert(data.consolidated === true, 'Should consolidate');
    assert(data.stats, 'Should have stats');
    assert(typeof data.stats.memories_before === 'number', 'Should track before count');
    assert(typeof data.stats.memories_after === 'number', 'Should track after count');
  });
  
  // Validation errors
  await test('Store rejects empty content', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/memory/store`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: '' }),
    });
    
    assert(response.status === 400, 'Should return 400');
  });
  
  await test('Store rejects invalid type', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/memory/store`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'test', type: 'invalid' }),
    });
    
    assert(response.status === 400, 'Should return 400');
  });
  
  await test('Recall rejects missing query', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/memory/recall`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    assert(response.status === 400, 'Should return 400');
  });
  
  // Auth errors
  await test('Rejects missing auth header', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/memory/stats`);
    assert(response.status === 401, 'Should return 401');
  });
  
  await test('Rejects invalid API key', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/memory/stats`, {
      headers: { 'Authorization': 'Bearer invalid-key' },
    });
    assert(response.status === 401, 'Should return 401');
  });
  
  // Summary
  console.log('\n📊 Test Summary\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  - ${r.name}: ${r.error}`);
    }
    process.exit(1);
  }
}

runTests().catch(console.error);
