# Welcome to Tributary Protocol

**Open-source, permissionless automated payment infrastructure for Solana**

Tributary brings Web2 subscription simplicity to Web3 with truly automated
recurring payments—no manual signing every month, no deposits into contracts,
funds flow directly from user token accounts.

It simplifies the payments so that merchants can accept USDC without even
thinking about blockchain specifics while still retaining the possibility to
verify, not trust.

## What is Tributary?

Tributary is a **protocol** that enables automated recurring payments on Solana:

- **Open-source smart contracts** for automated payments using token delegation
- **Developer SDKs** for easy integration (TypeScript, React, Payments)
- **Permissionless access** - anyone can build on top
- **Multiple payment types** - subscriptions, milestones, pay-as-you-go

## Key Features

### ✅ Payment Types

- **[Subscriptions](./policies/subscription.md)** - Fixed recurring payments (daily, weekly, monthly, etc.)
- **[Milestones](./policies/milestone.md)** - Project-based payments with up to 4 deliverables
- **[Pay-as-you-go](./policies/payasyougo.md)** - Usage-based billing with period limits

### ✅ Developer Tools

- **[TypeScript SDK](sdk.md#typescript-sdk-tributary-sosdk)** - Complete protocol interaction
- **[React SDK](sdk.md#react-sdk-tributary-sosdk-react)** - Pre-built payment components
- **[Payments SDK](sdk.md#payments-sdk-tributary-sopayments)** - Simple Payments API with hosted checkout page (zero API keys)
- **[x402 SDK](sdk.md#x402-sdk-tributary-sox402)** - HTTP 402 middleware for API monetization
- **[CLI](sdk.md#cli-tributary-socli)** - Protocol management tools
- **[REST API](./api/rest-api.md)** - Query subscriptions, events, manage webhooks
- **[WebSocket API](./api/websocket.md)** - Real-time payment notifications

### ✅ Protocol Features

- **Automated Execution** - Payments execute automatically on schedule
- **Non-Custodial** - Funds stay in user wallets
- **Low Fees** - 1% protocol fee + configurable gateway fees
- **Action Codes** - Wallet-less payment initiation
- **Full Control** - Pause, resume, or cancel anytime

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

## Resources

- **Website**: [tributary.so](https://tributary.so)
- **Documentation**: [docs.tributary.so](https://docs.tributary.so)
- **GitHub**: [github.com/tributary-so/tributary](https://github.com/tributary-so/tributary)
- **Checkout**: [checkout.tributary.so](https://checkout.tributary.so)
- **API**: [api.tributary.so](https://api.tributary.so)

## Next Steps

- [What is Tributary?](./what.md) - Understand the protocol
- [Integration](./integration.md) - Choose your integration method
- [SDK Reference](./sdk.md) - Complete SDK documentation
- [API Reference](./api/overview.md) - REST and WebSocket APIs
