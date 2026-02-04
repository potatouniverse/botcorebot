/**
 * Tool execution - execute tool calls from LLM
 */

import type { Bot } from 'botcore';
import type { ToolCall, ToolResult } from '../types.js';

/**
 * Execute a single tool call
 */
export async function executeTool(
  toolCall: ToolCall,
  bot: Bot
): Promise<ToolResult> {
  try {
    switch (toolCall.name) {
      case 'filesystem_write':
        return await executeFilesystemWrite(toolCall, bot);
      
      case 'filesystem_read':
        return await executeFilesystemRead(toolCall, bot);
      
      case 'filesystem_edit':
        return await executeFilesystemEdit(toolCall, bot);
      
      case 'memory_recall':
        return await executeMemoryRecall(toolCall, bot);
      
      case 'memory_store':
        return await executeMemoryStore(toolCall, bot);
      
      default:
        return {
          success: false,
          error: `Unknown tool: ${toolCall.name}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Tool: filesystem_write
 */
async function executeFilesystemWrite(
  toolCall: ToolCall,
  bot: Bot
): Promise<ToolResult> {
  const { path, content } = toolCall.args as { path: string; content: string };
  
  await bot.tools.fs.write(path, content);
  
  return {
    success: true,
    result: `Wrote ${content.length} bytes to ${path}`,
  };
}

/**
 * Tool: filesystem_read
 */
async function executeFilesystemRead(
  toolCall: ToolCall,
  bot: Bot
): Promise<ToolResult> {
  const { path } = toolCall.args as { path: string };
  
  const content = await bot.tools.fs.read(path);
  
  return {
    success: true,
    result: content,
  };
}

/**
 * Tool: filesystem_edit
 */
async function executeFilesystemEdit(
  toolCall: ToolCall,
  bot: Bot
): Promise<ToolResult> {
  const { path, oldText, newText } = toolCall.args as {
    path: string;
    oldText: string;
    newText: string;
  };
  
  await bot.tools.fs.edit(path, oldText, newText);
  
  return {
    success: true,
    result: `Edited ${path}`,
  };
}

/**
 * Tool: memory_recall
 */
async function executeMemoryRecall(
  toolCall: ToolCall,
  bot: Bot
): Promise<ToolResult> {
  const { query, limit } = toolCall.args as { query: string; limit?: number };
  
  const results = await bot.memory.recall(query, {
    limit: limit || 5,
  });
  
  return {
    success: true,
    result: results,
  };
}

/**
 * Tool: memory_store
 */
async function executeMemoryStore(
  toolCall: ToolCall,
  bot: Bot
): Promise<ToolResult> {
  const { content, type, importance } = toolCall.args as {
    content: string;
    type?: string;
    importance?: number;
  };
  
  const result = await bot.memory.store(content, {
    type: type as any,
    importance: importance || 0.5,
  });
  
  return {
    success: true,
    result,
  };
}
