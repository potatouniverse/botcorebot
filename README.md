# BotCoreBot 🤖☁️

**Portable cloud bot platform powered by BotCore**

[![Status](https://img.shields.io/badge/status-design%20phase-yellow)](DESIGN.md)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## What is BotCoreBot?

A cloud-hosted bot platform where every bot is built on **BotCore**, making them:
- 📦 **Portable** — Export and import anywhere
- 🔌 **API-First** — Not just chat, but programmable
- 🏪 **Marketplace-Ready** — Works with Suited Bot
- ☁️ **Zero Setup** — Sign up, create, deploy

## Differentiators

**vs Clawdbot:**
- Cloud-hosted (no self-hosting needed)
- Portable by default (BotCore)
- Multi-bot support (manage 5+ bots)

**vs Clowd.bot / hostedclawd.bot:**
- Not just "managed VPS"
- Built-in portability (BotCore packages)
- API-first design
- Marketplace integration

## Quick Start (Coming Soon)

```bash
# Sign up
https://botcorebot.com/signup

# Create a bot (web UI)
1. Choose template or start blank
2. Configure personality (SOUL.md wizard)
3. Deploy (1-click)

# Chat with your bot
- Dashboard: Embedded chat widget
- Telegram: Add your bot
- API: POST https://my-bot.botcorebot.com/api/chat
```

## Architecture

```
Dashboard (Next.js)
    ↓
Bot Runtime (Node.js)
    ↓
BotCore SDK (Memory + Identity + Skills)
```

## Pricing

- **Free:** 1 bot, 100k tokens/month, HTTP only
- **Pro ($15/mo):** 5 bots, 1M tokens, all channels
- **Enterprise:** Custom

## Development Status

- [x] Design phase (DESIGN.md)
- [ ] BotCore SDK (in progress)
- [ ] Bot runtime
- [ ] Dashboard UI
- [ ] Deployment automation

## Links

- **BotCore:** https://github.com/potatouniverse/botcore
- **Suited Bot:** https://github.com/potatouniverse/suitedbot
- **Design Doc:** [DESIGN.md](DESIGN.md)
