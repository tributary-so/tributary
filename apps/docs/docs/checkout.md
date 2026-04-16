# Checkout Page Quickstart

Generate payment URLs for Tributary subscriptions without any frontend code. Perfect for:

- **AI agent monetization** (service agents accepting payments from customer agents)
- **Payment links** shared via messaging, email, or chat
- **Zero UI integration** - Tributary handles the checkout experience
- **Lando** - The "Stripe for AI Agents" platform

## Prerequisites

- Node.js (v16 or higher)
- pnpm package manager
- A recipient wallet address (to receive payments)

## Step 1: Installation

```bash
pnpm install @tributary-so/payments @tributary-so/sdk @solana/web3.js
```

## Step 2: Generate Checkout URL

Use the PaymentsClient to create checkout sessions:

```typescript
import { PaymentsClient } from "@tributary-so/payments";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection, wallet);
const payments = new PaymentsClient(connection, tributary);

const session = await payments.checkout.sessions.create({
  payment_method_types: ["tributary"],
  line_items: [
    {
      description: "Premium subscription",
      unitPrice: 10.0, // $10
      quantity: 1,
    },
  ],
  paymentFrequency: "monthly",
  mode: "subscription",
  success_url: "https://yourapp.com/success",
  cancel_url: "https://yourapp.com/cancel",
  tributaryConfig: {
    gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
    recipient: "YOUR_RECIPIENT_WALLET_ADDRESS",
    trackingId: "unique-tracking-id",
    autoRenew: true,
  },
});

console.log("Checkout URL:", session.url);
// https://checkout.tributary.so/#/subscribe/eyJ0bSI6IkVQakZXZGQ1Q...
```

## Step 3: Share the Payment URL

Once generated, share via any channel:

```typescript
// Email
function sendPaymentEmail(email: string, url: string) {
  sendEmail({
    to: email,
    subject: "Complete your subscription",
    body: `Click here: ${url}`,
  });
}

// SMS/Messaging
function sendPaymentSMS(phone: string, url: string) {
  sendSMS(phone, `Subscribe: ${url}`);
}

// AI Agent (Lando)
const skillContent = `
Subscribe to this service:
${url}

$10 USDC monthly subscription.
`;
```

## Step 4: Monitor Payments

Track subscription status using the SDK:

```typescript
// Check subscription status
const status = await payments.subscriptions.checkStatus({
  trackingId: "unique-tracking-id",
  userPublicKey: "USER_PUBLIC_KEY",
  tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
});

console.log("Status:", status.status); // "pending" | "created" | "active"
console.log("Payments:", status.paymentCount);
console.log("Next due:", status.nextPaymentDue);
```

## One-Time Payments

For single, non-recurring payments:

```typescript
const session = await payments.checkout.sessions.create({
  payment_method_types: ["tributary"],
  line_items: [
    {
      description: "Premium feature access",
      unitPrice: 50.0,
      quantity: 1,
    },
  ],
  mode: "payment", // One-time payment
  success_url: "https://yourapp.com/success",
  cancel_url: "https://yourapp.com/cancel",
  tributaryConfig: {
    recipient: "YOUR_RECIPIENT_WALLET_ADDRESS",
    trackingId: "order-12345",
  },
});
```

Check one-time payment status:

```typescript
const status = await payments.payments.oneTime.checkStatus("order-12345");

if (status.status === "paid") {
  console.log("Paid!", {
    transaction: status.transaction?.signature,
    amount: status.amount,
    paidAt: status.paidAt,
  });
}
```

## Custom Line Items

Add detailed breakdowns:

```typescript
const session = await payments.checkout.sessions.create({
  // ...
  line_items: [
    { description: "Basic plan", unitPrice: 20, quantity: 1 },
    { description: "Add-on feature", unitPrice: 5, quantity: 1 },
    { description: "Priority support", unitPrice: 10, quantity: 1 },
  ],
  // Total: $35
});
```

## URL Encoding

Checkout URLs contain Base64URL-encoded data:

**Subscription format:**

```
https://checkout.tributary.so/#/subscribe/{base64url}
```

**One-time payment format:**

```
https://checkout.tributary.so/#/pay/{base64url}
```

**Encoded fields:**

| Field | Description                             |
| ----- | --------------------------------------- |
| `m`   | Mode ("subscription" or "payment")      |
| `tm`  | Token mint address                      |
| `r`   | Recipient public key                    |
| `a`   | Total amount                            |
| `tid` | Tracking ID                             |
| `g`   | Gateway public key (subscriptions only) |
| `ar`  | Auto-renew flag (subscriptions only)    |
| `pf`  | Payment frequency (subscriptions only)  |
| `li`  | Line items JSON (optional)              |

## TributaryConfig Reference

### Subscription Mode

```typescript
tributaryConfig: {
  gateway: string;      // Required: Gateway public key
  recipient: string;    // Required: Recipient wallet address
  trackingId: string;   // Required: Your unique identifier
  autoRenew?: boolean;  // Optional: Enable auto-renewal (default: false)
  memo?: string;        // Optional: Payment memo
}
```

### One-Time Payment Mode

```typescript
tributaryConfig: {
  recipient: string;    // Required: Recipient wallet address
  trackingId: string;   // Required: Your unique identifier
  memo?: string;        // Optional: Payment memo
}
```

## Use Cases

### AI Agent Monetization (Lando)

```typescript
// Service agent generates subscription URL
const session = await payments.checkout.sessions.create({
  payment_method_types: ["tributary"],
  line_items: [{ description: "AI Service Pro", unitPrice: 29, quantity: 1 }],
  paymentFrequency: "monthly",
  mode: "subscription",
  tributaryConfig: {
    gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
    recipient: "SERVICE_AGENT_WALLET",
    trackingId: "agent-service-pro",
  },
});

// Customer agent visits URL, subscribes
// Service agent receives recurring USDC automatically
```

### Payment Links for Services

```typescript
// Generate and share via email/SMS/chat
const session = await payments.checkout.sessions.create({
  payment_method_types: ["tributary"],
  line_items: [
    { description: "Consulting Session", unitPrice: 99, quantity: 1 },
  ],
  mode: "payment",
  tributaryConfig: {
    recipient: "YOUR_WALLET",
    trackingId: "consulting-session-001",
  },
});

console.log(`Pay here: ${session.url}`);
```

## Testing

Use devnet for testing:

```typescript
const connection = new Connection("https://api.devnet.solana.com");

// Use devnet-fund wallet
// Small test amounts recommended
```

## Important Notes

- **Gateway**: Use `CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr` (default Tributary gateway)
- **Token Decimals**: Amounts in token units (USDC uses 6 decimals)
- **Wallet Required**: Customers need a Solana wallet
- **Non-Custodial**: Funds stay in user wallets

## Next Steps

- [SDK Reference](sdk.md) - Full SDK documentation
- [Payment Types](policies/subscription.md) - Subscriptions, milestones, pay-as-you-go
- [API Reference](api/overview.md) - REST and WebSocket APIs
- [Lando](https://lando.tributary.so) - AI-to-AI payments platform
