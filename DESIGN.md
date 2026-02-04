# BotCoreBot - Portable Cloud Bot Platform

**Version:** 0.1.0  
**Status:** Design Phase  
**Created:** 2026-02-04

## Vision

**A cloud-hosted bot platform with portability at its core.**

Not just "Clawdbot in the cloud" — a new kind of bot platform where every bot is built on BotCore, making them portable, API-first, and ready for both personal use and marketplace integration.

## Problem Statement

**Current Landscape:**

1. **Clawdbot** (self-hosted, 100k+ stars)
   - Requires technical knowledge
   - Self-hosted = setup burden
   - Not portable between platforms

2. **Existing Hosted Services** (Clowd.bot, hostedclawd.bot)
   - Just hosting Clawdbot
   - No unique value beyond "managed VPS"
   - Not portable

3. **Gap:** No one offers **cloud-hosted bots with built-in portability and API-first design**

## Solution: BotCoreBot

**Cloud-hosted bot platform with BotCore at the foundation.**

### Core Differentiators

1. **Portable by Default** — Every bot has a BotCore (memory, identity, skills)
2. **API-First** — Not just chat, but programmable
3. **Marketplace Integration** — Works with Suited Bot out of the box
4. **Zero Setup** — Sign up, create bot, done

---

## Architecture

### Three-Layer Stack

```
┌─────────────────────────────────────────┐
│         User Dashboard (Web UI)         │
│  - Create/manage bots                   │
│  - Browse memory, configure identity    │
│  - Export/import BotCore packages       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Bot Runtime (Node.js)           │
│  - Agent loop (input → LLM → tools)     │
│  - HTTP API + Telegram channel          │
│  - Skill loader (MCP support)           │
│  - Cron jobs, webhooks                  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         BotCore (SDK)                   │
│  - Memory (Engram)                      │
│  - Identity (SOUL.md, IDENTITY.md)      │
│  - Skills (MCP registry)                │
│  - Export/Import                        │
└─────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- Supabase Auth

**Backend:**
- Next.js API Routes (serverless)
- BotCore SDK (TypeScript)
- Engram (Python MCP server)
- PostgreSQL (Supabase)

**Bot Runtime:**
- Lightweight agent loop
- MCP skill support
- HTTP API + Telegram
- Deployed per-bot (Railway/Fly.io)

**Hosting:**
- Frontend: Vercel
- Database: Supabase
- Bot Instances: Railway/Fly.io (containerized)

---

## Database Schema

### Core Tables

#### 1. `users`
```sql
- id (uuid, pk)
- email (text, unique)
- created_at (timestamp)
- subscription_tier (enum: free, pro, enterprise)
- stripe_customer_id (text, nullable)
```

#### 2. `bots`
```sql
- id (uuid, pk)
- user_id (uuid, fk → users)
- name (text)
- botcore_path (text) -- Storage path for BotCore package
- status (enum: active, paused, archived)
- runtime_url (text) -- Deployed instance URL
- created_at (timestamp)
- updated_at (timestamp)
```

#### 3. `bot_config`
```sql
- bot_id (uuid, pk, fk → bots)
- identity (jsonb) -- SOUL.md, IDENTITY.md data
- skills (jsonb) -- Enabled skills list
- channels (jsonb) -- Telegram token, HTTP API config
- model_preferences (jsonb) -- Which LLM to use
```

#### 4. `bot_memory_snapshots`
```sql
- id (uuid, pk)
- bot_id (uuid, fk → bots)
- snapshot_path (text) -- S3/R2 path to Engram DB backup
- created_at (timestamp)
- size_bytes (bigint)
```

#### 5. `bot_usage`
```sql
- id (uuid, pk)
- bot_id (uuid, fk → bots)
- date (date)
- llm_tokens (bigint)
- api_calls (integer)
- storage_bytes (bigint)
```

#### 6. `subscriptions`
```sql
- id (uuid, pk)
- user_id (uuid, fk → users)
- stripe_subscription_id (text)
- tier (enum: free, pro, enterprise)
- status (enum: active, cancelled, past_due)
- current_period_end (timestamp)
```

---

## User Flows

### 1. Create a Bot

1. User signs up (Supabase Auth)
2. Click "Create Bot"
3. Choose template or start blank
4. Configure:
   - Name, emoji, avatar
   - Personality (SOUL.md wizard)
   - Initial skills
5. Click "Deploy"
6. Backend:
   - Creates BotCore package
   - Spawns runtime container (Railway)
   - Provisions Telegram bot (optional)
7. Bot URL ready: `https://my-bot.botcorebot.com`

### 2. Chat with Bot

**Option A: Dashboard**
- Embedded chat widget in dashboard

**Option B: Telegram**
- User gets bot token, adds to Telegram

**Option C: HTTP API**
- `POST /api/chat` with API key
- Returns streaming response

### 3. Export Bot

1. Click "Export" in dashboard
2. Choose what to include:
   - Memory (Engram DB)
   - Identity files
   - Skills
   - Config
3. Download `my-bot.tar.gz`
4. Can import to:
   - Another BotCoreBot account
   - Clawdbot (with adapter)
   - Custom setup

### 4. Marketplace Integration (Suited Bot)

1. Bot can register on Suited Bot marketplace
2. Receives task notifications via webhook
3. Accepts tasks, completes, submits
4. All managed from BotCoreBot dashboard

---

## Bot Runtime

### Minimal Agent Loop

```typescript
// Simplified runtime
class BotRuntime {
  constructor(public botcore: BotCore) {}
  
  async handleMessage(input: string, userId: string): Promise<string> {
    // 1. Recall relevant memories
    const memories = await this.botcore.memory.recall(input);
    
    // 2. Build prompt with identity + memories
    const systemPrompt = this.botcore.identity.toPrompt();
    const context = memories.map(m => m.content).join('\n');
    
    // 3. Call LLM
    const response = await callLLM({
      system: systemPrompt,
      context,
      user: input,
      tools: this.botcore.skills.list(),
    });
    
    // 4. Execute tool calls
    for (const tool of response.toolCalls) {
      await this.botcore.skills.execute(tool);
    }
    
    // 5. Store important info
    if (response.shouldStore) {
      await this.botcore.memory.store(response.toStore);
    }
    
    return response.text;
  }
}
```

### Deployment

**Per-Bot Container:**
```dockerfile
FROM node:22-alpine
COPY botcore-package/ /app/botcore/
COPY runtime/ /app/runtime/
RUN npm install
ENV BOT_ID=xxx
ENV BOTCORE_PATH=/app/botcore/
CMD ["node", "runtime/index.js"]
```

**Deployed to Railway:**
- Auto-scaling
- Persistent storage (Engram DB)
- Environment variables (API keys)

---

## Pricing

### Free Tier
- 1 bot
- 100k tokens/month
- HTTP API only
- 7-day memory retention
- 100MB storage

### Pro Tier ($15/month)
- 5 bots
- 1M tokens/month
- All channels (Telegram, HTTP)
- Unlimited memory retention
- 1GB storage
- Priority support

### Enterprise (Custom)
- Unlimited bots
- Custom token limits
- White-label option
- Dedicated infrastructure
- SLA

---

## Differentiators vs Competitors

| Feature | BotCoreBot | Clowd.bot | hostedclawd.bot |
|---------|-----------|-----------|----------------|
| **Portability** | ✅ BotCore | ❌ | ❌ |
| **API-First** | ✅ | Partial | Partial |
| **Marketplace** | ✅ Suited Bot | ❌ | ❌ |
| **Pricing** | Per bot ($15/mo) | VPS-style | Waitlist |
| **Setup** | 1-click | Manual | Unknown |
| **Multi-bot** | ✅ 5 bots | 1 per instance | Unknown |

---

## Roadmap

### Phase 1: MVP (2 months)

**Week 1-2: Core Infrastructure**
- [ ] BotCore SDK integration
- [ ] Minimal runtime (agent loop)
- [ ] HTTP API endpoint
- [ ] Supabase setup (auth, DB)

**Week 3-4: Dashboard UI**
- [ ] User signup/login
- [ ] Bot creation wizard
- [ ] Chat widget
- [ ] Memory browser

**Week 5-6: Deployment**
- [ ] Railway deployment automation
- [ ] Bot instance management
- [ ] Telegram channel setup

**Week 7-8: Polish**
- [ ] Export/import
- [ ] Billing (Stripe)
- [ ] Docs + onboarding

### Phase 2: Growth (2-3 months)

- [ ] Marketplace integration (Suited Bot)
- [ ] More channels (WhatsApp, Slack)
- [ ] Skill marketplace
- [ ] Team collaboration

### Phase 3: Scale (3-6 months)

- [ ] Multi-region deployment
- [ ] Advanced analytics
- [ ] White-label option
- [ ] Enterprise features

---

## Success Metrics

### MVP Goals (3 months)

- 100 users signed up
- 50 active bots deployed
- $500 MRR (monthly recurring revenue)
- 10 paid users

### 6-Month Goals

- 500 users
- 200 active bots
- $3,000 MRR
- 50 paid users
- 5 enterprise customers

### 1-Year Goals

- 2,000 users
- 1,000 active bots
- $15,000 MRR
- 200 paid users
- 20 enterprise customers

---

## Technical Challenges

### 1. Per-Bot Deployment Cost
**Problem:** Each bot needs a container = $5-10/month minimum  
**Solution:** 
- Free tier: shared runtime (multi-tenant)
- Pro tier: dedicated container

### 2. Engram Python Dependency
**Problem:** Runtime is Node.js, Engram is Python  
**Solution:** 
- Option A: Spawn Engram MCP server as subprocess
- Option B: Port Engram to TypeScript (future)
- Option C: HTTP wrapper around Engram

### 3. State Persistence
**Problem:** Containers are ephemeral  
**Solution:** 
- Engram DB on persistent volume (Railway)
- Daily backups to S3/R2

### 4. Scaling Costs
**Problem:** Many bots = many containers  
**Solution:** 
- Start with Railway (simple)
- Later: Kubernetes for better density
- Hibernate inactive bots

---

## Open Questions

1. **Pricing:** Is $15/month competitive? Too low/high?
2. **Free tier abuse:** How to prevent spam signups?
3. **LLM costs:** Pass through or absorb?
4. **Telegram limits:** How many bots can one account create?
5. **Data privacy:** GDPR compliance for EU users?

---

## Non-Goals

- Not trying to replace Clawdbot for power users
- Not building all channels (focus on core)
- Not open-sourcing the runtime (only BotCore SDK)
- Not doing local deployment (cloud-only)

---

## References

- **BotCore:** `/Users/potato/clawd/projects/botcore/`
- **Clawdbot:** https://github.com/clawdbot/clawdbot
- **Competitors:** clowd.bot, hostedclawd.bot
- **Suited Bot:** `/Users/potato/clawd/projects/suitedbot/`
