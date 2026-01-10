# Subscription Payments

Subscription payments enable fixed, recurring payments at regular intervals. This is the most common payment model for services that provide ongoing value, such as SaaS platforms, content memberships, and recurring donations.

## Overview

Subscriptions are ideal for:

- **SaaS platforms** with monthly or annual billing
- **Content subscriptions** like streaming services and newsletters
- **Membership dues** and recurring donations
- **API access** with fixed monthly fees
- **Software licenses** and maintenance contracts
- **Any service** with consistent, predictable billing

## Key Features

- **Fixed Amounts**: Same payment every period for predictability
- **Flexible Intervals**: Daily, weekly, monthly, quarterly, or yearly
- **Auto-renewal**: Optional automatic continuation of payments
- **Renewal Limits**: Optional maximum number of payments
- **Easy Management**: Pause, resume, or cancel anytime
- **Non-custodial**: Funds remain in your wallet until execution

## Creating Subscriptions

### Basic Example

```typescript
import { Tributary } from "@tributary-so/sdk";
import { BN } from "@coral-xyz/anchor";

// Initialize SDK
const sdk = new Tributary(connection, wallet);

// Create subscription payment policy
const instructions = await sdk.createSubscription(
  tokenMint, // Token to pay with (e.g., USDC)
  recipient, // Who receives the payments
  gateway, // Payment gateway for processing
  new BN(10000000), // $10 per month (in smallest units)
  true, // Auto-renew enabled
  null, // No max renewals (unlimited)
  PaymentFrequency.Monthly, // Monthly payments
  createMemoBuffer("Monthly subscription", 64), // Payment memo
  new BN(Math.floor(Date.now() / 1000)), // Start time (now)
  new BN(120000000), // Approval amount ($120 for 12 months)
  false // Don't execute immediately
);

// Execute the transaction
const tx = new Transaction().add(...instructions);
const signature = await provider.sendAndConfirm(tx);
```

### Payment Frequencies

```typescript
// Available payment frequencies
const frequencies = {
  daily: PaymentFrequency.Daily,
  weekly: PaymentFrequency.Weekly,
  biweekly: PaymentFrequency.BiWeekly,
  monthly: PaymentFrequency.Monthly,
  quarterly: PaymentFrequency.Quarterly,
  semiAnnually: PaymentFrequency.SemiAnnually,
  yearly: PaymentFrequency.Yearly,
};

// Example: Weekly subscription
const weeklySub = await sdk.createSubscription(
  tokenMint,
  recipient,
  gateway,
  new BN(2000000), // $2 per week
  true, // Auto-renew
  null, // Unlimited
  PaymentFrequency.Weekly,
  createMemoBuffer("Weekly membership", 64)
);
```

### Limited Renewals

```typescript
// Create a 12-month subscription (will auto-pause after 12 payments)
const limitedSub = await sdk.createSubscription(
  tokenMint,
  recipient,
  gateway,
  new BN(100000000), // $100/month
  true, // Auto-renew
  12, // Maximum 12 renewals (1 year total)
  PaymentFrequency.Monthly,
  createMemoBuffer("Annual subscription", 64)
);

// Create a one-time payment (no auto-renewal)
const oneTimeSub = await sdk.createSubscription(
  tokenMint,
  recipient,
  gateway,
  new BN(50000000), // $50 one-time
  false, // No auto-renewal
  1, // Maximum 1 renewal (total 2 payments)
  PaymentFrequency.Monthly,
  createMemoBuffer("Two-payment subscription", 64)
);
```

## How It Works

### 1. Policy Creation

- User creates subscription policy with amount, frequency, and recipient
- Token delegation is approved for the expected total amount
- First payment is scheduled for the specified start time

### 2. Payment Execution

- When `next_payment_due` timestamp is reached (or passed)
- Protocol automatically executes payment if approved
- Funds transfer to recipient minus protocol and gateway fees
- `next_payment_due` advances to next period

### 3. Renewal Handling

- **Auto-renewal enabled**: Policy continues automatically
- **Auto-renewal disabled**: Policy pauses after next payment
- **Max renewals reached**: Policy automatically pauses

### 4. Completion

- User can pause, resume, or cancel at any time
- Unused approval amounts remain in user's wallet
- No funds are locked - only delegated for potential payments

## Smart Contract Details

### PolicyType::Subscription Structure

```rust
Subscription {
    amount: u64,              // Fixed payment amount per interval
    auto_renew: bool,         // Whether to auto-renew after each payment
    max_renewals: Option<u32>, // Maximum number of renewals (None = unlimited)
    payment_frequency: PaymentFrequency, // How often to charge
    next_payment_due: i64,    // Unix timestamp for next payment
    padding: [u8; 97],        // 128-byte alignment padding
}
```

### PaymentFrequency Enum

```rust
pub enum PaymentFrequency {
    Daily = 0,
    Weekly = 1,
    BiWeekly = 2,
    Monthly = 3,
    Quarterly = 4,
    SemiAnnually = 5,
    Yearly = 6,
}
```

### Approval Amount Calculation

The approval amount required depends on the frequency and renewal settings:

```typescript
// Calculate payments per year by frequency
function computePaymentsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case PaymentFrequency.Daily:
      return 365;
    case PaymentFrequency.Weekly:
      return 52;
    case PaymentFrequency.BiWeekly:
      return 26;
    case PaymentFrequency.Monthly:
      return 12;
    case PaymentFrequency.Quarterly:
      return 4;
    case PaymentFrequency.SemiAnnually:
      return 2;
    case PaymentFrequency.Yearly:
      return 1;
  }
}

// For unlimited subscriptions, SDK defaults to 1 year of payments
// For limited subscriptions, SDK calculates exact amount needed
const paymentsPerYear = computePaymentsPerYear(frequency);
const effectiveRenewals = maxRenewals ?? paymentsPerYear;
const approvalAmount = amount.mul(new BN(effectiveRenewals));
```

## Integration Examples

### React Subscription Button

```typescript
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";

// Pre-built subscription component
<SubscriptionButton
  amount={new BN("10000000")} // $10
  token={new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")}
  recipient={recipient}
  gateway={gateway}
  interval={PaymentInterval.Monthly}
  maxRenewals={null} // Unlimited
  memo={`Monthly donation to ${repository}`}
  label="Subscribe for $10/month"
  onSuccess={(signature) => console.log("Subscription created!", signature)}
  onError={(error) => console.error("Failed:", error)}
/>;
```

### Subscription Management

```typescript
// Pause an active subscription
const pauseIx = await sdk.changePaymentPolicyStatus(tokenMint, policyId, {
  paused: {},
});

// Resume a paused subscription
const resumeIx = await sdk.changePaymentPolicyStatus(tokenMint, policyId, {
  active: {},
});

// Cancel/delete a subscription
const cancelIx = await sdk.deletePaymentPolicy(tokenMint, policyId);
```

### Querying Subscription Status

```typescript
// Get subscription details
const policy = await sdk.getPaymentPolicy(policyPda);
const subscription = policy.policyType.subscription;

console.log("Amount:", subscription.amount.toString());
console.log(
  "Next payment due:",
  new Date(subscription.next_payment_due * 1000)
);
console.log("Auto-renewal:", subscription.auto_renew);
console.log("Max renewals:", subscription.max_renewals);

// Check if payment is due
const now = Math.floor(Date.now() / 1000);
const isDue = now >= subscription.next_payment_due.toNumber();
```

## Best Practices

### For Service Providers

1. **Clear Pricing**: Display exact amounts and billing frequencies upfront
2. **Prorating**: Consider implementing proration for mid-period changes
3. **Cancellation Policy**: Make cancellation easy and transparent
4. **Email Notifications**: Notify users before recurring charges

### For Subscribers

1. **Start Small**: Try with small amounts before committing to larger subscriptions
2. **Monitor Usage**: Regularly check that services provide expected value
3. **Budget Planning**: Account for subscriptions in monthly expenses
4. **Emergency Controls**: Use pause feature if financial situation changes

### For Developers

1. **Error Handling**: Handle InsufficientFunds and PaymentNotDue errors
2. **Webhook Integration**: Listen for payment events for notifications
3. **Testing**: Test with devnet and small amounts first
4. **User Feedback**: Show subscription status clearly in UI

## Comparison with Other Payment Types

| Feature            | Subscriptions    | Milestone Payments | Pay-as-you-go   |
| ------------------ | ---------------- | ------------------ | --------------- |
| **Timing**         | Fixed schedule   | Event-based        | On-demand       |
| **Amount**         | Fixed amounts    | Variable amounts   | Variable chunks |
| **Flexibility**    | Low              | Medium             | High            |
| **Predictability** | High             | Medium             | Low             |
| **Best For**       | Regular services | Project work       | Variable usage  |
| **User Control**   | Setup once       | Manual approval    | Period limits   |
| **Setup**          | Simple           | Medium             | Medium          |

## Use Cases

### SaaS Monthly Subscription

```typescript
// $29/month SaaS subscription
const saasSub = await sdk.createSubscription(
  USDC_MINT,
  companyWallet,
  gatewayPDA,
  new BN(29000000), // $29
  true, // Auto-renew
  null, // Unlimited
  PaymentFrequency.Monthly,
  createMemoBuffer("Pro Plan subscription", 64)
);
```

### Annual Membership with Renewal Limit

```typescript
// $100/year membership, max 3 years
const membershipSub = await sdk.createSubscription(
  USDC_MINT,
  clubWallet,
  gatewayPDA,
  new BN(100000000), // $100/year
  true,
  3, // Maximum 3 years
  PaymentFrequency.Yearly,
  createMemoBuffer("Annual membership", 64)
);
```

### Donation with Custom Start Date

```typescript
// Start donation at beginning of next month
const nextMonth = new Date();
nextMonth.setMonth(nextMonth.getMonth() + 1);
nextMonth.setDate(1);
nextMonth.setHours(0, 0, 0, 0);

const donationSub = await sdk.createSubscription(
  USDC_MINT,
  charityWallet,
  gatewayPDA,
  new BN(5000000), // $5/month
  true,
  null,
  PaymentFrequency.Monthly,
  createMemoBuffer("Monthly donation", 64),
  new BN(Math.floor(nextMonth.getTime() / 1000))
);
```

## Troubleshooting

### Common Issues

**"InsufficientFunds" Error**

- Check token balance in wallet
- Verify approval amount was set correctly
- Ensure delegated amount covers all pending payments

**"PaymentNotDue" Error**

- Check current time vs next_payment_due
- Verify policy status is active (not paused)
- Confirm correct policy PDA is being used

**Subscription Not Renewing**

- Verify auto_renew is set to true
- Check max_renewals hasn't been reached
- Ensure policy status is active

### Monitoring Subscriptions

Track active subscriptions and upcoming payments:

```typescript
// Get all subscriptions by user
const subscriptions = await sdk.getPaymentPoliciesByUser(userPublicKey);

// Filter for active subscriptions
const activeSubs = subscriptions.filter(
  (p) => "active" in p.account.status && "subscription" in p.account.policyType
);

// Check next payment timing
for (const sub of activeSubs) {
  const subscription = sub.account.policyType.subscription;
  const nextDue = new Date(subscription.next_payment_due.toNumber() * 1000);
  console.log(
    `Policy ${sub.publicKey}: Next payment ${nextDue.toLocaleString()}`
  );
}
```

Subscriptions provide a reliable, predictable payment model perfect for ongoing services, enabling automated recurring revenue with minimal user friction.
