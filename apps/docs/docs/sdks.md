# SDKs for Developers

## **TypeScript SDK** (`sdk/`)

- Complete protocol interaction library with Anchor integration
- Payment management functions (create, execute, pause/resume policies)
- PDA (Program Derived Address) helpers for deterministic addresses
- Token delegation utilities for SPL integration
- Error handling, validation, and payment frequency mapping

### Creating Subscriptions

```typescript
const instructions = await sdk.createSubscriptionInstruction(
  params.token,
  params.recipient,
  params.gateway,
  params.amount,
  false,
  null,
  createPaymentFrequency(params.interval),
  createMemoBuffer(params.memo || "", 64),
  params.startTime,
  params.approvalAmount,
  params.executeImmediately ?? true
);

// Build transaction
const transaction = new Transaction();
instructions.forEach((ix) => transaction.add(ix));
transaction.feePayer = wallet.publicKey;
const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
const signedTx = await wallet.signTransaction(transaction);
const txId = await connection.sendRawTransaction(signedTx.serialize());
```

### Creating Milestone Payments

```typescript
import { BN } from "@coral-xyz/anchor";

// Define milestone parameters
const milestoneAmounts = [
  new BN(50000000), // $50 - Initial setup
  new BN(75000000), // $75 - Core development
  new BN(100000000), // $100 - Final delivery
];
const milestoneTimestamps = [
  new BN(Math.floor(Date.now() / 1000) + 86400 * 7), // 1 week
  new BN(Math.floor(Date.now() / 1000) + 86400 * 21), // 3 weeks
  new BN(Math.floor(Date.now() / 1000) + 86400 * 35), // 5 weeks
];

// Create milestone payment policy
const milestoneIx = await sdk.createMilestonePaymentPolicy(
  tokenMint,
  recipient,
  gateway,
  milestoneAmounts,
  milestoneTimestamps,
  0, // Time-based release condition
  createMemoBuffer("Website development project", 64)
);

// Create user payment account if needed
const userPaymentIx = await sdk.createUserPayment(tokenMint);

// Build transaction
const transaction = new Transaction().add(userPaymentIx).add(milestoneIx);

transaction.feePayer = wallet.publicKey;
const { blockhash } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
const signedTx = await wallet.signTransaction(transaction);
const txId = await connection.sendRawTransaction(signedTx.serialize());
```

### Creating Pay-as-you-go Payments

```typescript
import { BN } from "@coral-xyz/anchor";

// Define pay-as-you-go parameters
const maxAmountPerPeriod = new BN(100000000); // $100 per period
const maxChunkAmount = new BN(10000000); // $10 max per claim
const periodLengthSeconds = new BN(86400 * 30); // 30 days

// Create pay-as-you-go payment policy
const payAsYouGoIx = await sdk.createPayAsYouGoPaymentPolicy(
  tokenMint,
  recipient,
  gateway,
  maxAmountPerPeriod,
  maxChunkAmount,
  periodLengthSeconds,
  createMemoBuffer("AI API usage billing", 64)
);

// Create user payment account if needed
const userPaymentIx = await sdk.createUserPayment(tokenMint);

// Build transaction
const transaction = new Transaction().add(userPaymentIx).add(payAsYouGoIx);

transaction.feePayer = wallet.publicKey;
const { blockhash } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
const signedTx = await wallet.signTransaction(transaction);
const txId = await connection.sendRawTransaction(signedTx.serialize());

// Execute payments (called by service provider when usage thresholds are met)
const executeIx = await sdk.executePayment(
  paymentPolicyPDA,
  new BN(5000000) // $5 payment amount
);
```

## **React SDK** (`sdk-react/`)

- Pre-built payment components
- React hooks for payment management
- TypeScript support
- Wallet integration

```typescript
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";
<SubscriptionButton
  amount={new BN("10000000")}
  token={new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")} // USDC mint
  recipient={recipient}
  gateway={gateway}
  interval={PaymentInterval.Weekly}
  maxRenewals={12}
  memo={`Monthly donation to ${repository}`}
  label="Donate $10/month"
  radius="sm"
  size="lg"
  executeImmediately={true}
  className="px-6 py-3 font-semibold bg-gradient-to-r from-[#9945FF] to-[#14F195] border-0 font-bold text-xl px-6 py-3 text-black"
  onSuccess={(tx) => console.log("Donation successful:", tx)}
  onError={(err) => console.error("Donation failed:", err)}
/>;
```
