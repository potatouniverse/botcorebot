/**
 * Core agent loop - the heart of BotCoreBot runtime
 */

import type { Bot } from 'botcore';
import type { AgentInput, AgentOutput, LLMProvider, ToolCall } from './types.js';
import { executeTool } from './tools/executor.js';

export interface AgentLoopConfig {
  bot: Bot;
  llmProvider: LLMProvider;
  maxToolIterations?: number;
}

export class AgentLoop {
  private bot: Bot;
  private llmProvider: LLMProvider;
  private maxToolIterations: number;
  
  constructor(config: AgentLoopConfig) {
    this.bot = config.bot;
    this.llmProvider = config.llmProvider;
    this.maxToolIterations = config.maxToolIterations || 5;
  }
  
  /**
   * Main execution loop
   */
  async run(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    
    try {
      // 1. Recall relevant memories
      const memories = await this.recallMemories(input.message);
      
      // 2. Get identity context
      const identity = this.bot.identity.getIdentity();
      const soul = this.bot.identity.getSoul();
      
      // 3. Build system prompt
      const systemPrompt = this.buildSystemPrompt(identity, soul);
      
      // 4. Build user message with context
      const userMessage = this.buildUserMessage(input.message, memories);
      
      // 5. Call LLM
      let response = await this.llmProvider.call(userMessage, {
        system: systemPrompt,
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
      });
      
      let toolIterations = 0;
      let totalToolsUsed = 0;
      
      // 6. Tool execution loop
      while (response.toolCalls && toolIterations < this.maxToolIterations) {
        const toolResults = [];
        
        for (const toolCall of response.toolCalls) {
          const result = await executeTool(toolCall, this.bot);
          toolResults.push(result);
          totalToolsUsed++;
        }
        
        // Call LLM again with tool results
        response = await this.llmProvider.callWithToolResults(
          userMessage,
          response.toolCalls,
          toolResults,
          { system: systemPrompt }
        );
        
        toolIterations++;
      }
      
      // 7. Store important information
      // TODO: Fix Engram MCP startup issue
      console.log('[Agent] Skipping memory store (Engram not available)');
      
      // 8. Return output
      const responseTime = Date.now() - startTime;
      
      return {
        message: response.text,
        metadata: {
          memories_recalled: memories.length,
          tools_used: totalToolsUsed,
          tokens_used: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
          response_time_ms: responseTime,
        },
      };
      
    } catch (error) {
      console.error('Agent loop error:', error);
      
      return {
        message: 'Sorry, I encountered an error processing your request.',
        metadata: {
          memories_recalled: 0,
          tools_used: 0,
          response_time_ms: Date.now() - startTime,
        },
      };
    }
  }
  
  /**
   * Recall relevant memories
   */
  private async recallMemories(query: string): Promise<any[]> {
    // TODO: Fix Engram MCP startup issue
    // For now, skip memory recall to test other features
    console.log('[Agent] Skipping memory recall (Engram not available)');
    return [];
  }
  
  /**
   * Build system prompt from identity
   */
  private buildSystemPrompt(identity: any, soul: any): string {
    const parts = [];
    
    // Add soul (personality)
    if (soul?.raw) {
      parts.push(soul.raw);
    }
    
    // Add identity
    if (identity) {
      parts.push(`\nYou are ${identity.name || 'an AI assistant'}${identity.creature ? ` (${identity.creature})` : ''}.`);
      
      if (identity.vibe) {
        parts.push(`Your vibe: ${identity.vibe}`);
      }
    }
    
    return parts.join('\n');
  }
  
  /**
   * Build user message with memory context
   */
  private buildUserMessage(message: string, memories: any[]): string {
    if (memories.length === 0) {
      return message;
    }
    
    const memoryContext = memories
      .map(m => `- ${m.content} (confidence: ${m.confidence.toFixed(2)})`)
      .join('\n');
    
    return `[Relevant memories from past conversations:]\n${memoryContext}\n\n[Current message:]\n${message}`;
  }
}
