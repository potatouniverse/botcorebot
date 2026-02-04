/**
 * Anthropic (Claude) LLM Provider
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMOptions, LLMResponse, ToolCall, ToolResult } from '../types.js';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private defaultModel: string;
  
  constructor(apiKey: string, defaultModel = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = defaultModel;
  }
  
  async call(message: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: options.model || this.defaultModel,
      max_tokens: options.max_tokens || 4096,
      temperature: options.temperature || 1.0,
      system: options.system,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });
    
    // Extract text content
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');
    
    return {
      text: textContent,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  }
  
  async callWithToolResults(
    originalMessage: string,
    toolCalls: ToolCall[],
    toolResults: any[],
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    // For now, just call again with the original message
    // In the future, we'll properly handle tool results
    return this.call(originalMessage, options);
  }
}
