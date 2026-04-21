# Tributary

**Open-source payment infrastructure for Solana.** Automated recurring payments that feel like Web2 but live on Web3.

---

## Why We Built This

Recurring payments are the backbone of modern business — subscriptions, retainers, utility billing. Yet in Web3, they're still a mess.

**Users** have to manually sign a transaction every single billing cycle. Miss one? Service stops. **Businesses** can't count on predictable revenue when payments depend on someone remembering to click "confirm." And the existing "solutions"? Most require locking funds in a smart contract, which is just a fancy way of saying _you give up control_.

That's not good enough. Web3 users deserve the same "set it and forget it" experience they already have with Netflix or their gym membership — without sacrificing self-custody.

That's why Tributary exists.

---

## How It Works

Tributary uses Solana's native **token delegation**. You grant permission for specific amounts on a specific schedule. The protocol pulls exactly what you approved, when you approved it — nothing more.

- **No deposits.** Your tokens stay in your wallet until a payment is due.
- **No middleman.** Payments go directly from your wallet to the recipient.
- **No surprises.** You can pause, resume, or cancel anytime.
- **No borders.** Anyone, anywhere can pay or accept payments.

Payments settle in under a second with fees measured in fractions of a cent — that's Solana, not magic.

|                 | Tributary           | Traditional                   |
| --------------- | ------------------- | ----------------------------- |
| **Setup**       | Seconds             | Days (KYC, bank verification) |
| **Fees**        | starting at 1%      | 2.9% + 30¢ per transaction    |
| **Settlement**  | Instant (400ms)     | 2–7 business days             |
| **Chargebacks** | No                  | Yes                           |
| **Custody**     | Your wallet, always | Held by a third party         |
| **Geography**   | No restrictions     | Country-limited               |

---

## What You Get

Three payment models. One protocol. Pick what fits your business.

### Subscriptions

The familiar model. Fixed amount, regular interval.

- Pay the same every week, month, or year
- Auto-renew or cap the number of renewals
- Cancel or pause with one click

**Great for:** SaaS tools, memberships, streaming, recurring donations

[Learn more](policies/subscription.md)

### Milestone Payments

Pay for deliverables, not time. Split a project into up to 4 milestones.

- Different amounts per milestone
- Release on schedule, on approval, or automatically
- Funds committed upfront but released only as work completes

**Great for:** Freelance projects, consulting, software development, content series

[Learn more](policies/milestone.md)

### Pay-as-you-go

Use first, pay later. Providers claim what you owe within limits you set.

- Set a spending cap per billing period
- Providers claim incrementally as you consume
- Periods reset automatically — hard limits enforced on-chain

**Great for:** AI APIs, cloud computing, utility services, anything metered

[Learn more](policies/payasyougo.md)

---

## Who Is It For?

### End Users

One-click setup, total transparency, full control. Every payment is on-chain. Your tokens never leave your wallet. Pause or cancel anytime.

### Developers

Drop in a [React component or hook](sdk-react/index.md) and you're done. Need more control? Use the [TypeScript SDK](sdk.md). Going no-code? Generate [checkout links](checkout.md) in seconds. Everything is [open-source](https://github.com/tributary-so/tributary).

### Businesses

Accept recurring payments globally without the KYC bottleneck. Pay ~1% instead of 3%+. Settle instantly. Give your customers a Web2-familiar experience on Web3 rails.

### Payment Providers

Build your own payment service on top of Tributary. Earn fees by running a [Payment Gateway](providers.md). Focus on UX — the protocol handles the complexity.

---

## What Can You Build?

| Idea                  | Payment Type  | How It Works                        |
| --------------------- | ------------- | ----------------------------------- |
| Streaming service     | Subscription  | $10/month, auto-renew               |
| Freelance platform    | Milestones    | Pay per deliverable phase           |
| AI API gateway        | Pay-as-you-go | Bill per token, capped daily        |
| Newsletter            | Subscription  | $5/month, cancel anytime            |
| Consulting engagement | Milestones    | 3-phase project with approval gates |
| Cloud compute         | Pay-as-you-go | Metered usage with weekly caps      |

More ideas in [Use Cases](use-cases.md).

---

## Get Started

1. **Pick your integration** — [React SDK](sdk-react/index.md), [TypeScript SDK](sdk.md), or [Checkout Links](checkout.md)
2. **Choose a payment type** — [Subscription](policies/subscription.md), [Milestone](policies/milestone.md), or [Pay-as-you-go](policies/payasyougo.md)
3. **Go live** — deploy on Solana mainnet in minutes
4. **Monitor** — track payments via [REST API](api/rest-api.md) or [WebSocket API](api/websocket.md)

!!! question "Questions?"

    Check the [FAQ](faq.md) or read the [Architecture Overview](architecture.md).

## Developer Tools

- **[TypeScript SDK](sdk.md#typescript-sdk-tributary-sosdk)** - Complete protocol interaction
- **[React SDK](sdk-react/index.md)** - Pre-built payment components and React hooks
- **[Payments SDK](sdk.md#payments-sdk-tributary-sopayments)** - Simple Payments API with hosted checkout page (zero API keys)
- **[x402 SDK](sdk.md#x402-sdk-tributary-sox402)** - HTTP 402 middleware for API monetization
- **[CLI](sdk.md#cli-tributary-socli)** - Protocol management tools
- **[REST API](./api/rest-api.md)** - Query subscriptions, events, manage webhooks
- **[WebSocket API](./api/websocket.md)** - Real-time payment notifications

---

Tributary provides the foundation. You build the future.
