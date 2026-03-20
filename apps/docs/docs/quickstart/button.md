# Subscription Button Quickstart

Integrate the `SubscriptionButton` component from `@tributary-so/sdk-react` into your React application for one-click recurring payments.

## Prerequisites

- Node.js (v16 or higher)
- pnpm package manager
- A Solana wallet (Phantom, Solflare, Backpack, etc.)
- Basic knowledge of React

## Step 1: Installation

```bash
pnpm install @tributary-so/sdk-react @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/web3.js @coral-xyz/anchor
```

## Step 2: Setup Wallet Provider

Configure wallet adapter in your app's entry point:

```typescript
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl } from "@solana/web3.js";

const wallets = [new PhantomWalletAdapter()];
const endpoint = clusterApiUrl("mainnet-beta");

function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{/* Your app */}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

## Step 3: Use Subscription Button

```typescript
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";
import { PublicKey, BN } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const RECIPIENT = new PublicKey("YOUR_RECIPIENT_WALLET");
const GATEWAY = new PublicKey("CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr");

function PricingPage() {
  const { connected } = useWallet();

  if (!connected) {
    return <p>Please connect your wallet</p>;
  }

  return (
    <SubscriptionButton
      amount={new BN(10_000_000)} // 10 USDC (6 decimals)
      token={USDC_MINT}
      recipient={RECIPIENT}
      gateway={GATEWAY}
      interval={PaymentInterval.Monthly}
      maxRenewals={12}
      memo="Pro subscription"
      executeImmediately={true}
      label="Subscribe $10/month"
      onSuccess={(tx) => console.log("Success:", tx)}
      onError={(err) => console.error("Failed:", err)}
    />
  );
}
```

## Props Reference

| Prop                 | Type               | Required | Description                                               |
| -------------------- | ------------------ | -------- | --------------------------------------------------------- |
| `amount`             | `BN`               | Yes      | Payment amount in smallest token units (USDC: 6 decimals) |
| `token`              | `PublicKey`        | Yes      | Token mint address (USDC: `EPjFWdd5...`)                  |
| `recipient`          | `PublicKey`        | Yes      | Recipient wallet address                                  |
| `gateway`            | `PublicKey`        | Yes      | Payment gateway address                                   |
| `interval`           | `PaymentInterval`  | Yes      | Payment frequency                                         |
| `custom_interval`    | `number`           | No       | Custom interval in seconds                                |
| `maxRenewals`        | `number`           | No       | Maximum renewals (null = unlimited)                       |
| `memo`               | `string`           | No       | Payment memo                                              |
| `startTime`          | `number`           | No       | Start timestamp (null = now)                              |
| `executeImmediately` | `boolean`          | No       | Execute first payment now (default: true)                 |
| `label`              | `string`           | No       | Button text (default: "Subscribe")                        |
| `className`          | `string`           | No       | CSS classes                                               |
| `disabled`           | `boolean`          | No       | Disable button                                            |
| `onSuccess`          | `(result) => void` | No       | Success callback                                          |
| `onError`            | `(error) => void`  | No       | Error callback                                            |

## Payment Intervals

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

For custom intervals:

```typescript
<SubscriptionButton
  interval={PaymentInterval.Custom}
  custom_interval={604800} // 7 days in seconds
  // ... other props
/>
```

## Multiple Tiers

```typescript
function PricingTiers() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Basic */}
      <div>
        <h3>Basic - $5/mo</h3>
        <SubscriptionButton
          amount={new BN(5_000_000)}
          recipient={RECIPIENT}
          gateway={GATEWAY}
          token={USDC_MINT}
          interval={PaymentInterval.Monthly}
          label="Subscribe Basic"
        />
      </div>

      {/* Pro */}
      <div>
        <h3>Pro - $15/mo</h3>
        <SubscriptionButton
          amount={new BN(15_000_000)}
          recipient={RECIPIENT}
          gateway={GATEWAY}
          token={USDC_MINT}
          interval={PaymentInterval.Monthly}
          label="Subscribe Pro"
        />
      </div>

      {/* Enterprise */}
      <div>
        <h3>Enterprise - $99/mo</h3>
        <SubscriptionButton
          amount={new BN(99_000_000)}
          recipient={RECIPIENT}
          gateway={GATEWAY}
          token={USDC_MINT}
          interval={PaymentInterval.Monthly}
          label="Subscribe Enterprise"
        />
      </div>
    </div>
  );
}
```

## Handling Success/Error

```typescript
function SubscribePage() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [txSignature, setTxSignature] = useState<string | null>(null);

  return (
    <div>
      {status === "success" && (
        <div className="text-green-600">
          Subscription created!
          <a href={`https://solscan.io/tx/${txSignature}`}>View transaction</a>
        </div>
      )}

      {status === "error" && (
        <div className="text-red-600">Failed to create subscription</div>
      )}

      <SubscriptionButton
        // ... props
        onSuccess={(result) => {
          setStatus("success");
          setTxSignature(result.signature);
        }}
        onError={(error) => {
          setStatus("error");
          console.error(error);
        }}
      />
    </div>
  );
}
```

## Common Patterns

### Yearly with Discount

```typescript
<SubscriptionButton
  amount={new BN(100_000_000)} // $100/year ($8.33/mo equivalent)
  interval={PaymentInterval.Annually}
  maxRenewals={1} // One year commitment
  label="Subscribe Yearly (Save 17%)"
/>
```

### Time-Limited Subscription

```typescript
<SubscriptionButton
  amount={new BN(29_000_000)}
  interval={PaymentInterval.Monthly}
  maxRenewals={3} // 3 months max
  label="3-Month Access"
/>
```

### Custom Start Date

```typescript
<SubscriptionButton
  amount={new BN(10_000_000)}
  interval={PaymentInterval.Monthly}
  startTime={Math.floor(Date.now() / 1000) + 86400} // Tomorrow
  executeImmediately={false}
  label="Start Tomorrow"
/>
```

## Important Notes

- **Wallet Required**: Button only works when wallet is connected
- **Token Balance**: User must have sufficient token balance
- **SOL for Fees**: User needs SOL for transaction fees
- **Gateway**: Use `CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr` (default Tributary gateway)
- **Testing**: Use devnet (`https://api.devnet.solana.com`) for testing

## Next Steps

- [SDK Reference](../sdks.md) - Full SDK documentation
- [Checkout Links](./checkout.md) - Generate shareable payment URLs
- [API Reference](../api/overview.md) - Check subscription status
