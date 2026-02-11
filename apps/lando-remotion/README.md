# Lando Demo Video

Production-ready 3-minute presentation video for Lando - Agent Commerce on Solana.

## Overview

This video demonstrates how Lando solves the agent monetization problem with a two-skill architecture:

1. **URL Creation Skill** (General-purpose) - Service agents encode subscription data
2. **Payment Setup Skill** (Payment-specific) - Customer agents execute Tributary payments

## Video Structure (3 minutes = 5400 frames @ 30fps)

| Scene               | Time        | Frames    | Description                                                       |
| ------------------- | ----------- | --------- | ----------------------------------------------------------------- |
| Problem             | 0:00 - 0:25 | 0-750     | AI agents create value but can't capture it ($0 earnings)         |
| Solution            | 0:25 - 1:00 | 750-1800  | Lando introduces two-skill architecture with flow visualization   |
| URL Creation Skill  | 1:00 - 1:35 | 1800-2850 | Complete walkthrough of creating subscription URLs with live code |
| Payment Setup Skill | 1:35 - 2:15 | 2850-4050 | Browser mock + Tributary SDK execution with code                  |
| CTA                 | 2:15 - 3:00 | 4050-5400 | Try demo, why Lando wins, links to resources                      |

## Key Features

- **Matrix rain background** - Tech aesthetic matching Lando frontend
- **Live typing code blocks** - Shows actual implementation
- **Browser mock with progress** - Visualizes subscription setup flow
- **Two-skill system** - Clear distinction between URL creation and payment setup
- **Real code examples** - From actual Lando skills

## Pain Point Solved

```
Before: 50+ AI agents asking "How do I get paid?"
After:  Share URL → Customer decodes → Tributary executes → Service receives payments
```

## Why It Works

1. **Universal** - Any service agent can use the URL creation skill
2. **Simple** - Base64URL encoding, shareable anywhere
3. **Production-ready** - Tributary is audited and deployed
4. **Autonomous** - Agents manage everything themselves
5. **Fast** - 400ms settlement on Solana
6. **Revenue model** - 1% protocol fee on all subscriptions

## Build & Run

```bash
cd apps/lando-remotion

# Install dependencies
pnpm install

# Start Remotion studio (preview)
pnpm start

# Build video
pnpm build

# Output: out/lando-demo.mp4 (3 minutes, 1920x1080, 30fps)
```

## Tech Stack

- **Framework**: Remotion 4.0
- **Language**: TypeScript
- **Styling**: TailwindCSS 4.1
- **Video**: H.264, CRF 23, 30fps

## Skills Referenced

1. **URL Creation Skill** (`@lando/url-creator`)

   - Encodes subscription data to Base64URL
   - Universal for any service agent

2. **Payment Setup Skill** (`@lando/payment-setup`)
   - Decodes subscription from URL
   - Executes Tributary SDK commands
   - Custom checkout payload support

## Links Shown

- Demo: https://lando.tributary.so
- Tributary SDK: github.com/tributary-so/tributary
- Colosseum: colosseum.com/agent-hackathon
- Repo: github.com/tributary-so/tributary/tree/feature/lando

## Attribution

Built for Colosseum Agent Hackathon 2026

- Lando (Service Agent)
- Corinna (Project Manager)
- OpenCode (Code Refinement)

**"Because autonomous agents deserve autonomous income"**
