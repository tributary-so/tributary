# Checkout Page Quickstart

This guide shows you how to generate payment URLs for Tributary subscriptions without any frontend code. This approach is perfect for:

- **AI agent monetization** (e.g., service agents accepting payments from customer agents)
- **Payment links** that can be shared via messaging, email, or chat
- **Zero UI integration** - let Tributary handle the entire checkout experience
- **Lando** - The "Stripe for AI Agents" platform built on this method

## Prerequisites

- Node.js (v16 or higher)
- pnpm package manager
- Basic knowledge of Solana addresses and tokens
- A recipient wallet address (to receive payments)

## Step 1: Installation

Install the Tributary payments package:

```bash
pnpm install @tributary-so/payments
```

## Step 2: Generate a Payment URL

The payments package provides a simple API to encode payment details into a URL that can be shared with customers.

```typescript
import { PaymentUrlBuilder } from "@tributary-so/payments";
import { PublicKey } from "@solana/web3.js";

// Configuration
const recipient = new PublicKey("YOUR_RECIPIENT_WALLET_ADDRESS");
const gateway = new PublicKey("CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr"); // Tributary gateway
const amount = 10; // 10 USDC
const frequency = "monthly"; // weekly, monthly, or custom

// Create the payment URL
const paymentUrl = PaymentUrlBuilder.buildSubscriptionUrl({
  token: "USDC",
  recipient: recipient.toString(),
  gateway: gateway.toString(),
  amount: amount,
  frequency: frequency,
  lineItems: [
    {
      description: "Premium subscription",
      unitPrice: amount,
      quantity: 1,
    },
  ],
  autoRenew: false,
});

console.log("Payment URL:", paymentUrl);
```

The output will be a URL like:
```
https://checkout.tributary.so/#/subscribe/eyJ0bSI6IkVQakZXZGQ1QXVmcVNTcWVNMnFOMXh6eWJhcEM4RzR3RUdHa1p3eVREdDF2IiwiciI6IlZPWExhTnZwNE9BZVh2RzR3eURvV2p2QVVqVnZ4aENvR3RZM2l0Y3NHRyIsImciOiJDd055YkxWUTNzVm1jWjNRMXZlUzZ4OTlnVVphQUYyZHVORGUzcWJjRU1HCIiwiYSI6IjEwIiwicGYiOiJtb250aGx5IiwibGkiOiJbeyJkZXNjcmlwdGlvbiI6IlByZW1pdW0gc3Vic2NyaXB0aW9uIiwidW5pdFByaWNlIjoxMCwicXVhbnRpdHkiOjF9XQ==...
```

## Step 3: Share the Payment URL

Once you have the payment URL, you can share it with customers through any channel:

```typescript
// Example: Send via messaging service
function sendPaymentUrlToCustomer(customerPhone: string, paymentUrl: string) {
  const message = `Subscribe to our premium service: ${paymentUrl}`;
  // Send via SMS, WhatsApp, Telegram, etc.
}

// Example: Send via email
function sendPaymentUrlViaEmail(customerEmail: string, paymentUrl: string) {
  const email = {
    to: customerEmail,
    subject: "Complete your subscription",
    body: `Click here to subscribe: ${paymentUrl}`,
  };
  // Send via your email service
}

// Example: AI agent scenario (Lando)
// Service agent sends payment URL to customer agent via chat
const skillContent = `
To subscribe to this service, visit:
${paymentUrl}

This will create a ${amount} USDC ${frequency} subscription.
`;
```

## Step 4: Customer Subscribes

When the customer visits the payment URL:

1. **Lando Checkout Page** displays subscription details
2. **Wallet Connection** prompts customer to connect their wallet
3. **Payment Confirmation** customer approves the subscription
4. **On-chain Subscription** created automatically on Solana
5. **Confirmation** customer receives confirmation and transaction signature

## Step 5: Monitor Payments

After customers subscribe, you can monitor payments using the Tributary SDK:

```typescript
import { Tributary } from "@tributary-so/sdk";
import { Connection } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection);

// Get all subscriptions where you're the recipient
const subscriptions = await tributary.getPaymentPoliciesByRecipient(recipient);
console.log("Active subscriptions:", subscriptions);
```

## Advanced Usage

### Custom Line Items

```typescript
const paymentUrl = PaymentUrlBuilder.buildSubscriptionUrl({
  token: "USDC",
  recipient: recipient.toString(),
  gateway: gateway.toString(),
  amount: 25,
  frequency: "monthly",
  lineItems: [
    {
      description: "Basic plan",
      unitPrice: 20,
      quantity: 1,
    },
    {
      description: "Add-on feature",
      unitPrice: 5,
      quantity: 1,
    },
  ],
});
```

### Custom Start Time

```typescript
const paymentUrl = PaymentUrlBuilder.buildSubscriptionUrl({
  token: "USDC",
  recipient: recipient.toString(),
  gateway: gateway.toString(),
  amount: 10,
  frequency: "monthly",
  startTime: new Date("2026-03-01T00:00:00Z").getTime() / 1000, // Unix timestamp
});
```

### One-Time Payments

For one-time payments (no auto-renewal):

```typescript
const paymentUrl = PaymentUrlBuilder.buildSubscriptionUrl({
  token: "USDC",
  recipient: recipient.toString(),
  gateway: gateway.toString(),
  amount: 50,
  frequency: "once",
  autoRenew: false,
});
```

### Custom Intervals

```typescript
const paymentUrl = PaymentUrlBuilder.buildSubscriptionUrl({
  token: "USDC",
  recipient: recipient.toString(),
  gateway: gateway.toString(),
  amount: 10,
  frequency: "custom",
  customIntervalSeconds: 604800, // Weekly (7 * 24 * 60 * 60)
});
```

## API Reference

### PaymentUrlBuilder.buildSubscriptionUrl()

Creates a payment URL for subscriptions.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Token mint address (e.g., USDC: `"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"`) |
| `recipient` | string | Yes | Recipient wallet address (to receive payments) |
| `gateway` | string | Yes | Payment gateway address (use default: `"CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr"`) |
| `amount` | number | Yes | Payment amount in token units |
| `frequency` | string | Yes | Payment frequency: `"once"`, `"weekly"`, `"monthly"`, or `"custom"` |
| `lineItems` | array | No | Array of line item objects for invoice breakdown |
| `autoRenew` | boolean | No | Enable automatic renewal (default: `false`) |
| `startTime` | number | No | Unix timestamp for subscription start (optional) |
| `customIntervalSeconds` | number | No | Custom interval in seconds (required when `frequency="custom"`) |

**Returns:** `string` - The full checkout URL

## Use Cases

### AI Agent Monetization (Lando)

```typescript
// Service agent generates subscription URL
const serviceAgentPaymentUrl = PaymentUrlBuilder.buildSubscriptionUrl({
  token: "USDC",
  recipient: "SERVICE_AGENT_WALLET",
  gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
  amount: 29,
  frequency: "monthly",
});

// Customer agent receives URL, visits checkout, subscribes
// Service agent receives recurring USDC payments automatically
```

### Payment Links for Services

```typescript
// Generate and share payment links via email, SMS, or chat
const paymentLink = PaymentUrlBuilder.buildSubscriptionUrl({
  token: "USDC",
  recipient: "YOUR_WALLET",
  gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
  amount: 99,
  frequency: "monthly",
});

// Share with customers
console.log(`Subscribe here: ${paymentLink}`);
```

### Flexible Payment Scheduling

```typescript
// Create payment URLs with custom schedules
const weeklyPayment = PaymentUrlBuilder.buildSubscriptionUrl({
  token: "USDC",
  recipient: "YOUR_WALLET",
  gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
  amount: 10,
  frequency: "custom",
  customIntervalSeconds: 604800, // Weekly
});

const quarterlyPayment = PaymentUrlBuilder.buildSubscriptionUrl({
  token: "USDC",
  recipient: "YOUR_WALLET",
  gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
  amount: 50,
  frequency: "custom",
  customIntervalSeconds: 7776000, // Quarterly (90 days)
});
```

## Important Notes

- **Gateway Address:** Use the default gateway `CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr` unless you have a custom gateway
- **Token Decimals:** Amounts are in token units, not smallest units (USDC uses 6 decimals)
- **URL Encoding:** The payment details are Base64URL-encoded for safe sharing
- **Checkout Page:** Customers will see the Lando checkout page at `checkout.tributary.so`
- **Wallet Required:** Customers need a Solana wallet to complete subscriptions

## Testing

For testing, use Solana devnet:

```typescript
// Devnet gateway address (if different from mainnet)
const devnetGateway = new PublicKey("DEVNET_GATEWAY_ADDRESS");

// Test with devnet
const testPaymentUrl = PaymentUrlBuilder.buildSubscriptionUrl({
  token: "USDC",
  recipient: recipient.toString(),
  gateway: devnetGateway.toString(),
  amount: 1, // Small test amount
  frequency: "monthly",
});
```

## Next Steps

- **Explore Payment Types:** Learn about [subscriptions](../subscription-payments.md), [milestones](../milestone-payments.md), and [pay-as-you-go](../pay-as-you-go.md)
- **Monitor Payments:** Use the [SDK](../sdks.md) to track subscriptions and payments
- **Build with Lando:** Check out [Lando](https://lando.tributary.so) for AI-to-AI payments
- **Full SDK Reference:** See [SDKs](../sdks.md) for advanced usage

## Need Help?

- 📖 Read the full [SDK Reference](../sdks.md)
- ❓ Check our [FAQ](../faq.md)
- 💬 Join our community on [Discord](https://discord.gg/tributary)
