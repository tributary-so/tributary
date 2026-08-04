# Quickstart: AI Agent Budget

Give an AI agent a capped USDC allowance. It can pull funds on-demand, but
only up to a per-period ceiling — and only when its hot wallet actually
needs it. No forward, no swap: pure conditional pull.

**You'll build:** a PayAsYouGo composable policy with a Lighthouse balance
guard. The agent pulls USDC only when its wallet dips below a threshold.

**Time to first value:** <10 min if you have a funded devnet wallet.

## Prerequisites

- Node 18+, `@solana/web3.js`, `@coral-xyz/anchor`, `@tributary-so/sdk`
- A funded Solana wallet (devnet or mainnet)
- A `PaymentGateway` — create one via the SDK manager CLI or
  `sdk.createPaymentGateway()`
- USDC in your wallet (the funder)

## Setup

```typescript
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Tributary, lighthouse, LIGHTHOUSE_PROGRAM_ID } from "@tributary-so/sdk";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const connection = new Connection("https://api.devnet.solana.com");

// Your wallet (funder) and the agent's wallet (recipient)
const funder = Keypair.generate();   // load from your wallet provider
const agentWallet = Keypair.generate();

const sdk = new Tributary(connection, {
  publicKey: funder.publicKey,
  signTransaction: /* your signer */,
} as any);

const gatewayPDA = new PublicKey("<your gateway PDA>");

// The agent's USDC ATA — Lighthouse will read its balance
const agentUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, agentWallet.publicKey);
```

## Step 1: Build the guard

Only allow pulls when the agent's USDC balance is below 50 USDC. This
prevents the agent from draining funds it doesn't need.

```typescript
const THRESHOLD = 50_000_000; // 50 USDC (6 decimals)

const guard = lighthouse
  .tokenAccount(agentUsdcAta)
  .amount(THRESHOLD, "<")
  .build();
```

## Step 2: Create the policy

One call handles ATA creation, UserPayment, the composable policy, and
delegate approval.

```typescript
const CAP_MONTHLY = 1_000_000_000; // 1000 USDC / month
const CAP_PER_CALL = 50_000_000; // 50 USDC / call
const THIRTY_DAYS_S = 30 * 24 * 3600;

const policyType = {
  payAsYouGo: {
    maxAmountPerPeriod: new anchor.BN(CAP_MONTHLY),
    maxChunkAmount: new anchor.BN(CAP_PER_CALL),
    periodLengthSeconds: new anchor.BN(THIRTY_DAYS_S),
    currentPeriodStart: new anchor.BN(Math.floor(Date.now() / 1000)),
    currentPeriodTotal: new anchor.BN(0),
    expiryDate: null,
    padding: new Array(79).fill(0),
  },
};

// Forward disabled — same-mint (USDC → USDC), no swap
const forwardConfig = {
  instructionConstraint: {
    programId: PublicKey.default, // sentinel: forward disabled (static getter, no parens)
    numDataChecks: 0,
    dataChecks: Array(4).fill({
      offset: 0,
      length: 0,
      expected: Buffer.alloc(8),
    }),
    numPinnedAccounts: 0,
    pinnedAccounts: [
      { index: 0, pubkey: PublicKey.default },
      { index: 0, pubkey: PublicKey.default },
    ], // fixed-size [PinnedAccount; 2] — must have 2 entries even when disabled
  },
  inputMint: USDC_MINT,
  outputMint: USDC_MINT, // == inputMint ⇒ deliver-no-transform settlement
  forwardFlags: 0,
};

const ixs = await sdk.createComposable(
  USDC_MINT,
  agentWallet.publicKey, // recipient = the AI agent
  gatewayPDA,
  policyType,
  "AI agent budget",
  forwardConfig,
  { programCall: { programId: LIGHTHOUSE_PROGRAM_ID } }, // preValidation
  [agentUsdcAta], // prePinnedAccounts
  guard.data, // preValidationData
  { disabled: {} }, // postValidation (disabled — pre-validation is enough here)
  [], // postPinnedAccounts
  Buffer.alloc(0), // postValidationData
  undefined, // feePayer (defaults to provider)
  new anchor.BN(CAP_MONTHLY) // approvalAmount (delegate approval cap)
);

// Send the transaction
await sendAndConfirmTransaction(connection, new Transaction().add(...ixs), [
  funder,
]);
```

## Step 3: Execute (permissionless)

Anyone can execute — the agent itself, a scheduler, or your backend. The
guard fires first: if the agent's balance is ≥ threshold, the tx reverts.

```typescript
const { address: composablePolicyPDA } = sdk.getComposablePolicyPda(
  sdk.getUserPaymentPda(funder.publicKey, USDC_MINT).address,
  1 // first composable policy
);

const execIxs = await sdk.executeComposable(
  composablePolicyPDA,
  Buffer.alloc(0), // no forward instruction data
  new anchor.BN(CAP_PER_CALL), // pull 50 USDC
  guard.accounts // Lighthouse read-accounts
);

await sendAndConfirmTransaction(connection, new Transaction().add(...execIxs), [
  funder,
]);
```

## What happened

1. **Pull** — 50 USDC + fees pulled from your wallet to the intermediate ATA.
2. **Skim** — Protocol + gateway fees skimmed (input-side, USDC).
3. **Pre-validate** — Lighthouse checks `agentUsdcAta.amount < 50 USDC`. Passes
   only when the agent is low on funds.
4. **Settle** — USDC swept to the agent's ATA.

If the agent already has ≥ 50 USDC, the assertion fails and nothing moves.

## Next steps

- [Auto-topup quickstart](./auto-topup.md) — same guard but with a USDC→SOL swap
- [Auto-DCA quickstart](./auto-dca.md) — recurring subscription with a forward swap
- [Lighthouse facade guide](../lighthouse-facade.md) — every assertion family
- [SDK reference](../sdk.md) — full composable API
