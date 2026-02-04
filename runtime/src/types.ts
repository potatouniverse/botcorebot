/**
 * Shared types for BotCoreBot Runtime
 */

export interface AgentInput {
  message: string;
  sessionId: string;
  channel: 'http' | 'telegram' | 'webhook';
  metadata?: Record<string, unknown>;
}

export interface AgentOutput {
  message: string;
  metadata: {
    memories_recalled: number;
    tools_used: number;
    tokens_used?: number;
    response_time_ms?: number;
  };
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface LLMOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  system?: string;
}

export interface LLMResponse {
  text: string;
  toolCalls?: ToolCall[];
  shouldStore?: boolean;
  memoryContent?: string;
  memoryType?: 'factual' | 'episodic' | 'relational' | 'emotional' | 'procedural' | 'opinion';
  importance?: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface Memory {
  id: string;
  content: string;
  type: string;
  confidence: number;
  strength: number;
}

export interface LLMProvider {
  call(message: string, options: LLMOptions): Promise<LLMResponse>;
  callWithToolResults(
    originalMessage: string,
    toolCalls: ToolCall[],
    toolResults: ToolResult[],
    options: LLMOptions
  ): Promise<LLMResponse>;
}
