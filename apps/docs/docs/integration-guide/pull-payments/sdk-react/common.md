# Common Patterns

## Multiple Pricing Tiers

```tsx
function PricingTiers() {
  const tiers = [
    { name: "Basic", price: 5_000_000, label: "Subscribe Basic" },
    { name: "Pro", price: 15_000_000, label: "Subscribe Pro" },
    { name: "Enterprise", price: 99_000_000, label: "Subscribe Enterprise" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {tiers.map((tier) => (
        <div key={tier.name}>
          <h3>
            {tier.name} - ${tier.price / 1_000_000}/mo
          </h3>
          <SubscriptionButton
            amount={new BN(tier.price)}
            recipient={RECIPIENT}
            gateway={GATEWAY}
            token={USDC_MINT}
            interval={PaymentInterval.Monthly}
            label={tier.label}
          />
        </div>
      ))}
    </div>
  );
}
```

## Yearly with Discount

```tsx
<SubscriptionButton
  amount={new BN(100_000_000)} // $100/year ($8.33/mo equivalent)
  interval={PaymentInterval.Annually}
  maxRenewals={1}
  label="Subscribe Yearly (Save 17%)"
/>
```

## Custom Hook with Status Tracking

```tsx
function useSubscribeWithStatus() {
  const { createSubscription, loading, error } = useCreateSubscription();
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const subscribe = async (params: CreateSubscriptionParams) => {
    setTxSignature(null);
    try {
      const result = await createSubscription(params);
      setTxSignature(result.txId);
      return result;
    } catch (err) {
      throw err;
    }
  };

  return { subscribe, loading, error, txSignature };
}
```

## Important Notes

- **Wallet Required**: All hooks and buttons require a connected wallet via `@solana/wallet-adapter-react`
- **Token Balance**: User must have sufficient token balance (USDC or configured token)
- **SOL for Fees**: User needs SOL for transaction fees
- **Default Gateway**: `CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr`
- **Testing**: Use devnet (`https://api.devnet.solana.com`) for testing

## Next Steps

- [SDK Reference](../sdk.md) — Full SDK documentation for all packages
- [Checkout Links](../checkout.md) — Generate shareable payment URLs
- [Integration Options](../../index.md) — Compare all integration methods
- [API Reference](../../../api/rest-api.md) — Check subscription status server-side
