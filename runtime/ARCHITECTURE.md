# BotCoreBot Runtime Architecture

**Purpose:** Agent runtime that uses BotCore SDK as foundation

**Status:** Initial implementation (dogfooding BotCore)

---

## Overview

The **runtime** is the heart of BotCoreBot - it's what makes a BotCore package "alive". It:
- Receives input (HTTP API, Telegram, etc.)
- Uses BotCore (memory, identity, gid)
- Calls LLM
- Executes tools
- Returns output

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Input Channels                  │
│  - HTTP API                             │
│  - Telegram                             │
│  - Webhook                              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Agent Loop                      │
│  1. Parse input                         │
│  2. Recall context (BotCore.memory)     │
│  3. Build prompt                        │
│  4. Call LLM                            │
│  5. Execute tools                       │
│  6. Store memory                        │
│  7. Return output                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         BotCore SDK                     │
│  - Memory (Engram)                      │
│  - Identity (SOUL/IDENTITY/USER)        │
│  - GID (task tracking)                  │
│  - FileSystem tools                     │
└─────────────────────────────────────────┘
```

---

## Core Components

### 1. Agent Loop (`agent-loop.ts`)

The main execution cycle:

```typescript
async function runAgentLoop(input: AgentInput): Promise<AgentOutput> {
  // 1. Recall relevant memories
  const memories = await bot.memory.recall(input.message);
  
  // 2. Get identity context
  const identity = bot.identity.getIdentity();
  const soul = bot.identity.getSoul();
  
  // 3. Build LLM prompt
  const prompt = buildPrompt({
    message: input.message,
    memories,
    identity,
    soul
  });
  
  // 4. Call LLM
  const response = await callLLM(prompt);
  
  // 5. Execute any tool calls
  if (response.toolCalls) {
    for (const toolCall of response.toolCalls) {
      await executeTool(toolCall, bot);
    }
  }
  
  // 6. Store important info
  if (response.shouldStore) {
    await bot.memory.store(response.memoryContent, {
      type: response.memoryType,
      importance: response.importance
    });
  }
  
  // 7. Record activity (if file operations)
  // Automatically tracked by bot.tools.fs
  
  return {
    message: response.text,
    metadata: {
      memories_recalled: memories.length,
      tools_used: response.toolCalls?.length || 0
    }
  };
}
```

---

### 2. LLM Provider (`llm/provider.ts`)

Abstraction over different LLM providers:

```typescript
interface LLMProvider {
  call(prompt: string, options: LLMOptions): Promise<LLMResponse>;
}

class AnthropicProvider implements LLMProvider {
  // Claude implementation
}

class OpenAIProvider implements LLMProvider {
  // GPT implementation
}
```

---

### 3. Tool Executor (`tools/executor.ts`)

Executes tool calls:

```typescript
async function executeTool(
  toolCall: ToolCall,
  bot: Bot
): Promise<ToolResult> {
  switch (toolCall.name) {
    case 'filesystem_write':
      return await bot.tools.fs.write(
        toolCall.args.path,
        toolCall.args.content
      );
    
    case 'filesystem_read':
      return await bot.tools.fs.read(toolCall.args.path);
    
    case 'memory_recall':
      return await bot.memory.recall(
        toolCall.args.query,
        toolCall.args.options
      );
    
    default:
      throw new Error(`Unknown tool: ${toolCall.name}`);
  }
}
```

---

### 4. Channel Adapters (`channels/`)

Different input/output channels:

**HTTP API** (`channels/http.ts`):
```typescript
app.post('/api/message', async (req, res) => {
  const { message, session_id } = req.body;
  
  const result = await runAgentLoop({
    message,
    sessionId: session_id,
    channel: 'http'
  });
  
  res.json(result);
});
```

**Telegram** (`channels/telegram.ts`):
```typescript
bot.on('message', async (msg) => {
  const result = await runAgentLoop({
    message: msg.text,
    sessionId: `telegram:${msg.chat.id}`,
    channel: 'telegram'
  });
  
  await bot.sendMessage(msg.chat.id, result.message);
});
```

---

## File Structure

```
runtime/
├── ARCHITECTURE.md          # This file
├── src/
│   ├── index.ts            # Entry point
│   ├── agent-loop.ts       # Core agent logic
│   ├── llm/
│   │   ├── provider.ts     # LLM abstraction
│   │   ├── anthropic.ts    # Claude
│   │   └── openai.ts       # GPT
│   ├── tools/
│   │   ├── executor.ts     # Tool execution
│   │   └── registry.ts     # Available tools
│   ├── channels/
│   │   ├── http.ts         # HTTP API
│   │   ├── telegram.ts     # Telegram bot
│   │   └── webhook.ts      # Generic webhooks
│   └── types.ts            # Shared types
├── tests/
│   ├── agent-loop.test.ts
│   └── tools.test.ts
├── package.json
└── tsconfig.json
```

---

## Environment Variables

```bash
# BotCore
BOTCORE_WORKSPACE=/path/to/bot
ENGRAM_DB_PATH=/path/to/bot/engram.db

# LLM
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
DEFAULT_MODEL=claude-3-5-sonnet-20241022

# Channels
TELEGRAM_BOT_TOKEN=xxx (optional)
HTTP_PORT=3000

# Monitoring
LOG_LEVEL=info
```

---

## Deployment

Each bot gets its own runtime container:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy runtime code
COPY runtime/dist ./runtime

# Copy BotCore package
COPY botcore-package/ ./botcore-package/

ENV BOTCORE_WORKSPACE=/app/botcore-package

CMD ["node", "runtime/index.js"]
```

---

## Development Workflow

### 1. Local Development

```bash
# Start runtime locally
cd runtime
npm install
npm run dev

# Test with curl
curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "session_id": "test-123"}'
```

### 2. Testing with BotCore

```bash
# Create a test bot
cd ../examples/test-bot
npm install botcore

# Write test files
echo "# Test Bot" > IDENTITY.md

# Start runtime pointing to it
cd ../../runtime
BOTCORE_WORKSPACE=../examples/test-bot npm run dev
```

---

## Performance Targets

- **Cold start:** < 2s (BotCore load + first LLM call)
- **Hot response:** < 500ms (with cached memory)
- **Memory overhead:** < 100MB per bot instance
- **Token usage:** < 2000 tokens per message (with good memory recall)

---

## Next Steps

### Phase 1: MVP (This Week)
- [x] Architecture design
- [ ] Implement agent loop
- [ ] Anthropic LLM provider
- [ ] HTTP channel
- [ ] Basic tool executor
- [ ] Integration test

### Phase 2: Full Features
- [ ] OpenAI provider
- [ ] Telegram channel
- [ ] Full tool registry
- [ ] Session management
- [ ] Error handling + retry

### Phase 3: Production
- [ ] Monitoring (Sentry)
- [ ] Rate limiting
- [ ] Load testing
- [ ] Deploy to Railway
- [ ] Auto-scaling

---

**Last Updated:** 2026-02-04  
**Maintainer:** Clawd
