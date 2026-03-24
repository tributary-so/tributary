# @tributary-so/payments

A minimal payments SDK for Tributary on Solana. Supports both recurring subscriptions (via smart contract) and one-time payments (via SPL transfers with memo tracking). Provides essential checkout session functionality with zero API keys required - developers can integrate immediately without registration.

## Features

- **Zero API Keys**: No registration, no configuration, just install and use
- **USDC Only**: Single currency support (USDC on Solana)
- **Tributary Payment Method**: Only supports "tributary" payment method type
- **Base64URL Encoding**: Compact, URL-safe session encoding for sharing
- **Dual Payment Modes**: Subscriptions (smart contract) OR one-time payments (SPL transfers)
- **Dual Lookup Strategy**: User-based OR gateway-based subscription status checking
- **Real-time Status**: Live subscription status using PaymentPolicy `paymentCount`
- **Memo Tracking**: One-time payments tracked via transaction memo fields
- **Pure Frontend**: No backend or webhooks required for basic functionality
- **Type Safety**: Full TypeScript support

## Installation

```bash
npm install @tributary-so/payments
```

## Quick Start

```typescript
import { PaymentsClient } from "@tributary-so/payments";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

// Initialize with connection and tributary
const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection, wallet);
const manager = new PaymentsClient(connection, tributary);

const session = await manager.checkout.sessions.create({
  payment_method_types: ["tributary"],
  line_items: [
    {
      description: "Monthly premium access to all features",
      unitPrice: 20.0, // $20.00
      quantity: 1,
    },
  ],
  paymentFrequency: "monthly",
  mode: "subscription",
  success_url: "https://yourapp.com/success",
  cancel_url: "https://yourapp.com/cancel",
  tributaryConfig: {
    gateway: "GATEWAY_PUBLIC_KEY_HERE",
    recipient: "RECIPIENT_PUBLIC_KEY_HERE",
    trackingId: "user_123_monthly_premium", // Your unique identifier
    autoRenew: true,
    memo: "Optional memo for the payment",
  },
});

// Redirect to hosted checkout
window.location.href = session.url;
```

### One-Time Payment Quick Start

```typescript
import { PaymentsClient } from "@tributary-so/payments";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

// Initialize with connection and tributary
const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection, wallet);
const manager = new PaymentsClient(connection, tributary);

const session = await manager.checkout.sessions.create({
  payment_method_types: ["tributary"],
  line_items: [
    {
      description: "Premium feature access",
      unitPrice: 50.0, // $50.00
      quantity: 1,
    },
  ],
  mode: "payment",
  success_url: "https://yourapp.com/success",
  cancel_url: "https://yourapp.com/cancel",
  tributaryConfig: {
    recipient: "RECIPIENT_PUBLIC_KEY_HERE",
    trackingId: "user_123_premium_upgrade", // equivalent to memo
  },
});

// Redirect to hosted checkout
window.location.href = session.url;
```

## Subscription Status Tracking

Check subscription status efficiently using our dual lookup strategy - either user-based OR gateway-based:

```typescript
import { PaymentsClient } from "@tributary-so/payments";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection, wallet);
const manager = new PaymentsClient(connection, tributary);

// Option 1: User-based lookup (for user-facing apps)
async function checkUserSubscription() {
  const status = await manager.subscriptions.checkStatus({
    trackingId: "user_123_monthly_premium",
    userPublicKey: "USER_PUBLIC_KEY_HERE",
    tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  });

  if (status.status === "active") {
    console.log("Subscription active!", {
      paymentCount: status.paymentCount,
      nextPaymentDue: status.nextPaymentDue,
    });
    // Grant access, update UI, etc.
  } else if (status.status === "created") {
    console.log("Subscription created, waiting for first payment...");
    // Show pending status
  } else {
    console.log("Subscription not found or failed");
    // Handle error case
  }
}

// Option 2: Gateway-based lookup (for gateway management)
async function checkGatewaySubscription() {
  const status = await manager.subscriptions.checkStatus({
    trackingId: "user_123_monthly_premium",
    gatewayPublicKey: "GATEWAY_PUBLIC_KEY_HERE",
  });

  if (status.status === "active") {
    console.log("Subscription active via gateway!", {
      paymentCount: status.paymentCount,
      nextPaymentDue: status.nextPaymentDue,
    });
    // Gateway management logic
  }
}

// Enhanced session retrieval with real-time status
async function getSessionWithStatus() {
  const session = await manager.checkout.sessions.retrieve(
    "session_id_or_encoded_url"
  );

  if (session.subscription) {
    console.log("Subscription details:", {
      id: session.subscription.id,
      status: session.subscription.status,
      paymentCount: session.subscription.paymentCount,
      current_period_end: session.subscription.current_period_end,
    });
  }
}

// Check status on page load
checkUserSubscription();
```

## One-Time Payment Status Tracking

One-time payments are tracked via SPL transfers with memo fields. Status checking requires indexing (planned in Milestone 2):

```typescript
import { PaymentsClient } from "@tributary-so/payments";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection, wallet);
const manager = new PaymentsClient(connection, tributary);

// Check one-time payment status
async function checkOneTimePayment() {
  const status = await manager.payments.oneTime.checkStatus(
    "user_123_premium_upgrade"
  );

  if (status.status === "paid") {
    console.log("Payment completed!", {
      transaction: status.transaction,
      paidAt: status.paidAt,
      amount: status.amount,
    });
    // Grant access, update UI, etc.
  } else if (status.status === "pending") {
    console.log("Payment pending...");
    // Show pending status
  } else if (status.status === "expired") {
    console.log("Payment link expired");
    // Show expired state
  }
}

// Build memo for manual SPL transfer
async function prepareManualTransfer() {
  const memo = manager.payments.oneTime.buildMemo("user_123_premium_upgrade");
  console.log("Memo:", memo);
  // Output: "Custom memo text | user_123_premium_upgrade"
}

// Extract tracking ID from existing transaction
async function parseTransactionMemo(txMemo: string) {
  const trackingId = manager.payments.oneTime.extractTrackingId(txMemo);
  console.log("Tracking ID:", trackingId);
}
```

### One-Time Payment Status Flow

1. **`pending`**: Payment not yet executed
2. **`paid`**: SPL transfer with matching memo found
3. **`expired`**: Payment window expired (if expiration is set)

```typescript
interface OneTimePaymentStatus {
  trackingId: string;
  status: "pending" | "paid" | "expired";
  transaction?: PaymentTransaction; // Transaction details if paid
  amount: number; // Amount expected
  recipient: string; // Recipient public key
  paidAt?: number; // Unix timestamp when paid
}
```

## Status Flow

The subscription status follows a simple flow based on PaymentPolicy state:

1. **`pending`**: Subscription not yet created
2. **`created`**: Subscription created on-chain, waiting for first payment
3. **`active`**: First payment executed, subscription is active

```typescript
interface SubscriptionStatus {
  id: string; // PaymentPolicy public key
  object: "subscription";
  status: "pending" | "created" | "active" | "failed";
  paymentCount: number; // Number of payments executed
  current_period_start?: number; // Unix timestamp
  current_period_end?: number; // Unix timestamp
  nextPaymentDue?: number; // Unix timestamp of next payment
  metadata: {
    trackingId: string;
    userPublicKey?: string;
    gatewayPublicKey?: string;
    recipient: string;
    tokenMint: string;
    amount: number;
    frequency: number;
  };
}
```

## URL Encoding

The SDK uses Base64URL encoding to pack all payment parameters into compact, shareable URLs:

### Subscription URLs

```typescript
// Session URL contains all necessary data
const session = await manager.checkout.sessions.create({
  mode: "subscription",
  // ... configuration
});

// URL format: https://checkout.tributary.so/subscribe/{base64url-encoded-data}
console.log(session.url);
// Example: https://checkout.tributary.so/subscribe/eyJ0bSI6IkVQakZXZGRBdWZxU1NxZTJxTjF6eWJhcEM4RzR3RUdHa3p3eVREdjF2Iiwi...
```

### One-Time Payment URLs

```typescript
// One-time payment URL
const session = await manager.checkout.sessions.create({
  mode: "payment",
  // ... configuration
});

// URL format: https://checkout.tributary.so/pay/{base64url-encoded-data}
console.log(session.url);
// Example: https://checkout.tributary.so/pay/eyJ0bSI6ImBheW1lbnQiLCJ0bSI6Ii...
```

The encoded data includes:

**Common fields:**

- `m`: Mode (`"subscription"` | `"payment"`)
- `tm`: Token mint (USDC)
- `r`: Recipient public key
- `a`: Total amount (calculated from line items)
- `tid`: Tracking ID

**Subscription-only fields:**

- `g`: Gateway public key
- `ar`: Auto-renew flag
- `mr`: Maximum renewals
- `pf`: Payment frequency
- `st`: Start time
- `li`: Line items (JSON array)

**One-time payment-only fields:**

- _none_

## MEMO Format

Tracking IDs are stored in Solana transaction MEMO fields as well as in events
when payment is triggered.

Example: `user_123_monthly_premium`

This enables:

- **Blockchain verification**: Payment status can be verified by anyone
- **No webhooks needed**: Status checking via on-chain state
- **Client-side only**: Pure frontend implementation possible

## API Reference

### PaymentsClient

The main client class - requires Connection and Tributary instances.

```typescript
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection, wallet);
const manager = new PaymentsClient(connection, tributary);
```

#### checkout.sessions.create()

Create a checkout session with encoded URL.

```typescript
const session = await manager.checkout.sessions.create({
  payment_method_types: ["tributary"], // Only "tributary" supported
  line_items: [
    {
      description: "Product Name",
      unitPrice: 20.0, // Amount in dollars
      quantity: 1,
    },
  ],
  paymentFrequency: "monthly", // "daily" | "weekly" | "monthly" | "annually"
  mode: "subscription",
  success_url: "https://yourapp.com/success",
  cancel_url: "https://yourapp.com/cancel",
  tributaryConfig: {
    gateway: "gateway-public-key", // Gateway public key
    recipient: "recipient-public-key", // Recipient public key
    trackingId: "unique-tracking-id", // Your unique identifier
    autoRenew: true,
  },
});
```

**Returns:**

```typescript
{
  id: string; // Session ID
  object: "checkout.session";
  url: string; // Encoded checkout URL
  payment_status: "unpaid";
  status: "open";
  amount_total: number;
  currency: "usd";
  // ... other manager-compatible fields
}
```

#### checkout.sessions.retrieve()

Retrieve a session with real-time subscription status.

```typescript
// Retrieve by session ID
const session = await manager.checkout.sessions.retrieve("cs_1234567890");

// Or retrieve by encoded URL (auto-detected)
const session = await manager.checkout.sessions.retrieve(
  "https://checkout.tributary.so/subscribe/eyJ0bSI6IkVQakFWZGRBdWZxU1NxZTJxTjF6eWJhcEM4RzR3RUdHa3p3eVREdjF2Iiwi..."
);

// Enhanced response with subscription details
console.log(session.subscription);
// {
//   id: "sub_1234567890",
//   object: "subscription",
//   status: "active",
//   paymentCount: 3,
//   current_period_end: 1640995200,
//   nextPaymentDue: 1641081600,
//   metadata: { ... }
// }
```

**Returns:**

```typescript
{
  id: string;
  object: "checkout.session";
  url: string;
  payment_status: "unpaid";
  status: "open";
  amount_total: number;
  currency: "usd";
  subscription?: SubscriptionStatus; // Real-time status if available
  // ... other manager-compatible fields
}
```

#### subscriptions.checkStatus()

Check subscription status using dual lookup strategy.

```typescript
// User-based lookup
const status = await manager.subscriptions.checkStatus({
  trackingId: "user_123_monthly_premium",
  userPublicKey: "USER_PUBLIC_KEY_HERE",
  tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
});

// Gateway-based lookup
const status = await manager.subscriptions.checkStatus({
  trackingId: "user_123_monthly_premium",
  gatewayPublicKey: "GATEWAY_PUBLIC_KEY_HERE",
});
```

**PolicyLookupOptions:**

```typescript
interface PolicyLookupOptions {
  trackingId: string;
  userPublicKey?: string; // Either userPublicKey OR gatewayPublicKey
  gatewayPublicKey?: string;
  tokenMint?: string; // Defaults to USDC
}
```

**Returns:**

```typescript
{
  id: string;
  object: "subscription";
  status: "pending" | "created" | "active" | "failed";
  paymentCount: number;
  current_period_start?: number;
  current_period_end?: number;
  nextPaymentDue?: number;
  metadata: {
    trackingId: string;
    userPublicKey?: string;
    gatewayPublicKey?: string;
    recipient: string;
    tokenMint: string;
    amount: number;
    frequency: number;
  };
}
```

#### subscriptions.isActive()

Quick check if subscription is active (created + initial payment).

```typescript
const isActive = await manager.subscriptions.isActive({
  trackingId: "user_123_monthly_premium",
  userPublicKey: "USER_PUBLIC_KEY_HERE",
});
// Returns: boolean
```

#### subscriptions.getDetails()

Get detailed subscription information.

```typescript
const details = await manager.subscriptions.getDetails({
  trackingId: "user_123_monthly_premium",
  gatewayPublicKey: "GATEWAY_PUBLIC_KEY_HERE",
});
// Returns: SubscriptionStatus | null
```

#### payments.oneTime.checkStatus()

Check one-time payment status by tracking ID (requires indexer):

```typescript
const status = await manager.payments.oneTime.checkStatus(
  "user_123_premium_upgrade"
);
```

**Returns:**

```typescript
{
  trackingId: string;
  status: "pending" | "paid" | "expired";
  transaction?: {
    signature: string;
    timestamp: number;
    amount: number;
    recipient: string;
    memo: string;
  };
  amount: number;
  recipient: string;
  paidAt?: number;
}
```

#### payments.oneTime.buildMemo()

Build memo field for manual SPL transfer:

```typescript
const memo = manager.payments.oneTime.buildMemo("user_123_premium_upgrade");
// Output: "Optional custom memo text | user_123_premium_upgrade"
```

#### payments.oneTime.extractTrackingId()

Extract tracking ID from transaction memo:

```typescript
const trackingId = manager.payments.oneTime.extractTrackingId(
  "user_123_premium_upgrade"
);
// Output: "user_123_premium_upgrade"
```

The `tributaryConfig` object contains Tributary-specific settings:

**Subscription mode (`mode: "subscription"`):**

- `gateway`: Your Tributary gateway public key (required)
- `recipient`: The recipient public key (where payments go)
- `trackingId`: Your unique identifier for tracking payments
- `autoRenew`: Enable automatic subscription renewal (default: false)

**One-time payment mode (`mode: "payment"`):**

- `recipient`: The recipient public key (where payment goes) - no gateway needed
- `trackingId`: Your unique identifier for tracking payment

## Tributary Configuration

### Traditional Approach (Expensive)

```typescript
// Expensive: Scan transaction history
const transactions = await connection.getSignaturesForAddress(recipient);
const paymentTxs = await Promise.all(
  transactions.map((sig) => connection.getParsedTransaction(sig.signature))
);
const hasPayment = paymentTxs.some((tx) => tx.memo?.includes(`${trackingId}`));
```

### PaymentPolicy Approach (Efficient)

```typescript
// Fast: Direct on-chain state lookup
const paymentPolicy = await tributary.getPaymentPolicy(policyPda);
const isActive = paymentPolicy?.paymentCount > 0;
```

## Performance Benefits

### Traditional Approach

```typescript
// Expensive: Scan transaction history
const transactions = await connection.getSignaturesForAddress(recipient);
const paymentTxs = await Promise.all(
  transactions.map((sig) => connection.getParsedTransaction(sig.signature))
);
const hasPayment = paymentTxs.some((tx) => tx.memo?.includes(trackingId));
```

### Payment Policy Approach

```typescript
// Fast: Direct on-chain state lookup
const paymentPolicy = await tributary.getPaymentPolicy(policyPda);
const isActive = paymentPolicy?.paymentCount > 0;
```

### Dual Lookup Strategy (Optimized)

Our SDK provides two optimized lookup methods:

**User-based lookup:**

```typescript
// O(1) lookup via UserPayment PDA
const userPaymentPda = getUserPaymentPda(userPublicKey, tokenMint);
const policies = await getPaymentPoliciesByUserPayment(userPaymentPda);
const policy = policies.find((p) => p.trackingId === trackingId);
```

**Gateway-based lookup:**

```typescript
// O(1) lookup via gateway public key
const policies = await getPaymentPoliciesByGateway(gatewayPublicKey);
const policy = policies.find((p) => p.trackingId === trackingId);
```

**Benefits:**

- **O(1) vs O(n)**: Direct lookup vs transaction scanning
- **Low RPC cost**: Single query vs hundreds of transactions
- **Instant response**: No need to scan entire payment history
- **Flexible**: User-facing apps OR gateway management
- **Reliable**: Uses on-chain state, not external indexes
- **Real-time**: Live status from PaymentPolicy `paymentCount`

## Error Handling

The SDK throws standard JavaScript errors for invalid inputs:

```typescript
try {
  const session = await manager.checkout.sessions.create(params);
} catch (error) {
  if (error.message.includes("Invalid gateway public key")) {
    // Handle invalid gateway key
  } else if (error.message.includes("Invalid trackingId format")) {
    // Handle invalid tracking ID
  } else if (
    error.message.includes("Either userPublicKey or gatewayPublicKey required")
  ) {
    // Handle missing lookup parameters
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
