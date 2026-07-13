# Quickstart: Auto-Topup

Keep a hot wallet topped up with SOL. When the hot wallet's USDC balance
drops below a threshold, a composable policy pulls USDC from your cold
wallet, swaps it to SOL via Meteora DLMM, and delivers it. Conditional +
transformative in one primitive.

**You'll build:** a PayAsYouGo composable with a Lighthouse balance guard
and a Meteora DLMM forward swap.

**Time to first value:** <15 min (requires a DLMM pool address).

## Prerequisites

- Node 18+, `@solana/web3.js`, `@coral-xyz/anchor`, `@tributary-so/sdk`
- `@meteora-ag/dlmm` installed
- Two wallets: cold (funder) and hot (recipient)
- A `PaymentGateway`
- USDC in the cold wallet
- A Meteora DLMM pool address (USDC/SOL pair)

## Setup

```typescript
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Connection,
  Transaction,
  sendAndConfirmTransaction,
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
// ... initialise sdk with coldWallet as provider, gatewayPDA

const hotWalletUsdcAta = getAssociatedTokenAddressSync(
  USDC_MINT,
  hotWallet.publicKey
);
```

## Step 1: Build the guard + swap helper

```typescript
const THRESHOLD = 50_000_000; // 50 USDC — trigger when below this
const TOPUP_CHUNK = 50_000_000; // 50 USDC per execute call

// Guard: only top up when hot wallet is below threshold
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(THRESHOLD, "<")
  .build();

// Swap helper (same pattern as auto-DCA quickstart)
const dlmmPool = await DLMM.create(connection, DLMM_POOL, {
  cluster: "mainnet-beta",
  skipSolWrappingOperation: true,
});

async function buildSwapIx(user: PublicKey) {
  const swapForY = USDC_MINT.equals(dlmmPool.tokenX.publicKey);
  const binArrays = await dlmmPool.getBinArrayForSwap(swapForY);
  const quote = dlmmPool.swapQuote(
    new anchor.BN(TOPUP_CHUNK),
    swapForY,
    new anchor.BN(100), // 1% slippage
    binArrays
  );
  const swapTx = await dlmmPool.swap({
    lbPair: DLMM_POOL,
    inToken: USDC_MINT,
    outToken: NATIVE_MINT,
    inAmount: new anchor.BN(TOPUP_CHUNK),
    minOutAmount: quote.minOutAmount,
    user,
    binArraysPubkey: quote.binArraysPubkey as PublicKey[],
  });
  const found = swapTx.instructions.find((i) =>
    i.programId.equals(METEORA_DLMM_PUBKEY)
  );
  if (!found) throw new Error("DLMM swap instruction not found");
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

const discriminator = (await buildSwapIx(PublicKey.default)).data.slice(0, 8);
```

## Step 2: Create the policy

PayAsYouGo: up to 200 USDC/month, 50 USDC per call, with the balance guard
and the SOL swap forward.

```typescript
const policyType = {
  payAsYouGo: {
    maxAmountPerPeriod: new anchor.BN(200_000_000), // 200 USDC / month
    maxChunkAmount: new anchor.BN(TOPUP_CHUNK), // 50 USDC / call
    periodLengthSeconds: new anchor.BN(30 * 24 * 3600),
    currentPeriodStart: new anchor.BN(Math.floor(Date.now() / 1000)),
    currentPeriodTotal: new anchor.BN(0),
    expiryDate: null,
    padding: new Array(79).fill(0),
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
    pinnedAccounts: [],
  },
  inputMint: USDC_MINT,
  outputMint: NATIVE_MINT, // WSOL delivery
  forwardFlags: 0,
};

const ixs = await sdk.createComposable(
  USDC_MINT,
  hotWallet.publicKey, // recipient = the hot wallet
  gatewayPDA,
  policyType,
  "Auto SOL topup",
  forwardConfig,
  { programCall: { programId: LIGHTHOUSE_PROGRAM_ID } }, // preValidation
  [hotWalletUsdcAta], // prePinnedAccounts
  guard.data, // preValidationData
  undefined,
  new anchor.BN(200_000_000) // approvalAmount
);

await sendAndConfirmTransaction(connection, new Transaction().add(...ixs), [
  coldWallet,
]);
```

## Step 3: Execute (permissionless)

A scheduler polls the hot wallet balance and fires this when the guard
would pass. The guard reverts the tx if the balance is still above threshold.

```typescript
const { address: composablePolicyPDA } = sdk.getComposablePolicyPda(
  sdk.getUserPaymentPda(coldWallet.publicKey, USDC_MINT).address,
  1
);

const swapIx = await buildSwapIx(composablePolicyPDA);

const forwardAccounts = swapIx.keys.map((k) => ({
  pubkey: k.pubkey,
  isSigner: false,
  isWritable: true,
}));

const remainingAccounts = [
  ...guard.accounts, // Lighthouse target accounts
  ...forwardAccounts, // DLMM swap accounts
];

const execIxs = await sdk.executeComposable(
  composablePolicyPDA,
  Buffer.from(swapIx.data), // swap instruction data
  new anchor.BN(TOPUP_CHUNK), // pull amount
  remainingAccounts
);

await sendAndConfirmTransaction(connection, new Transaction().add(...execIxs), [
  coldWallet,
]);
```

## What happened

1. **Pull** — 50 USDC + fees pulled from cold wallet to intermediate ATA.
2. **Skim** — Protocol + gateway fees skimmed (input-side, USDC).
3. **Pre-validate** — Lighthouse checks `hotWalletUsdcAta.amount < 50 USDC`.
   Reverts if the hot wallet doesn't need a topup.
4. **Forward** — DLMM swap: USDC → WSOL.
5. **Settle (deliver-transform)** — WSOL swept to the hot wallet's WSOL ATA.

## Next steps

- [AI agent budget](./ai-agent-budget.md) — same guard, no swap (simplest)
- [Auto-DCA](./auto-dca.md) — recurring schedule with swap
- [Native SOL topup example](../examples/native-sol-topup.md) — unwrap WSOL to
  native SOL with `FORWARD_FLAG_NATIVE_OUTPUT`
- [Forward CPI guide](../forward-cpi-guide.md) — how to pin forward instructions
