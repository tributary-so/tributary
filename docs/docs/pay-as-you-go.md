# Pay-as-you-go Payments

Pay-as-you-go payments enable flexible, usage-based billing where service providers can claim funds incrementally within predefined limits. This payment model is perfect for AI agents, APIs, and other services with variable consumption patterns.

## Overview

Unlike traditional subscriptions or milestone payments, pay-as-you-go allows providers to request payment when they hit usage thresholds, up to a maximum chunk amount within each billing period. When the period ends, counters automatically reset for the next billing cycle.

## Key Features

- **Period-based Limits**: Set maximum amounts per billing period (daily, weekly, monthly, etc.)
- **Chunk-based Claims**: Configure maximum amount per individual payment request
- **Automatic Resets**: Period totals reset when time expires
- **Flexible Billing**: Supports variable usage patterns without upfront commitments

## Use Cases

### AI and LLM Providers

```typescript
// AI service provider billing
const maxAmountPerPeriod = new BN(100000000); // $100 per month
const maxChunkAmount = new BN(10000000); // $10 per API call batch
const periodLength = new BN(86400 * 30); // 30 days

const policyIx = await sdk.createPayAsYouGoPaymentPolicy(
  tokenMint,
  providerWallet, // AI service provider
  gatewayPDA,
  maxAmountPerPeriod,
  maxChunkAmount,
  periodLength,
  createMemoBuffer("OpenAI API usage", 64)
);
```

### API Services

```typescript
// REST API with usage-based billing
const maxAmountPerPeriod = new BN(50000000); // $50 per month
const maxChunkAmount = new BN(5000000); // $5 per 1000 requests
const periodLength = new BN(86400 * 30); // 30 days

const policyIx = await sdk.createPayAsYouGoPaymentPolicy(
  tokenMint,
  apiProvider,
  gatewayPDA,
  maxAmountPerPeriod,
  maxChunkAmount,
  periodLength,
  createMemoBuffer("API usage billing", 64)
);
```

## How It Works

### 1. Policy Creation

Users create a pay-as-you-go policy specifying:

- **Maximum Amount Per Period**: Total budget for the billing period
- **Maximum Chunk Amount**: Largest single payment the provider can request
- **Period Length**: Duration of each billing cycle (in seconds)
- **Token Mint**: Which token to use for payments
- **Recipient**: Service provider's wallet address

### 2. Provider Claims

Service providers monitor their usage and request payments when thresholds are met:

```typescript
// Provider requests payment for usage
const paymentAmount = new BN(7500000); // $7.50 for recent usage
const executeIx = await sdk.executePayment(paymentPolicyPDA, paymentAmount);
```

### 3. Validation & Execution

The protocol validates:

- Payment amount ≤ maximum chunk amount
- Current period total + payment amount ≤ maximum period amount
- Period hasn't expired (auto-resets if needed)

### 4. Automatic Period Management

When the current time exceeds `current_period_start + period_length_seconds`:

- `current_period_total` resets to 0
- `current_period_start` updates to current timestamp
- New period begins with fresh limits

## Parameter Configuration

### Choosing Period Limits

```typescript
// Conservative (low risk, frequent small payments)
const conservative = {
  maxAmountPerPeriod: new BN(10000000), // $10/month
  maxChunkAmount: new BN(1000000), // $1 max per claim
  periodLength: new BN(86400 * 30), // Monthly
};

// Aggressive (high risk, larger payments)
const aggressive = {
  maxAmountPerPeriod: new BN(100000000), // $100/month
  maxChunkAmount: new BN(25000000), // $25 max per claim
  periodLength: new BN(86400 * 7), // Weekly
};
```

### Period Length Options

```typescript
const periods = {
  hourly: new BN(3600), // 1 hour
  daily: new BN(86400), // 24 hours
  weekly: new BN(86400 * 7), // 7 days
  monthly: new BN(86400 * 30), // 30 days
  quarterly: new BN(86400 * 90), // 90 days
};
```

## Integration Examples

### Frontend Integration

```typescript
// React component for pay-as-you-go setup
function PayAsYouGoSetup({ tokenMint, gateway, recipient }) {
  const [maxPeriod, setMaxPeriod] = useState("100000000"); // $100
  const [maxChunk, setMaxChunk] = useState("10000000"); // $10
  const [period, setPeriod] = useState(30); // days

  const createPolicy = async () => {
    const periodSeconds = new BN(period * 24 * 60 * 60);

    const instruction = await sdk.createPayAsYouGoPaymentPolicy(
      tokenMint,
      recipient,
      gateway,
      new BN(maxPeriod),
      new BN(maxChunk),
      periodSeconds,
      createMemoBuffer("Service usage billing", 64)
    );

    // Submit transaction...
  };

  return (
    <div>
      <input
        value={maxPeriod}
        onChange={(e) => setMaxPeriod(e.target.value)}
        placeholder="Max per period ($)"
      />
      <input
        value={maxChunk}
        onChange={(e) => setMaxChunk(e.target.value)}
        placeholder="Max per claim ($)"
      />
      <select value={period} onChange={(e) => setPeriod(e.target.value)}>
        <option value={1}>Daily</option>
        <option value={7}>Weekly</option>
        <option value={30}>Monthly</option>
      </select>
      <button onClick={createPolicy}>Create Pay-as-you-go Policy</button>
    </div>
  );
}
```

### Backend Provider Logic

```typescript
// Service provider payment claiming logic
class UsageBasedBilling {
  private policyPDA: PublicKey;
  private sdk: RecurringPaymentsSDK;

  async claimPayment(usageAmount: number) {
    // Convert usage to payment amount
    const paymentAmount = this.calculatePayment(usageAmount);

    // Check if payment is within limits
    if (await this.canClaim(paymentAmount)) {
      const executeIx = await this.sdk.executePayment(
        this.policyPDA,
        new BN(paymentAmount)
      );

      // Submit transaction...
      return true;
    }

    return false;
  }

  private async canClaim(amount: number): Promise<boolean> {
    const policy = await this.sdk.getPaymentPolicy(this.policyPDA);
    const payAsYouGo = policy!.policyType.payAsYouGo;

    // Check chunk limit
    if (amount > payAsYouGo.maxChunkAmount.toNumber()) {
      return false;
    }

    // Check period limit
    const remaining =
      payAsYouGo.maxAmountPerPeriod.toNumber() -
      payAsYouGo.currentPeriodTotal.toNumber();

    return amount <= remaining;
  }
}
```

## Best Practices

### For Users (Payment Creators)

1. **Start Small**: Begin with conservative limits and increase based on usage
2. **Monitor Usage**: Track provider claims and adjust limits as needed
3. **Set Realistic Periods**: Choose periods that match your budget cycles
4. **Emergency Pause**: Keep policy status as active unless issues arise

### For Providers (Service Providers)

1. **Transparent Pricing**: Clearly communicate usage-to-payment conversion
2. **Reasonable Claims**: Don't max out chunks unnecessarily - build trust
3. **Usage Tracking**: Maintain accurate records for dispute resolution
4. **Customer Communication**: Notify users of large claims in advance

### Security Considerations

- **Rate Limiting**: Implement reasonable delays between claims
- **Usage Verification**: Consider on-chain usage proofs for transparency
- **Emergency Controls**: Users can pause policies if abuse occurs
- **Audit Trails**: All payments are recorded on-chain for accountability

## Comparison with Other Payment Types

| Feature         | Pay-as-you-go   | Subscriptions  | Milestones    |
| --------------- | --------------- | -------------- | ------------- |
| **Timing**      | On-demand       | Fixed schedule | Event-based   |
| **Amount**      | Variable chunks | Fixed amounts  | Fixed amounts |
| **Limits**      | Period + chunk  | Renewal caps   | Total fixed   |
| **Use Case**    | Usage-based     | Recurring      | Project-based |
| **Flexibility** | High            | Low            | Medium        |

## Troubleshooting

### Common Issues

**"InvalidAmount" Error**

- Check that payment amount ≤ max chunk amount
- Verify period limit hasn't been exceeded
- Ensure sufficient token balance and delegation

**"PaymentNotDue" Error**

- Pay-as-you-go payments don't have due dates
- This error suggests wrong policy type

**Period Not Resetting**

- Periods reset automatically based on blockchain time
- Check `current_period_start` + `period_length_seconds` vs current time

### Monitoring

Track pay-as-you-go usage:

````typescript
const policy = await sdk.getPaymentPolicy(policyPDA);
const payAsYouGo = policy!.policyType.payAsYouGo;

console.log("Period remaining:", payAsYouGo.maxAmountPerPeriod.toNumber() - payAsYouGo.currentPeriodTotal.toNumber());
console.log("Period ends:", new Date((payAsYouGo.currentPeriodStart.toNumber() + payAsYouGo.periodLengthSeconds.toNumber()) * 1000));
```</content>
<parameter name="filePath">docs/docs/pay-as-you-go.md
````
