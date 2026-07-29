# @tributary-so/sdk

[![npm version](https://badge.fury.io/js/%40tributary-so%2Fsdk.svg)](https://badge.fury.io/js/%40tributary-so%2Fsdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white)](https://solana.com)

TypeScript SDK for the Tributary recurring payments protocol on Solana. Provides a complete interface for creating payment gateways, managing subscriptions, executing payments, and interacting with the protocol.

## Key Features

- **Complete Protocol Coverage**: All Tributary program instructions and queries
- **Composable Pull Payments**: Programmable payments with on-chain validation (Lighthouse) and token transformation (Meteora DLMM forward swaps)
- **Type-Safe**: Full TypeScript support with Anchor-generated types
- **Payment Types**: Subscriptions, Milestone, Pay-as-you-go, One-time, UpTo + composable variants
- **Lighthouse Validation**: Fluent assertion builder — balance guards, price gates, any on-chain condition
- **Referral System**: Built-in referral tracking and rewards
- **Token Metadata**: Metaplex Token Metadata integration
- **PDA Utilities**: Program Derived Address helpers for all account types
- **Non-custodial**: Funds remain in user wallets with delegation-based automation

## Tech Stack

- **Language**: TypeScript 5.7+
- **Blockchain**: Solana (Program ID: `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`)
- **Framework**: Anchor 0.31.0 for smart contract interaction
- **Libraries**: @solana/web3.js, @coral-xyz/anchor, @metaplex-foundation/umi
- **Package Manager**: pnpm 9.6.0+
- **Node.js**: >=16.0.0

## Prerequisites

- Node.js 16.0.0 or higher
- pnpm (recommended) or npm
- A Solana RPC endpoint (mainnet-beta, devnet, or localnet)

## Installation

```bash
# Using pnpm (recommended)
pnpm add @tributary-so/sdk

# Using npm
npm install @tributary-so/sdk

# Using yarn
yarn add @tributary-so/sdk
```

## Getting Started

### Basic Setup

```typescript
import { Tributary } from "@tributary-so/sdk";
import { Connection, Keypair } from "@solana/web3.js";

// Connect to Solana
const connection = new Connection("https://api.mainnet-beta.solana.com");

// Create a wallet (replace with your wallet loading logic)
const wallet = Keypair.generate(); // For demo only - use proper wallet in production

// Initialize SDK
const sdk = new Tributary(connection, wallet);
```

### Creating a Subscription

```typescript
import { Tributary, getPaymentFrequency } from "@tributary-so/sdk";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// Initialize SDK
const sdk = new Tributary(connection, wallet);

// Token addresses (example: USDC on mainnet)
const tokenMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const recipient = new PublicKey("..."); // Recipient wallet
const gateway = new PublicKey("..."); // Payment gateway address

// Create subscription instructions
const instructions = await sdk.createSubscription(
  tokenMint,
  recipient,
  gateway,
  new BN("10000000"), // 10 USDC (6 decimals)
  true, // auto-renew
  12, // max renewals
  getPaymentFrequency("monthly"), // monthly payments
  [], // memo (empty)
  undefined, // start immediately
  undefined, // auto-calculate approval amount
  false // don't execute immediately
);

// Send transaction
const tx = new Transaction().add(...instructions);
const signature = await connection.sendTransaction(tx, [wallet]);
```

### Composable Pull Payments (v2)

Composable policies add two hooks to a pull payment: **validation** (a
Lighthouse on-chain assertion that can veto the transaction) and **forward**
(a Meteora DLMM swap that transforms the pulled token before delivery).

```typescript
import {
  Tributary,
  lighthouse,
  LIGHTHOUSE_PROGRAM_ID,
} from "@tributary-so/sdk";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Build a Lighthouse guard: only pay when recipient's balance is below 50 USDC
const guard = lighthouse
  .tokenAccount(recipientUsdcAta)
  .amount(50_000_000, "<")
  .build();

// Create a PayAsYouGo composable policy with the guard
const ixs = await sdk.createComposable(
  USDC,
  recipient,
  gateway,
  { payAsYouGo: { maxAmountPerPeriod: new BN(1_000_000_000) /* ... */ } },
  "Conditional payment",
  {
    /* forwardConfig — disabled for same-mint */
  },
  { programCall: { programId: LIGHTHOUSE_PROGRAM_ID } }, // preValidation
  [recipientUsdcAta], // prePinnedAccounts
  guard.data // preValidationData
);

await connection.sendTransaction(new Transaction().add(...ixs), [wallet]);

// Execute (permissionless — any gateway signer)
const execIxs = await sdk.executeComposable(
  composablePolicyPDA,
  Buffer.alloc(0), // no forward data
  new BN(50_000_000), // pull 50 USDC
  guard.accounts // Lighthouse read-accounts
);
await connection.sendTransaction(new Transaction().add(...execIxs), [wallet]);
```

See the [composable quickstarts](https://docs.tributary.so) and
[Lighthouse facade guide](https://docs.tributary.so) for full worked examples.

## Architecture

### Directory Structure

```
src/
├── index.ts           # Main exports
├── sdk.ts             # Core Tributary class
├── pda.ts             # Program Derived Address utilities
├── types.ts           # TypeScript type definitions
├── constants.ts       # Protocol constants
├── utils.ts           # Helper functions
├── token.ts           # Token metadata utilities
└── lighthouse.ts      # Fluent Lighthouse assertion builder
```

### Core Classes

#### Tributary (Main SDK Class)

The primary interface for interacting with the Tributary protocol:

```typescript
class Tributary {
  program: Program;           // Anchor program instance
  programId: PublicKey;       // Tributary program ID
  connection: Connection;     // Solana RPC connection
  provider: AnchorProvider;   // Anchor provider with wallet

  // Payment creation methods
  createSubscription(...)
  createMilestone(...)
  createPayAsYouGo(...)
  createOneTimePayment(...)
  createUpToAuthorization(...)

  // Composable payments (v2)
  createComposable(...)
  getCreateComposablePolicyInstruction(...)
  executeComposable(...)

  // Gateway management
  createPaymentGateway(...)
  updateGatewayReferralSettings(...)

  // Payment execution
  executePayment(...)

  // Query methods
  getAllPaymentGateway()
  getPaymentPoliciesByUser(...)
  getUserPayment(...)
}
```

### Payment Types

Tributary supports three payment models:

#### 1. Subscriptions

Fixed recurring payments at regular intervals:

```typescript
const instructions = await sdk.createSubscription(
  tokenMint,
  recipient,
  gateway,
  new BN("1000000"), // 1 USDC per month
  true, // auto-renew
  null, // unlimited renewals
  getPaymentFrequency("monthly"),
  encodeMemo("Monthly subscription"),
  undefined, // start now
  undefined, // auto-calculate approval
  false // don't execute immediately
);
```

#### 2. Milestone Payments

Project-based compensation with configurable milestones:

```typescript
const milestoneAmounts = [
  new BN("5000000"), // $5 for milestone 1
  new BN("5000000"), // $5 for milestone 2
  new BN("10000000"), // $10 for milestone 3
];

const milestoneTimestamps = [
  new BN(Math.floor(Date.now() / 1000) + 86400 * 30), // 30 days
  new BN(Math.floor(Date.now() / 1000) + 86400 * 60), // 60 days
  new BN(Math.floor(Date.now() / 1000) + 86400 * 90), // 90 days
];

const instructions = await sdk.createMilestone(
  tokenMint,
  recipient,
  gateway,
  milestoneAmounts,
  milestoneTimestamps,
  1, // release condition: gateway signer approval
  encodeMemo("Project milestones")
);
```

#### 3. Pay-as-you-go

Usage-based billing with period limits:

```typescript
const instructions = await sdk.createPayAsYouGo(
  tokenMint,
  recipient,
  gateway,
  new BN("10000000"), // $10 max per period
  new BN("1000000"), // $1 max per chunk
  new BN(86400 * 30), // 30-day periods
  encodeMemo("Usage-based billing")
);
```

### Program Derived Addresses (PDAs)

The SDK provides utilities for deriving all protocol PDAs:

```typescript
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
} from "@tributary-so/sdk";

// Program configuration PDA (singleton)
const configPda = getConfigPda(sdk.programId);

// Gateway PDA for a specific authority
const gatewayPda = getGatewayPda(gatewayAuthority, sdk.programId);

// User payment PDA for tracking payments
const userPaymentPda = getUserPaymentPda(userWallet, tokenMint, sdk.programId);
```

## Environment Variables

### Required

| Variable         | Description         | Example                               |
| ---------------- | ------------------- | ------------------------------------- |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.mainnet-beta.solana.com` |

### Optional

| Variable              | Description            | Default                    |
| --------------------- | ---------------------- | -------------------------- |
| `ANCHOR_WALLET`       | Path to wallet keypair | `~/.config/solana/id.json` |
| `ANCHOR_PROVIDER_URL` | Anchor provider URL    | Localnet URL               |

## Available Scripts

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `pnpm run build`   | Build TypeScript to JavaScript |
| `pnpm run clean`   | Remove build artifacts         |
| `pnpm run lint`    | Run ESLint                     |
| `pnpm run manager` | Run CLI manager tool           |

## API Reference

### Core Methods

#### Payment Creation

```typescript
// Create subscription
createSubscription(
  tokenMint: PublicKey,
  recipient: PublicKey,
  gateway: PublicKey,
  amount: BN,
  autoRenew: boolean,
  maxRenewals: number | null,
  paymentFrequency: PaymentFrequency,
  memo: number[],
  startTime?: BN | null,
  approvalAmount?: BN,
  executeImmediately?: boolean,
  referralCode?: string
): Promise<TransactionInstruction[]>

// Create milestone payment
createMilestone(
  tokenMint: PublicKey,
  recipient: PublicKey,
  gateway: PublicKey,
  milestoneAmounts: BN[],
  milestoneTimestamps: BN[],
  releaseCondition: number,
  memo: number[],
  approvalAmount?: BN,
  executeImmediately?: boolean,
  referralCode?: string
): Promise<TransactionInstruction[]>

// Create pay-as-you-go payment
createPayAsYouGo(
  tokenMint: PublicKey,
  recipient: PublicKey,
  gateway: PublicKey,
  maxAmountPerPeriod: BN,
  maxChunkAmount: BN,
  periodLengthSeconds: BN,
  memo: number[],
  approvalAmount?: BN,
  referralCode?: string
): Promise<TransactionInstruction[]>
```

#### Payment Execution

```typescript
// Execute a payment
executePayment(
  paymentPolicyPda: PublicKey,
  paymentAmount?: BN,
  recipient?: PublicKey,
  tokenMint?: PublicKey,
  gateway?: PublicKey,
  user?: PublicKey
): Promise<TransactionInstruction[]>
```

#### Gateway Management

```typescript
// Create payment gateway
createPaymentGateway(
  authority: PublicKey,
  gatewayFeeBps: number,
  schedulerShareBps: number,
  gatewayFeeRecipient: PublicKey,
  name: string,
  url: string
): Promise<TransactionInstruction>

// Update gateway referral settings
updateGatewayReferralSettings(
  gatewayAuthority: PublicKey,
  featureFlags: number,
  referralAllocationBps: number,
  referralTiersBps: [number, number, number]
): Promise<TransactionInstruction>
```

#### Query Methods

```typescript
// Get all payment gateways
getAllPaymentGateway(): Promise<Array<{ publicKey: PublicKey; account: PaymentGateway }>>

// Get payment policies by user
getPaymentPoliciesByUser(user: PublicKey): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>>

// Get user payment account
getUserPayment(userPaymentAddress: PublicKey): Promise<UserPayment | null>

// Get payment gateway
getPaymentGateway(gatewayAddress: PublicKey): Promise<PaymentGateway | null>
```

### Utility Functions

#### Payment Frequency

```typescript
import { getPaymentFrequency } from "@tributary-so/sdk";

// Convert string to PaymentFrequency enum
const monthly = getPaymentFrequency("monthly");
const custom = getPaymentFrequency("custom", 86400 * 7); // weekly
```

#### Memo Encoding

```typescript
import { encodeMemo, decodeMemo } from "@tributary-so/sdk";

// Encode string to memo buffer
const memoBuffer = encodeMemo("Payment for services", 64);

// Decode memo buffer to string
const memoString = decodeMemo(memoBuffer);
```

#### Token Metadata

```typescript
import { getTokenInfo } from "@tributary-so/sdk";

// Get token metadata
const metadata = await getTokenInfo(connection, tokenMint);
if (metadata) {
  console.log(`Token: ${metadata.data.name} (${metadata.data.symbol})`);
}
```

### PDA Utilities

```typescript
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getPaymentPolicyPda,
  getPaymentsDelegatePda,
  getReferralPda,
} from "@tributary-so/sdk";

// All PDA functions return { address: PublicKey, bump: number }
const configPda = getConfigPda(programId);
const gatewayPda = getGatewayPda(authority, programId);
const userPaymentPda = getUserPaymentPda(user, tokenMint, programId);
const paymentPolicyPda = getPaymentPolicyPda(
  userPaymentPda.address,
  policyId,
  programId
);
const paymentsDelegatePda = getPaymentsDelegatePda(programId);
const referralPda = getReferralPda(gateway, referralCodeBuffer, programId);
```

## Usage Examples

### Complete Subscription Flow

```typescript
import { Tributary, getPaymentFrequency, encodeMemo } from "@tributary-so/sdk";
import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import BN from "bn.js";

// Setup
const connection = new Connection("https://api.devnet.solana.com");
const wallet = Keypair.generate(); // Replace with your wallet
const sdk = new Tributary(connection, wallet);

// Airdrop SOL for fees (devnet only)
const airdropSig = await connection.requestAirdrop(
  wallet.publicKey,
  1_000_000_000
);
await connection.confirmTransaction(airdropSig);

// Token addresses (devnet USDC)
const tokenMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const recipient = new PublicKey("..."); // Replace with recipient
const gateway = new PublicKey("..."); // Replace with gateway

// Create subscription
const instructions = await sdk.createSubscription(
  tokenMint,
  recipient,
  gateway,
  new BN("1000000"), // 1 USDC
  true, // auto-renew
  12, // 12 months
  getPaymentFrequency("monthly"),
  encodeMemo("Monthly subscription"),
  undefined, // start now
  undefined, // auto-calculate approval
  false // don't execute immediately
);

// Execute transaction
const tx = new Transaction().add(...instructions);
const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);

console.log(`Subscription created: ${signature}`);
```

### Gateway Setup

```typescript
// Create a payment gateway
const gatewayInstructions = await sdk.createPaymentGateway(
  wallet.publicKey, // gateway authority
  500, // 5% total gateway fee
  100, // 1% scheduler share (of the gateway fee)
  wallet.publicKey, // fee recipient
  "My Payment Gateway",
  "https://mygateway.com"
);

// Send transaction
const tx = new Transaction().add(gatewayInstructions);
const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
```

### Querying Protocol State

```typescript
// Get all payment gateways
const gateways = await sdk.getAllPaymentGateway();
console.log(`Found ${gateways.length} gateways`);

// Get user's payment policies
const policies = await sdk.getPaymentPoliciesByUser(wallet.publicKey);
console.log(`User has ${policies.length} payment policies`);

// Get specific payment policy
const policy = await sdk.getPaymentPolicy(policyAddress);
if (policy) {
  console.log(`Policy type: ${Object.keys(policy.policyType)[0]}`);
}
```

### Referral System

```typescript
// Create referral account
const referralIx = await sdk.createReferralAccount(
  gateway,
  "ABC123", // 6-character referral code
  referrerAddress // optional referrer
);

// Update gateway referral settings
const updateIx = await sdk.updateGatewayReferralSettings(
  gatewayAuthority,
  1, // feature flags (referrals enabled)
  2500, // 25% of gateway fee for referrals
  [5000, 3000, 2000] // L1: 50%, L2: 30%, L3: 20%
);
```

## Testing

### Running Tests

```bash
# From project root
cd tests
npx jest
```

### Test Coverage

The SDK includes comprehensive integration tests covering:

- Program initialization
- User payment account creation
- Gateway setup and configuration
- All payment policy types (subscription, milestone, pay-as-you-go)
- Token delegation and approval
- Payment execution with fee distribution
- Referral system functionality

## Building

```bash
# Build the SDK
pnpm run build

# Clean build artifacts
pnpm run clean

# Run linting
pnpm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with tests
4. Run the test suite: `cd tests && npx jest`
5. Ensure linting passes: `pnpm run lint`
6. Commit with conventional commits
7. Push and create a pull request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/tributary-so/tributary
cd tributary

# Install dependencies
pnpm install

# Build SDK
cd sdk
pnpm run build
```

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors:**

```bash
# Clear node_modules and rebuild
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm run build
```

**Connection errors:**

```bash
# Check your RPC endpoint
curl https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
```

**Insufficient funds for transaction:**

```bash
# Check wallet balance
solana balance

# Airdrop SOL (devnet only)
solana airdrop 1
```

**Token approval errors:**

- Ensure the token account exists and has sufficient balance
- Verify the approval amount covers the payment requirements
- Check that delegation hasn't already been set to another address

## Security

- **Non-custodial**: Funds remain in user wallets
- **Delegation-based**: Uses SPL token delegation for automation
- **Type-safe**: Full TypeScript coverage prevents runtime errors
- **Audited**: Smart contract has been audited by professional security firms
- **Access control**: Proper authority verification on all operations

## License

MIT License - see [LICENSE](../../LICENSE) file for details.

## Links

- **Documentation**: [docs.tributary.so](https://docs.tributary.so)
- **Protocol Repository**: [github.com/tributary-so/tributary](https://github.com/tributary-so/tributary)
- **NPM Package**: [npmjs.com/package/@tributary-so/sdk](https://www.npmjs.com/package/@tributary-so/sdk)
- **Discord**: Community discussions and support

## Bump

2026-07-29: minor bump to up and sync packages
