# SDK Integration Quickstart

This guide covers the basics of integrating the Tributary SDK (`@tributary-so/sdk`) into your application for programmatic control over recurring payments on Solana.

## Prerequisites

- Node.js (v16 or higher)
- pnpm package manager
- A Solana wallet (Phantom, Solflare, etc.)
- Basic knowledge of Solana development

## Step 1: Installation

Install the Tributary SDK:

```bash
pnpm install @tributary-so/sdk @solana/web3.js @solana/spl-token @coral-xyz/anchor
```

## Step 2: Import and Initialize

Import the SDK and create an instance:

```typescript
import { Tributary } from '@tributary-so/sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

// Create connection to Solana
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Initialize with your wallet (this should be connected)
const wallet: Wallet = /* your connected wallet */;
const provider = new AnchorProvider(connection, wallet, {
  preflightCommitment: 'confirmed'
});

// Create SDK instance
const tributary = new Tributary(connection, wallet);
```

## Step 3: Create Payments

Tributary supports multiple payment types. Choose the one that fits your use case:

### Creating a Subscription

To create a recurring payment subscription, use the `createSubscriptionInstruction` method:

```typescript
import { BN } from "@coral-xyz/anchor";
import { PaymentFrequency } from "@tributary-so/sdk";

// Define subscription parameters
const tokenMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC
const recipient = new PublicKey("..."); // Recipient's public key
const gateway = new PublicKey("..."); // Payment gateway's public key
const amount = new BN(1000000); // 1 USDC (6 decimals)
const paymentFrequency = { monthly: {} } as PaymentFrequency;
const memo = [72, 101, 108, 108, 111]; // "Hello" as byte array

// Create subscription instructions
const instructions = await tributary.createSubscriptionInstruction(
  tokenMint,
  recipient,
  gateway,
  amount,
  true, // autoRenew
  12, // maxRenewals
  paymentFrequency,
  memo,
  undefined, // startTime
  new BN(12000000), // approvalAmount (12 USDC)
  true // executeImmediately
);

// Send the transaction
const tx = new Transaction().add(...instructions);
const signature = await provider.sendAndConfirm(tx);
console.log("Subscription created:", signature);
```

### Creating Milestone Payments

For project-based payments with multiple deliverables, use milestone payments:

```typescript
import { BN } from "@coral-xyz/anchor";

// Define project milestones
const milestoneAmounts = [
  new BN(25000000), // $25 - Planning & design
  new BN(50000000), // $50 - Development
  new BN(25000000), // $25 - Testing & delivery
];
const milestoneTimestamps = [
  new BN(Math.floor(Date.now() / 1000) + 86400 * 7), // 1 week from now
  new BN(Math.floor(Date.now() / 1000) + 86400 * 21), // 3 weeks from now
  new BN(Math.floor(Date.now() / 1000) + 86400 * 35), // 5 weeks from now
];

// Create milestone payment policy
const milestoneInstructions = await tributary.createMilestonePaymentPolicy(
  tokenMint,
  recipient,
  gateway,
  milestoneAmounts,
  milestoneTimestamps,
  0, // Release condition: 0=time-based, 1=manual approval, 2=automatic
  createMemoBuffer("Website redesign project", 64)
);

// Send the transaction
const milestoneTx = new Transaction().add(...milestoneInstructions);
const milestoneSignature = await provider.sendAndConfirm(milestoneTx);
console.log("Milestone payment created:", milestoneSignature);
```

## Step 4: Execute a Payment

To manually execute a payment for an existing subscription:

```typescript
// Get the payment policy PDA
const userPaymentPda = tributary.getUserPaymentPda(wallet.publicKey, tokenMint);
const policyPda = tributary.getPaymentPolicyPda(userPaymentPda.address, 1); // Policy ID 1

// Create execute payment instructions
const executeInstructions = await tributary.executePayment(
  policyPda.address,
  recipient,
  tokenMint,
  gateway
);

// Send the transaction
const executeTx = new Transaction().add(...executeInstructions);
const executeSignature = await provider.sendAndConfirm(executeTx);
console.log("Payment executed:", executeSignature);
```

## Step 5: Query Subscription Data

The SDK provides methods to query existing subscriptions and payments:

```typescript
// Get all user payments for the current user
const userPayments = await tributary.getAllUserPaymentsByOwner(
  wallet.publicKey
);
console.log("User payments:", userPayments);

// Get payment policies for the current user
const policies = await tributary.getPaymentPoliciesByUser(wallet.publicKey);
console.log("Payment policies:", policies);

// Get details of a specific payment policy
const policyDetails = await tributary.getPaymentPolicy(policyPda.address);
console.log("Policy details:", policyDetails);
```

## Key SDK Methods

### Payment Management

- `createSubscriptionInstruction()`: Create a new subscription with all necessary instructions
- `createMilestonePaymentPolicy()`: Create a milestone-based payment policy
- `createUserPayment()`: Initialize user payment account for a token
- `createPaymentPolicy()`: Create a payment policy for recurring payments

### Payment Execution

- `executePayment()`: Execute a payment for an existing subscription

### Account Management

- `changePaymentPolicyStatus()`: Pause or resume a subscription
- `deletePaymentPolicy()`: Cancel a subscription

### Queries

- `getAllUserPaymentsByOwner()`: Get all user payment accounts
- `getPaymentPoliciesByUser()`: Get all payment policies for a user
- `getPaymentPoliciesByRecipient()`: Get policies where user is recipient
- `getPaymentPoliciesByGateway()`: Get policies using a specific gateway

## Error Handling

Always wrap SDK calls in try-catch blocks:

```typescript
try {
  const instructions =
    await tributary.createSubscriptionInstruction(/* params */);
  // Process instructions
} catch (error) {
  console.error("Failed to create subscription:", error);
  // Handle error appropriately
}
```

## Important Notes

- **Wallet Connection**: Ensure your wallet is connected and has sufficient funds
- **Token Accounts**: The SDK handles ATA creation automatically
- **Approvals**: Use `approvalAmount` to delegate spending authority for recurring payments
- **Network Fees**: Account for Solana transaction fees
- **Testing**: Use devnet for testing: `'https://api.devnet.solana.com'`

For advanced usage and all available methods, refer to the [SDK Reference](../sdks.md).
