# Basics

Tributary enables automated recurring payments on Solana through token delegation - users approve payments once, and the protocol handles execution automatically.

## Payment Flow

1. **User Approval** - User delegates spending authority for specific amounts
2. **Policy Creation** - Payment policies define when and how much to pay
3. **Automated Execution** - Smart contracts process payments on schedule
4. **Direct Transfer** - Funds move directly from user wallets to recipients

## Quick Start

### Generate Checkout Link (5 minutes)

```bash
pnpm install @tributary-so/payments @tributary-so/sdk @solana/web3.js
```

```typescript
import { PaymentsClient } from "@tributary-so/payments";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection, wallet);
const stripe = new PaymentsClient(connection, tributary);

const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ description: "Pro Plan", unitPrice: 10, quantity: 1 }],
  paymentFrequency: "monthly",
  tributaryConfig: {
    gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
    recipient: "YOUR_WALLET",
    trackingId: "user-pro-plan",
  },
});

console.log(session.url); // Share this link!
```

### Check Status

```typescript
const status = await stripe.subscriptions.checkStatus({
  trackingId: "user-pro-plan",
  userPublicKey: "USER_WALLET",
});

if (status.status === "active") {
  // Grant access
}
```

## For Different Audiences

### End Users

- Connect Solana wallet (Phantom, Solflare, Backpack)
- Approve one-time delegation
- Payments execute automatically
- Pause, resume, or cancel anytime

### Developers

- Install SDK: `pnpm install @tributary-so/sdk`
- Choose integration: Checkout links, React button, or Core SDK
- Build payment flows in minutes
- Monitor via REST API or WebSockets

### Payment Providers

- Build user-facing services on top of Tributary
- Create dashboards, onboarding, analytics
- Earn fees on payment volume
- Focus on UX, not protocol complexity

## Payment Types

| Type          | Description                             | Status  |
| ------------- | --------------------------------------- | ------- |
| Subscriptions | Fixed recurring payments                | ✅ Live |
| Milestones    | Project-based with up to 4 deliverables | ✅ Live |
| Pay-as-you-go | Usage-based with period limits          | ✅ Live |

## Key Benefits

- **No Fund Lock-Up** - Payments from user wallets, not contracts
- **True Automation** - One signature enables ongoing payments
- **Full Control** - Pause, resume, or cancel anytime
- **Any Token** - Support for all SPL tokens
- **Transparent** - All transactions on blockchain
- **Low Fees** - 1% protocol fee + Solana network fees

## Program Details

- **Program ID**: `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`
- **USDC Mint**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **Default Gateway**: `CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr`

## Networks

| Network  | RPC URL                               |
| -------- | ------------------------------------- |
| Mainnet  | `https://api.mainnet-beta.solana.com` |
| Devnet   | `https://api.devnet.solana.com`       |
| API      | `https://api.tributary.so`            |
| Checkout | `https://checkout.tributary.so`       |

## Next Steps

- [Integration Options](./integration.md) - Choose your integration method
- [Checkout Quickstart](./quickstart/checkout.md) - Generate payment links
- [SDK Reference](./sdks.md) - Complete SDK documentation
- [API Reference](./api/overview.md) - REST & WebSocket APIs
- [Use Cases](./use-cases.md) - Business applications
