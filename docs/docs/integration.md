# 🔌 Integration

## Simple Integration

!!! warning "🏗️ Work in Progress. Tributary is under active development and interfaces may change at any time.""

```typescript
// Basic payment button
<SubscriptionButton
  amount={new BN(10_000_000)}
  token={USDC_MINT}
  recipient={merchantWallet}
  interval={PaymentInterval.Monthly}
  label="Subscribe for $10/month"
/>
```

## Advanced Provider Integration

!!! warning "🏗️ Work in Progress. Tributary is under active development and interfaces may change at any time.""

```typescript
// Full provider service
class PaymentProvider {
  constructor(config) {
    this.tributary = new Tributary(config);
    this.database = new Database(config.db);
    this.webhooks = new WebhookService(config.webhooks);
  }

  async setupSubscription(user, plan) {
    // Create payment policy using Tributary
    const policy = await this.tributary.createPaymentPolicy({
      amount: plan.amount,
      interval: plan.interval,
      recipient: plan.recipient,
    });

    // Provider-specific features
    await this.database.saveSubscription({
      userId: user.id,
      policyId: policy.id,
      plan: plan,
      status: "active",
    });

    // Setup monitoring
    await this.webhooks.register({
      policyId: policy.id,
      events: ["payment.success", "payment.failed"],
      url: `${this.config.baseUrl}/webhooks/payments`,
    });

    return policy;
  }
}
```
