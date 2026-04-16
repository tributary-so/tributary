# Use Cases

Tributary's three payment types support diverse business models. Each type is optimized for specific scenarios.

## Payment Type Overview

| Type          | Best For         | Predictability | Flexibility |
| ------------- | ---------------- | -------------- | ----------- |
| Subscriptions | Regular services | High           | Low         |
| Milestones    | Project work     | Medium         | Medium      |
| Pay-as-you-go | Variable usage   | Low            | High        |

## Subscriptions

Fixed recurring payments at regular intervals.

### SaaS & Software

- **Monthly software licenses** - $29/month for productivity tools
- **Annual enterprise plans** - $999/year with discounts
- **Developer tools** - API access with tiered pricing
- **Cloud services** - Compute, storage, bandwidth

### Content & Media

- **Newsletters** - Premium content for $10/month
- **Streaming platforms** - Video, audio, podcasts
- **Research reports** - Weekly/monthly analysis
- **Course access** - Continuous learning subscriptions

### Memberships & Communities

- **Professional associations** - Annual dues
- **Creator communities** - Discord server access
- **DAO participation** - Voting rights, exclusive channels
- **Club memberships** - Gym, co-working, social clubs

### Donations & Support

- **Open source funding** - Monthly GitHub sponsors
- **Creator support** - Patreon-style recurring donations
- **Nonprofit donations** - Charitable giving automation

---

## Milestone Payments

Project-based compensation with up to 4 configurable deliverables.

### Freelance & Consulting

```
Website Development - $1,500 total
├── Milestone 1: Design mockups - $300 (Week 1)
├── Milestone 2: Core development - $700 (Week 3)
├── Milestone 3: Testing & launch - $500 (Week 5)
```

### Software Development

- **Feature development** - Payment per feature delivered
- **Bug fixes** - Bounties with milestone verification
- **Code reviews** - Payment upon completion
- **Documentation** - Writing projects with chapter milestones

### Content Creation

- **Video series** - Payment per episode
- **Article packages** - Payment per article delivered
- **Design work** - Concept, draft, final milestones
- **Translation** - Milestone per document section

### Construction & Physical Work

- **Home renovations** - Foundation, framing, finishing
- **Event planning** - Booking, preparation, execution
- **Manufacturing** - Design, prototype, production

### Release Conditions

| Condition  | Description                     |
| ---------- | ------------------------------- |
| Time-based | Automatic release at timestamp  |
| Manual     | Requires recipient approval     |
| Automatic  | Instant on milestone completion |

---

## Pay-as-you-go

Usage-based billing with period limits and chunk controls.

### AI & LLM Services

```typescript
// AI API billing
PayAsYouGo {
  maxAmountPerPeriod: 100_000_000, // $100/month
  maxChunkAmount: 10_000_000,      // $10 max per call
  periodLengthSeconds: 2_592_000,   // 30 days
}
```

- **LLM token usage** - Per-token billing
- **Image generation** - Pay per image
- **Embedding services** - Per-request billing
- **Model inference** - Compute time billing

### API Services

- **REST APIs** - Per-request billing
- **GraphQL** - Query complexity billing
- **Webhooks** - Event delivery charges
- **Rate limiting** - Premium tier access

### Cloud Resources

- **Compute** - Per-hour billing
- **Storage** - Per-GB billing
- **Bandwidth** - Per-TB billing
- **Database** - Query-based pricing

### Data Services

- **Data feeds** - Real-time market data
- **Analytics** - Query-based billing
- **Search** - Per-search billing
- **Monitoring** - Metric ingestion

---

## Integration Patterns

### AI Agent Monetization (Lando)

Service agents generate subscription URLs for customer agents:

```typescript
// Service agent generates payment URL
const session = await payments.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ description: "AI Service Pro", unitPrice: 29, quantity: 1 }],
  paymentFrequency: "monthly",
  tributaryConfig: {
    gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
    recipient: "SERVICE_AGENT_WALLET",
    trackingId: "ai-service-pro",
  },
});

// Customer agent visits URL, subscribes
// Payments execute automatically
```

### API Monetization (x402)

HTTP 402 middleware for API access:

```typescript
import { createX402Middleware } from "@tributary-so/x402";

app.use(
  "/api/premium",
  createX402Middleware({
    scheme: "x402://payg",
    amount: 0.01, // $0.01 per request
    maxAmountPerPeriod: 100,
    periodLengthSeconds: 86400,
  })
);
```

### Checkout Links

Zero-code payment collection:

```typescript
// Generate link
const session = await payments.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ description: "Newsletter Pro", unitPrice: 10, quantity: 1 }],
  paymentFrequency: "monthly",
  tributaryConfig: { gateway, recipient, trackingId },
});

// Share via email, SMS, chat
sendEmail(email, `Subscribe: ${session.url}`);
```

---

## Hybrid Models

Combine payment types for complex scenarios:

### Freemium + Subscription

- Free tier with basic access
- $10/month for premium features
- $50/month for enterprise

### Project + Maintenance

- Milestone payments for initial build
- Monthly subscription for ongoing support

### Usage + Minimum

- $50/month minimum (subscription)
- Pay-as-you-go for usage above threshold

---

## Industry Applications

### Creator Economy

| Creator Type      | Payment Type  | Model                  |
| ----------------- | ------------- | ---------------------- |
| Newsletter writer | Subscription  | $10/month premium      |
| YouTuber          | Subscription  | $5/month membership    |
| Consultant        | Milestone     | $500 per project phase |
| AI bot builder    | Pay-as-you-go | $0.01 per API call     |

### DeFi & Web3

| Protocol Type   | Payment Type  | Model                  |
| --------------- | ------------- | ---------------------- |
| Staking service | Subscription  | Monthly management fee |
| Bridge protocol | Pay-as-you-go | Per-transaction fee    |
| DAO tooling     | Milestone     | Feature bounties       |
| Analytics       | Subscription  | $99/month premium      |

### Professional Services

| Service Type   | Payment Type  | Model        |
| -------------- | ------------- | ------------ |
| Legal retainer | Subscription  | $2000/month  |
| Development    | Milestone     | $500/feature |
| Consulting     | Pay-as-you-go | $150/hour    |
| Accounting     | Subscription  | $300/month   |

---

## Next Steps

- [Subscription Payments](./policies/subscription.md) - Detailed subscription docs
- [Milestone Payments](./policies/milestone.md) - Milestone implementation
- [Pay-as-you-go](./policies/payasyougo.md) - Usage-based billing
- [Integration Options](./integration.md) - Get started
