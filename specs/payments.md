# 🎯 **Package: `@tributary-so/payments`**

## Overview

A minimal Stripe-compatible payments SDK for Tributary USDC subscriptions on Solana. Provides essential checkout session functionality with zero API keys required - developers can integrate immediately without registration.

## Notes

- **No API Key Required**: Zero friction integration - just install and use
- **USDC Only**: Single currency support (USDC on Solana)
- **Tributary Payment Method**: Only supports "tributary" payment method type
- **No Customers**: Stripe customer concept not needed
- **No Payment Intents**: Direct session-based approach
- **MEMO-based Tracking**: Developers provide tracking ID stored in Solana transaction memos
- **Pure Frontend**: No backend or webhooks required for basic functionality

## Package Structure

```
packages/payments/
├── src/
│   ├── index.ts                 # Main exports
│   ├── core/
│   │   ├── client.ts           # Main client (no config needed)
│   │   ├── session.ts          # Checkout session management
│   │   └── tracking.ts         # MEMO-based payment tracking
│   ├── types/
│   │   ├── stripe.ts           # Stripe-compatible types
│   │   └── index.ts            # Type exports
│   └── utils/
│       ├── conversion.ts       # Stripe ↔ Tributary conversion
│       ├── validation.ts       # Input validation
│       └── memo.ts             # MEMO field utilities
├── package.json
└── README.md
```

## Core API Design

### Main Client Class

```typescript
// Zero configuration initialization
const stripe = new PaymentsClient(); // No API key needed!

// Usage: Identical to Stripe
const session = await stripe.checkout.sessions.create({
  payment_method_types: ["tributary"],
  line_items: [
    {
      price_data: {
        currency: "usd",
        product_data: { name: "Premium Subscription" },
        unit_amount: 2000, // $20.00
        recurring: { interval: "month" },
      },
      quantity: 1,
    },
  ],
  mode: "subscription",
  success_url: "https://yourdomain.com/success",
  cancel_url: "https://yourdomain.com/cancel",
  tributaryConfig: {
    gateway: "gateway-public-key", // Developer's gateway
    recipient: "recipient-public-key", // Developer's recipient
    trackingId: "user_123_sub_456", // Stored in MEMO for tracking
    autoRenew: true,
    memo: "Premium subscription", // Optional additional memo
  },
});
```

## Stripe-Compatible API Surface

### 1. Checkout Sessions

```typescript
interface CheckoutSessionCreateParams {
  payment_method_types?: string[]; // Only ["tributary"] supported
  line_items: LineItem[];
  mode: "payment" | "subscription"; // Only "subscription" for MVP
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, string>;
  tributaryConfig: {
    gateway: string; // Gateway public key
    recipient: string; // Recipient public key
    trackingId: string; // Unique ID for payment tracking
    autoRenew?: boolean; // Default: true
    memo?: string; // Optional additional memo text
  };
}

interface LineItem {
  price_data: {
    currency: string; // Only "usd" supported
    product_data: {
      name: string;
      description?: string;
      images?: string[];
    };
    unit_amount: number; // in cents
    recurring?: {
      interval: "day" | "week" | "month" | "year";
      interval_count?: number;
    };
  };
  quantity?: number;
}

class CheckoutSession {
  async create(
    params: CheckoutSessionCreateParams
  ): Promise<StripeCheckoutSession> {
    // Convert Stripe params to Tributary format
    const tributarySession = await this.createTributarySession(params);
    return this.convertToStripeFormat(tributarySession);
  }

  async retrieve(sessionId: string): Promise<StripeCheckoutSession> {
    // Fetch from Tributary and convert to Stripe format
  }
}
```

### 2. Payment Tracking (No Webhooks Required)

```typescript
class PaymentTracker {
  // Check payment status by tracking ID
  async checkPaymentStatus(
    trackingId: string,
    recipient: string
  ): Promise<PaymentStatus> {
    // Query Solana for transactions to recipient containing trackingId in MEMO
    const transactions = await this.findTransactionsByTrackingId(
      trackingId,
      recipient
    );

    return {
      status: transactions.length > 0 ? "paid" : "pending",
      transactions: transactions,
    };
  }

  // Get all payments for a tracking ID
  async getPaymentHistory(
    trackingId: string,
    recipient: string
  ): Promise<PaymentTransaction[]> {
    return await this.findTransactionsByTrackingId(trackingId, recipient);
  }

  private async findTransactionsByTrackingId(
    trackingId: string,
    recipient: string
  ): Promise<PaymentTransaction[]> {
    // Search Solana blockchain for transactions to recipient with trackingId in MEMO
    // Uses connection.getSignaturesForAddress() and parses transaction memos
  }
}
```

## Type Conversion Layer

### Stripe ↔ Tributary Conversion

```typescript
class StripeTributaryConverter {
  // Stripe Checkout Session → Tributary Session
  static stripeSessionToTributary(
    session: StripeCheckoutSession
  ): TributarySession {
    return {
      sessionId: session.id,
      gateway: session.tributaryConfig?.gateway || "",
      recipient: session.tributaryConfig?.recipient || "",
      tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
      amount: this.parseAmount(session.amount_total),
      currency: session.currency,
      paymentFrequency: this.convertFrequency(
        session.line_items[0]?.recurring?.interval
      ),
      autoRenew: session.tributaryConfig?.autoRenew ?? true,
      trackingId: session.tributaryConfig?.trackingId || "",
      memo: this.buildMemo(session.tributaryConfig),
    };
  }

  // Build MEMO field with tracking ID
  static buildMemo(tributaryConfig: TributaryConfig): string {
    const baseMemo = tributaryConfig.memo || "";
    const trackingMemo = `tributary:tracking:${tributaryConfig.trackingId}`;

    return baseMemo ? `${baseMemo} | ${trackingMemo}` : trackingMemo;
  }

  // Tributary Payment Policy → Stripe Subscription
  static tributaryPolicyToStripe(policy: PaymentPolicy): StripeSubscription {
    return {
      id: policy.publicKey.toString(),
      object: "subscription",
      customer: policy.userPayment.toString(),
      status: this.convertPolicyStatus(policy.status),
      current_period_start: policy.nextPaymentDue.toNumber() * 1000,
      current_period_end: this.calculatePeriodEnd(policy),
      items: [
        {
          id: "default",
          object: "subscription_item",
          price: {
            id: "custom-price",
            object: "price",
            currency: "usd",
            unit_amount: policy.policyType.subscription?.amount.toNumber() || 0,
            recurring: {
              interval: this.convertFrequencyToString(
                policy.policyType.subscription?.paymentFrequency
              ),
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tributary_policy_id: policy.publicKey.toString(),
        user_payment_id: policy.userPayment.toString(),
        tracking_id: this.extractTrackingIdFromMemo(policy.memo),
      },
    };
  }
}
```

## MEMO Field Utilities

```typescript
class MemoUtils {
  // Extract tracking ID from MEMO field
  static extractTrackingId(memo: string): string | null {
    const trackingMatch = memo.match(/tributary:tracking:([a-zA-Z0-9_-]+)/);
    return trackingMatch ? trackingMatch[1] : null;
  }

  // Validate tracking ID format
  static validateTrackingId(trackingId: string): boolean {
    // Allow alphanumeric, underscore, hyphen, max 64 chars
    return /^[a-zA-Z0-9_-]{1,64}$/.test(trackingId);
  }

  // Build complete MEMO with tracking
  static buildMemo(customMemo: string, trackingId: string): string {
    const trackingPart = `tributary:tracking:${trackingId}`;
    return customMemo ? `${customMemo} | ${trackingPart}` : trackingPart;
  }
}
```

## Package Configuration

```json
{
  "name": "@tributary-so/payments",
  "version": "1.0.0",
  "description": "Stripe-compatible payments SDK for Tributary USDC subscriptions - zero API keys required",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "prepack": "pnpm run build"
  },
  "dependencies": {
    "@tributary-so/sdk": "^1.1.0",
    "@solana/web3.js": "^1.98.4",
    "@solana/spl-token": "^0.4.13"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}
```

## Key Features

1. **Zero API Keys**: No registration, no configuration, just install and use
2. **USDC Only**: Single currency support (USDC on Solana)
3. **MEMO-based Tracking**: Developers provide tracking ID stored in Solana transaction memos
4. **Pure Frontend**: No backend or webhooks required for basic functionality
5. **Self-contained**: Developers track payments by monitoring Solana blockchain
6. **Type Safety**: Full TypeScript support with Stripe-compatible types

## Usage Examples

### Basic Subscription with Tracking

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
        unit_amount: 2000,
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

### Check Payment Status (Frontend Only)

```typescript
import { PaymentsClient, PaymentTracker } from "@tributary-so/payments";

const stripe = new PaymentsClient();
const tracker = new PaymentTracker();

// Check if payment was completed
async function checkPayment() {
  const status = await tracker.checkPaymentStatus(
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

### Get Payment History

```typescript
// Get all payments for a tracking ID
const payments = await tracker.getPaymentHistory(
  "user_123_monthly_premium",
  "RECIPIENT_PUBLIC_KEY_HERE"
);

console.log("Payment history:", payments);
// Output: Array of payment transactions with timestamps and amounts
```

## Implementation Priority

1. **Phase 1**: Core client and checkout sessions with MEMO tracking
2. **Phase 2**: Payment tracking utilities and status checking
3. **Phase 3**: Error handling and edge cases

## Future Enhancements

- **Optional Webhooks**: Add webhook registration for developers who want server-side notifications
- **Analytics Dashboard**: Optional registration for usage analytics and insights
- **Advanced Tracking**: More sophisticated MEMO formats and metadata storage
- **Multi-currency Support**: Add other SPL tokens if needed
