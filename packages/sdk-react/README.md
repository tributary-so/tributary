# @tributary-so/sdk-react

React hooks and components for Tributary recurring payments on Solana. Build subscription, milestone, and pay-as-you-go payment flows with pre-built UI components and TypeScript hooks.

[![npm version](https://img.shields.io/npm/v/@tributary-so/sdk-react.svg)](https://www.npmjs.com/package/@tributary-so/sdk-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.2+-61dafb?style=flat&logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white)](https://solana.com)

## Overview

The Tributary React SDK provides a complete set of React hooks and pre-built components for integrating automated recurring payments into your dApp. Built on top of the core Tributary SDK, it offers three payment models:

- **Subscriptions**: Fixed recurring payments with auto-renewal
- **Milestone Payments**: Project-based compensation with configurable milestones
- **Pay-as-you-go**: Usage-based billing with period limits

All payments are non-custodial, execute automatically on Solana, and support Web2-style UX with Web3 transparency.

## Key Features

- **Pre-built Components**: Drop-in React components for all payment types
- **TypeScript Hooks**: Full type safety with React hooks for custom implementations
- **Wallet Integration**: Seamless integration with Solana wallet adapters
- **UI Components**: Beautiful, responsive components built with HeroUI and Tailwind CSS
- **Action Codes**: Support for wallet-less payments via one-time codes
- **Error Handling**: Comprehensive error states and user feedback
- **Loading States**: Built-in loading indicators and disabled states

## Tech Stack

- **Language**: TypeScript 5.7+
- **Framework**: React 19.2+
- **UI Library**: HeroUI 2.8+ (formerly NextUI)
- **Styling**: Tailwind CSS 3.4+
- **Build Tool**: tsup (ESM/CJS/IIFE builds)
- **Icons**: Lucide React
- **Blockchain**: Solana (via @tributary-so/sdk)
- **Wallet**: Solana Wallet Adapter

## Prerequisites

- **Node.js**: 16.0.0 or higher
- **React**: 19.2.0 or higher
- **TypeScript**: 5.7.0 or higher (for type definitions)
- **Solana Wallet**: Phantom, Solflare, or any wallet-adapter compatible wallet
- **Peer Dependencies**:
  - `@coral-xyz/anchor`: ^0.31.0
  - `@solana/wallet-adapter-react`: ^0.15.35
  - `@solana/web3.js`: ^1.98.4

## Installation

```bash
# npm
npm install @tributary-so/sdk-react

# pnpm
pnpm add @tributary-so/sdk-react

# yarn
yarn add @tributary-so/sdk-react
```

### Peer Dependencies

Install the required peer dependencies:

```bash
# Core Solana dependencies
npm install @solana/web3.js @solana/wallet-adapter-react @coral-xyz/anchor

# Optional: Wallet adapters
npm install @solana/wallet-adapter-wallets @solana/wallet-adapter-react-ui
```

## Getting Started

### 1. Basic Setup

Wrap your app with Solana wallet providers:

```tsx
import React from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint = clusterApiUrl("devnet");
const wallets = [new PhantomWalletAdapter()];

function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <YourPaymentComponents />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### 2. Using Components

```tsx
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

const tokenMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC
const recipient = new PublicKey("8EVBvLDVhJUw1nkAUp73mPyxviVFK9Wza5ba1GRANEw1");
const gateway = new PublicKey("CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr");

function PaymentExample() {
  return (
    <SubscriptionButton
      amount={new BN(1_000)} // 0.001 USDC (6 decimals)
      token={tokenMint}
      recipient={recipient}
      gateway={gateway}
      interval={PaymentInterval.Monthly}
      maxRenewals={12}
      memo="Monthly subscription"
      approvalAmount={new BN(120_000)} // 0.12 USDC approval
      label="Subscribe Monthly"
      onSuccess={(result) => console.log("Subscription created:", result)}
      onError={(error) => console.error("Error:", error)}
    />
  );
}
```

### 3. Using Hooks

```tsx
import { useCreateSubscription } from "@tributary-so/sdk-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

function CustomSubscriptionComponent() {
  const { createSubscription, loading, error } = useCreateSubscription();

  const handleSubscribe = async () => {
    try {
      const result = await createSubscription({
        amount: new BN(1_000),
        token: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
        recipient: new PublicKey(
          "8EVBvLDVhJUw1nkAUp73mPyxviVFK9Wza5ba1GRANEw1"
        ),
        gateway: new PublicKey("CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr"),
        interval: PaymentInterval.Monthly,
        maxRenewals: 12,
        memo: "Custom subscription",
        approvalAmount: new BN(120_000),
        executeImmediately: true,
      });
      console.log("Success:", result);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <button onClick={handleSubscribe} disabled={loading}>
      {loading ? "Creating..." : "Subscribe"}
    </button>
  );
}
```

## Architecture

### Directory Structure

```
src/
├── components/           # Pre-built React components
│   ├── SubscriptionButton.tsx
│   ├── MilestoneButton.tsx
│   ├── PayAsYouGoButton.tsx
│   ├── SubscriptionWithCodeButton.tsx
│   └── index.ts
├── hooks/               # React hooks for custom implementations
│   ├── useCreateSubscription.ts
│   ├── useCreateMilestone.ts
│   ├── useCreatePayAsYouGo.ts
│   ├── useActionCode.ts
│   ├── useTributarySDK.ts
│   └── index.ts
├── types.ts            # TypeScript type definitions
├── SubscriptionButtonExample.tsx  # Demo component
├── main.tsx           # Development entry point
└── index.ts           # Main exports
```

### Component Architecture

All components follow a consistent pattern:

1. **Props Interface**: Strongly typed props with optional callbacks
2. **Hook Integration**: Uses corresponding hooks for business logic
3. **UI Rendering**: HeroUI components with Tailwind styling
4. **Error Handling**: Comprehensive error states and user feedback
5. **Loading States**: Disabled buttons and loading indicators

### Hook Architecture

Hooks provide the core functionality:

- **useTributarySDK**: Initializes the Tributary SDK instance
- **useCreateSubscription**: Creates subscription payment policies
- **useCreateMilestone**: Creates milestone-based payment policies
- **useCreatePayAsYouGo**: Creates usage-based payment policies
- **useActionCode**: Generates one-time payment codes

## Components

### SubscriptionButton

Creates recurring subscription payments with fixed amounts and intervals.

```tsx
<SubscriptionButton
  amount={new BN(1000000)} // Amount per payment
  token={tokenMint}
  recipient={recipientWallet}
  gateway={gatewayAddress}
  interval={PaymentInterval.Monthly}
  maxRenewals={12} // Optional: max renewals
  memo="Monthly subscription" // Optional
  startTime={new Date()} // Optional: when to start
  approvalAmount={new BN(12000000)} // Optional: token approval amount
  executeImmediately={true} // Optional: execute first payment immediately
  label="Subscribe" // Optional: button text
  className="custom-class" // Optional: additional CSS classes
  disabled={false} // Optional: disable button
  radius="md" // Optional: button radius
  size="lg" // Optional: button size
  onSuccess={(result) => {}} // Optional: success callback
  onError={(error) => {}} // Optional: error callback
/>
```

### MilestoneButton

Creates project-based payments with up to 4 configurable milestones.

```tsx
<MilestoneButton
  milestoneAmounts={[
    new BN(25000000), // $25
    new BN(25000000), // $25
    new BN(25000000), // $25
    new BN(25000000), // $25
  ]}
  milestoneTimestamps={[
    new BN(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60), // 1 week
    new BN(Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60), // 2 weeks
    new BN(Math.floor(Date.now() / 1000) + 21 * 24 * 60 * 60), // 3 weeks
    new BN(Math.floor(Date.now() / 1000) + 28 * 24 * 60 * 60), // 4 weeks
  ]}
  releaseCondition={0} // 0=time-based, 1=manual, 2=automatic
  token={tokenMint}
  recipient={recipientWallet}
  gateway={gatewayAddress}
  memo="Project milestone payment"
  approvalAmount={new BN(100000000)} // $100 total approval
  executeImmediately={true}
  label="Create Milestone Plan"
  onSuccess={(result) => {}}
  onError={(error) => {}}
/>
```

### PayAsYouGoButton

Creates usage-based billing with period limits and chunk-based claims.

```tsx
<PayAsYouGoButton
  maxAmountPerPeriod={new BN(100000000)} // $100 per period
  maxChunkAmount={new BN(10000000)} // $10 per chunk
  periodLengthSeconds={new BN(30 * 24 * 60 * 60)} // 30 days
  token={tokenMint}
  recipient={recipientWallet}
  gateway={gatewayAddress}
  memo="API usage billing"
  approvalAmount={new BN(120000000)} // $120 approval
  label="Setup Usage Billing"
  onSuccess={(result) => {}}
  onError={(error) => {}}
/>
```

### SubscriptionButtonWithCode

Creates subscriptions that can be shared via one-time action codes (wallet-less payments).

```tsx
<SubscriptionButtonWithCode
  amount={new BN(1000000)}
  token={tokenMint}
  gateway={gatewayAddress}
  interval={PaymentInterval.Monthly}
  maxRenewals={12}
  memo="Action code subscription"
  approvalAmount={new BN(12000000)}
  executeImmediately={true}
  label="Generate Payment Code"
  onSuccess={(result) => {}}
  onError={(error) => {}}
/>
```

## Hooks

### useTributarySDK

Initializes the Tributary SDK instance with wallet connection.

```tsx
const sdk = useTributarySDK();
// Returns Tributary instance or null if wallet not connected
```

### useCreateSubscription

Hook for creating subscription payments.

```tsx
const { createSubscription, loading, error } = useCreateSubscription();

const result = await createSubscription({
  amount: new BN(1000000),
  token: tokenMint,
  recipient: recipientWallet,
  gateway: gatewayAddress,
  interval: PaymentInterval.Monthly,
  maxRenewals: 12,
  memo: "Monthly subscription",
  approvalAmount: new BN(12000000),
  executeImmediately: true,
});
```

### useCreateMilestone

Hook for creating milestone payments.

```tsx
const { createMilestone, loading, error } = useCreateMilestone();

const result = await createMilestone({
  milestoneAmounts: [new BN(25000000), new BN(25000000)],
  milestoneTimestamps: [
    new BN(Date.now() / 1000 + 7 * 24 * 60 * 60),
    new BN(Date.now() / 1000 + 14 * 24 * 60 * 60),
  ],
  releaseCondition: 0, // time-based
  token: tokenMint,
  recipient: recipientWallet,
  gateway: gatewayAddress,
  memo: "Project milestones",
  approvalAmount: new BN(50000000),
  executeImmediately: true,
});
```

### useCreatePayAsYouGo

Hook for creating pay-as-you-go billing.

```tsx
const { createPayAsYouGo, loading, error } = useCreatePayAsYouGo();

const result = await createPayAsYouGo({
  maxAmountPerPeriod: new BN(100000000),
  maxChunkAmount: new BN(10000000),
  periodLengthSeconds: new BN(30 * 24 * 60 * 60),
  token: tokenMint,
  recipient: recipientWallet,
  gateway: gatewayAddress,
  memo: "Usage billing",
  approvalAmount: new BN(120000000),
});
```

### useActionCode

Hook for generating one-time payment action codes.

```tsx
const { generateActionCode, loading, error } = useActionCode();

const code = await generateActionCode({
  amount: new BN(1000000),
  token: tokenMint,
  gateway: gatewayAddress,
  interval: PaymentInterval.Monthly,
  maxRenewals: 12,
  memo: "Action code subscription",
  approvalAmount: new BN(12000000),
  executeImmediately: true,
});
```

## API Reference

### Types

#### PaymentInterval

```typescript
enum PaymentInterval {
  Daily = "daily",
  Weekly = "weekly",
  Monthly = "monthly",
  Quarterly = "quarterly",
  SemiAnnually = "semiAnnually",
  Annually = "annually",
  Custom = "custom",
}
```

#### CreateSubscriptionParams

```typescript
interface CreateSubscriptionParams {
  amount: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  interval: PaymentInterval;
  custom_interval?: number; // seconds for custom interval
  maxRenewals?: number;
  memo?: string;
  startTime?: Date;
  approvalAmount?: BN;
  executeImmediately?: boolean;
}
```

#### CreateMilestoneParams

```typescript
interface CreateMilestoneParams {
  milestoneAmounts: BN[];
  milestoneTimestamps: BN[];
  releaseCondition: number; // 0=time-based, 1=manual, 2=automatic
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  memo?: string;
  approvalAmount?: BN;
  executeImmediately?: boolean;
}
```

#### CreatePayAsYouGoParams

```typescript
interface CreatePayAsYouGoParams {
  maxAmountPerPeriod: BN;
  maxChunkAmount: BN;
  periodLengthSeconds: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  memo?: string;
  approvalAmount?: BN;
}
```

### Result Types

```typescript
interface CreateSubscriptionResult {
  txId: string;
  instructions: any[];
}

interface CreateMilestoneResult {
  txId: string;
  instructions: any[];
}

interface CreatePayAsYouGoResult {
  txId: string;
  instructions: any[];
}
```

### Hook Return Types

```typescript
interface UseCreateSubscriptionReturn {
  createSubscription: (
    params: CreateSubscriptionParams
  ) => Promise<CreateSubscriptionResult>;
  loading: boolean;
  error: string | null;
}

interface UseCreateMilestoneReturn {
  createMilestone: (
    params: CreateMilestoneParams
  ) => Promise<CreateMilestoneResult>;
  loading: boolean;
  error: string | null;
}

interface UseCreatePayAsYouGoReturn {
  createPayAsYouGo: (
    params: CreatePayAsYouGoParams
  ) => Promise<CreatePayAsYouGoResult>;
  loading: boolean;
  error: string | null;
}
```

## Environment Variables

### Required

| Variable          | Description         | Example                         |
| ----------------- | ------------------- | ------------------------------- |
| `VITE_SOLANA_API` | Solana RPC endpoint | `https://api.devnet.solana.com` |

### Optional

| Variable          | Description         | Default                         |
| ----------------- | ------------------- | ------------------------------- |
| `VITE_SOLANA_API` | Solana RPC endpoint | `https://api.devnet.solana.com` |

## Available Scripts

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `pnpm run dev`     | Start development server with Vite       |
| `pnpm run build`   | Build for production (ESM, CJS, UMD)     |
| `pnpm run clean`   | Remove dist directory                    |
| `pnpm run prepack` | Build before publishing to npm           |
| `pnpm run release` | Publish new version via semantic-release |

## Development

### Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Open http://localhost:5173 to see the demo
```

The development server includes a comprehensive demo showing all payment types with wallet integration.

### Building

```bash
# Build all formats
pnpm run build

# This creates:
# - dist/index.js (ESM)
# - dist/index.cjs (CommonJS)
# - dist/index.umd.js (UMD for browsers)
# - dist/index.d.ts (TypeScript definitions)
```

### Testing

```bash
# Run tests (currently placeholder)
pnpm run test

# Note: Integration tests are in the main Tributary repo under tests/
```

## Deployment

The SDK is published to npm automatically via semantic-release. To use in production:

```bash
npm install @tributary-so/sdk-react
```

### CDN Usage

For browser environments, you can use the UMD build:

```html
<script src="https://unpkg.com/@tributary-so/sdk-react@latest/dist/index.umd.js"></script>
```

## Styling

Components use Tailwind CSS classes and HeroUI design tokens. To customize:

### Custom Button Styling

```tsx
<SubscriptionButton
  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
  label="Custom Styled Subscribe"
/>
```

### Theme Customization

Components respect HeroUI theme configuration. Configure your theme in `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

## Error Handling

All components and hooks provide comprehensive error handling:

```tsx
function PaymentComponent() {
  const [error, setError] = useState<string | null>(null);

  return (
    <SubscriptionButton
      // ... props
      onError={(err) => {
        setError(err.message);
        // Handle error (show toast, log, etc.)
      }}
    />
  );
}
```

Common error scenarios:

- Wallet not connected
- Insufficient token balance
- Invalid gateway or recipient addresses
- Network errors
- Transaction failures

## Troubleshooting

### Common Issues

**Component not rendering:**

- Ensure all peer dependencies are installed
- Check that wallet providers are properly configured
- Verify React version compatibility

**Transaction failing:**

- Check wallet connection and balance
- Verify token mint addresses
- Ensure gateway is properly configured
- Check Solana network (devnet/mainnet)

**TypeScript errors:**

- Ensure @types/react and @types/react-dom are installed
- Check TypeScript version compatibility
- Verify BN and PublicKey imports from correct packages

**Styling issues:**

- Ensure Tailwind CSS is properly configured
- Check HeroUI theme setup
- Verify CSS imports for wallet adapter UI

### Debug Mode

Enable debug logging by setting:

```bash
localStorage.setItem('tributary-debug', 'true');
```

## Examples

### Complete Subscription Flow

```tsx
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

function SubscriptionExample() {
  // Configuration
  const config = {
    token: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
    recipient: new PublicKey("8EVBvLDVhJUw1nkAUp73mPyxviVFK9Wza5ba1GRANEw1"),
    gateway: new PublicKey("CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr"),
    amount: new BN(1_000), // 0.001 USDC
    approval: new BN(120_000), // 0.12 USDC
  };

  const handleSuccess = (result: any) => {
    console.log("Subscription created:", result.txId);
    // Show success message, redirect, etc.
  };

  const handleError = (error: Error) => {
    console.error("Subscription failed:", error);
    // Show error message, retry logic, etc.
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Monthly Subscription</h2>
      <p className="text-gray-600 mb-6">
        Subscribe for $0.001 per month. Auto-renews for 12 months.
      </p>

      <SubscriptionButton
        amount={config.amount}
        token={config.token}
        recipient={config.recipient}
        gateway={config.gateway}
        interval={PaymentInterval.Monthly}
        maxRenewals={12}
        memo="Monthly subscription example"
        approvalAmount={config.approval}
        executeImmediately={true}
        label="Subscribe Now"
        className="w-full"
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
```

### Milestone Payment Example

```tsx
import { MilestoneButton } from "@tributary-so/sdk-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

function MilestoneExample() {
  const now = Math.floor(Date.now() / 1000);

  const milestones = {
    amounts: [
      new BN(25_000_000), // $25
      new BN(25_000_000), // $25
      new BN(25_000_000), // $25
      new BN(25_000_000), // $25
    ],
    timestamps: [
      new BN(now + 7 * 24 * 60 * 60), // Week 1
      new BN(now + 14 * 24 * 60 * 60), // Week 2
      new BN(now + 21 * 24 * 60 * 60), // Week 3
      new BN(now + 28 * 24 * 60 * 60), // Week 4
    ],
  };

  return (
    <MilestoneButton
      milestoneAmounts={milestones.amounts}
      milestoneTimestamps={milestones.timestamps}
      releaseCondition={0} // Time-based release
      token={new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")}
      recipient={new PublicKey("8EVBvLDVhJUw1nkAUp73mPyxviVFK9Wza5ba1GRANEw1")}
      gateway={new PublicKey("CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr")}
      memo="4-week project milestones"
      approvalAmount={new BN(100_000_000)} // $100 total
      executeImmediately={true}
      label="Start Project"
    />
  );
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with tests
4. Ensure TypeScript compilation: `pnpm run build`
5. Commit with conventional commits
6. Push and create a pull request

### Development Guidelines

- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Add proper error handling and loading states
- Include comprehensive TypeScript types
- Test components with different wallet states
- Follow conventional commit format for releases

## License

MIT License - see [LICENSE](../LICENSE) file for details.

## Links

- **Main Repository**: [github.com/tributary-so/tributary](https://github.com/tributary-so/tributary)
- **Documentation**: [docs.tributary.so](https://docs.tributary.so)
- **Core SDK**: [@tributary-so/sdk](../sdk/)
- **x402 Middleware**: [@tributary-so/sdk-x402](../sdk-x402/)
- **CLI Manager**: [@tributary-so/cli](../cli/)

## Support

- **Issues**: [GitHub Issues](https://github.com/tributary-so/tributary/issues)
- **Discord**: Community discussions and support
- **Twitter**: [@tributary_so](https://twitter.com/tributary_so)
