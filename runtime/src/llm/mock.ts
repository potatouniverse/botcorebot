/**
 * Mock LLM Provider (for testing without API key)
 */

import type { LLMProvider, LLMOptions, LLMResponse, ToolCall, ToolResult } from '../types.js';

export class MockProvider implements LLMProvider {
  async call(message: string, options: LLMOptions = {}): Promise<LLMResponse> {
    console.log('[MockLLM] Received message:', message.substring(0, 100));
    
    // Simulate thinking
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      text: `[Mock Response] I received your message. This is a mock LLM provider for testing the runtime without an API key. The actual message was: "${message.substring(0, 50)}..."`,
      usage: {
        input_tokens: message.length / 4,
        output_tokens: 50,
      },
    };
  }
  
  async callWithToolResults(
    originalMessage: string,
    toolCalls: ToolCall[],
    toolResults: ToolResult[],
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    console.log('[MockLLM] Tool results received:', toolResults.length);
    
    return {
      text: `[Mock Response] I received tool results: ${JSON.stringify(toolResults)}`,
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    };
  }
}
