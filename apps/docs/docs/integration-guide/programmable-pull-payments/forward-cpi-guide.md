# Guide: Forward CPI Integration

A composable policy can transform the pulled token before delivering it to
the recipient — pull USDC, swap to SOL via Meteora DLMM, deliver SOL. This
guide shows how to wire any allowlisted forward program into a composable
policy and pin it so only the exact instruction you approve can run.

## Why constraints exist

The forward step is a CPI — Tributary calls an external program
(`invoke_signed`) with caller-supplied instruction data and accounts. Without
constraints, a malicious gateway could substitute any instruction on the
allowlisted program (e.g. a Meteora "withdraw" instead of "swap").

Tributary solves this with `InstructionConstraint`: you pin the instruction
**selector** (first 8 bytes) and optionally pin specific **account positions**
to concrete pubkeys. At execute time, the program validates both before the
CPI fires.

## The three pieces

```
ForwardConfig
├── instructionConstraint: InstructionConstraint
│   ├── programId: PublicKey          ← must be in ALLOWED_FORWARD_PROGRAMS
│   ├── dataChecks: ByteRangeCheck[4] ← pin the instruction selector
│   └── pinnedAccounts: PinnedAccount[2] ← pin specific account slots
├── inputMint: PublicKey              ← the user's token (what's pulled)
├── outputMint: PublicKey             ← what the recipient receives
└── forwardFlags: u8                  ← bit0 = native SOL unwrap
```

Currently `ALLOWED_FORWARD_PROGRAMS` contains **Meteora DLMM**, **Raydium
CPMM**, **Raydium CLMM**, and **Orca Whirlpool** (see ADR-0032 and
`programs/tributary/src/constants.rs`).

## Step 1: Extract the discriminator

Every Anchor/SPL instruction starts with an 8-byte discriminator (the first
8 bytes of `instruction.data`). Pin those bytes at offset 0 to lock the
instruction type.

```typescript
import DLMM from "@meteora-ag/dlmm";

const METEORA_DLMM_PUBKEY = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);

// Build the swap ix once with a dummy user — you only need the data layout
const dummyIx = await buildSwapIx(PublicKey.default);

// The first 8 bytes are the Anchor instruction discriminator
const discriminator = dummyIx.data.slice(0, 8);
```

## Step 2: Build the InstructionConstraint

At least one `ByteRangeCheck` must pin offset 0. The `dataChecks` array is
fixed-size (4 entries); pad unused slots with zero-length checks.

```typescript
const forwardConfig = {
  instructionConstraint: {
    programId: METEORA_DLMM_PUBKEY,
    numDataChecks: 1,
    dataChecks: [
      { offset: 0, length: 8, expected: Buffer.from(discriminator) },
      { offset: 0, length: 0, expected: Buffer.alloc(8) }, // unused
      { offset: 0, length: 0, expected: Buffer.alloc(8) }, // unused
      { offset: 0, length: 0, expected: Buffer.alloc(8) }, // unused
    ],
    numPinnedAccounts: 0,
    pinnedAccounts: [
      { index: 0, pubkey: PublicKey.default },
      { index: 0, pubkey: PublicKey.default },
    ], // fixed-size [PinnedAccount; 2] — must have 2 entries even when unused
  },
  inputMint: USDC_MINT,
  outputMint: NATIVE_MINT,
  forwardFlags: 0,
};
```

!!! warning "At least one pin required when forward is enabled"
A forward-enabled constraint with zero effective pins is rejected at
create (`DegenerateForwardPins`). If you leave `numPinnedAccounts: 0`,
you must also disable forward (`programId: PublicKey.default`). To
enable forward without pinning a specific account, pin any required
account (typically the pool) at its index — see below.

### PinnedAccounts (required when forward is enabled)

Pin specific pubkeys to specific slots in the forward-account slice. At
least one pin must be active when `programId != PublicKey.default`:

```typescript
// Suppose the DLMM pool is at index 2 in the swap instruction's accounts
pinnedAccounts: [
  { index: 2, pubkey: DLMM_POOL },
  { index: 0, pubkey: PublicKey.default }, // pad to [PinnedAccount; 2]
],
numPinnedAccounts: 1,
```

At execute time, Tributary checks
`remaining_accounts[fwd_base + pin.index].pubkey == pin.pubkey` for each
active pin. No duplicate indices allowed.

### Cold-relayer safety net (ADR-0016)

If the execute caller is not the gateway signer, the user, or the
recipient (a "cold relayer" / pure scheduler), Tributary additionally
requires **either** `post_validation` is `ProgramCall` **or** the
forward constraint has at least one active pin (a "route pin"). This
blocks the obvious "scheduler drains arbitrary output to its own ATA"
attack. A bare PayAsYouGo policy with no validation and no pins is only
executable by the trusted three.

## Step 3: The three settlement shapes

`outputMint` controls what happens after the forward CPI:

| `outputMint`                  | Forward                          | Shape                    | Behaviour                                                                          |
| ----------------------------- | -------------------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `== inputMint`                | disabled (`programId = default`) | **deliver-no-transform** | sweep input directly to recipient                                                  |
| `!= inputMint`, concrete mint | enabled                          | **deliver-transform**    | swap → sweep output to recipient                                                   |
| `PublicKey.default()`         | enabled                          | **act mode**             | no output ATA, no sweep — forward acts on the input (e.g. deposit to a subaccount) |

## Step 4: Execute — the forward accounts

At execute time, the caller supplies the live forward instruction data and
the forward accounts. The forward accounts come from the swap instruction's
`keys` — map them to `AccountMeta`:

```typescript
const swapIx = await buildSwapIx(composablePolicyPDA); // real PDA as user

const forwardAccounts = swapIx.keys.map((k) => ({
  pubkey: k.pubkey,
  isSigner: false, // Tributary strips all is_signer from forward accounts
  isWritable: true, // mark all writable — safe, avoids stale-IDL mismatches
}));

// remaining_accounts = [validation targets..., forward accounts...]
const remainingAccounts = [
  ...guard.accounts, // Lighthouse targets (empty if no validation)
  ...forwardAccounts, // DLMM swap accounts
];

const execIxs = await sdk.executeComposable(
  composablePolicyPDA,
  Buffer.from(swapIx.data), // the raw instruction data (selector must match)
  new anchor.BN(amount), // pull amount (null for subscription)
  remainingAccounts
);
```

!!! warning "Signer sanitization"
Tributary forces `isSigner: false` on ALL forward (and validation) accounts.
This prevents the fee payer — a Signer — from granting signer authority to
the forward program via remaining_accounts. Do not attempt to pass signer
flags; they are stripped.

## Common patterns

### Meteora DLMM swap

See the [Swap & Deliver example](./examples/swap-and-deliver.md) and the
[Auto-DCA quickstart](./quickstarts/auto-dca.md) for complete working code,
including the `hostFeeIn` fix (rewrite the SystemProgram placeholder →
DLMM program id).

### Native SOL delivery (WSOL unwrap)

Set `forwardFlags = 1` (`FORWARD_FLAG_NATIVE_OUTPUT`) to unwrap WSOL to
native SOL via `closeAccount` after the swap. The recipient gets native SOL
in their system account — no WSOL ATA needed. See the
[Native SOL topup example](./examples/native-sol-topup.md).

### Same-mint topup (no swap)

When `inputMint === outputMint` and forward is disabled
(`programId = PublicKey.default()`), the policy is **deliver-no-transform**:
the pull goes straight to the recipient with no forward CPI. See the
[AI agent budget quickstart](./quickstarts/ai-agent-budget.md).

## Building forward instructions (ForwardBuilder)

The manual `swapIx.keys.map(...)` block above works, but it duplicates logic that
the scheduler and CLI also need (validation-target resolution, account assembly,
PayAsYouGo face→gross math). To kill that duplication, `@tributary-so/sdk` exports
the shared primitives and a `ForwardBuilder` interface; concrete implementations
(Meteora DLMM first) live in the opt-in `@tributary-so/forward-builders` package.

```typescript
import { createMeteoraDlmmForward } from "@tributary-so/forward-builders";
import {
  isForwardEnabled,
  resolveValidationTargets,
  assembleComposableRemainingAccounts,
  resolveDefaultForwardAmount,
} from "@tributary-so/sdk";

// 1. Resolve the face amount (handles PayAsYouGo gross→face; null for fixed-amount variants)
const face = resolveDefaultForwardAmount(policy, gateway);

// 2. Build the forward instruction (or skip if forward is disabled)
const fwd = isForwardEnabled(policy)
  ? await createMeteoraDlmmForward({ pool, slippageBps: 100 }).build({
      connection,
      policy,
      composablePolicyPda: composablePolicyPDA,
      face,
    })
  : { instructionData: Buffer.alloc(0), forwardAccounts: [] };

// 3. Assemble remaining_accounts in ADR-0016 order: [pre, forward, post]
const remaining = assembleComposableRemainingAccounts({
  preTargets: await resolveValidationTargets(
    connection,
    composablePolicyPDA,
    policy.preValidation,
    validationProgramId,
    "pre"
  ),
  forwardAccounts: fwd.forwardAccounts,
  postTargets: await resolveValidationTargets(
    connection,
    composablePolicyPDA,
    policy.postValidation,
    validationProgramId,
    "post"
  ),
});

const execIxs = await sdk.executeComposable(
  composablePolicyPDA,
  fwd.instructionData,
  face,
  remaining
);
```

### Why the builder returns `{ pubkey, isWritable }[]`

The builder does **not** return `isSigner`. The assembler
(`assembleComposableRemainingAccounts`) stamps `isSigner: false` on every account.
This is the ADR-0008 privilege boundary enforced at the type level: a builder
cannot leak signer authority because the `ForwardAccountMeta` type has no field
to carry it. Per-account `isWritable` comes from the forward program's own account
list (e.g. DLMM's `swapIx.keys`), not a blanket `true`.

See [ADR-0030](../../../adr/0030-composable-execution-primitives.md) for the
full rationale (primitives-not-orchestrator, sibling-package structure, assembler
owns ADR-0008).

## Checklist before you ship

- [ ] `programId` is in `ALLOWED_FORWARD_PROGRAMS`
- [ ] At least one `ByteRangeCheck` pins offset 0 (the discriminator)
- [ ] `outputMint` matches your intended settlement shape
- [ ] Forward accounts at execute time use per-account `isWritable` from the
      forward program (or use a `ForwardBuilder` from `@tributary-so/forward-builders`,
      which handles this for you)
- [ ] Swap-level slippage (`minOutAmount` in the swap ix) is set — or use
      [post-validation](./lighthouse-facade.md) as an output floor

## Related

- [Forward Hook reference](../../protocol-reference/composable-policy/forward-hook.md) — on-chain mechanics
- [Allowlists & Sentinels](../../protocol-reference/composable-policy/allowlists-and-sentinels.md) — disabled forward
- [SDK reference](./sdk.md) — `ForwardConfig` type
