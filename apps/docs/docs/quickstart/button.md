# Subscription Button Quickstart

This guide provides a step-by-step walkthrough for integrating the `SubscriptionButton` component from `@tributary-so/sdk-react` into your React application. The button allows users to create recurring payment subscriptions on Solana with a single click.

## Prerequisites

- Node.js (v16 or higher)
- pnpm package manager
- A Solana wallet (Phantom, Solflare, etc.)
- Basic knowledge of React and Solana development

## Step 1: Installation

Install the required packages:

```bash
pnpm install @tributary-so/sdk-react @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/web3.js @solana/spl-token @coral-xyz/anchor
```

## Step 2: Setup Wallet Connection

The `SubscriptionButton` requires a connected Solana wallet to function. You'll need to set up wallet connection using `@solana/wallet-adapter-react`.

First, configure the wallet adapter in your app's entry point:

```typescript
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl } from "@solana/web3.js";

// Configure wallet adapters
const wallets = [new PhantomWalletAdapter()];

// Choose network (mainnet-beta for production)
const network = WalletAdapterNetwork.Mainnet;
const endpoint = clusterApiUrl(network);

function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {/* Your app components */}
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

## Step 3: Wrap with Tributary Provider

Import and wrap your app with the `TributarySDKProvider`:

```typescript
import { TributarySDKProvider } from "@tributary-so/sdk-react";

function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <TributarySDKProvider>
          {/* Your subscription components */}
        </TributarySDKProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

## Step 4: Add Wallet Connection UI

Add a wallet connection button to allow users to connect their wallets:

```typescript
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

function WalletConnection() {
  const { connected } = useWallet();

  return (
    <div>
      <WalletMultiButton />
      {!connected && <p>Please connect your wallet to continue</p>}
    </div>
  );
}
```

## Step 5: Integrate the Subscription Button

Now you can use the `SubscriptionButton` component. Here's a complete example:

```typescript
import React from "react";
import { SubscriptionButton } from "@tributary-so/sdk-react";
import { PaymentInterval } from "@tributary-so/sdk-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";

// Configuration constants
const CONFIG = {
  TOKEN: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
  RECIPIENT: new PublicKey("8EVBvLDVhJUw1nkAUp73mPyxviVFK9Wza5ba1GRANEw1"), // Replace with actual recipient
  GATEWAY: new PublicKey("CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr"), // hosted by contribute.so
  AMOUNT: new BN(1_000), // 1 USDC (6 decimals)
};

const SubscriptionExample: React.FC = () => {
  const { connected } = useWallet();

  const handleSuccess = (result: any) => {
    console.log("Subscription created successfully:", result);
    alert("Subscription created! Check console for details.");
  };

  const handleError = (error: Error) => {
    console.error("Subscription creation failed:", error);
    alert(`Error: ${error.message}`);
  };

  if (!connected) {
    return <p>Please connect your wallet to create a subscription.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="text-center">
        <SubscriptionButton
          amount={CONFIG.AMOUNT}
          token={CONFIG.TOKEN}
          recipient={CONFIG.RECIPIENT}
          gateway={CONFIG.GATEWAY}
          interval={PaymentInterval.Monthly}
          maxRenewals={12}
          memo="Example subscription"
          executeImmediately={true}
          label="Subscribe for $1/month"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>
    </div>
  );
};

export default SubscriptionExample;
```

## Step 6: Understanding the Props

The `SubscriptionButton` accepts the following props:

- `amount`: The subscription amount as a `BN` (in smallest token units)
- `token`: The token mint `PublicKey` for payments
- `recipient`: The `PublicKey` of the payment recipient
- `gateway`: The `PublicKey` of the payment gateway
- `interval`: Payment frequency (`PaymentInterval.Monthly`, `PaymentInterval.Weekly`, etc.)
- `custom_interval`: Custom interval in seconds (optional)
- `maxRenewals`: Maximum number of automatic renewals (optional)
- `memo`: Optional memo string for the subscription
- `startTime`: Optional start date for the subscription
- `executeImmediately`: Whether to execute the first payment immediately (default: true)
- `label`: Button text (default: "Subscribe")
- `className`: Additional CSS classes
- `disabled`: Whether the button is disabled
- `radius` & `size`: Button styling options
- `onSuccess`: Callback function called on successful subscription creation
- `onError`: Callback function called on error

## Important Notes

- **Wallet Connection Required**: The button will not work unless `wallet.connected` is `true`. Always check this before rendering the button.
- **Gateway**: You'll need a valid payment gateway PublicKey. The one provided in the code is operated by contribute.so and is operational on devnet and mainnet.
- **Testing**: Use Solana devnet for testing before deploying to mainnet.

For more examples and the latest code, visit [app.tributary.so](https://app.tributary.so).
