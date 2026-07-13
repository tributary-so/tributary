# Example: Swap & Deliver (USDC → WSOL via Meteora DLMM)

**Use case.** A service charges in USDC (the input mint the user holds), but
the recipient wants to be paid in WSOL. The composable policy pulls USDC from
the user, swaps it through a Meteora DLMM pool into WSOL, and delivers WSOL
(minus fees) to the recipient's WSOL ATA.

This is a composable policy with:

- **Forward enabled** — `programId = METEORA_DLMM_PUBKEY` on the
  `instructionConstraint`, with a `ByteRangeCheck` pinning the swap
  instruction discriminator at offset 0.
- **Optional validation** — same pattern as the topup guard (e.g. only swap
  when the recipient's WSOL balance is below a threshold).
- **Input-side fees** — protocol and gateway fees are skimmed from the
  gross USDC pull in Phase 1b (ADR-0026), before the forward runs. The
  swap and deliver phases move only the net principal.

```mermaid
graph LR
    Cold["coldWallet<br/>(user, USDC)"] -->|"pull USDC (gross)<br/>(UserPayment PDA signs)"| In["intermediate USDC ATA"]
    In -->|"skim fees<br/>(input-side)"| Fee["protocol fee + gateway fee<br/>(USDC)"]
    PreVal["Lighthouse CPI<br/>(pre‑validation)"] -.->|"assertion → continue"| In
    In -->|"swap via DLMM<br/>(ComposablePolicy PDA signs)"| Out["intermediate WSOL ATA"]
    PostVal["Lighthouse CPI<br/>(post‑validation)"] -.->|"assertion → continue"| Out
    Out -->|"sweep WSOL"| Hot["hotWallet<br/>(recipient, WSOL ATA)"]

    classDef user fill:#e8f5e8,stroke:#1b5e20
    classDef pda fill:#e3f2fd,stroke:#1565c0
    classDef val fill:#fff3e0,stroke:#e65100
    class Cold,Hot user
    class In,Out pda
    class PreVal,PostVal val
    class Fee user
```

## Constants

```typescript
import DLMM from "@meteora-ag/dlmm";
import { NATIVE_MINT } from "@solana/spl-token";

// The only program currently in ALLOWED_FORWARD_PROGRAMS.
const METEORA_DLMM_PUBKEY = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);
const METEORA_DLMM_SOL_USDC_POOL = new PublicKey("<your pool address>");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const SWAP_INPUT_AMOUNT = 50_000_000; // 50 USDC
```

!!! warning "Pool choice matters"
The pool you pass to `pool.swap()` must have `USDC_MINT` as one leg and
`NATIVE_MINT` as the other. Tributary does not validate the pool itself —
only that the forward program id is allowlisted and the instruction selector
matches the pinned `ByteRangeCheck`.

## 1. Build the DLMM swap instruction

The swap `user` MUST be the `ComposablePolicy` PDA — it owns both intermediate
ATAs, and Tributary's `run_forward_cpi` promotes it to signer via
`invoke_signed`.

```typescript
// Load the pool with skipSolWrappingOperation — pool.swap() otherwise appends
// a WSOL wrap/unwrap post-instruction; Tributary manages the intermediates
// itself.
const dlmmPool = await DLMM.create(connection, METEORA_DLMM_SOL_USDC_POOL, {
  cluster: "mainnet-beta",
  skipSolWrappingOperation: true,
});

// swapForY = true ⟹ in-token is X (we sell USDC, buy WSOL/Y).
const swapForY = USDC_MINT.equals(dlmmPool.tokenX.publicKey);
const binArrays = await dlmmPool.getBinArrayForSwap(swapForY);
const quote = dlmmPool.swapQuote(
  new anchor.BN(SWAP_INPUT_AMOUNT),
  swapForY,
  new anchor.BN(100), // 1% slippage
  binArrays
);
```

The ComposablePolicy PDA isn't known until after creation, so build the swap
ix in two places: once at creation (to extract its discriminator) and again at
execute (with the real `user`). Wrap it in a helper:

```typescript
async function buildSwapIx(user: PublicKey): Promise<TransactionInstruction> {
  const swapTx = await dlmmPool.swap({
    lbPair: METEORA_DLMM_SOL_USDC_POOL,
    inToken: USDC_MINT,
    outToken: NATIVE_MINT,
    inAmount: new anchor.BN(SWAP_INPUT_AMOUNT),
    minOutAmount: quote.minOutAmount, // slippage protection at the swap layer
    user,
    binArraysPubkey: quote.binArraysPubkey as PublicKey[],
  });

  // pool.swap() returns [CU-estimation ix, idempotent ATA-create ix, swap ix].
  // Keep ONLY the instruction whose programId == DLMM.
  const found = swapTx.instructions.find((i) =>
    i.programId.equals(METEORA_DLMM_PUBKEY)
  );
  if (!found) throw new Error("DLMM swap instruction not found");

  // hostFeeIn fix: the SDK passes hostFeeIn: null → Anchor serializes that as
  // the System Program id. The DLMM program rejects a System-Program-owned
  // host_fee_in. Rewrite that one account meta to the DLMM program id itself
  // (Meteora's own CLI/tests use that as the "no host fee" placeholder).
  const keys = found.keys.map((k) =>
    k.pubkey.equals(SystemProgram.programId)
      ? {
          pubkey: METEORA_DLMM_PUBKEY,
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        }
      : k
  );
  return new TransactionInstruction({
    keys,
    programId: found.programId,
    data: found.data,
  });
}

// Build once just to extract the discriminator for the ByteRangeCheck.
const discriminator = (await buildSwapIx(PublicKey.default)).data.slice(0, 8);
```

## 2. Create the composable policy

Forward enabled: `programId = METEORA_DLMM_PUBKEY` on the
`instructionConstraint`, at least one `ByteRangeCheck` pins the
discriminator at offset 0.

```typescript
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
  outputMint: NATIVE_MINT,
  forwardFlags: 0, // WSOL ATA delivery — see native-sol-topup.md for the unwrap variant
};

// Optional Lighthouse guard: only swap when recipient WSOL is below 1 WSOL.
const guard = lighthouse
  .tokenAccount(hotWalletWsolAta)
  .amount(1_000_000_000, "<")
  .build();

const createIx = await sdk.getCreateComposablePolicyInstruction(
  USDC_MINT,
  hotWallet.publicKey, // recipient
  gatewayPDA,
  policyType,
  "Topup WSOL swap",
  forwardConfig,
  { programCall: { programId: LIGHTHOUSE_PROGRAM_ID } }, // preValidation
  guard.accounts, // prePinnedAccounts — owner-declared Lighthouse target accounts
  guard.data // preValidationData
);
```

!!! info "Why pin the discriminator?"
Without a `ByteRangeCheck` at offset 0, a malicious gateway could substitute
any instruction data at execute time — the program ID is allowlisted, but
DLMM exposes other instructions besides `swap`. Pinning the first 8 bytes
locks the swap selector and refuses any other instruction shape.

## 3. Execute (permissionless)

The caller supplies:

- `instructionData` = the raw DLMM swap ix data (the same bytes whose first 8
  must match the pinned `ByteRangeCheck`).
- `forwardAmount` = the USDC pull size (required for PayAsYouGo; pass `null`
  for subscription/onetime).
- `remaining_accounts` = `[...guard.accounts, ...forwardAccounts]` — the
  `ValidationPda` is in the `accountsStrict` map; the remaining accounts
  slice is just the Lighthouse target accounts + forward accounts.

```typescript
// Two distinct intermediates (input_mint != output_mint), both owned by the
// ComposablePolicy PDA. The swap draws USDC from the input ATA and sends
// WSOL to the output ATA; fees + sweep then move WSOL to the recipient.
const swapIx = await buildSwapIx(composablePolicyPDA);

const forwardAccounts = swapIx.keys.map((k) => ({
  pubkey: k.pubkey,
  isSigner: false,
  // Mark ALL forward accounts writable. The DLMM program mutates several
  // accounts that dlmm-sdk@0.7.7's IDL marks read-only (e.g.
  // bin_array_bitmap_extension, oracle). The runtime permits marking an
  // account writable even if the callee never writes it, so this is safe
  // and sidesteps the stale-IDL mutability mismatch.
  isWritable: true,
}));

const remainingAccounts = [
  ...guard.accounts, // Lighthouse target accounts (no leading ValidationPda)
  ...forwardAccounts, // DLMM swap accounts (includes the self-listed DLMM program)
];

const [execIx] = await sdk.executeComposable(
  composablePolicyPDA,
  Buffer.from(swapIx.data),
  new anchor.BN(SWAP_INPUT_AMOUNT),
  remainingAccounts
);
// Returns [executeInstruction] — also ATA ensures for recipient + fee recipients
```

## `minOutputAmount` (removed)

`ForwardConfig.minOutputAmount` was removed in v2.1. The `ByteRangeCheck`
pins the swap instruction selector, so swap-level slippage (`minOutAmount` on
`pool.swapQuote`) is the caller's responsibility — it's encoded inside the
forward instruction data that the CPI executes verbatim.

For net-level guarantees (output after fees), use the **post-validation**
hook: a Lighthouse assertion against the intermediate output ATA balance
after the swap but before the sweep. This replaces the old inline
`minOutputAmount` field.

```typescript
const netGuard = lighthouse
  .tokenAccount(intermediateOutputAta)
  .amount(desiredMinOut, ">=")
  .build();

const createIx = await sdk.getCreateComposablePolicyInstruction(
  USDC_MINT,
  hotWallet.publicKey,
  gatewayPDA,
  policyType,
  "Topup WSOL swap",
  forwardConfig,
  preValidationSpec,
  prePinnedAccounts,
  preValidationData,
  { programCall: { programId: LIGHTHOUSE_PROGRAM_ID } }, // postValidation
  netGuard.accounts, // postPinnedAccounts
  netGuard.data // postValidationData
);
```

!!! info "Slippage protection"

    The DLMM `minOutAmount` inside the swap ix is the primary
    price-slippage defence. The post-validation hook is an optional backstop
    on the delivered amount; leave it disabled if swap-level slippage already
    covers your requirements.

## Failure modes

| Condition                                                      | Outcome                                                                      |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Swap selector doesn't match the pinned `ByteRangeCheck`        | `DiscriminatorCheckRequired` / `ByteRangeCheckFailed` → tx reverts.          |
| PayAsYouGo period cap exhausted                                | Rejected before the swap CPI runs.                                           |
| Lighthouse assertion fails (recipient already has enough WSOL) | Tx reverts before the swap.                                                  |
| Insufficient delegate amount on `userTokenAccount`             | `InsufficientDelegatedAmount`.                                               |
| Pool moves adversarially between quote and execute             | `minOutAmount` in the swap ix (or a post‑validation assertion) protects you. |

## Reference

- Working test: `tests/topup-balance-swap.test.ts` (runs against Surfpool
  with a mainnet-forked DLMM pool).
- [SDK surface](../sdk.md) — `executeComposable` and `remaining_accounts`
  layout.
- Next: [Native SOL topup](./native-sol-topup.md) — same flow but unwraps WSOL
  to native SOL via the `FORWARD_FLAG_NATIVE_OUTPUT` bit.
