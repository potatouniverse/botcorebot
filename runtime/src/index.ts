/**
 * BotCoreBot Runtime - Entry Point
 * 
 * This is the agent runtime that brings BotCore packages to life.
 * It uses BotCore SDK for memory, identity, GID, and tools.
 */

import { createBot } from 'botcore';
import { AgentLoop } from './agent-loop.js';
import { AnthropicProvider } from './llm/anthropic.js';
import { createHttpChannel } from './channels/http.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🤖 BotCoreBot Runtime starting...\n');
  
  // 1. Load configuration from environment
  const workspace = process.env.BOTCORE_WORKSPACE || process.cwd();
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const httpPort = parseInt(process.env.HTTP_PORT || '3000');
  
  if (!anthropicApiKey) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }
  
  console.log(`📁 Workspace: ${workspace}`);
  
  // 2. Initialize BotCore
  console.log('🔧 Loading BotCore...');
  const bot = await createBot({
    workspace,
    displayGidSummary: true,
  });
  
  console.log('✅ BotCore loaded!\n');
  
  // Log identity
  const identity = bot.identity.getIdentity();
  if (identity) {
    console.log(`👤 Identity: ${identity.name || 'Unnamed'}`);
    if (identity.emoji) console.log(`   Emoji: ${identity.emoji}`);
  }
  
  // Log GID status
  if (bot.gid.isActive) {
    console.log('📊 GID: Active');
  }
  
  console.log();
  
  // 3. Initialize LLM provider
  const llmProvider = new AnthropicProvider(anthropicApiKey);
  console.log('🧠 LLM Provider: Anthropic (Claude 3.5 Sonnet)\n');
  
  // 4. Create agent loop
  const agentLoop = new AgentLoop({
    bot,
    llmProvider,
  });
  
  // 5. Start HTTP channel
  createHttpChannel(agentLoop, httpPort);
  
  console.log('\n✨ Runtime ready!\n');
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Start
main().catch((error) => {
  console.error('Failed to start runtime:', error);
  process.exit(1);
});
