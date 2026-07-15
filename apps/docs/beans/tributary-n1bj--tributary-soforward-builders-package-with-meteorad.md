---
# tributary-n1bj
title: '@tributary-so/forward-builders package with MeteoraDlmmForward'
status: todo
type: feature
priority: high
created_at: 2026-07-15T10:12:23Z
updated_at: 2026-07-15T10:12:23Z
parent: tributary-l8wr
blocked_by:
    - tributary-t4je
---

# @tributary-so/forward-builders package

## What

New package at `packages/forward-builders/`. Exports `MeteoraDlmmForward` — the first
concrete `ForwardBuilder` implementation. Extracted from `apps/scheduler/src/composable.ts:89-157`
(`buildForwardIx`).

## Package setup
- `packages/forward-builders/package.json` — name `@tributary-so/forward-builders`
- Dependencies: `@tributary-so/sdk` (workspace:*), `@meteora-ag/dlmm`, `@solana/web3.js`, `bn.js`
- Dev deps: `typescript`, `tsup`, `eslint`, `@types/bn.js`, `@types/node`
- `tsup` build config mirroring `packages/sdk/`
- `tsconfig.json` extending root
- Export from `src/index.ts`

## MeteoraDlmmForward

```typescript
import type { ForwardBuilder } from "@tributary-so/sdk";

export function createMeteoraDlmmForward(opts: {
  pool: PublicKey;
  slippageBps: number;
  applyHostFeeInFix?: boolean;
}): ForwardBuilder {
  return {
    async build({ connection, policy, composablePolicyPda, face }) {
      // ... body from scheduler's buildForwardIx
    },
  };
}
```

### Body (adapted from `composable.ts:89-157`)

```typescript
const dlmmPool = await DLMM.create(connection, opts.pool, {
  cluster: "mainnet-beta",
  skipSolWrappingOperation: true,
});

const inputMint = policy.forwardConfig.inputMint;
const outputMint = policy.forwardConfig.outputMint;
const swapForY = inputMint.equals(dlmmPool.tokenX.publicKey);
const binArrays = await dlmmPool.getBinArrayForSwap(swapForY);
const quote = dlmmPool.swapQuote(face, swapForY, new BN(opts.slippageBps), binArrays);

const swapTx = await dlmmPool.swap({
  lbPair: opts.pool,
  inToken: inputMint,
  outToken: outputMint,
  inAmount: face,
  minOutAmount: quote.minOutAmount,
  user: composablePolicyPda,
  binArraysPubkey: quote.binArraysPubkey as PublicKey[],
});

const swapIx = swapTx.instructions.find((i) =>
  i.programId.equals(METEORA_DLMM_PUBKEY)
);
if (!swapIx) throw new Error("DLMM swap instruction not found");

let keys = swapIx.keys;
if (opts.applyHostFeeInFix) {
  keys = keys.map((k) =>
    k.pubkey.equals(SystemProgram.programId)
      ? { ...k, pubkey: METEORA_DLMM_PUBKEY }
      : k
  );
}

// BEHAVIOR CHANGE: per-account isWritable from swapIx.keys (was: force all writable)
return {
  instructionData: Buffer.from(swapIx.data),
  forwardAccounts: keys.map((k) => ({
    pubkey: k.pubkey,
    isWritable: k.isWritable,  // was: true (forced)
  })),
};
```

### Constants
- `METEORA_DLMM_PUBKEY` = `new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")`
  (from `programs/tributary/src/constants.rs` ALLOWED_FORWARD_PROGRAMS)

## TDD checklist
- [ ] Package scaffolds and builds (`pnpm --filter @tributary-so/forward-builders build`)
- [ ] `createMeteoraDlmmForward` returns a valid `ForwardBuilder` (implements interface)
- [ ] `build()` returns correct `instructionData` (non-empty Buffer)
- [ ] `build()` returns `forwardAccounts` with per-account `isWritable` from swapIx.keys (NOT all-true)
- [ ] `build()` applies `applyHostFeeInFix` key rewrite when enabled (SystemProgram → DLMM)
- [ ] `build()` does NOT include `isSigner` in returned accounts (type doesn't have the field)
- [ ] Integration: scheduler fire path using the builder produces identical instructionData to old buildForwardIx (modulo isWritable change)

## Key references
- Milestone D3 (ForwardBuilder interface shape)
- Milestone D4 (ADR-0008 enforcement in assembler, not builder)
- `composable.ts:89-157` — source to extract from
- `composable.ts:43-44` — METEORA_DLMM_SOL_USDC_POOL (stays in scheduler config, NOT in this package)
- ADR-0008: CPI signer sanitization
