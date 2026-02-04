export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>🤖 BotCoreBot Memory API</h1>
      <p>Memory-as-a-Service for AI bots.</p>
      
      <h2>API Endpoints</h2>
      <ul>
        <li><code>POST /api/v1/memory/recall</code> - Recall memories</li>
        <li><code>POST /api/v1/memory/store</code> - Store new memory</li>
        <li><code>POST /api/v1/memory/consolidate</code> - Consolidate memories</li>
        <li><code>GET /api/v1/memory/stats</code> - Get memory statistics</li>
        <li><code>GET /api/health</code> - Health check</li>
      </ul>
      
      <h2>Authentication</h2>
      <p>All endpoints require an API key in the Authorization header:</p>
      <pre>Authorization: Bearer your-api-key</pre>
      
      <h2>Rate Limits</h2>
      <ul>
        <li><strong>Free tier:</strong> 10 requests/minute</li>
        <li><strong>Pro tier:</strong> 100 requests/minute</li>
        <li><strong>Enterprise:</strong> 1000 requests/minute</li>
      </ul>
      
      <h2>Documentation</h2>
      <p>
        See <a href="/api/openapi.json">OpenAPI spec</a> for full API documentation.
      </p>
    </main>
  );
}
