---
# tributary-51or
title: Implement createWhirlpoolForward + whirlpoolForwardConfig in forward-builders
status: completed
type: task
priority: high
created_at: 2026-07-23T18:42:10Z
updated_at: 2026-07-26T11:57:51Z
parent: tributary-z893
---

Create `packages/forward-builders/src/whirlpool.ts` following the co-located fire-half/setup-half pattern of `meteora-dlmm.ts` and `raydium-clmm.ts`. Full contract in milestone tributary-na7u HANDOFF §§2-4 (account order, data offsets, constraint layout, kit-v2 interop rules, pseudo-code).

Task-local notes:

- Deps: add `@orca-so/whirlpools` + `@solana/kit` to `packages/forward-builders/package.json` — internal use only, public API stays web3.js v1 (`PublicKey`, `Connection`, `BN`).
- `whirlpoolForwardConfig` is async (fetches the pool to derive `aToB` and validate mints) — unlike the sync Meteora config; document why in the docstring.
- Add `WHIRLPOOL_PUBKEY` to `src/constants.ts`; export builder, config, discriminator, and options types from `src/index.ts`.
- Unit tests in `src/whirlpool.test.ts` mirroring `meteora-dlmm.test.ts` / `raydium-cpmm.test.ts`: discriminator equals sha256("global:swapV2")[0..8]; config pins pool at account index 4, exact-in byte at offset 40, aToB byte at offset 41; config rejects input/output mints that don't match the pool.

## Tasks

- [x] Add @orca-so/whirlpools + @solana/kit deps
- [x] createWhirlpoolForward (fire half): noop-signer swapInstructions, extract whirlpool ix, convert kit metas → ForwardAccountMeta
- [x] whirlpoolForwardConfig (setup half): 3 dataChecks + pool pinned at index 4, mint validation, unwrapNativeSol flag
- [x] Constants + index exports
- [x] Unit tests green, typecheck green

## Summary of Changes

- `packages/forward-builders/src/whirlpool.ts` — new module: `createWhirlpoolForward` (fire half) + `whirlpoolForwardConfig` (setup half) + `WHIRLPOOL_SWAP_V2_DISCRIMINATOR`.
  - Fire half uses `@orca-so/whirlpools` `swapInstructions` with kit v2 interop (createSolanaRpc, createNoopSigner); extracts only the whirlpool swap instruction; converts kit account metas → ForwardAccountMeta via `isWritableRole`.
  - Setup half reads the whirlpool account via web3.js v1 `getAccountInfo` (tokenMintA at offset 101, tokenMintB at offset 181), validates mints, derives `aToB`, and builds 3 dataChecks (discriminator + exact-in + aToB) + pool pinned at index 4.
  - `WHIRLPOOL_SWAP_V2_DISCRIMINATOR = [43, 4, 237, 11, 26, 201, 30, 98]` = sha256("global:swap_v2")[0..8]. NOTE: the milestone HANDOFF labelled this `sha256("global:swapV2")` — the actual Anchor instruction name is `swap_v2` (snake_case); the bytes are verified against the Orca whirlpools-client source.
- `packages/forward-builders/src/whirlpool.test.ts` — 15 unit tests: fire-half kit role conversion, isSigner omission, instructionData extraction, missing-instruction throw; config-half discriminator sha256 verification, programId/pool/mint pinning, 3 dataChecks (offset 0/40/41), aToB both directions, unwrapNativeSol flag, mint-mismatch rejection, pool-not-found throw.
- `packages/forward-builders/src/constants.ts` — added `WHIRLPOOL_PUBKEY`.
- `packages/forward-builders/src/index.ts` — exported builder, config, discriminator, options types, and `WHIRLPOOL_PUBKEY`.
- `packages/forward-builders/package.json` — added `@orca-so/whirlpools` + `@solana/kit` as optional peer deps and dev deps.
- All 32 forward-builders tests green; `tsc --noEmit --strict` clean.
