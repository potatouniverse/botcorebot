/**
 * HTTP API Channel
 */

import express from 'express';
import type { AgentLoop } from '../agent-loop.js';

export function createHttpChannel(agentLoop: AgentLoop, port = 3000) {
  const app = express();
  
  app.use(express.json());
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Main message endpoint
  app.post('/api/message', async (req, res) => {
    try {
      const { message, session_id } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'message is required' });
      }
      
      if (!session_id) {
        return res.status(400).json({ error: 'session_id is required' });
      }
      
      const result = await agentLoop.run({
        message,
        sessionId: session_id,
        channel: 'http',
      });
      
      res.json(result);
      
    } catch (error) {
      console.error('HTTP channel error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Start server
  app.listen(port, () => {
    console.log(`🚀 HTTP channel listening on port ${port}`);
    console.log(`   POST http://localhost:${port}/api/message`);
  });
  
  return app;
}
