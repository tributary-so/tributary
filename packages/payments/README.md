# @tributary-so/payments

A minimal Stripe-compatible payments SDK for Tributary USDC subscriptions on Solana. Provides essential checkout session functionality with zero API keys required - developers can integrate immediately without registration.

## Features

- **Zero API Keys**: No registration, no configuration, just install and use
- **USDC Only**: Single currency support (USDC on Solana)
- **Tributary Payment Method**: Only supports "tributary" payment method type
- **MEMO-based Tracking**: Developers provide tracking ID stored in Solana transaction memos
- **Pure Frontend**: No backend or webhooks required for basic functionality
- **Type Safety**: Full TypeScript support with Stripe-compatible types

## Installation

```bash
npm install @tributary-so/payments
```

## Quick Start

```typescript
import { PaymentsClient } from "@tributary-so/payments";

// No configuration needed!
const stripe = new PaymentsClient();

const session = await stripe.checkout.sessions.create({
  payment_method_types: ["tributary"],
  line_items: [
    {
      price_data: {
        currency: "usd",
        product_data: { name: "Premium Plan" },
        unit_amount: 2000, // $20.00
        recurring: { interval: "month" },
      },
      quantity: 1,
    },
  ],
  mode: "subscription",
  success_url: "https://yourapp.com/success",
  cancel_url: "https://yourapp.com/cancel",
  tributaryConfig: {
    gateway: "GATEWAY_PUBLIC_KEY_HERE",
    recipient: "RECIPIENT_PUBLIC_KEY_HERE",
    trackingId: "user_123_monthly_premium", // Your unique identifier
    autoRenew: true,
    memo: "Monthly premium subscription",
  },
});

// Redirect to hosted checkout
window.location.href = session.url;
```

## Payment Tracking

Check payment status without webhooks using MEMO-based tracking:

```typescript
import { PaymentsClient } from "@tributary-so/payments";

const stripe = new PaymentsClient();

// Check if payment was completed
async function checkPayment() {
  const status = await stripe.payments.checkStatus(
    "user_123_monthly_premium",
    "RECIPIENT_PUBLIC_KEY_HERE"
  );

  if (status.status === "paid") {
    console.log("Payment completed!", status.transactions);
    // Update UI, grant access, etc.
  } else {
    console.log("Payment still pending...");
    // Continue polling or show pending status
  }
}

// Poll every 30 seconds
setInterval(checkPayment, 30000);
```

## API Reference

### PaymentsClient

The main client class - no configuration required.

```typescript
const stripe = new PaymentsClient();
```

#### checkout.sessions.create()

Create a checkout session.

```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ["tributary"], // Only "tributary" supported
  line_items: [
    {
      price_data: {
        currency: "usd", // Only "usd" supported
        product_data: {
          name: "Product Name",
          description: "Optional description",
        },
        unit_amount: 2000, // Amount in cents
        recurring: {
          interval: "day" | "week" | "month" | "year",
          interval_count: number,
        },
      },
      quantity: 1,
    },
  ],
  mode: "subscription", // Only "subscription" for MVP
  success_url: "https://yourapp.com/success",
  cancel_url: "https://yourapp.com/cancel",
  tributaryConfig: {
    gateway: "gateway-public-key", // Gateway public key
    recipient: "recipient-public-key", // Recipient public key
    trackingId: "unique-tracking-id", // Your unique identifier
    autoRenew: boolean, // Default: true
    memo: string, // Optional additional memo
  },
});
```

#### payments.checkStatus()

Check payment status by tracking ID.

```typescript
const status = await stripe.payments.checkStatus(trackingId, recipient);
```

Returns:

```typescript
{
  status: "pending" | "paid" | "failed";
  transactions: PaymentTransaction[];
}
```

#### payments.getHistory()

Get payment history for a tracking ID.

```typescript
const payments = await stripe.payments.getHistory(trackingId, recipient);
```

## Tributary Configuration

The `tributaryConfig` object contains Tributary-specific settings:

- `gateway`: Your Tributary gateway public key
- `recipient`: The recipient public key (where payments go)
- `trackingId`: Your unique identifier for tracking payments
- `autoRenew`: Whether to automatically renew payments (default: true)
- `memo`: Optional additional memo text for the transaction

## MEMO-based Tracking

Instead of webhooks, this SDK uses Solana transaction MEMO fields for payment tracking:

1. **Tracking ID**: You provide a unique identifier that gets stored in the MEMO
2. **Automatic Storage**: The SDK automatically formats the MEMO as `tributary:tracking:{trackingId}`
3. **Blockchain Query**: Payment status is checked by querying Solana transactions for the tracking ID

This approach enables pure frontend applications without requiring backend infrastructure.

## Error Handling

The SDK throws standard JavaScript errors for invalid inputs:

```typescript
try {
  const session = await stripe.checkout.sessions.create(params);
} catch (error) {
  if (error.message.includes("Invalid gateway public key")) {
    // Handle invalid gateway key
  } else if (error.message.includes("Invalid trackingId format")) {
    // Handle invalid tracking ID
  }
  // ... other error handling
}
```

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm run test

# Lint the code
npm run lint
```

## License

MIT
