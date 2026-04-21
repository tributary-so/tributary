# Basics

Tributary is a protocol for automated recurring payments on Solana. You approve once, payments execute on schedule, your funds never leave your wallet.

---

## Pick Your Path

What do you want to do?

**I want to accept payments on my site**
→ [React SDK](sdk-react/index.md) for drop-in components and hooks, or [Checkout Links](checkout.md) for no-code hosted payment pages.

**I want full control over the payment flow**
→ [Integration Options](integration.md) to compare approaches, then [SDK Reference](sdk.md) for the complete TypeScript API.

**I want to bill for API usage**
→ [x402 Payments](x402.md) — HTTP 402 middleware that gates access behind pay-as-you-go or subscription payments.

**I want to monitor and verify payments server-side**
→ [Payment Tokens (JWT)](jwt-auth.md) to verify active subscriptions, [REST API](api/rest-api.md) to query payment data, or [WebSocket API](api/websocket.md) for real-time notifications.

**I want to build a payment service on top of Tributary**
→ [Providers](providers.md) for the gateway model, [Architecture](architecture.md) for the full technical picture.

**I want to use the CLI**
→ [CLI Tools](tools.md) for protocol management from the command line.

---

## Quick Start

The fastest path to a working payment:

```bash
pnpm install @tributary-so/payments @tributary-so/sdk @solana/web3.js
```

```typescript
import { PaymentsClient } from "@tributary-so/payments";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection, wallet);
const payments = new PaymentsClient(connection, tributary);

const session = await payments.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ description: "Pro Plan", unitPrice: 10, quantity: 1 }],
  paymentFrequency: "monthly",
  tributaryConfig: {
    gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
    recipient: "YOUR_WALLET",
    trackingId: "user-pro-plan",
  },
});

console.log(session.url); // Share this link with your customer
```

Verify the subscription is active:

```typescript
const status = await payments.subscriptions.checkStatus({
  trackingId: "user-pro-plan",
  userPublicKey: "USER_WALLET",
});

if (status.status === "active") {
  // Grant access
}
```

Full details in [Checkout Links](checkout.md) and [Payment Tokens](jwt-auth.md).

---

## Reference

|                     |                                                |
| ------------------- | ---------------------------------------------- |
| **Program ID**      | `TRibg8W8zmPHQqWtyAD1RxBRXEdyU13Mu6qX1Sg42tJ`  |
| **USDC Mint**       | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| **Default Gateway** | `CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr` |

| Network       | URL                                   |
| ------------- | ------------------------------------- |
| Mainnet RPC   | `https://api.mainnet-beta.solana.com` |
| Devnet RPC    | `https://api.devnet.solana.com`       |
| Tributary API | `https://api.tributary.so`            |
| Checkout      | `https://checkout.tributary.so`       |

---

## Payment Types

| Type          | Best For                   | Docs                                              |
| ------------- | -------------------------- | ------------------------------------------------- |
| Subscription  | Fixed recurring billing    | [Subscription Payments](policies/subscription.md) |
| Milestone     | Project-based deliverables | [Milestone Payments](policies/milestone.md)       |
| Pay-as-you-go | Metered / usage-based      | [Pay-as-you-go Payments](policies/payasyougo.md)  |

---

## Full Guide Index

| Page                                  | What You'll Find                                |
| ------------------------------------- | ----------------------------------------------- |
| [Integration Options](integration.md) | Compare all integration methods                 |
| [SDK Reference](sdk.md)               | TypeScript, React, Payments, x402, CLI packages |
| [React SDK](sdk-react/index.md)             | Components, hooks, and payment buttons          |
| [Checkout Links](checkout.md)         | Hosted payment pages, no frontend required      |
| [Payment Tokens](jwt-auth.md)         | Server-side JWT verification                    |
| [x402 Payments](x402.md)              | HTTP 402 middleware for API monetization        |
| [REST API](api/rest-api.md)           | Query subscriptions, events, webhooks           |
| [WebSocket API](api/websocket.md)     | Real-time payment notifications                 |
| [Architecture](architecture.md)       | Protocol design and account structure           |
| [Smart Contract](smart-contract.md)   | On-chain program details                        |
| [Fees](fees.md)                       | Protocol and gateway fee breakdown              |
| [Security](security.md)               | Non-custodial model and audit status            |
| [Providers](providers.md)             | Build a payment gateway                         |
| [Use Cases](use-cases.md)             | Business applications and examples              |
| [FAQ](faq.md)                         | Common questions                                |
