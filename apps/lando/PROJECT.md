# Lando - Agent Commerce on Solana

## Overview

**Lando** is an agent-to-agent subscription platform built on Solana via the Tributary protocol. Named after Lando Calrissian (Star Wars), the smooth businessman who makes deals and runs operations.

**Tagline:** *"You gotta play to win. And to win, you subscribe."*

---

## Core Concept

### The Problem
The Colosseum Agent Hackathon has 50+ AI agents building sophisticated projects, but **no unified payment solution exists**. Agents are asking: *"How do we get paid for our work after the hackathon?"*

### The Solution
Lando enables agents to monetize their services through automated subscriptions on Solana:

1. **Service-offering agent** defines a service → sets pricing → generates subscription URL
2. **Customer agent** receives URL → decodes data → sets up Tributary payment (using human's wallet)
3. **Tributary** processes payments automatically
4. **Service-offering agent** receives payments → enables service access

**This is Stripe for AI agents, but fully autonomous.**

---

## Architecture

### URL Pattern
```
https://lando.tributary.so/subscribe/[base64_encoded_data]
```

### Encoded Data Structure
The base64-encoded data contains all parameters needed for a Tributary subscription:

| Field | Short | Type | Description |
|-------|--------|-------|-------------|
| tokenMint | `tm` | string (base58) | USDC token mint address |
| recipient | `r` | string (base58) | Service agent's wallet address |
| gateway | `g` | string (base58) | Tributary gateway authority |
| amount | `a` | number | Payment amount in smallest units |
| autoRenew | `ar` | boolean | Auto-renewal enabled? |
| maxRenewals | `mr` | number/null | Maximum renewal limit |
| paymentFrequency | `pf` | string | daily/weekly/monthly/annually |
| startTime | `st` | number/null | Unix timestamp or null |
| trackingId | `tid` | string | Unique tracking identifier |
| lineItems | `li` | array | JSON string of service descriptions |

### Base64URL Encoding
Uses URL-safe base64 encoding (RFC 4648):
- No padding characters (`=`)
- `+` replaced with `-`
- `/` replaced with `_`

**Example encoding logic:**
```typescript
const jsonString = JSON.stringify(data);
const base64 = Buffer.from(jsonString).toString("base64");
const urlSafe = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
```

### Decoding Logic
Reverses encoding with padding restoration:
```typescript
const padding = encoded.length % 4;
const base64 = encoded + "=".repeat(padding === 0 ? 0 : 4 - padding);
const standardBase64 = base64.replace(/-/g, "+").replace(/_/g, "/");
const jsonString = Buffer.from(standardBase64, "base64").toString("utf8");
return JSON.parse(jsonString);
```

---

## Application Structure

### Landing Page (`/`)
**Purpose:** Explain Lando to service-offering agents

**Content:**
- Hero section: "Agent Commerce on Solana"
- Two flows: Service agent flow & Customer agent flow
- URL pattern documentation with examples
- Call to action: "Register Your Service"

**Design:**
- Dark theme
- Monospace fonts (JetBrains Mono or similar)
- Green accents (#4ade80 - Lando green)
- Matrix-style subtle background effects
- Technical, agent-friendly aesthetic

### Subscription Page (`/subscribe/:data`)
**Purpose:** Decode subscription URL and guide customer agents to pay

**Features:**
1. **Decode base64 data** from URL parameter
2. **Validate all fields** (public keys, amounts, frequencies)
3. **Display subscription details:**
   - Line items (what they're subscribing to)
   - Amount and frequency
   - Recipient wallet address
   - Tracking ID for reference
4. **Generate custom Tributary skill** with:
   - Exact SDK commands to execute
   - Code snippets for copy-paste
   - Step-by-step payment instructions

**Design:**
- Same dark/nerdy theme as landing
- Copy-friendly code blocks
- Clear step indicators
- Visual hierarchy for technical vs. descriptive content

---

## Tech Stack

### Frontend
- **Framework:** Vite
- **UI Library:** React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

### Dependencies
```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "^5.6.0",
  "vite": "^6.0.0",
  "tailwindcss": "^3.4.0",
  "lucide-react": "^0.460.0",
  "@solana/web3.js": "^1.95.0"
}
```

### Tributary Integration
- **SDK:** `@tributary-so/sdk`
- **Smart Contract:** Program ID `TRibg8W8zmPHQqW8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`
- **Token Mint:** USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **Gateway Address:** `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`

---

## Design System

### Colors
```css
--bg-primary: #0a0a0a;
--bg-secondary: #171717;
--text-primary: #fafafa;
--text-secondary: #a1a1aa;
--accent-green: #4ade80;
--accent-green-dark: #22c55e;
```

### Typography
```css
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### UI Patterns
- **Cards:** Dark cards with subtle green borders on hover
- **Code Blocks:** Monospace with green accent for keywords
- **Buttons:** Green gradient hover effects
- **Background:** Subtle grid or matrix pattern

---

## Use Cases

### Example 1: Research Agent Subscriptions

**Service Agent:** Offers weekly research reports

**Subscription Tiers:**
- $10/month → Basic reports (web search + summary)
- $50/month → Deep analysis with primary sources
- $200/month → Custom research on demand

**Customer Agents:** DeFi protocols, VCs, journalists needing market intelligence

---

### Example 2: DeFi Strategy Agent

**Service Agent:** Monitors yield farming opportunities

**Subscription Tiers:**
- $25/month → Daily opportunity alerts
- $100/month → Detailed strategy breakdowns
- $500/month → Real-time execution notifications

**Customer Agents:** Portfolio managers, automated trading bots

---

### Example 3: Code Review Agent

**Service Agent:** Reviews pull requests and provides security recommendations

**Subscription Tiers:**
- $20/month → 50 PR reviews/month (basic linting)
- $75/month → 200 PR reviews + security analysis
- $250/month → Unlimited + on-call for urgent fixes

**Customer Agents:** Developer teams, solo founders

---

## Development

### Getting Started

```bash
cd ~/projects/tributary/apps/lando

# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview build
npm run preview
```

### Dev Server
- URL: `http://localhost:5173/`
- Hot module replacement enabled
- TypeScript strict mode active

### Build
- Output: `dist/`
- Production-ready bundle
- Optimized assets

---

## Colosseum Hackathon

### Registration
- **Agent Name:** Lando
- **Agent ID:** 193
- **Status:** Active
- **Claim Code:** `0dfb738b-22cd-48d2-ac63-d997a978bbfb`
- **Claim URL:** https://colosseum.com/agent-hackathon/claim/0dfb738b-22cd-48d2-ac63-d997a978bbfb

### Timeline
- **Start:** Feb 2, 2026
- **End:** Feb 12, 2026
- **Duration:** 10 days
- **Prize Pool:** $100,000 USDC

### Project Goals
- ✅ Solve immediate agent monetization pain point
- ✅ Leverage Tributary's production-ready infrastructure
- ✅ Build something deployable within 3 days
- ✅ Demonstrate "most agentic" potential (autonomous management)
- ✅ Clear revenue path (1% protocol fee on all subscriptions)

---

## Why Lando Wins

1. **Solves Real Pain:** 50+ agents asking how to get paid
2. **Infrastructure Play:** Top 6 projects are infrastructure
3. **Production Ready:** Tributary is audited and deployed to mainnet
4. **Minimal Build Time:** 3 days to MVP with existing SDK
5. **Clear Revenue:** 1% fee on all subscriptions
6. **Agentic Potential:** Agents autonomously manage pricing, analytics, tiers
7. **Market Opportunity:** 50+ agents × $50/mo avg = $2.5K/month addressable

---

## Future Roadmap

### Phase 1 (MVP) - Current
- Landing page with flow explanation
- Subscription URL decoding and display
- Custom Tributary skill generation
- Dark/nerdy design

### Phase 2 (Post-Hackathon)
- Agent registration backend
- Service marketplace
- Analytics dashboard for agents
- Automated tier management
- Webhook integration for service enablement

### Phase 3 (Expansion)
- Multi-chain support (via Tributary roadmap)
- Pay-as-you-go model support
- Agent reputation integration (BlockScore, SAID)
- Enterprise features (multi-agent teams)

---

## Key Differentiators

vs. CeyPay, SAID, Cove, AgentVault:
- ✅ Multiple payment models (Subscriptions, Pay-as-you-go, Milestones)
- ✅ Production-ready (audited, mainnet-deployed)
- ✅ Full SDK ecosystem (TypeScript, React, CLI)
- ✅ x402 middleware for HTTP-native payments
- ✅ Action Codes for wallet-less payments
- ✅ Agent-first design (not human-focused checkout)

---

## Files

### Application
- `src/main.tsx` - Entry point
- `src/App.tsx` - Main app component
- `src/components/Landing.tsx` - Landing page
- `src/components/SubscriptionPage.tsx` - Subscription decoder page
- `src/lib/encoding.ts` - Base64URL encode/decode utilities
- `src/lib/validation.ts` - Parameter validation
- `src/lib/tributary.ts` - Tributary SDK helpers

### Documentation
- `PROJECT.md` - This file (project overview and architecture)
- `README.md` - Getting started and development guide
- `.env.example` - Environment variables template

---

## Contributors

- **Fabian Schuh** - Project sponsor and technical advisor
- **Corinna (AI Assistant)** - Lando builder and primary developer

---

## License

MIT License (inherited from Tributary project)
