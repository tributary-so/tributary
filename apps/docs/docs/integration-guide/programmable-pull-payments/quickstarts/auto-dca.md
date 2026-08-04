# Quickstart: Auto-DCA

Automatically dollar-cost-average into SOL every week. A subscription
composable policy pulls USDC on a schedule, swaps it to SOL via Meteora
DLMM, and delivers SOL to your wallet — all on-chain, no custodian.

**You'll build:** a Subscription composable policy with a Meteora forward.
USDC is pulled weekly, swapped to SOL, and delivered.

**Time to first value:** <15 min (requires a DLMM pool address).

## Prerequisites

- Node 18+, `@solana/web3.js`, `@coral-xyz/anchor`, `@tributary-so/sdk`
- `@meteora-ag/dlmm` installed
- A funded Solana wallet
- A `PaymentGateway`
- USDC in your wallet
- A Meteora DLMM pool address (USDC/SOL pair) — find one on
  [Meteora](https://app.meteora.ag/) or use the SDK to discover pools

## Setup

```typescript
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Connection,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import {
  Tributary,
  lighthouse,
  LIGHTHOUSE_PROGRAM_ID,
} from "@tributary-so/sdk";
import DLMM from "@meteora-ag/dlmm";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const METEORA_DLMM_PUBKEY = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);
const DLMM_POOL = new PublicKey("<your USDC/SOL pool address>");

const connection = new Connection("https://api.devnet.solana.com");
// ... initialise sdk, wallet, gatewayPDA as usual
```

## Step 1: Build the DLMM swap helper

The swap `user` must be the ComposablePolicy PDA (it owns the intermediate
ATAs). Build a helper that can produce the swap ix for any `user` — you'll
call it twice: once to extract the discriminator (at create time), once with
the real PDA (at execute time).

```typescript
const DCA_AMOUNT = 100_000_000; // 100 USDC per swap

const dlmmPool = await DLMM.create(connection, DLMM_POOL, {
  cluster: "mainnet-beta",
  skipSolWrappingOperation: true, // Tributary manages intermediates
});

async function buildSwapIx(user: PublicKey) {
  const swapForY = USDC_MINT.equals(dlmmPool.tokenX.publicKey);
  const binArrays = await dlmmPool.getBinArrayForSwap(swapForY);
  const quote = dlmmPool.swapQuote(
    new anchor.BN(DCA_AMOUNT),
    swapForY,
    new anchor.BN(100), // 1% slippage
    binArrays
  );

  const swapTx = await dlmmPool.swap({
    lbPair: DLMM_POOL,
    inToken: USDC_MINT,
    outToken: NATIVE_MINT,
    inAmount: new anchor.BN(DCA_AMOUNT),
    minOutAmount: quote.minOutAmount,
    user,
    binArraysPubkey: quote.binArraysPubkey as PublicKey[],
  });

  // Keep only the DLMM instruction (pool.swap returns extras)
  const found = swapTx.instructions.find((i) =>
    i.programId.equals(METEORA_DLMM_PUBKEY)
  );
  if (!found) throw new Error("DLMM swap instruction not found");

  // hostFeeIn fix: rewrite SystemProgram placeholder → DLMM program id
  const keys = found.keys.map((k) =>
    k.pubkey.equals(PublicKey.default) ||
    k.pubkey.equals(SystemProgram.programId)
      ? { ...k, pubkey: METEORA_DLMM_PUBKEY }
      : k
  );
  return new TransactionInstruction({
    keys,
    programId: found.programId,
    data: found.data,
  });
}

// Extract the discriminator for the ByteRangeCheck
const discriminator = (await buildSwapIx(PublicKey.default)).data.slice(0, 8);
```

## Step 2: Create the policy

Subscription: 100 USDC every 7 days, swapped to SOL, delivered to you.

```typescript
const WEEK_S = 7 * 24 * 3600;

const policyType = {
  subscription: {
    amount: new anchor.BN(DCA_AMOUNT), // 100 USDC
    paymentFrequency: { custom: new anchor.BN(WEEK_S) }, // weekly via custom seconds
    nextPaymentDue: new anchor.BN(Math.floor(Date.now() / 1000) + WEEK_S),
    maxRenewals: 52, // 1 year of weekly DCA
    autoRenew: true,
    padding: new Array(97).fill(0), // [u8; 97] per IDL
  },
};

const forwardConfig = {
  instructionConstraint: {
    programId: METEORA_DLMM_PUBKEY,
    numDataChecks: 1,
    dataChecks: [
      { offset: 0, length: 8, expected: Buffer.from(discriminator) },
      { offset: 0, length: 0, expected: Buffer.alloc(8) },
      { offset: 0, length: 0, expected: Buffer.alloc(8) },
      { offset: 0, length: 0, expected: Buffer.alloc(8) },
    ],
    numPinnedAccounts: 0,
    pinnedAccounts: [
      { index: 0, pubkey: PublicKey.default },
      { index: 0, pubkey: PublicKey.default },
    ], // fixed-size [PinnedAccount; 2] — must have 2 entries
  },
  inputMint: USDC_MINT,
  outputMint: NATIVE_MINT, // WSOL delivery
  forwardFlags: 0,
};

const ixs = await sdk.createComposable(
  USDC_MINT,
  wallet.publicKey, // you are the recipient
  gatewayPDA,
  policyType,
  "Weekly DCA",
  forwardConfig,
  { disabled: {} }, // preValidation (no pre-guard; post-validation checks output)
  [], // prePinnedAccounts
  Buffer.alloc(0), // preValidationData
  { programCall: { programId: LIGHTHOUSE_PROGRAM_ID } }, // postValidation (price guard)
  [outputSolAta], // postPinnedAccounts (read-accounts for post-validation)
  postGuard.data, // postValidationData
  undefined, // feePayer
  undefined // approvalAmount (optional — subscription amount suffices)
);

await sendAndConfirmTransaction(connection, new Transaction().add(...ixs), [
  wallet,
]);
```

!!! info "Post-validation price guard"
This DCA adds a **post-validation** guard: after the swap but before
settle, Lighthouse asserts the recipient's WSOL ATA received at least
`MIN_OUTPUT_LAMPORTS`. This is the "floor on output" pattern from
ADR-0031 — the on-chain `>0` guard stays, and `post_validation`
generalizes it as the owner's enforced minimum.

Build the guard the same way as a pre-validation guard, but pass it
through `postValidation` / `postPinnedAccounts` / `postValidationData`
(the 10th–12th `createComposable` args above):

```typescript
const MIN_OUTPUT_LAMPORTS = new anchor.BN(0); // floor: any non-zero amount

const postGuard = lighthouse
  .tokenAccount(outputSolAta) // WSOL ATA after the swap
  .amount(MIN_OUTPUT_LAMPORTS, ">=")
  .build();
```

If you don't want a price guard, set `postValidation: { disabled: {} }`
and skip the `postPinnedAccounts` / `postValidationData` args — the DCA
will run unconditionally on schedule.

## Step 3: Execute (permissionless)

A scheduler (or anyone) calls execute when `next_payment_due` has passed.
The caller supplies the live swap instruction data.

```typescript
const { address: composablePolicyPDA } = sdk.getComposablePolicyPda(
  sdk.getUserPaymentPda(wallet.publicKey, USDC_MINT).address,
  1
);

// Build the swap ix with the REAL composable policy PDA as user
const swapIx = await buildSwapIx(composablePolicyPDA);

// Map DLMM accounts → AccountMeta (all writable, all non-signer)
const forwardAccounts = swapIx.keys.map((k) => ({
  pubkey: k.pubkey,
  isSigner: false,
  isWritable: true,
}));

const execIxs = await sdk.executeComposable(
  composablePolicyPDA,
  Buffer.from(swapIx.data), // the raw swap instruction data
  null, // null for subscription (fixed amount)
  forwardAccounts // DLMM swap accounts
);

await sendAndConfirmTransaction(connection, new Transaction().add(...execIxs), [
  wallet,
]);
```

## What happened

1. **Pull** — 100 USDC + fees pulled from your wallet to the intermediate ATA.
2. **Skim** — Protocol + gateway fees skimmed (input-side, USDC).
3. **Forward** — DLMM swap: USDC → WSOL via the intermediate ATAs.
4. **Settle (deliver-transform)** — WSOL swept to your wallet's WSOL ATA.
5. **Schedule advance** — `next_payment_due` += 7 days.

## Next steps

- [AI agent budget](./ai-agent-budget.md) — PayAsYouGo with validation, no swap
- [Auto-topup](./auto-topup.md) — balance guard + swap
- [Swap & Deliver example](../examples/swap-and-deliver.md) — deeper dive with post-validation
- [Forward CPI guide](../forward-cpi-guide.md) — how to pin any forward instruction
