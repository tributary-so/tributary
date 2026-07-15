---
# tributary-n1bj
title: '@tributary-so/forward-builders package with MeteoraDlmmForward'
status: completed
type: feature
priority: high
created_at: 2026-07-15T10:12:23Z
updated_at: 2026-07-15T11:20:54Z
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

## Summary of Changes

New package `@tributary-so/forward-builders` (`packages/forward-builders/`) exporting the first concrete `ForwardBuilder` implementation, extracted from `apps/scheduler/src/composable.ts:buildForwardIx`.

### Files added
- `packages/forward-builders/package.json` — package manifest (deps: `@tributary-so/sdk` workspace, `@meteora-ag/dlmm`, `@solana/web3.js`, `bn.js`; devDeps: jest/ts-jest/tsup/typescript). ESM build via tsup mirroring `packages/sdk/`.
- `packages/forward-builders/tsconfig.json` / `tsup.config.ts` / `jest.config.cjs` — build + test config (jest config mirrors `packages/payments/` package-local convention).
- `packages/forward-builders/src/index.ts` — re-exports `createMeteoraDlmmForward` + `METEORA_DLMM_PUBKEY`.
- `packages/forward-builders/src/constants.ts` — `METEORA_DLMM_PUBKEY` (`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`).
- `packages/forward-builders/src/meteora-dlmm.ts` — `createMeteoraDlmmForward(opts): ForwardBuilder`. Faithful port of scheduler `buildForwardIx` body, with the ADR-0008 boundary fix: returns `{ pubkey, isWritable }[]` (no `isSigner` field), per-account `isWritable` preserved from `swapIx.keys` (was: force all writable in scheduler).
- `packages/forward-builders/src/meteora-dlmm.test.ts` — 7 passing unit tests (DLMM mocked). Covers: interface conformance, instructionData, per-account isWritable preservation, no-isSigner invariant, applyHostFeeInFix rewrite on/off, missing-swap-ix error.

### Verification
- `pnpm --filter @tributary-so/forward-builders build` → clean ESM + d.ts emit.
- `pnpm --filter @tributary-so/forward-builders test` → 7/7 pass.

### Behavior change vs scheduler (per milestone D3/D4)
`forwardAccounts` now carries per-account `isWritable` from the swap instruction's own key list instead of forcing all-writable. The `isSigner: false` stamping has moved to the SDK assembler (`assembleComposableRemainingAccounts`) — the builder type literally has no `isSigner` field (ADR-0008).

### Deferred (per milestone D6)
- Scheduler refactor to consume this builder → bean tributary-jhc2.
- CLI forward-builder support → bean tributary-r00t / future feature.
- Integration parity test (scheduler fire path) → bean tributary-jhc2 (checklist item 7).
