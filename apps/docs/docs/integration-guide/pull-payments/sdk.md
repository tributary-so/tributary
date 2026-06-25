# SDKs for Developers

Tributary provides multiple SDKs for different integration needs.

## TypeScript SDK (`@tributary-so/sdk`)

Complete protocol interaction library with Anchor integration.

### Installation

```bash
pnpm install @tributary-so/sdk @solana/web3.js @solana/spl-token @coral-xyz/anchor
```

### Basic Setup

```typescript
import { Tributary } from '@tributary-so/sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const wallet: Wallet = /* your connected wallet */;
const tributary = new Tributary(connection, wallet);
```

### Creating Subscriptions

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
  new BN(12000000), // approvalAmount
  true // executeImmediately
);

const tx = new Transaction().add(...instructions);
const signature = await provider.sendAndConfirm(tx);
```

### Creating Milestone Payments

```typescript
import { BN } from "@coral-xyz/anchor";

const milestoneAmounts = [
  new BN(50000000), // $50 - Initial setup
  new BN(75000000), // $75 - Core development
  new BN(100000000), // $100 - Final delivery
];
const milestoneTimestamps = [
  new BN(Math.floor(Date.now() / 1000) + 86400 * 7), // 1 week
  new BN(Math.floor(Date.now() / 1000) + 86400 * 21), // 3 weeks
  new BN(Math.floor(Date.now() / 1000) + 86400 * 35), // 5 weeks
];

const milestoneIx = await tributary.createMilestonePaymentPolicy(
  tokenMint,
  recipient,
  gateway,
  milestoneAmounts,
  milestoneTimestamps,
  0, // Time-based release condition
  createMemoBuffer("Website development project", 64)
);
```

### Creating Pay-as-you-go Payments

```typescript
const maxAmountPerPeriod = new BN(100000000); // $100 per period
const maxChunkAmount = new BN(10000000); // $10 max per claim
const periodLengthSeconds = new BN(86400 * 30); // 30 days

const payAsYouGoIx = await tributary.createPayAsYouGoPaymentPolicy(
  tokenMint,
  recipient,
  gateway,
  maxAmountPerPeriod,
  maxChunkAmount,
  periodLengthSeconds,
  createMemoBuffer("AI API usage billing", 64)
);
```

### Key Methods

| Method                            | Description                                         |
| --------------------------------- | --------------------------------------------------- |
| `createSubscriptionInstruction()` | Create subscription with all necessary instructions |
| `createMilestonePaymentPolicy()`  | Create milestone-based payment policy               |
| `createPayAsYouGoPaymentPolicy()` | Create usage-based payment policy                   |
| `executePayment()`                | Execute a payment for existing subscription         |
| `getAllUserPaymentsByOwner()`     | Get all user payment accounts                       |
| `getPaymentPoliciesByUser()`      | Get all policies for a user                         |
| `getPaymentPoliciesByRecipient()` | Get policies where user is recipient                |
| `changePaymentPolicyStatus()`     | Pause or resume a subscription                      |
| `deletePaymentPolicy()`           | Cancel a subscription                               |

---

## Payments SDK (`@tributary-so/payments`)

Payments SDK for Tributary. Supports subscriptions and one-time payments with
zero API keys required. It enables the use of a hosted checkout page that
facilitates the payments via embedded solana wallet integrations. The merchant
does not need to take care of anything blockchain related and can still verify
payments through a JWT token handed out after payment succeeded.

### Installation

```bash
pnpm install @tributary-so/payments @tributary-so/sdk @solana/web3.js
```

### Basic Setup

```typescript
import { PaymentsClient } from "@tributary-so/payments";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection, wallet);
const payments = new PaymentsClient(connection, tributary);
```

### Create Checkout Session

```typescript
const session = await payments.checkout.sessions.create({
  payment_method_types: ["tributary"],
  line_items: [
    {
      description: "Monthly premium access",
      unitPrice: 20.0,
      quantity: 1,
    },
  ],
  paymentFrequency: "monthly",
  mode: "subscription",
  success_url: "https://yourapp.com/success",
  cancel_url: "https://yourapp.com/cancel",
  tributaryConfig: {
    gateway: "GATEWAY_PUBLIC_KEY",
    recipient: "RECIPIENT_PUBLIC_KEY",
    trackingId: "user_123_monthly_premium",
    autoRenew: true,
  },
});

// Redirect to checkout
window.location.href = session.url;
```

### Check Subscription Status

```typescript
// User-based lookup
const status = await payments.subscriptions.checkStatus({
  trackingId: "user_123_monthly_premium",
  userPublicKey: "USER_PUBLIC_KEY",
  tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
});

if (status.status === "active") {
  console.log("Active!", {
    paymentCount: status.paymentCount,
    nextPaymentDue: status.nextPaymentDue,
  });
}
```

### One-Time Payments

```typescript
const session = await payments.checkout.sessions.create({
  payment_method_types: ["tributary"],
  line_items: [
    {
      description: "Premium feature",
      unitPrice: 50.0,
      quantity: 1,
    },
  ],
  mode: "payment",
  success_url: "https://yourapp.com/success",
  cancel_url: "https://yourapp.com/cancel",
  tributaryConfig: {
    recipient: "RECIPIENT_PUBLIC_KEY",
    trackingId: "user_123_premium_upgrade",
  },
});
```

### Check One-Time Payment Status

```typescript
const status = await payments.payments.oneTime.checkStatus(
  "user_123_premium_upgrade"
);

if (status.status === "paid") {
  console.log("Payment completed!", {
    transaction: status.transaction,
    paidAt: status.paidAt,
  });
}
```

### Status Values

**Subscriptions:**

| Status    | Description                         |
| --------- | ----------------------------------- |
| `pending` | Subscription not yet created        |
| `created` | On-chain, waiting for first payment |
| `active`  | First payment executed              |
| `failed`  | Payment failed                      |

**One-Time Payments:**

| Status    | Description                           |
| --------- | ------------------------------------- |
| `pending` | Payment not yet executed              |
| `paid`    | SPL transfer found with matching memo |
| `expired` | Payment window expired                |

### Key Features

- **Zero API Keys**: No registration, no configuration
- **USDC Only**: Single currency support
- **Dual Lookup**: User-based OR gateway-based status checking
- **Base64URL Encoding**: Compact, shareable checkout URLs
- **Real-time Status**: Live subscription status via PaymentPolicy

---

## React SDK (`@tributary-so/sdk-react`)

Pre-built payment components for React applications.

### Installation

```bash
pnpm install @tributary-so/sdk-react @solana/web3.js @coral-xyz/anchor
```

### Subscription Button

```typescript
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";
import { PublicKey, BN } from "@solana/web3.js";

<SubscriptionButton
  amount={new BN("10000000")} // 10 USDC
  token={new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")}
  recipient={recipient}
  gateway={gateway}
  interval={PaymentInterval.Monthly}
  maxRenewals={12}
  memo="Monthly subscription"
  label="Subscribe for $10/month"
  executeImmediately={true}
  onSuccess={(tx) => console.log("Success:", tx)}
  onError={(err) => console.error("Failed:", err)}
/>;
```

### Payment Intervals

```typescript
enum PaymentInterval {
  Daily,
  Weekly,
  Monthly,
  Quarterly,
  SemiAnnually,
  Annually,
}
```

---

## x402 SDK (`@tributary-so/x402`)

HTTP 402 payment protocol implementation for micropayments.

### Installation

```bash
pnpm install @tributary-so/x402 @tributary-so/sdk @solana/web3.js express
```

### Express Middleware

```typescript
import { createX402Middleware } from "@tributary-so/x402";
import { Tributary } from "@tributary-so/sdk";

const tributary = new Tributary(connection, wallet);

const middleware = createX402Middleware({
  scheme: "deferred", // or "x402://payg"
  network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  amount: 100,
  recipient: process.env.RECIPIENT_WALLET!,
  gateway: process.env.GATEWAY!,
  tokenMint: process.env.TOKEN_MINT!,
  paymentFrequency: "monthly",
  jwtSecret: process.env.JWT_SECRET!,
  sdk: tributary,
  connection,
});

app.use("/api/premium", middleware);
```

### Schemes

| Scheme           | Description               |
| ---------------- | ------------------------- |
| `deferred`       | Subscription-based access |
| `x402://payg`    | Metered pay-as-you-go     |
| `x402://prepaid` | Credit-based prepayment   |

---

## CLI (`@tributary-so/cli`)

Command-line interface for protocol management. See [CLI Tools](./cli.md) for full documentation.

```bash
# Create subscription
tributary-cli -c https://api.mainnet-beta.solana.com -k ~/.config/solana/id.json \
  create-subscription \
  -t [TOKEN_MINT] \
  -r [RECIPIENT] \
  -g [GATEWAY] \
  -a 1000000 \
  -f monthly
```
