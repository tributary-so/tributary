# SDK Integration Quickstart

Integrate Tributary SDK for programmatic control over recurring payments on Solana.

## Choose Your SDK

| SDK                      | Best For                                      |
| ------------------------ | --------------------------------------------- |
| `@tributary-so/sdk`      | Full protocol control, all payment types      |
| `@tributary-so/payments` | Stripe-compatible checkout, quick integration |

## Core SDK (`@tributary-so/sdk`)

### Installation

```bash
pnpm install @tributary-so/sdk @solana/web3.js @solana/spl-token @coral-xyz/anchor
```

### Setup

```typescript
import { Tributary } from '@tributary-so/sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const wallet: Wallet = /* your connected wallet */;
const tributary = new Tributary(connection, wallet);
```

### Create Subscription

```typescript
import { BN } from "@coral-xyz/anchor";
import { PaymentFrequency, createMemoBuffer } from "@tributary-so/sdk";

const tokenMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC
const recipient = new PublicKey("...");
const gateway = new PublicKey("...");

const instructions = await tributary.createSubscriptionInstruction(
  tokenMint,
  recipient,
  gateway,
  new BN(1000000), // 1 USDC
  true, // autoRenew
  12, // maxRenewals
  { monthly: {} } as PaymentFrequency,
  createMemoBuffer("Monthly subscription", 64),
  undefined, // startTime
  new BN(12000000), // approvalAmount (12 USDC)
  true // executeImmediately
);

const tx = new Transaction().add(...instructions);
const signature = await provider.sendAndConfirm(tx);
```

### Create Milestone Payment

```typescript
import { BN } from "@coral-xyz/anchor";

const milestoneAmounts = [
  new BN(25000000), // $25 - Planning
  new BN(50000000), // $50 - Development
  new BN(25000000), // $25 - Delivery
];
const milestoneTimestamps = [
  new BN(Math.floor(Date.now() / 1000) + 86400 * 7), // 1 week
  new BN(Math.floor(Date.now() / 1000) + 86400 * 21), // 3 weeks
  new BN(Math.floor(Date.now() / 1000) + 86400 * 35), // 5 weeks
];

const instructions = await tributary.createMilestonePaymentPolicy(
  tokenMint,
  recipient,
  gateway,
  milestoneAmounts,
  milestoneTimestamps,
  0, // Release condition: 0=time-based
  createMemoBuffer("Website project", 64)
);
```

### Create Pay-as-you-go

```typescript
const maxAmountPerPeriod = new BN(100000000); // $100 per month
const maxChunkAmount = new BN(10000000); // $10 max per claim
const periodLengthSeconds = new BN(86400 * 30); // 30 days

const instructions = await tributary.createPayAsYouGoPaymentPolicy(
  tokenMint,
  recipient,
  gateway,
  maxAmountPerPeriod,
  maxChunkAmount,
  periodLengthSeconds,
  createMemoBuffer("API usage", 64)
);
```

### Execute Payment

```typescript
const userPaymentPda = tributary.getUserPaymentPda(wallet.publicKey, tokenMint);
const policyPda = tributary.getPaymentPolicyPda(userPaymentPda.address, 1);

const executeInstructions = await tributary.executePayment(
  policyPda.address,
  recipient,
  tokenMint,
  gateway
);

const tx = new Transaction().add(...executeInstructions);
const signature = await provider.sendAndConfirm(tx);
```

### Query Subscriptions

```typescript
// Get all user payments
const userPayments = await tributary.getAllUserPaymentsByOwner(
  wallet.publicKey
);

// Get policies by user
const policies = await tributary.getPaymentPoliciesByUser(wallet.publicKey);

// Get policies where user is recipient
const receivedPolicies = await tributary.getPaymentPoliciesByRecipient(
  wallet.publicKey
);

// Get specific policy
const policy = await tributary.getPaymentPolicy(policyPda.address);
```

### Manage Policies

```typescript
// Pause subscription
await tributary.changePaymentPolicyStatus(policyPda.address, { paused: {} });

// Resume subscription
await tributary.changePaymentPolicyStatus(policyPda.address, { active: {} });

// Cancel subscription
await tributary.deletePaymentPolicy(policyPda.address);
```

### Key Methods

| Method                            | Description              |
| --------------------------------- | ------------------------ |
| `createSubscriptionInstruction()` | Create subscription      |
| `createMilestonePaymentPolicy()`  | Create milestone payment |
| `createPayAsYouGoPaymentPolicy()` | Create pay-as-you-go     |
| `executePayment()`                | Execute a payment        |
| `getAllUserPaymentsByOwner()`     | Get user payments        |
| `getPaymentPoliciesByUser()`      | Get user's policies      |
| `getPaymentPoliciesByRecipient()` | Get received payments    |
| `changePaymentPolicyStatus()`     | Pause/resume             |
| `deletePaymentPolicy()`           | Cancel                   |

---

## Payments SDK (`@tributary-so/payments`)

Stripe-compatible SDK for quick checkout integration.

### Installation

```bash
pnpm install @tributary-so/payments @tributary-so/sdk @solana/web3.js
```

### Setup

```typescript
import { PaymentsClient } from "@tributary-so/payments";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection, wallet);
const stripe = new PaymentsClient(connection, tributary);
```

### Create Checkout Session

```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ["tributary"],
  line_items: [{ description: "Pro Plan", unitPrice: 10.0, quantity: 1 }],
  paymentFrequency: "monthly",
  mode: "subscription",
  success_url: "https://yourapp.com/success",
  cancel_url: "https://yourapp.com/cancel",
  tributaryConfig: {
    gateway: "GATEWAY_PUBLIC_KEY",
    recipient: "RECIPIENT_PUBLIC_KEY",
    trackingId: "user_123_pro",
    autoRenew: true,
  },
});

// Redirect to checkout
window.location.href = session.url;
```

### Check Subscription Status

```typescript
const status = await stripe.subscriptions.checkStatus({
  trackingId: "user_123_pro",
  userPublicKey: "USER_PUBLIC_KEY",
  tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
});

// status.status: "pending" | "created" | "active" | "failed"
// status.paymentCount: number of payments
// status.nextPaymentDue: timestamp
```

### One-Time Payment

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [
    { description: "Premium Feature", unitPrice: 50.0, quantity: 1 },
  ],
  tributaryConfig: {
    recipient: "RECIPIENT_PUBLIC_KEY",
    trackingId: "order_12345",
  },
});

// Check status
const status = await stripe.payments.oneTime.checkStatus("order_12345");
// status.status: "pending" | "paid" | "expired"
```

### Quick Active Check

```typescript
const isActive = await stripe.subscriptions.isActive({
  trackingId: "user_123_pro",
  userPublicKey: "USER_PUBLIC_KEY",
});
// Returns: boolean
```

---

## Error Handling

```typescript
try {
  const instructions = await tributary.createSubscriptionInstruction(/*...*/);
  // Process
} catch (error) {
  console.error("Failed:", error);
  // Handle appropriately
}
```

## Important Notes

- **Wallet Connection**: Ensure wallet is connected and funded
- **Token Accounts**: SDK handles ATA creation automatically
- **Approvals**: Use `approvalAmount` for delegation
- **Network Fees**: Account for Solana transaction fees
- **Testing**: Use devnet (`https://api.devnet.solana.com`)

## Next Steps

- [SDK Reference](../sdks.md) - Complete SDK documentation
- [Checkout Links](./checkout.md) - Generate shareable URLs
- [React Button](./button.md) - Pre-built components
- [API Reference](../api/overview.md) - REST and WebSocket APIs
