# Tributary SDK Integration Guide

Reference documentation for integrating with the Tributary recurring payments protocol. Four packages: `@tributary-so/sdk` (on-chain), `@tributary-so/sdk-react` (React), `@tributary-so/sdk-x402` (HTTP-402), `@tributary-so/payments` (checkout sessions).

---

## 1. Architecture

### Package Map

| Package                   | npm                  | Purpose                                                                                     |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `@tributary-so/sdk`       | `packages/sdk`       | On-chain operations: create gateways, policies, execute payments, query state               |
| `@tributary-so/sdk-react` | `packages/sdk-react` | React hooks + ready-made UI components (Subscription, Milestone, PayAsYouGo, OneTime, UpTo) |
| `@tributary-so/sdk-x402`  | `packages/sdk-x402`  | HTTP-402 middleware for Express, usage metering, UpTo authorization verify/settle           |
| `@tributary-so/payments`  | `packages/payments`  | Checkout session encoding, JWT verification, PaymentsClient facade                          |

### Program ID

```
TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
```

### On-Chain Accounts

| Account          | Seeds                                            | Purpose                                                                       |
| ---------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| ProgramConfig    | `["config"]`                                     | Singleton: protocol fees, admin, emergency pause                              |
| PaymentGateway   | `["gateway", authority]`                         | Per-authority gateway settings and fees                                       |
| UserPayment      | `["user_payment", owner, mint]`                  | Per user+mint: tracks `created_policies_count` and `created_composable_count` |
| PaymentPolicy    | `["payment_policy", user_payment, policy_id]`    | Direct pull-payment policy                                                    |
| ComposablePolicy | `["composable_policy", user_payment, policy_id]` | Programmable pull-payment with optional forward + validation                  |
| ReferralAccount  | `["referral", gateway, referral_code]`           | 6-char referral code tracking                                                 |

### Policy Types (shared by both policy families)

All variants are 128 bytes on-chain.

| Variant        | Behavior                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `subscription` | Fixed amount per `payment_frequency` until `max_renewals`                                                                      |
| `milestone`    | Up to 4 amounts, released via bitmap conditions                                                                                |
| `payAsYouGo`   | Claim up to `max_chunk_amount` per call, capped at `max_amount_per_period` per `period_length_seconds`. Optional `expiry_date` |
| `oneTime`      | Fixed amount, fires once, transitions to `Completed`                                                                           |
| `upTo`         | Single-use, time-bound. Actual settled amount is caller-supplied at execute, bounded by `max_amount`                           |

### Lifecycle

```
User → createUserPayment(mint)
    → createGateway(authority, feeBps, feeRecipient)
    → createPolicy(userPayment, recipient, gateway, PolicyType)
    → approve delegate on user token account (UserPayment PDA)
    → executePayment(policyPda)  // permissionless
```

### Imports

```typescript
import { Tributary, getPaymentFrequency, encodeMemo } from "@tributary-so/sdk";
import { BN } from "bn.js";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
```

---

## 2. SDK Core (`@tributary-so/sdk`)

### `Tributary` Class

Main entry point. All on-chain operations route through this class.

```typescript
import { Tributary } from "@tributary-so/sdk";
import { Connection, Keypair } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const wallet = Keypair.generate(); // or any IWallet
const sdk = new Tributary(connection, wallet);
```

#### Constructor

```typescript
constructor(connection: Connection, wallet: Keypair | IWallet)
```

`IWallet` interface:

```typescript
interface IWallet {
  publicKey: PublicKey;
  signTransaction<T>(tx: T): Promise<T>;
  signAllTransactions<T>(txs: T[]): Promise<T[]>;
}
```

#### Properties

```typescript
sdk.program: anchor.Program<TributaryIdl>;
sdk.programId: PublicKey;         // TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
sdk.connection: Connection;
sdk.provider: anchor.AnchorProvider;
```

#### `updateWallet(wallet: any): Promise<void>`

Change the signer without creating a new SDK instance.

### Gateway Management

#### `createPaymentGateway(authority, gatewayFeeBps, schedulerShareBps, gatewayFeeRecipient, name, url, initialFeatureFlags?): Promise<TransactionInstruction>`

Create a payment gateway. `name` max 32 chars, `url` max 64 chars.

```typescript
const gatewayIx = await sdk.createPaymentGateway(
  authority.publicKey, // gateway authority
  100, // fee: 100 bps = 1%
  0, // scheduler share: 0 bps
  feeRecipient.publicKey,
  "My Gateway",
  "https://gateway.example.com",
  0 // initial feature flags
);
```

#### `updateGatewayReferralSettings(gatewayAuthority, featureFlags, referralAllocationBps, referralTiersBps: [number, number, number]): Promise<TransactionInstruction>`

Update referral settings. `referralTiersBps` must sum to 10000. `referralAllocationBps` max 2500.

#### `changeGatewaySigner(gatewayAuthority, newSigner): Promise<TransactionInstruction>`

Change the signer authorized to execute payments.

#### `changeGatewayFeeRecipient(gatewayAuthority, newFeeRecipient): Promise<TransactionInstruction>`

Change the fee recipient for a gateway.

#### `changeGatewayFeeBps(gatewayAuthority, newFeeBps): Promise<TransactionInstruction>`

Change gateway fee. Max 10000 bps.

#### `updateGatewayProtocolFee(gatewayAuthority, useCustomProtocolFee, customProtocolShareBps): Promise<TransactionInstruction>`

Admin-only. Set per-gateway protocol share override.

#### `updateGatewaySchedulerShare(gatewayAuthority, schedulerShareBps): Promise<TransactionInstruction>`

Set the scheduler (execute-tx signer) share. Constraint: `protocol_share + scheduler_share + referral_allocation <= 10000`.

#### `updateGatewayFeatureFlags(gatewayAuthority, featureFlags): Promise<TransactionInstruction>`

Set raw feature flags. Only bits 0-1 (REFERRAL, NET_AMOUNT) allowed.

#### `enableGatewayFeature(gatewayAuthority, flag): Promise<TransactionInstruction>`

#### `disableGatewayFeature(gatewayAuthority, flag): Promise<TransactionInstruction>`

#### `deletePaymentGateway(gatewayAuthority): Promise<TransactionInstruction>`

Admin-only.

### User Payment Accounts

#### `createUserPayment(tokenMint, feePayer?): Promise<TransactionInstruction>`

Create a UserPayment account for the wallet. One per token mint per user.

```typescript
const userPaymentIx = await sdk.createUserPayment(mintPubkey);
```

#### `deleteUserPayment(tokenMint): Promise<TransactionInstruction>`

Delete a UserPayment account. Only when no active policies/composables exist.

### Policy Creation (High-Level)

These methods return `TransactionInstruction[]` — full setup including ATA creation, UserPayment creation, policy creation, and token delegation approval.

#### `createSubscription(tokenMint, recipient, gateway, amount, autoRenew, maxRenewals, paymentFrequency, memo, startTime?, approvalAmount?, executeImmediately?, referralCode?, feePayer?): Promise<TransactionInstruction[]>`

```typescript
const ixs = await sdk.createSubscription(
  usdcMint,
  recipientPubkey,
  gatewayPda,
  new BN("1000000"), // 1 USDC (6 decimals)
  true, // auto-renew
  12, // max renewals
  getPaymentFrequency("monthly"),
  encodeMemo("Pro plan") // 64-byte memo
);
```

#### `createMilestone(tokenMint, recipient, gateway, milestoneAmounts, milestoneTimestamps, releaseCondition, memo, approvalAmount?, executeImmediately?, referralCode?, feePayer?): Promise<TransactionInstruction[]>`

`releaseCondition` is a bitmap: bit0=check due date, bit1=gateway signer, bit2=owner signer, bit3=recipient signer. Bits 1-3 mutually exclusive (use values 0, 1, 2, 4 for the signer bits).

```typescript
const ixs = await sdk.createMilestone(
  usdcMint,
  recipientPubkey,
  gatewayPda,
  [new BN("5000000"), new BN("10000000")], // milestone amounts
  [new BN(Date.now() / 1000), new BN(Date.now() / 1000 + 86400)], // timestamps
  2, // owner signer
  encodeMemo("Milestone deal")
);
```

#### `createPayAsYouGo(tokenMint, recipient, gateway, maxAmountPerPeriod, maxChunkAmount, periodLengthSeconds, memo, approvalAmount?, referralCode?, expiryDate?, feePayer?): Promise<TransactionInstruction[]>`

`expiryDate`: `null`/omitted = never expires (ADR-0024).

```typescript
const ixs = await sdk.createPayAsYouGo(
  usdcMint,
  recipientPubkey,
  gatewayPda,
  new BN("10000000"), // 10 USDC max per period
  new BN("1000000"), // 1 USDC max per chunk
  new BN(86400), // 1-day period
  encodeMemo("Pay as you go")
);
```

#### `createOneTimePayment(tokenMint, recipient, gateway, amount, memo, dueDate?, expiryDate?, approvalAmount?, referralCode?, feePayer?): Promise<TransactionInstruction[]>`

`dueDate`: `null`/`<=0` = immediate. `expiryDate`: `null` = never expires. Fires once, transitions to `Completed` (ADR-0019).

```typescript
const ixs = await sdk.createOneTimePayment(
  usdcMint,
  recipientPubkey,
  gatewayPda,
  new BN("5000000"), // 5 USDC
  encodeMemo("One-time payment")
);
```

#### `createUpToAuthorization(tokenMint, recipient, gateway, maxAmount, deadline, memo, validAfter?, approvalAmount?, referralCode?, feePayer?): Promise<TransactionInstruction[]>`

Single-use, time-bound variable-amount authorization. `deadline` MUST be > 0 and > `validAfter`. `validAfter`: `null`/`<=0` = immediate. The actual settled amount is caller-supplied at execute, bounded by `maxAmount` (ADR-0020).

```typescript
const deadline = new BN(Math.floor(Date.now() / 1000) + 86400);
const ixs = await sdk.createUpToAuthorization(
  usdcMint,
  recipientPubkey,
  gatewayPda,
  new BN("10000000"), // 10 USDC ceiling
  deadline,
  encodeMemo("Pay-for-use")
);
```

### Policy Creation (Instruction-Only)

Low-level variants return a single `TransactionInstruction`. Use when composing custom transaction layouts.

#### `getCreateSubscriptionPolicyInstruction(tokenMint, recipient, gateway, amount, autoRenew, maxRenewals, paymentFrequency, memo, startTime?, feePayer?): Promise<TransactionInstruction>`

#### `getCreatePayAsYouGoPolicyInstruction(tokenMint, recipient, gateway, maxAmountPerPeriod, maxChunkAmount, periodLengthSeconds, memo, expiryDate?, feePayer?): Promise<TransactionInstruction>`

#### `getCreateMilestonePolicyInstruction(tokenMint, recipient, gateway, milestoneAmounts, milestoneTimestamps, releaseCondition, memo, feePayer?): Promise<TransactionInstruction>`

#### `getCreateOneTimePolicyInstruction(tokenMint, recipient, gateway, amount, dueDate, expiryDate, memo, feePayer?): Promise<TransactionInstruction>`

#### `getCreateUpToPolicyInstruction(tokenMint, recipient, gateway, maxAmount, validAfter, deadline, memo, feePayer?): Promise<TransactionInstruction>`

### Payment Execution

#### `executePayment(paymentPolicyPda, paymentAmount?, recipient?, tokenMint?, gateway?, user?): Promise<TransactionInstruction[]>`

Permissionless — any gateway signer. Handles ATA creation and fee distribution.

```typescript
const execIxs = await sdk.executePayment(paymentPolicyPda);
```

For pay-as-you-go or upto policies, pass the actual amount:

```typescript
const execIxs = await sdk.executePayment(uptoPda, new BN("2500000")); // settle 2.5 USDC
```

#### `settleUpTo(paymentPolicyPda, actualAmount, recipient?, tokenMint?, gateway?, user?): Promise<TransactionInstruction[]>`

Thin wrapper over `executePayment`. `actualAmount` MAY be 0 (no usage → no charge, authorization consumed regardless).

#### `executeComposable(composablePolicy, instructionData, forwardAmount?, remainingAccounts?): Promise<TransactionInstruction>`

Execute a composable policy. `instructionData` is the forward program's instruction buffer. `remainingAccounts` contains Lighthouse target accounts + forward accounts (no leading ValidationPda entry — ADR-0016).

```typescript
const execIx = await sdk.executeComposable(
  composablePolicyPda,
  instructionData, // Buffer from forward program
  forwardAmount ?? null, // null if no forward
  remainingAccounts // [lighthouseTargets..., forwardAccounts...]
);
```

### Composable Policy

#### `getCreateComposablePolicyInstruction(tokenMint, recipient, gateway, policyType, memo, forwardConfig, preValidation?, prePinnedAccounts?, preValidationData?, postValidation?, postPinnedAccounts?, postValidationData?, feePayer?): Promise<TransactionInstruction>`

`forwardConfig.outputMint`:

- `== inputMint` + forward disabled → deliver-no-transform (same-mint topup)
- `!= inputMint` + forward enabled → deliver-transform (swap)
- `PublicKey.default` + forward enabled → act mode (no fungible output)

`preValidation` / `postValidation`:

- `{ disabled: {} }` — no validation (default)
- `{ programCall: { programId: LIGHTHOUSE } }` — Lighthouse assertion

`pinnedAccounts` — owner-declared Lighthouse target accounts (max 2).

```typescript
const ix = await sdk.getCreateComposablePolicyInstruction(
  tokenMint,
  recipient,
  gateway,
  policyType,
  "Auto topup guard",
  forwardConfig,
  { programCall: { programId: LIGHTHOUSE } }, // pre-validation
  [hotWalletUsdcAta], // pinned accounts
  guardData, // assertion bytes
  { disabled: {} }, // post-validation
  [], // no post pinned
  Buffer.alloc(0) // no post data
);
```

### Composable Management

#### `changeComposablePolicyStatus(tokenMint, policyId, newStatus): Promise<TransactionInstruction>`

#### `deleteComposablePolicy(tokenMint, policyId): Promise<TransactionInstruction>`

### Policy Management

#### `changePaymentPolicyStatus(tokenMint, policyId, newStatus): Promise<TransactionInstruction>`

Only Active ↔ Paused allowed. `completed` rejected on-chain.

#### `deletePaymentPolicy(tokenMint, policyId): Promise<TransactionInstruction>`

### Standalone Transfer

#### `transfer(tokenMint, recipient, gateway, amount, memo, referralCode?): Promise<TransactionInstruction[]>`

One-time SPL token transfer with fee distribution. Amount is GROSS (fees deducted from this).

```typescript
const ixs = await sdk.transfer(
  usdcMint,
  recipientPubkey,
  gatewayPda,
  new BN("5000000"),
  "Direct transfer",
  "ABC123" // optional referral code
);
```

### Utility Methods

#### `requiredDelegatedAmount(face, gateway, protocolShareBps?): BN`

Compute gross pull amount for a composable policy: `face + (face * feeBps / 10000)`.

#### `migrateDelegate(tokenMint, approvalAmount): Promise<TransactionInstruction[]>`

Migrate delegation from legacy global `PaymentsDelegate` PDA to per-user `UserPayment` PDA.

### PDA Helpers

```typescript
sdk.getConfigPda(): PdaResult;
sdk.getGatewayPda(gatewayAuthority: PublicKey): PdaResult;
sdk.getUserPaymentPda(user: PublicKey, tokenMint: PublicKey): PdaResult;
sdk.getPaymentPolicyPda(userPayment: PublicKey, policyId: number): PdaResult;
sdk.getComposablePolicyPda(userPayment: PublicKey, policyId: number): PdaResult;
sdk.getPaymentsDelegatePda(): PdaResult;  // deprecated
sdk.getPreValidationPda(composablePolicy: PublicKey): PdaResult;
sdk.getPostValidationPda(composablePolicy: PublicKey): PdaResult;
sdk.getReferralPda(gateway: PublicKey, referralCode: Buffer): PdaResult;
```

### Query Methods

```typescript
sdk.getAllPaymentPolicies(): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>>;
sdk.getAllPaymentGateway(): Promise<Array<{ publicKey: PublicKey; account: PaymentGateway }>>;
sdk.getAllUserPayments(): Promise<Array<{ publicKey: PublicKey; account: UserPayment }>>;
sdk.getAllUserPaymentsByOwner(owner: PublicKey): Promise<Array<{ publicKey: PublicKey; account: UserPayment }>>;
sdk.getPaymentPoliciesByUser(user: PublicKey): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>>;  // deprecated
sdk.getPaymentPoliciesByUserPayment(userPayment: PublicKey): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>>;
sdk.getPaymentPoliciesByRecipient(user: PublicKey): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>>;
sdk.getPaymentPoliciesByGateway(gateway: PublicKey): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>>;
sdk.getPaymentPoliciesByGatewayOwnerAndMint(walletPublicKey: PublicKey, tokenMint: PublicKey, gateway: PublicKey): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>>;
sdk.getUserPayment(userPaymentAddress: PublicKey): Promise<UserPayment | null>;
sdk.getProgramConfig(configAddress: PublicKey): Promise<ProgramConfig | null>;
sdk.getPaymentGateway(gatewayAddress: PublicKey): Promise<PaymentGateway | null>;
sdk.getPaymentPolicy(policyAddress: PublicKey): Promise<PaymentPolicy | null>;
sdk.getReferralAccountByOwner(gateway: PublicKey, owner: PublicKey): Promise<ReferralAccount | null>;
sdk.getReferralAccountAddressByOwner(gateway: PublicKey, owner: PublicKey): Promise<{ publicKey: PublicKey; account: ReferralAccount } | null>;
sdk.getReferralAccount(referralAccountAddress: PublicKey): Promise<ReferralAccount | null>;
sdk.getReferralAccountByCode(gateway: PublicKey, code: string): Promise<ReferralAccount | null>;
sdk.getReferralChain(user: PublicKey, gateway: PublicKey): Promise<(PublicKey | null)[]>;
```

### Referral Management

```typescript
sdk.createReferralAccount(gateway: PublicKey, referralCode: string, referrer?: PublicKey, feePayer?: PublicKey): Promise<TransactionInstruction>;
sdk.validateReferralCode(code: string): boolean;
```

### Transaction Confirmation

```typescript
sdk.confirmTransactionWithStatus(
  signature: TransactionSignature,
  commitment?: "processed" | "confirmed" | "finalized",
  interval?: number,  // ms, default 150
  timeout?: number,   // ms, default 60000
): Promise<SignatureStatus>;
```

### Utility Functions (standalone)

```typescript
import {
  encodeMemo, // (memo: string, size?: number) => number[]
  createMemoBuffer, // alias for encodeMemo
  decodeMemo, // (buffer: number[]) => string
  getPaymentFrequency, // (frequency: PaymentFrequencyString, customIntervalSeconds?: number) => PaymentFrequency
  computePaymentsPerYear, // (frequency: PaymentFrequency) => number
  generateSecureRandomString, // (length?: number) => string
  getTokenMetadata, // (connection, mintAddress) => Promise<Metadata | null>
  getTokenSymbol, // (connection, mintAddress) => Promise<string | null>
  getTokenDecimals, // (connection, mintAddress) => Promise<number | null>
} from "@tributary-so/sdk";
```

`PaymentFrequencyString`: `"daily" | "weekly" | "monthly" | "quarterly" | "semiAnnually" | "annually" | "custom"`

### Lighthouse Facade

```typescript
import { lighthouse, LIGHTHOUSE_PROGRAM_ID } from "@tributary-so/sdk";

// Build an assertion
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<") // balance < 50 USDC
  .build();

// guard.data        → Buffer (store in ValidationPda)
// guard.numAccounts → 1
// guard.accounts    → [hotWalletUsdcAta]
```

### Types

```typescript
type PolicyType = IdlTypes<Tributary>["policyType"];
// Variants: { subscription: {...} } | { milestone: {...} } | { payAsYouGo: {...} } | { oneTime: {...} } | { upTo: {...} }

type PaymentFrequency = IdlTypes<Tributary>["paymentFrequency"];
// Variants: { daily: {} } | { weekly: {} } | { monthly: {} } | { quarterly: {} } | { semiAnnually: {} } | { annually: {} } | { custom: { 0: BN } }

type PolicyStatus = IdlTypes<Tributary>["policyStatus"];
// Variants: { active: {} } | { paused: {} } | { completed: {} }

type PaymentGateway = IdlAccounts<Tributary>["paymentGateway"];
type UserPayment = IdlAccounts<Tributary>["userPayment"];
type PaymentPolicy = IdlAccounts<Tributary>["paymentPolicy"];
type ComposablePolicy = IdlAccounts<Tributary>["composablePolicy"];
type ProgramConfig = IdlAccounts<Tributary>["programConfig"];
type ReferralAccount = IdlAccounts<Tributary>["referralAccount"];
type ForwardConfig = IdlTypes<Tributary>["forwardConfig"];
type ValidationSpec = IdlTypes<Tributary>["validationSpec"];

interface PdaResult {
  address: PublicKey;
  bump: number;
}

interface ValidationPdaAccount {
  bump: number;
  numPinnedAccounts: number;
  pinnedAccounts: PublicKey[];
  dataLen: number;
  data: Buffer;
}

function parseValidationPda(data: Buffer): ValidationPdaAccount;
function parseValidationPdaData(data: Buffer): Buffer;
```

---

## 3. React Integration (`@tributary-so/sdk-react`)

### Exports

```typescript
export * from "./hooks"; // useTributarySDK, useCreateSubscription, useCreateMilestone, useCreatePayAsYouGo, useCreateOneTime, useCreateUpTo
export * from "./types"; // PaymentInterval, Create*Params, Create*Result
export { SubscriptionButton } from "./components/SubscriptionButton";
export { SubscriptionButtonWithCode } from "./components/SubscriptionWithCodeButton";
export { MilestoneButton } from "./components/MilestoneButton";
export { PayAsYouGoButton } from "./components/PayAsYouGoButton";
export { OneTimeButton } from "./components/OneTimeButton";
export { UpToButton } from "./components/UpToButton";
export { issuePolicyToken } from "./helpers/issuePolicyToken";
export type {
  IssuePolicyTokenParams,
  IssuePolicyTokenResult,
} from "./helpers/issuePolicyToken";
```

### `useTributarySDK`

```typescript
import { useTributarySDK } from "@tributary-so/sdk-react";

const sdk = useTributarySDK(); // Tributary | null
```

Returns `Tributary | null`. Wraps `useConnection` + `useWallet` from `@solana/wallet-adapter-react`.

### `useCreateSubscription`

```typescript
import { useCreateSubscription } from "@tributary-so/sdk-react";

const { createSubscription, loading, error } = useCreateSubscription();

const result = await createSubscription({
  amount: new BN("1000000"),
  token: usdcMint,
  recipient: recipientPubkey,
  gateway: gatewayPda,
  interval: PaymentInterval.Monthly,
  maxRenewals: 12,
  memo: "Pro plan",
  approvalAmount: new BN("12000000"), // optional
  executeImmediately: false, // optional
});
// result.txId, result.instructions, result.token
```

**`CreateSubscriptionParams`:**

```typescript
interface CreateSubscriptionParams {
  amount: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  interval: PaymentInterval;
  custom_interval?: number; // seconds, required when interval = Custom
  maxRenewals?: number;
  memo?: string;
  startTime?: Date;
  approvalAmount?: BN;
  executeImmediately?: boolean;
  fetchToken?: boolean;
  tokenIssuerConfig?: TokenIssuerConfig;
}
```

**`PaymentInterval` enum:**

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

### Other Hooks

All follow the same pattern:

```typescript
const { createMilestone, loading, error } = useCreateMilestone();
const { createPayAsYouGo, loading, error } = useCreatePayAsYouGo();
const { createOneTime, loading, error } = useCreateOneTime();
const { createUpTo, loading, error } = useCreateUpTo();
```

**`CreateMilestoneParams`:**

```typescript
interface CreateMilestoneParams {
  milestoneAmounts: BN[];
  milestoneTimestamps: BN[];
  releaseCondition: number; // 0=time, 1=manual, 2=automatic
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  memo?: string;
  approvalAmount?: BN;
  executeImmediately?: boolean;
}
```

**`CreatePayAsYouGoParams`:**

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

**`CreateOneTimeParams`:**

```typescript
interface CreateOneTimeParams {
  amount: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  memo?: string;
  dueDate?: BN | null;
  expiryDate?: BN | null;
  approvalAmount?: BN;
}
```

**`CreateUpToParams`:**

```typescript
interface CreateUpToParams {
  maxAmount: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  deadline: BN; // mandatory, > 0
  validAfter?: BN | null;
  memo?: string;
  approvalAmount?: BN;
}
```

### Components

All button components accept the same props pattern:

```typescript
interface SubscriptionButtonProps {
  amount: BN;
  recipient: PublicKey;
  gateway: PublicKey;
  token: PublicKey;
  interval: PaymentInterval;
  maxRenewals?: number;
  memo?: string;
  approvalAmount?: BN;
  // ... event handlers and UI customization
}
```

```tsx
import { SubscriptionButton } from "@tributary-so/sdk-react";

<SubscriptionButton
  amount={new BN("1000000")}
  recipient={recipientPubkey}
  gateway={gatewayPda}
  token={usdcMint}
  interval={PaymentInterval.Monthly}
  maxRenewals={12}
  memo="Pro plan"
/>;
```

Available components: `SubscriptionButton`, `SubscriptionButtonWithCode`, `MilestoneButton`, `PayAsYouGoButton`, `OneTimeButton`, `UpToButton`.

---

## 4. x402 Integration (`@tributary-so/sdk-x402`)

### Express Middleware

```typescript
import { createX402Middleware } from "@tributary-so/sdk-x402";

app.use(
  "/api/premium",
  createX402Middleware({
    amount: 1000000, // 1 USDC
    tokenMint: "USDC_MINT",
    recipient: "RECIPIENT_PUBKEY",
    gateway: "GATEWAY_PDA",
    scheme: "deferred", // or "x402://payg", "x402://prepaid", "x402://upto"
  })
);
```

### `createX402Middleware(options)`

```typescript
function createX402Middleware(options: {
  amount: number;
  tokenMint: string;
  recipient: string;
  gateway: string;
  scheme: X402Scheme;
}): RequestHandler;
```

### X402 Schemes

| Scheme           | Type          | Description                              |
| ---------------- | ------------- | ---------------------------------------- |
| `deferred`       | Subscription  | Fixed amount per period                  |
| `x402://payg`    | Pay-as-you-go | Usage-based with period cap              |
| `x402://prepaid` | Prepaid       | Pre-funded balance                       |
| `x402://upto`    | UpTo          | Single-use variable-amount authorization |

### X402 Types

```typescript
interface X402PaymentRequirements {
  amount: number;
  tokenMint: string;
  recipient: string;
  gateway: string;
  scheme: X402Scheme;
}

interface X402PaymentReceipt {
  txSignature: string;
  amount: number;
  tokenMint: string;
  recipient: string;
  timestamp: number;
}
```

### UpTo Authorization (verify + settle flow)

```typescript
import { verifyUpToAuthorization, settleUpTo } from "@tributary-so/sdk-x402";

// Verify phase (after client creates UpTo policy on-chain)
const result = await verifyUpToAuthorization(
  sdk,
  userPublicKey,
  expectedMaxAmount,
  expectedTokenMint,
  expectedGateway,
  expectedRecipient
);
// result.success, result.policyAddress

// Settle phase (after resource consumption)
const settleIxs = await settleUpTo(sdk, policyPda, actualAmount);
```

### Metering

#### `TokenMeter`

Track token usage against policy limits.

```typescript
import { TokenMeter } from "@tributary-so/sdk-x402";

const meter = new TokenMeter({
  maxAmountPerPeriod: new BN("10000000"),
  periodLengthSeconds: new BN(86400),
});

meter.record(new BN("500000")); // record 0.5 USDC usage
meter.canConsume(new BN("500000")); // check if 0.5 USDC is within limit
```

#### `ComputeMeter`

Track compute unit usage.

```typescript
import { ComputeMeter } from "@tributary-so/sdk-x402";

const meter = new ComputeMeter({
  maxComputeUnits: 1_000_000,
  periodLengthSeconds: new BN(86400),
});
```

#### `UsageTracker`

Aggregate usage across multiple resources.

```typescript
import { UsageTracker } from "@tributary-so/sdk-x402";

const tracker = new UsageTracker();
tracker.record("requests", 1);
tracker.record("tokens.in", 1500);
tracker.record("compute.units", 50000);
```

**Metering resource types:** `requests`, `tokens.in`, `tokens.out`, `compute.units`, `time.ms`, `bytes.in`, `bytes.out`, `storage.bytes`, `credits`, `gpu.ms`, `embedding.dims`.

---

## 5. Payments (`@tributary-so/payments`)

### `PaymentsClient`

Facade for checkout, policies, and tracking.

```typescript
import { PaymentsClient } from "@tributary-so/payments";

const client = new PaymentsClient({
  apiUrl: "https://api.tributary.so",
  apiKey: "your-api-key",
});

// Namespaces
client.policies; // policy management
client.checkout; // checkout sessions
client.tracking; // payment tracking
```

### Checkout Sessions

#### `encodeSession(session)`

Create a base64url-encoded checkout blob URL.

```typescript
import { CheckoutSessionManager } from "@tributary-so/payments";

const manager = new CheckoutSessionManager();

// Subscription checkout
const url = manager.encodeSession({
  type: "subscription",
  amount: 1000000,
  tokenMint: usdcMint.toString(),
  recipient: recipientPubkey.toString(),
  gateway: gatewayPda.toString(),
  interval: "monthly",
  maxRenewals: 12,
  memo: "Pro plan",
});
// Returns: "https://tributary.so/pay?session=<base64url>"
```

#### `decodeSession(blob)`

Decode a checkout blob back to session params.

```typescript
const session = manager.decodeSession(blob);
// session.type discriminates the shape
```

### Session Types

```typescript
type TributaryConfigVariant =
  | SubscriptionParams
  | OneTimeParams
  | MilestoneParams
  | PayAsYouGoParams
  | UpToParams
  | PaymentParams;

interface SubscriptionParams {
  type: "subscription";
  amount: number;
  tokenMint: string;
  recipient: string;
  gateway: string;
  interval: string;
  maxRenewals?: number;
  memo?: string;
}

interface OneTimeParams {
  type: "oneTime";
  amount: number;
  tokenMint: string;
  recipient: string;
  gateway: string;
  memo?: string;
  dueDate?: number;
  expiryDate?: number;
}

interface MilestoneParams {
  type: "milestone";
  amounts: number[];
  timestamps: number[];
  releaseCondition: number;
  tokenMint: string;
  recipient: string;
  gateway: string;
  memo?: string;
}

interface PayAsYouGoParams {
  type: "payAsYouGo";
  maxAmountPerPeriod: number;
  maxChunkAmount: number;
  periodLengthSeconds: number;
  tokenMint: string;
  recipient: string;
  gateway: string;
  memo?: string;
}

interface UpToParams {
  type: "upTo";
  maxAmount: number;
  tokenMint: string;
  recipient: string;
  gateway: string;
  deadline: number;
  validAfter?: number;
  memo?: string;
}

interface PaymentParams {
  type: "payment";
  amount: number;
  tokenMint: string;
  recipient: string;
  gateway: string;
  memo?: string;
}
```

### Cluster Config

```typescript
type Cluster = "mainnet-beta" | "devnet" | "testnet";
```

### Verification

#### `VerificationUtils.verifyPayment(jwt, jwksUri?)`

Verify a Tributary payment JWT. JWKS defaults to `https://api.tributary.so/.well-known/jwks.json`.

```typescript
import { VerificationUtils } from "@tributary-so/payments";

const payload = await VerificationUtils.verifyPayment(jwt);
// payload contains: sub, iss, iat, exp, policyClaim, ...
```

#### `VerificationUtils.verifyPolicy(claims)`

Verify policy claims from a JWT. Supports all 5 policy variants:

```typescript
interface PolicyClaim {
  type: "subscription" | "milestone" | "payAsYouGo" | "oneTime" | "upTo";
  policyPda: string;
  // variant-specific fields
}
```

---

## 6. Recipes

### Recipe: Full Subscription Setup (Client)

```typescript
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { Tributary, getPaymentFrequency, encodeMemo } from "@tributary-so/sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const wallet = Keypair.generate(); // user's wallet
const sdk = new Tributary(connection, wallet);

const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const recipient = new PublicKey("RecipientPubkeyHere");
const gateway = new PublicKey("GatewayPdaHere");

// 1. Create subscription (handles ATA + UserPayment + Policy + Approval)
const ixs = await sdk.createSubscription(
  usdcMint,
  recipient,
  gateway,
  new BN("1000000"), // 1 USDC
  true, // auto-renew
  12, // max renewals
  getPaymentFrequency("monthly"),
  encodeMemo("Pro plan")
);

// 2. Build, sign, send transaction
const tx = new Transaction().add(...ixs);
const sig = await wallet.signTransaction(tx);
await connection.sendRawTransaction(sig.serialize());
```

### Recipe: React Subscription Button

```tsx
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";
import { BN } from "bn.js";
import { PublicKey } from "@solana/web3.js";

function App() {
  const usdcMint = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );
  const recipient = new PublicKey("RecipientPubkeyHere");
  const gateway = new PublicKey("GatewayPdaHere");

  return (
    <SubscriptionButton
      amount={new BN("1000000")}
      recipient={recipient}
      gateway={gateway}
      token={usdcMint}
      interval={PaymentInterval.Monthly}
      maxRenewals={12}
      memo="Pro plan"
    />
  );
}
```

### Recipe: Express x402 Middleware

```typescript
import express from "express";
import { createX402Middleware } from "@tributary-so/sdk-x402";

const app = express();

app.use(
  "/api/premium",
  createX402Middleware({
    amount: 1000000,
    tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    recipient: "RecipientPubkeyHere",
    gateway: "GatewayPdaHere",
    scheme: "deferred",
  })
);

app.get("/api/premium/data", (req, res) => {
  res.json({ data: "premium content" });
});
```

### Recipe: UpTo Authorization (Facilitator)

```typescript
import { verifyUpToAuthorization, settleUpTo } from "@tributary-so/sdk-x402";

// Client creates UpTo policy on-chain, facilitator verifies
const verifyResult = await verifyUpToAuthorization(
  sdk,
  userPublicKey,
  10_000_000, // expected ceiling (10 USDC)
  usdcMint,
  gatewayPda,
  recipientPubkey
);

if (!verifyResult.success) {
  throw new Error(verifyResult.error);
}

// After usage, settle with actual amount
const settleIxs = await settleUpTo(sdk, verifyResult.policyAddress, 2_500_000); // settle 2.5 USDC
```

### Recipe: Checkout Session (Payment Link)

```typescript
import { CheckoutSessionManager } from "@tributary-so/payments";

const manager = new CheckoutSessionManager();

// Encode subscription checkout
const url = manager.encodeSession({
  type: "subscription",
  amount: 1000000,
  tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  recipient: "RecipientPubkeyHere",
  gateway: "GatewayPdaHere",
  interval: "monthly",
  maxRenewals: 12,
  memo: "Pro plan",
});

// Share this URL — it opens a checkout page
console.log(url);
```

### Recipe: Composable Policy with Lighthouse Guard

```typescript
import {
  Tributary,
  lighthouse,
  LIGHTHOUSE_PROGRAM_ID,
} from "@tributary-so/sdk";

// 1. Build assertion: hot wallet USDC balance < 50
const hotWalletAta = new PublicKey("HotWalletUsdcAta");
const guard = lighthouse
  .tokenAccount(hotWalletAta)
  .amount(50_000_000, "<")
  .build();

// 2. Create composable policy
const ix = await sdk.getCreateComposablePolicyInstruction(
  usdcMint,
  recipient,
  gateway,
  policyType, // subscription/milestone/payAsYouGo
  "Auto topup guard",
  forwardConfig, // outputMint = PublicKey.default for act mode
  { programCall: { programId: LIGHTHOUSE_PROGRAM_ID } }, // pre-validation
  [hotWalletAta], // pinned accounts
  guard.data, // assertion bytes
  { disabled: {} }, // no post-validation
  [],
  Buffer.alloc(0)
);

// 3. Execute (permissionless)
const execIx = await sdk.executeComposable(
  composablePolicyPda,
  forwardInstructionData,
  null, // no forward amount
  [hotWalletAta] // remaining accounts (Lighthouse targets)
);
```

### Recipe: Query All Policies for a User

```typescript
// Get all UserPayment accounts for a user
const userPayments = await sdk.getAllUserPaymentsByOwner(userPubkey);

for (const { account: userPayment } of userPayments) {
  // Get all policies for this UserPayment
  const policies = await sdk.getPaymentPoliciesByUserPayment(
    userPayment.owner // use the PDA address, not owner
  );

  for (const { publicKey, account: policy } of policies) {
    console.log(`Policy: ${publicKey.toBase58()}`);
    console.log(`  Type: ${Object.keys(policy.policyType)[0]}`);
    console.log(`  Status: ${Object.keys(policy.status)[0]}`);
    console.log(`  Recipient: ${policy.recipient.toBase58()}`);
  }
}
```

---

_Source: packages/sdk, packages/sdk-react, packages/sdk-x402, packages/payments. All API signatures verified against source code._
