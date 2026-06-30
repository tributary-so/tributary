# Composable Policy SDK Surface

The TypeScript SDK exposes a low-level instruction builder and an executor for
composable policies. Both live on the main `Tributary` class from
`@tributary-so/sdk`.

```bash
pnpm install @tributary-so/sdk @solana/web3.js @solana/spl-token @coral-xyz/anchor
```

```typescript
import {
  Tributary,
  lighthouse,
  LIGHTHOUSE_PROGRAM_ID,
} from "@tributary-so/sdk";
import { Tributary as TributarySDK } from "@tributary-so/sdk";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

const sdk: TributarySDK = new Tributary(connection, wallet.payer);
```

## `getCreateComposablePolicyInstruction()`

Creates a `ComposablePolicy` PDA and (optionally) a `ValidationPda` that
stores the Lighthouse assertion data.

```typescript
async getCreateComposablePolicyInstruction(
  tokenMint: PublicKey,
  recipient: PublicKey,
  gateway: PublicKey,
  policyType: PolicyType,                       // { subscription | milestone | payAsYouGo }
  memo: string,                                 // free-form, max 64 bytes (SDK encodes it)
  forwardConfig: ForwardConfig,                 // target_program = PublicKey.default() disables forward
  validationProgram: PublicKey = PublicKey.default(),  // SystemProgram disables validation
  numValidationAccounts: number = 0,
  validationData: Buffer = Buffer.alloc(0),     // from lighthouse.<...>.build().data
  feePayer?: PublicKey                          // defaults to provider wallet
): Promise<TransactionInstruction>
```

!!! info "Counter separation"
`ComposablePolicy` IDs come from
`user_payment.created_composable_count` — **independent** from
`PaymentPolicy` IDs (`created_policies_count`). A regular policy `#1` and
a composable policy `#1` can coexist on the same `UserPayment`.

### Minimal example — same-mint topup, validation enabled

```typescript
import {
  Tributary,
  lighthouse,
  LIGHTHOUSE_PROGRAM_ID,
} from "@tributary-so/sdk";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<") // 50 USDC threshold
  .build();

const policyType = {
  payAsYouGo: {
    maxAmountPerPeriod: new BN(100_000_000), // 100 USDC / month
    maxChunkAmount: new BN(50_000_000), // 50 USDC / call
    periodLengthSeconds: new BN(30 * 24 * 3600),
    currentPeriodStart: new BN(Math.floor(Date.now() / 1000)),
    currentPeriodTotal: new BN(0),
    padding: new Array(88).fill(0),
  },
};

// Forward disabled: sentinel target_program = PublicKey.default().
// num_data_checks MUST be 0 (no forward instruction to byte-range validate).
// dataChecks must still be a full [4]-array of zeroed entries (fixed-size).
const forwardConfig = {
  targetProgram: PublicKey.default(),
  inputMint: USDC_MINT,
  outputMint: USDC_MINT, // must equal inputMint when forward disabled
  minOutputAmount: null,
  forwardFlags: 0,
  numDataChecks: 0,
  dataChecks: [
    { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
    { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
    { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
    { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
  ],
};

const ix = await sdk.getCreateComposablePolicyInstruction(
  USDC_MINT,
  hotWallet.publicKey, // recipient
  gatewayPDA, // gateway
  policyType,
  "Auto topup guard",
  forwardConfig,
  LIGHTHOUSE_PROGRAM_ID, // validation program (SystemProgram = none)
  guard.numAccounts, // 1
  guard.data // the Lighthouse assertion buffer
);
```

## `executeComposable()`

Permissionless — any gateway signer (or the user, or the recipient) can call
it. The caller supplies the forward instruction data and the full
`remaining_accounts` list.

```typescript
async executeComposable(
  composablePolicy: PublicKey,
  instructionData: Buffer,        // forward program ix data (empty Buffer if forward disabled)
  forwardAmount?: BN | null,      // amount to pull through the forward step
  remainingAccounts?: AccountMeta[]
): Promise<TransactionInstruction>
```

### `remaining_accounts` layout

```text
remaining_accounts =
  [ ValidationPda                          // 1st (only if validation enabled)
  , ...guard.accounts                       // Lighthouse read-accounts (numValidationAccounts of them)
  , ...forwardAccounts                      // forward program accounts (empty if forward disabled)
  ]
```

!!! warning "SDK auto-prepends the ValidationPda"
`executeComposable()` detects whether the policy has validation enabled and
**prepends** the `ValidationPda` to the `remaining_accounts` you pass. Do
**not** include it yourself — pass only `[...guard.accounts, ...forwardAccounts]`.
The PDA derivation uses `getValidationPda(composablePolicy, programId)`.

### Minimal example — validation only (no forward)

```typescript
import { Tributary } from "@tributary-so/sdk";
import { Buffer } from "buffer";
import { BN } from "@coral-xyz/anchor";

// Forward disabled → instruction_data is unused by the program. Pass empty.
const instructionData = Buffer.alloc(0);

// remaining_accounts = guard.accounts only (the SDK adds the ValidationPda).
const remainingAccounts = guard.accounts; // [{ pubkey: hotWalletUsdcAta, isSigner: false, isWritable: false }]

const ix = await sdk.executeComposable(
  composablePolicyPDA,
  instructionData,
  new BN(50_000_000), // forward amount (the pull size)
  remainingAccounts
);
```

### With forward enabled — caller supplies swap ix data + pool accounts

```typescript
// Build the Meteora DLMM swap ix (user = ComposablePolicy PDA, which owns both
// intermediates). Keep ONLY the swap instruction.
const swapIx = await buildSwapIx(composablePolicyPDA);
const forwardAccounts = swapIx.keys.map((k) => ({
  pubkey: k.pubkey,
  isSigner: false,
  isWritable: true, // see swap-and-deliver.md for the writability rationale
}));

const remainingAccounts = [
  ...guard.accounts, // validation read-accounts (empty array if no validation)
  ...forwardAccounts,
];

const ix = await sdk.executeComposable(
  composablePolicyPDA,
  Buffer.from(swapIx.data), // the forward program instruction data
  new BN(SWAP_INPUT_AMOUNT),
  remainingAccounts
);
```

## Type reference

### `ForwardConfig`

```typescript
type ForwardConfig = {
  targetProgram: PublicKey; // Pubkey.default() = disabled (sentinel)
  inputMint: PublicKey; // must == user_payment.token_mint
  outputMint: PublicKey; // recipient delivery mint (NATIVE_MINT for WSOL)
  minOutputAmount: BN | null; // NET (post-fee) minimum, DeFi convention
  forwardFlags: number; // bit 0 = FORWARD_FLAG_NATIVE_OUTPUT
  numDataChecks: number; // 0 if forward disabled, else 1..4
  dataChecks: ByteRangeCheck[]; // length must be 4 (fixed-size); pin selector at offset 0
};
```

Rules enforced on-chain (`validate_forward_config`):

- `targetProgram == PublicKey.default()` → `num_data_checks` MUST be `0` and
  `input_mint` MUST equal `output_mint`.
- Otherwise `targetProgram` MUST be in `ALLOWED_FORWARD_PROGRAMS`, and at
  least one `ByteRangeCheck` MUST pin bytes at `offset: 0, length: > 0`
  (discriminator coverage).
- `FORWARD_FLAG_NATIVE_OUTPUT` (bit 0) → `output_mint` MUST be `NATIVE_MINT`.

### `ByteRangeCheck`

```typescript
type ByteRangeCheck = {
  offset: number; // byte offset into the forward instruction data
  length: number; // 0..=8 (expected is a [u8; 8])
  expected: number[]; // length-8 array; only the first `length` bytes are checked
};
```

### `ValidationConfig`

```typescript
type ValidationConfig = {
  validationProgram: PublicKey; // SystemProgram.programId = disabled (sentinel)
  numValidationAccounts: number; // 0..=10 read-accounts for the assertion
};
```

The assertion **data** (≤1024 bytes) is NOT stored inline — it lives in a
separate `ValidationPda` account (`["composable_validation", composable_policy]`)
that the create handler initializes via `invoke_signed`.

## Disabling the hooks

| Hook       | Disabling recipe                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Forward    | `forwardConfig.targetProgram = PublicKey.default()`, `numDataChecks = 0`, `inputMint === outputMint`                                      |
| Validation | `validationProgram = PublicKey.default()` (or `SystemProgram.programId`), `numValidationAccounts = 0`, `validationData = Buffer.alloc(0)` |

!!! info "Why `Pubkey::default()` instead of the Token program?"
The same-mint topup (no swap) used to be modelled by setting the forward
target to the SPL Token program. That opened a drain vector: the forward
`AccountMeta` list's `to` account is not validated, so a gateway could
redirect the sweep. The sentinel pattern makes "no forward step"
unambiguous and safe.

## Related

- [Overview](./overview.md) — concept and lifecycle.
- [Lighthouse facade](./lighthouse-facade.md) — building the assertion buffer.
- [Protocol Reference → Composable Policy](../../protocol-reference/composable-policy/overview.md)
  for on-chain constraints, error codes, and the full account layout.
