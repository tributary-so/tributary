# Welcome to Tributary Protocol

**Open-source, permissionless automated payment infrastructure for Solana**

Tributary brings Web2 subscription simplicity to Web3 with truly automated recurring payments—no manual signing every month, no deposits into contracts, funds flow directly from user token accounts.

## What is Tributary?

Tributary is a **protocol** that enables automated recurring payments on Solana:

- **Open-source smart contracts** for automated payments using token delegation
- **Developer SDKs** for easy integration (TypeScript, React, Payments)
- **Permissionless access** - anyone can build on top
- **Multiple payment types** - subscriptions, milestones, pay-as-you-go

## Key Features

### ✅ Payment Types

- **Subscriptions** - Fixed recurring payments (daily, weekly, monthly, etc.)
- **Milestones** - Project-based payments with up to 4 deliverables
- **Pay-as-you-go** - Usage-based billing with period limits

### ✅ Developer Tools

- **TypeScript SDK** - Complete protocol interaction
- **React SDK** - Pre-built payment components
- **Payments SDK** - Stripe-compatible checkout (zero API keys)
- **x402 SDK** - HTTP 402 middleware for API monetization
- **CLI** - Protocol management tools
- **REST API** - Query subscriptions, events, manage webhooks
- **WebSocket API** - Real-time payment notifications

### ✅ Protocol Features

- **Automated Execution** - Payments execute automatically on schedule
- **Non-Custodial** - Funds stay in user wallets
- **Low Fees** - 1% protocol fee + configurable gateway fees
- **Action Codes** - Wallet-less payment initiation
- **Full Control** - Pause, resume, or cancel anytime

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT PROVIDERS                        │
│   (Build user-facing services, dashboards, integrations)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRIBUTARY SDKs                           │
│   TypeScript SDK │ React SDK │ Payments SDK │ x402 SDK     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 TRIBUTARY PROTOCOL                          │
│   Smart Contracts │ PDA System │ Fee Distribution           │
│   Program ID: TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SOLANA BLOCKCHAIN                        │
│   400ms finality │ Sub-cent fees │ Global access            │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Generate Checkout Link

```bash
pnpm install @tributary-so/payments @tributary-so/sdk @solana/web3.js
```

```typescript
import { PaymentsClient } from "@tributary-so/payments";

const stripe = new PaymentsClient(connection, tributary);
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ description: "Pro Plan", unitPrice: 10, quantity: 1 }],
  paymentFrequency: "monthly",
  tributaryConfig: { gateway, recipient, trackingId },
});

console.log(session.url); // Share this link!
```

### React Component

```tsx
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";

<SubscriptionButton
  amount={new BN(10000000)}
  recipient={recipient}
  interval={PaymentInterval.Monthly}
  label="Subscribe $10/month"
/>;
```

### REST API

```bash
# Check subscription status
curl "https://api.tributary.so/v1/subscriptions?trackingId=my-sub"
```

## Why Tributary?

| Feature     | Tributary       | Traditional          |
| ----------- | --------------- | -------------------- |
| Setup       | Seconds         | Days (KYC, approval) |
| Fees        | 1%              | 2.9% + 30¢           |
| Settlement  | Instant         | 2-7 days             |
| Chargebacks | No              | Yes                  |
| Recurring   | Native          | Complex setup        |
| Custody     | Non-custodial   | Custodial risk       |
| Global      | No restrictions | Country restrictions |

## Program Details

- **Program ID**: `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`
- **Network**: Solana Mainnet & Devnet
- **USDC Mint**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

## Resources

- **Documentation**: [docs.tributary.so](https://docs.tributary.so)
- **GitHub**: [github.com/tributary-so/tributary](https://github.com/tributary-so/tributary)
- **Website**: [tributary.so](https://tributary.so)
- **Checkout**: [checkout.tributary.so](https://checkout.tributary.so)
- **API**: [api.tributary.so](https://api.tributary.so)

## Next Steps

- [What is Tributary?](./what.md) - Understand the protocol
- [Integration Options](./integration.md) - Choose your integration method
- [Quickstarts](./quickstart/integration.md) - Get started quickly
- [SDK Reference](./sdks.md) - Complete SDK documentation
- [API Reference](./api/overview.md) - REST and WebSocket APIs
