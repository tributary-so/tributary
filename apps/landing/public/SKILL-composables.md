# ComposablePolicy Guide

## 1. Overview

ComposablePolicy extends the pull-payment model of PaymentPolicy with two optional hooks that execute during the payment lifecycle:

1. **Validation** — a read-only assertion CPI (Lighthouse) that vetoes the transaction if on-chain state does not meet a defined condition.
2. **Forward** — a token-transform CPI (Meteora DLMM) that swaps the pulled input token into an output token before delivering to the recipient.

Both hooks are opt-in via sentinel values (`Pubkey::default` / `SystemProgram`). A composable policy with both disabled behaves identically to a PaymentPolicy but uses a separate PDA namespace and an intermediate ATA hop.

ComposablePolicy shares the same `PolicyType` enum as PaymentPolicy:

- Subscription
- Milestone
- PayAsYouGo
- OneTime
- UpTo

ComposablePolicy is a distinct account type with its own PDA seeds and independent counter. A regular PaymentPolicy #1 and a ComposablePolicy #1 can coexist on the same UserPayment account.

### Fee model

Composable fees are input-side (ADR-0026): protocol and gateway fees are skimmed from the gross pull in `input_mint` before the forward runs. The delegate approval on the user's token account must cover `face + total_fee` (NET-on-pull, hardcoded).

### Settlement shapes (ADR-0026)

| Shape                | output_mint         | forward  | deliver sweep                           | >0 guard |
| -------------------- | ------------------- | -------- | --------------------------------------- | -------- |
| deliver-no-transform | `== input_mint`     | disabled | sweep `intermediate_input` → recipient  | yes      |
| deliver-transform    | `!= input_mint`     | enabled  | sweep `intermediate_output` → recipient | yes      |
| act mode             | `Pubkey::default()` | enabled  | none                                    | no       |

---

## 2. Anatomy of a Composable

This section walks through two complete lifecycles: a same-mint topup (forward disabled) and a cross-mint swap (forward enabled).

### 2.1 Same-mint topup (forward disabled)

Source: `tests/topup-balance.test.ts`

```typescript
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  Tributary as TributarySDK,
  lighthouse,
  LIGHTHOUSE_PROGRAM_ID,
} from "@tributary-so/sdk";
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getComposablePolicyPda,
  getPreValidationPda,
  getPostValidationPda,
  getPaymentsDelegatePda,
} from "@tributary-so/sdk/pda";

// ── 1. Derive PDAs ──────────────────────────────────────────────────────
const userPaymentPDA = getUserPaymentPda(user, USDC_MINT, programId).address;
const composablePolicyId = (userPayment.createdComposableCount ?? 0) + 1;

const composablePolicyPDA = getComposablePolicyPda(
  userPaymentPDA,
  composablePolicyId,
  programId
).address;

const preValidationPDA = getPreValidationPda(
  composablePolicyPDA,
  programId
).address;

const postValidationPDA = getPostValidationPda(
  composablePolicyPDA,
  programId
).address;

// ── 2. Build ForwardConfig (forward disabled) ───────────────────────────
// Sentinel: programId = PublicKey.default disables the forward step.
// outputMint == inputMint → deliver-no-transform (same-mint topup).
const forwardConfig = {
  inputMint: USDC_MINT,
  outputMint: USDC_MINT, // same mint = no swap
  forwardFlags: 0,
  instructionConstraint: {
    programId: PublicKey.default, // sentinel: forward disabled
    numDataChecks: 0, // no forward data to validate
    dataChecks: [
      { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
      { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
      { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
      { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
    ],
    numPinnedAccounts: 0,
    pinnedAccounts: [
      PublicKey.default,
      PublicKey.default,
      PublicKey.default,
      PublicKey.default,
    ],
  },
};

// ── 3. Build ValidationSpec ─────────────────────────────────────────────
// Pre-validation: Lighthouse assertion (hotWallet USDC balance < 50 USDC).
// Post-validation: disabled.
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<")
  .build();

// Helper: convert ValidationSpec to on-chain format
const DISABLED_SPEC = { disabled: {} };
const DISABLED_INIT = {
  numPinnedAccounts: 0,
  pinnedAccounts: [PublicKey.default, PublicKey.default],
  validationData: Buffer.alloc(0),
};

// ── 4. Create composable policy ─────────────────────────────────────────
const ix = await sdk.getCreateComposablePolicyInstruction(
  USDC_MINT, // tokenMint
  hotWallet.publicKey, // recipient
  gatewayPDA, // gateway
  policyType, // PolicyType (PayAsYouGo in this example)
  "Topup balance", // memo
  forwardConfig, // ForwardConfig
  { programCall: { programId: LIGHTHOUSE_PUBKEY } }, // preValidation
  [guard.accounts[0].pubkey], // prePinnedAccounts
  guard.data, // preValidationData
  DISABLED_SPEC, // postValidation
  [], // postPinnedAccounts
  Buffer.alloc(0) // postValidationData
);

// ── 5. Approve delegate ─────────────────────────────────────────────────
// The delegate must be the UserPayment PDA. Approval must cover
// face + total_fee (gross amount).
await creditTokenAccount(user.publicKey, 1_000_000_000, {
  delegate: userPaymentPDA,
  delegatedAmount: 1_000_000_000,
});

// ── 6. Execute composable ───────────────────────────────────────────────
// Forward disabled: instructionData is an empty buffer.
const instructionData = Buffer.alloc(0);

// Intermediate ATAs owned by ComposablePolicy PDA (not UserPayment PDA).
const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
  USDC_MINT,
  composablePolicyPDA,
  true // allowOwnerOffCurve (PDA)
);
// Same-mint topup: output intermediate == input intermediate.
const intermediateOutputTokenAccount = intermediateInputTokenAccount;

// remaining_accounts: Lighthouse target accounts only (no forward accounts).
const remainingAccounts = [
  { pubkey: hotWalletUsdcAta, isSigner: false, isWritable: false },
];

const execIx = await program.methods
  .executeComposable(instructionData, new anchor.BN(50_000_000))
  .accountsStrict({
    feePayer: coldWallet.publicKey,
    paymentsDelegate: paymentsDelegatePDA,
    composablePolicy: composablePolicyPDA,
    userPayment: userPaymentPDA,
    gateway: gatewayPDA,
    config: configPDA,
    preValidationProgram: LIGHTHOUSE_PUBKEY,
    postValidationProgram: SystemProgram.programId,
    preValidationPda: preValidationPDA,
    postValidationPda: postValidationPDA,
    userTokenAccount: coldWalletUsdcAta,
    mint: USDC_MINT,
    outputMint: USDC_MINT,
    intermediateInputTokenAccount,
    intermediateOutputTokenAccount,
    recipientTokenAccount: hotWalletUsdcAta,
    gatewayFeeAccount: feeRecipientUsdcAta,
    protocolFeeAccount: adminUsdcAta,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .remainingAccounts(remainingAccounts)
  .instruction();

// ── 7. Assert settlement ────────────────────────────────────────────────
const policy = await program.account.composablePolicy.fetch(
  composablePolicyPDA
);
expect(policy.totalInput.toNumber()).toBe(50_000_000);
expect(policy.paymentCount).toBe(1);
```

### 2.2 Cross-mint swap (forward enabled)

Source: `tests/topup-balance-swap.test.ts`

```typescript
import { NATIVE_MINT } from "@solana/spl-token";
import { METEORA_DLMM_PUBKEY } from "./constants";

// ── 1. Build ForwardConfig (forward enabled) ────────────────────────────
// programId = Meteora DLMM (allowlisted).
// numDataChecks > 0: pins the swap instruction discriminator.
// numPinnedAccounts > 0: pins the first forward account (lbPair).
// outputMint != inputMint → deliver-transform (swap).
const forwardConfig = {
  inputMint: USDC_MINT,
  outputMint: NATIVE_MINT, // WSOL — distinct from input
  forwardFlags: 0,
  instructionConstraint: {
    programId: METEORA_DLMM_PUBKEY,
    numDataChecks: 1,
    dataChecks: [
      { offset: 0, length: 8, expected: discriminator }, // swap selector
      { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
      { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
      { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
    ],
    numPinnedAccounts: 1,
    pinnedAccounts: [
      swapIx.keys[0].pubkey, // lbPair — first forward account
      PublicKey.default,
      PublicKey.default,
      PublicKey.default,
    ],
  },
};

// ── 2. Execute with forward ─────────────────────────────────────────────
// Two distinct intermediates (input_mint != output_mint), both owned by
// ComposablePolicy PDA.
const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
  USDC_MINT,
  composablePolicyPDA,
  true,
  TOKEN_PROGRAM_ID
);
const intermediateOutputTokenAccount = getAssociatedTokenAddressSync(
  NATIVE_MINT,
  composablePolicyPDA,
  true,
  TOKEN_PROGRAM_ID
);

// Forward accounts: DLMM swap instruction keys.
const forwardAccounts = swapIx.keys.map((k) => ({
  pubkey: k.pubkey,
  isSigner: false,
  isWritable: true,
}));

// remaining_accounts = [...lighthouseTargets, ...forwardAccounts]
const remainingAccounts = [
  { pubkey: hotWalletWsolAta, isSigner: false, isWritable: false },
  ...forwardAccounts,
];

const execIx = await program.methods
  .executeComposable(swapIx.data, new anchor.BN(SWAP_INPUT_AMOUNT))
  .accountsStrict({
    feePayer: coldWallet.publicKey,
    paymentsDelegate: paymentsDelegatePDA,
    composablePolicy: composablePolicyPDA,
    userPayment: userPaymentPDA,
    gateway: gatewayPDA,
    config: configPDA,
    preValidationProgram: LIGHTHOUSE_PUBKEY,
    postValidationProgram: SystemProgram.programId,
    preValidationPda: preValidationPDA,
    postValidationPda: postValidationPDA,
    userTokenAccount: coldWalletUsdcAta,
    mint: USDC_MINT,
    outputMint: NATIVE_MINT,
    intermediateInputTokenAccount,
    intermediateOutputTokenAccount,
    recipientTokenAccount: hotWalletWsolAta,
    gatewayFeeAccount: feeRecipientUsdcAta,
    protocolFeeAccount: adminUsdcAta,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .remainingAccounts(remainingAccounts)
  .instruction();
```

---

## 3. ForwardConfig Reference

```typescript
interface ForwardConfig {
  instructionConstraint: InstructionConstraint;
  inputMint: PublicKey;
  outputMint: PublicKey;
  forwardFlags: number; // currently 0, reserved
}
```

### output_mint semantics (ADR-0026)

| output_mint         | forward programId     | Settlement shape     | Description                                                                                                          |
| ------------------- | --------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `== input_mint`     | `PublicKey.default()` | deliver-no-transform | Same-mint topup. Pull → sweep intermediate directly to recipient. No swap.                                           |
| `!= input_mint`     | allowlisted program   | deliver-transform    | Cross-mint swap. Pull → forward swaps → sweep output to recipient.                                                   |
| `Pubkey::default()` | allowlisted program   | act mode             | No fungible output. Forward consumes input; no output ATA, no deliver sweep, no `>0` guard. E.g. subaccount deposit. |

### InstructionConstraint

```typescript
interface InstructionConstraint {
  programId: PublicKey; // must be in ALLOWED_FORWARD_PROGRAMS
  numDataChecks: number; // 0–4, must be >0 when forward enabled
  dataChecks: ByteRangeCheck[4]; // fixed-size array, 4 slots
  numPinnedAccounts: number; // 0–4
  pinnedAccounts: PublicKey[4]; // fixed-size array, 4 slots
}

interface ByteRangeCheck {
  offset: number; // byte offset into instruction data
  length: number; // 0–8 bytes to compare
  expected: number[]; // 8-byte array (padded)
}
```

**Constraints:**

- `programId` must be in `ALLOWED_FORWARD_PROGRAMS`. Currently: Meteora DLMM (`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`). `Pubkey::default()` disables the forward step entirely.
- When forward is enabled, `numDataChecks` must be > 0 (degenerate-pin guard: zero effective pins rejected at create).
- Each `ByteRangeCheck.length` must be ≤ 8.
- Unused slots: set `offset: 0, length: 0, expected: [0; 8]` and `pinnedAccounts` slot to `PublicKey.default`.
- `pinnedAccounts[0]` corresponds to `remaining_accounts[fwd_base]` at execute time, where `fwd_base = number_of_lighthouse_target_accounts`.

### Allowlisted forward programs

| Program      | Address                                       |
| ------------ | --------------------------------------------- |
| Meteora DLMM | `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo` |

---

## 4. ValidationSpec Reference

Each composable policy carries two independent validation configurations:

- `pre_validation` — runs after PULL, before FORWARD
- `post_validation` — runs after FORWARD, before SETTLE

Each has its own `ValidationPda` account storing assertion data (≤ 1024 bytes) and owner-pinned target accounts.

### PDA derivation

```typescript
import {
  getPreValidationPda,
  getPostValidationPda,
} from "@tributary-so/sdk/pda";

const preValidationPDA = getPreValidationPda(composablePolicyPDA, programId);
const postValidationPDA = getPostValidationPda(composablePolicyPDA, programId);
```

Seeds:

- Pre: `["composable_validation_pre", composablePolicy]`
- Post: `["composable_validation_post", composablePolicy]`

### ValidationSpec variants

```typescript
type ValidationSpec =
  | { disabled: {} }
  | { programCall: { programId: PublicKey } };
```

| Variant     | Account value             | Behavior                                                                                                                            |
| ----------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Disabled    | `SystemProgram.programId` | No validation CPI. ValidationPda is not created.                                                                                    |
| ProgramCall | allowlisted program ID    | CPI into the validation program with assertion data from the ValidationPda. Fails the tx if the assertion does not hold. Read-only. |
| Inline      | —                         | Not implemented. Errors at create.                                                                                                  |

### Allowlisted validation programs

| Program    | Address                                       |
| ---------- | --------------------------------------------- |
| Lighthouse | `L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95` |

### ValidationPda layout

The ValidationPda account stores:

- `bump` (u8)
- `num_pinned_accounts` (u8) — owner-declared target accounts
- `pinned_accounts` ([Pubkey; 2]) — positional, replay-validated at execute
- `data_len` (u16)
- `data` (Vec<u8>) — serialized Lighthouse assertion (≤ 1024 bytes)

Parse via `parseValidationPda` from `@tributary-so/sdk`:

```typescript
import { parseValidationPda } from "@tributary-so/sdk";

const accountInfo = await connection.getAccountInfo(preValidationPDA);
const parsed = parseValidationPda(accountInfo.data);
// parsed.numPinnedAccounts, parsed.dataLen, parsed.data
```

---

## 5. Lighthouse Facade Reference

Import path: `@tributary-so/sdk`

```typescript
import { lighthouse, LIGHTHOUSE_PROGRAM_ID } from "@tributary-so/sdk";
```

The `lighthouse` object is the entry point. Each method returns a fluent builder. Call `.build()` to produce a `LighthouseAssertion`:

```typescript
interface LighthouseAssertion {
  data: Buffer; // serialized Lighthouse instruction data
  numAccounts: number; // number of target accounts
  accounts: AccountMeta[]; // ordered target accounts (read-only)
}
```

### 5.1 tokenAccount

Asserts fields of an SPL token account.

```typescript
lighthouse.tokenAccount(target: PublicKey): TokenAccountBuilder
```

**Methods:**

| Method                              | Operator type     | Description                                           |
| ----------------------------------- | ----------------- | ----------------------------------------------------- |
| `.amount(value, operator)`          | IntegerOperator   | Token balance                                         |
| `.mint(value, operator?)`           | EquatableOperator | Token mint (default `==`)                             |
| `.owner(value, operator?)`          | EquatableOperator | Account owner (default `==`)                          |
| `.delegate(value, operator?)`       | EquatableOperator | Delegate (null = no delegate, default `==`)           |
| `.state(value, operator)`           | IntegerOperator   | 1 = initialized, 2 = frozen                           |
| `.isNative(value, operator?)`       | EquatableOperator | Native SOL wrapping (null = not native, default `==`) |
| `.delegatedAmount(value, operator)` | IntegerOperator   | Delegated amount                                      |
| `.closeAuthority(value, operator?)` | EquatableOperator | Close authority (null = none, default `==`)           |
| `.ownerIsDerived()`                 | —                 | Assert owner is the derived ATA owner                 |

**Examples:**

```typescript
// Single assertion
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<")
  .build();

// Multi-assertion (saves space + compute)
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<")
  .state(2, "!=") // not frozen
  .build();
```

### 5.2 mintAccount

Asserts fields of an SPL mint account.

```typescript
lighthouse.mintAccount(target: PublicKey): MintAccountBuilder
```

**Methods:**

| Method                               | Operator type     | Description                                  |
| ------------------------------------ | ----------------- | -------------------------------------------- |
| `.mintAuthority(value, operator?)`   | EquatableOperator | Mint authority (null = none, default `==`)   |
| `.supply(value, operator)`           | IntegerOperator   | Total supply                                 |
| `.decimals(value, operator)`         | IntegerOperator   | Decimal places                               |
| `.isInitialized(value, operator?)`   | EquatableOperator | Initialization flag (default `==`)           |
| `.freezeAuthority(value, operator?)` | EquatableOperator | Freeze authority (null = none, default `==`) |

**Example:**

```typescript
const guard = lighthouse
  .mintAccount(usdcMint)
  .supply(100_000_000_000_000, ">")
  .build();
```

### 5.3 accountInfo

Asserts generic account-info fields (lamports, owner, data length).

```typescript
lighthouse.accountInfo(target: PublicKey): AccountInfoBuilder
```

**Methods:**

| Method                          | Operator type     | Description                    |
| ------------------------------- | ----------------- | ------------------------------ |
| `.lamports(value, operator)`    | IntegerOperator   | Lamport balance                |
| `.dataLength(value, operator)`  | IntegerOperator   | Account data length            |
| `.owner(value, operator?)`      | EquatableOperator | Account owner (default `==`)   |
| `.rentEpoch(value, operator)`   | IntegerOperator   | Rent epoch                     |
| `.isSigner(value, operator?)`   | EquatableOperator | Signer flag (default `==`)     |
| `.isWritable(value, operator?)` | EquatableOperator | Writable flag (default `==`)   |
| `.executable(value, operator?)` | EquatableOperator | Executable flag (default `==`) |

**Example:**

```typescript
const guard = lighthouse
  .accountInfo(someAccount)
  .lamports(1_000_000_000, ">=")
  .build();
```

### 5.4 accountData

Asserts raw typed values at byte offsets in account data.

```typescript
lighthouse.accountData(target: PublicKey): AccountDataBuilder
```

**Methods:**

| Method                               | Description                           |
| ------------------------------------ | ------------------------------------- |
| `.at(offset, type, value, operator)` | Assert a typed value at a byte offset |

**Type variants:** `Bool`, `U8`, `I8`, `U16`, `I16`, `U32`, `I32`, `U64`, `I64`, `U128`, `I128`

**Examples:**

```typescript
// Assert a u64 at byte offset 8
const guard = lighthouse
  .accountData(someAccount)
  .at(8, "U64", 42n, ">")
  .build();

// Assert a bool at byte offset 0
const guard = lighthouse
  .accountData(someAccount)
  .at(0, "Bool", true, "==")
  .build();
```

### 5.5 accountDelta

Compares fields between two accounts (delta).

```typescript
lighthouse.accountDelta(
  accountA: PublicKey,
  accountB: PublicKey
): AccountDeltaBuilder
```

**Methods:**

| Method                                   | Description                             |
| ---------------------------------------- | --------------------------------------- |
| `.accountInfo(aOffset, value, operator)` | Assert a delta on an account-info field |

Note: AccountDelta has no multi-instruction variant. Only one assertion per builder.

**Example:**

```typescript
const guard = lighthouse
  .accountDelta(accountA, accountB)
  .accountInfo(0, 100n, ">") // lamports increased by > 100
  .build();
```

### 5.6 sysvarClock

Asserts sysvar clock fields. No target accounts required.

```typescript
lighthouse.sysvarClock(): SysvarClockBuilder
```

**Methods:**

| Method                           | Description          |
| -------------------------------- | -------------------- |
| `.field(field, value, operator)` | Assert a clock field |

**Field variants:** `Slot`, `EpochStartTimestamp`, `Epoch`, `LeaderScheduleEpoch`, `UnixTimestamp`

Note: SysvarClock has no multi-instruction variant. Only one assertion per builder.

**Example:**

```typescript
const guard = lighthouse
  .sysvarClock()
  .field("UnixTimestamp", 1700000000n, ">")
  .build();
// guard.accounts = [] (no target accounts)
```

### 5.7 stakeAccount

Asserts fields of a stake account.

```typescript
lighthouse.stakeAccount(target: PublicKey): StakeAccountBuilder
```

**Methods:**

| Method                         | Operator type     | Description                |
| ------------------------------ | ----------------- | -------------------------- |
| `.state(value, operator?)`     | EquatableOperator | Stake state (default `==`) |
| `.stakeFlags(value, operator)` | IntegerOperator   | Stake flags                |

**Example:**

```typescript
const guard = lighthouse
  .stakeAccount(stakeAccountPubkey)
  .state(2, "==") // stake is active
  .build();
```

### 5.8 merkleTree

Verifies a leaf in a merkle tree account.

```typescript
lighthouse.merkleTree(target: PublicKey): MerkleTreeBuilder
```

**Methods:**

| Method                             | Description                                |
| ---------------------------------- | ------------------------------------------ |
| `.verifyLeaf(leafIndex, leafHash)` | Verify a leaf at an index against its hash |

Note: MerkleTree has no multi-instruction variant. Only one assertion per builder.

**Example:**

```typescript
const guard = lighthouse
  .merkleTree(merkleTreeAccount)
  .verifyLeaf(0, leafHash)
  .build();
```

### Operators

**Integer operators** (for numeric fields):

| String alias            | Enum value                           | Description             |
| ----------------------- | ------------------------------------ | ----------------------- |
| `"<"`                   | `IntegerOperator.LessThan`           | Less than               |
| `"<="`                  | `IntegerOperator.LessThanOrEqual`    | Less than or equal      |
| `"=="` / `"==="`        | `IntegerOperator.Equal`              | Equal                   |
| `">="`                  | `IntegerOperator.GreaterThanOrEqual` | Greater than or equal   |
| `">"`                   | `IntegerOperator.GreaterThan`        | Greater than            |
| `"!="` / `"!=="`        | `IntegerOperator.NotEqual`           | Not equal               |
| `"in"` / `"contains"`   | `IntegerOperator.Contains`           | Contains (for bitflags) |
| `"!in"` / `"!contains"` | `IntegerOperator.DoesNotContain`     | Does not contain        |

**Equatable operators** (for PublicKey, boolean, enum fields):

| String alias     | Enum value                   | Description |
| ---------------- | ---------------------------- | ----------- |
| `"=="` / `"==="` | `EquatableOperator.Equal`    | Equal       |
| `"!="` / `"!=="` | `EquatableOperator.NotEqual` | Not equal   |

Operators accept either the enum value or the string alias:

```typescript
// Both equivalent
.amount(50_000_000, "<")
.amount(50_000_000, IntegerOperator.LessThan)
```

---

## 6. PolicyType Variants

All five PolicyType variants are available for ComposablePolicy. Each variant's composable-specific configuration is documented below.

### 6.1 Subscription

Fixed amount paid every `payment_frequency` interval. Gates on `next_payment_due`.

```typescript
const policyType = {
  subscription: {
    amount: new BN(10_000_000), // 10 USDC per period
    paymentFrequency: getPaymentFrequency("monthly"),
    nextPaymentDue: new BN(now), // first payment timestamp
    autoRenew: true,
    maxRenewals: new BN(12), // null = unlimited
    totalPaid: new BN(0),
    paymentCount: 0,
    expiryDate: null, // null = never expires
    padding: new Array(68).fill(0),
  },
};
```

Key fields:

- `nextPaymentDue`: execution gated until `current_time >= next_payment_due`
- `autoRenew`: if false, transitions to `Completed` after `maxRenewals`
- `expiryDate`: optional hard deadline

### 6.2 PayAsYouGo

Usage-based: claim up to `max_chunk_amount` per call, capped at `max_amount_per_period` per `period_length_seconds`.

```typescript
const policyType = {
  payAsYouGo: {
    maxAmountPerPeriod: new BN(100_000_000), // 100 USDC/month
    maxChunkAmount: new BN(50_000_000), // 50 USDC per call
    periodLengthSeconds: new BN(30 * 24 * 3600), // 30 days
    currentPeriodStart: new BN(now),
    currentPeriodTotal: new BN(0),
    expiryDate: null, // null = never expires (ADR-0024)
    padding: new Array(79).fill(0),
  },
};
```

Key fields:

- `maxChunkAmount`: maximum pull per `execute_composable` call
- `maxAmountPerPeriod`: cumulative cap per period; reject execution when `currentPeriodTotal + chunk > maxAmountPerPeriod`
- `periodLengthSeconds`: period duration in seconds; resets `currentPeriodTotal` on rollover
- `expiryDate` (ADR-0024): `None` = never expires; `Some(ts)` with `ts > 0` rejects execution once `current_time > ts` (boundary `<=` permitted). Orthogonal to the period cap.

### 6.3 OneTime (ADR-0019)

Fixed amount, fires exactly once, then transitions to `Completed`.

```typescript
const policyType = {
  oneTime: {
    amount: new BN(25_000_000), // 25 USDC
    dueDate: new BN(0), // 0 = immediate (no due-date gate)
    expiryDate: null, // null = never expires
    padding: new Array(103).fill(0),
  },
};
```

Key fields:

- `amount`: fixed payment amount
- `dueDate`: `<= 0` means immediate; `> 0` blocks execution until `current_time >= dueDate`
- `expiryDate`: optional hard deadline; `null` = never expires

Execution: fires once → status transitions to `Completed`. Re-execution is rejected.

Source: `tests/one-time-payment.test.ts`

```typescript
// Create composable OneTime with Lighthouse guard
const guard = lighthouse
  .tokenAccount(recipientTokenAccount)
  .amount(1_000_000, "<") // recipient balance < 1 USDC
  .build();

const ix = await sdk.getCreateComposablePolicyInstruction(
  USDC_MINT,
  recipient.publicKey,
  gatewayPDA,
  {
    oneTime: {
      amount: new BN(25_000_000),
      dueDate: new BN(0),
      expiryDate: null,
      padding: new Array(103).fill(0),
    },
  },
  "composable one-time",
  forwardConfig,
  { programCall: { programId: LIGHTHOUSE_PUBKEY } },
  [guard.accounts[0].pubkey],
  guard.data
);
```

### 6.4 UpTo (ADR-0020)

Single-use, time-bound variable-amount authorization. The actual settled amount is caller-supplied at execute time, bounded by `max_amount` (`0 <= actual <= max`).

```typescript
const policyType = {
  upTo: {
    maxAmount: new BN(100_000_000), // 100 USDC ceiling
    validAfter: new BN(0), // 0 = immediate
    deadline: new BN(Math.floor(Date.now() / 1000) + 31_536_000), // +1y
    padding: new Array(104).fill(0),
  },
};
```

Key fields:

- `maxAmount`: ceiling on settlement amount
- `validAfter`: `<= 0` means immediate; `> 0` blocks until `current_time >= validAfter`
- `deadline`: mandatory (`> 0`), must be `> validAfter`; execution rejected when `current_time >= deadline` (`PolicyExpired`)

Execution rules:

- `0 <= actual <= max`: transitions to `Completed`
- `actual > max`: rejected
- `actual == 0`: valid (no charge, policy consumed)
- Recipient-triggerable: the recipient can sign the settle transaction

Source: `tests/up-to-policy.test.ts`

```typescript
// Settle with variable amount
const ixs = await sdk.settleUpTo(pda, new BN(42_000_000)); // 42 USDC

// Recipient-triggerable settle
await sdk.updateWallet(new anchor.Wallet(recipient));
const ixs = await sdk.settleUpTo(pda, new BN(5_000_000));
```

### 6.5 Milestone

Up to 4 milestone amounts/timestamps held in escrow. Released via `release_condition` bitmap: bit0=due-date check, bit1=gateway signer, bit2=owner signer, bit3=recipient signer (bits 1–3 mutually exclusive).

```typescript
const policyType = {
  milestone: {
    amounts: [new BN(25_000_000), new BN(25_000_000), new BN(0), new BN(0)],
    releaseConditions: [1, 2, 0, 0], // bitmap per milestone
    currentMilestone: 0,
    padding: new Array(59).fill(0),
  },
};
```

---

## 7. Execution Remaining Accounts Layout

The `remaining_accounts` slice at `execute_composable` time follows this order (ADR-0016):

```
remaining_accounts = [
  // 1. Lighthouse target accounts (pre-validation)
  ...preValidationTargets,       // e.g. [hotWalletUsdcAta]

  // 2. Lighthouse target accounts (post-validation)
  ...postValidationTargets,      // e.g. [recipientAta] or [] if disabled

  // 3. Forward program accounts (if forward enabled)
  ...forwardAccounts,            // e.g. DLMM swap instruction keys
]
```

**Key points:**

- `ValidationPda` is a named account on the instruction, NOT in `remaining_accounts`.
- Pre-validation targets come first, post-validation targets second, forward accounts last.
- Each section is concatenated; no separators or length prefixes.
- When a section is empty (e.g., validation disabled), it contributes zero entries.
- When forward is disabled, forward accounts section is empty (pass `Buffer.alloc(0)` as `instructionData`).

### Slot derivation at execute time

For forward accounts, `pinned_accounts[i]` maps to `remaining_accounts[fwd_base + i]`, where:

```
fwd_base = numPreValidationTargets + numPostValidationTargets
```

For example, with 1 pre-validation target and 0 post-validation targets:

- `fwd_base = 1`
- `pinned_accounts[0]` maps to `remaining_accounts[1]` (first forward account)

### Permissionless execution (ADR-0016)

When the gateway has `FEATURE_PERMISSIONLESS` (bit 3) set, `execute_composable` admits any signer for CONFORMING composable policies (those with `post_validation` or route pin enabled). The trusted three (gateway signer, owner, recipient) always pass regardless.

---

## 8. Intermediate ATA Ownership

Intermediate ATAs are owned by the **ComposablePolicy PDA**, not the UserPayment PDA. This is a security boundary:

- The ComposablePolicy PDA owns the intermediate token accounts.
- The forward program (Meteora DLMM) can only move transient intermediate balances, never the user's source funds.
- The user's source token account delegate is the UserPayment PDA.

### Derivation pattern

```typescript
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// Input intermediate — owned by ComposablePolicy PDA
const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
  inputMint, // e.g. USDC_MINT
  composablePolicyPDA, // owner = ComposablePolicy PDA
  true, // allowOwnerOffCurve (PDA, not a keypair)
  TOKEN_PROGRAM_ID
);

// Output intermediate — only exists in deliver-transform mode
const intermediateOutputTokenAccount = getAssociatedTokenAddressSync(
  outputMint, // e.g. NATIVE_MINT
  composablePolicyPDA, // owner = ComposablePolicy PDA
  true,
  TOKEN_PROGRAM_ID
);
```

In same-mint topup (deliver-no-transform), both intermediates derive to the same address. In cross-mint swap (deliver-transform), they are distinct. In act mode, the output intermediate is a placeholder (program skips creation).

---

## Appendix: Complete Account List

The full set of accounts passed to `execute_composable`:

| Account                          | Owner   | Writable | Description                                                         |
| -------------------------------- | ------- | -------- | ------------------------------------------------------------------- |
| `feePayer`                       | Signer  | Yes      | Transaction fee payer                                               |
| `paymentsDelegate`               | Program | No       | Legacy global delegate (backward compat)                            |
| `composablePolicy`               | Program | Yes      | The composable policy account                                       |
| `userPayment`                    | Program | No       | User's payment account                                              |
| `gateway`                        | Program | No       | Payment gateway account                                             |
| `config`                         | Program | No       | Program config (singleton)                                          |
| `preValidationProgram`           | —       | No       | Validation program for pre-validation (Lighthouse or SystemProgram) |
| `postValidationProgram`          | —       | No       | Validation program for post-validation                              |
| `preValidationPda`               | Program | No       | Pre-validation assertion data                                       |
| `postValidationPda`              | Program | No       | Post-validation assertion data                                      |
| `userTokenAccount`               | Token   | Yes      | User's source token account (delegate = UserPayment PDA)            |
| `mint`                           | —       | No       | Input token mint                                                    |
| `outputMint`                     | —       | No       | Output token mint (or SystemProgram for act mode)                   |
| `intermediateInputTokenAccount`  | Token   | Yes      | Intermediate input ATA (owned by ComposablePolicy PDA)              |
| `intermediateOutputTokenAccount` | Token   | Yes      | Intermediate output ATA (owned by ComposablePolicy PDA)             |
| `recipientTokenAccount`          | Token   | Yes      | Recipient's token account                                           |
| `gatewayFeeAccount`              | Token   | Yes      | Gateway fee recipient ATA (input-side, ADR-0026)                    |
| `protocolFeeAccount`             | Token   | Yes      | Protocol fee recipient ATA (input-side, ADR-0026)                   |
| `tokenProgram`                   | —       | No       | SPL Token program                                                   |
| `associatedTokenProgram`         | —       | No       | Associated Token Account program                                    |
| `systemProgram`                  | —       | No       | System program                                                      |
