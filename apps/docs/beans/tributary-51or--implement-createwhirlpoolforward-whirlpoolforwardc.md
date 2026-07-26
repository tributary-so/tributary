---
# tributary-51or
title: Implement createWhirlpoolForward + whirlpoolForwardConfig in forward-builders
status: todo
type: task
priority: high
created_at: 2026-07-23T18:42:10Z
updated_at: 2026-07-26T11:37:58Z
parent: tributary-z893
---

Create `packages/forward-builders/src/whirlpool.ts` following the co-located fire-half/setup-half pattern of `meteora-dlmm.ts` and `raydium-clmm.ts`. Full contract in milestone tributary-na7u HANDOFF §§2-4 (account order, data offsets, constraint layout, kit-v2 interop rules, pseudo-code).

Task-local notes:

- Deps: add `@orca-so/whirlpools` + `@solana/kit` to `packages/forward-builders/package.json` — internal use only, public API stays web3.js v1 (`PublicKey`, `Connection`, `BN`).
- `whirlpoolForwardConfig` is async (fetches the pool to derive `aToB` and validate mints) — unlike the sync Meteora config; document why in the docstring.
- Add `WHIRLPOOL_PUBKEY` to `src/constants.ts`; export builder, config, discriminator, and options types from `src/index.ts`.
- Unit tests in `src/whirlpool.test.ts` mirroring `meteora-dlmm.test.ts` / `raydium-cpmm.test.ts`: discriminator equals sha256("global:swapV2")[0..8]; config pins pool at account index 4, exact-in byte at offset 40, aToB byte at offset 41; config rejects input/output mints that don't match the pool.

## Tasks

- [ ] Add @orca-so/whirlpools + @solana/kit deps
- [ ] createWhirlpoolForward (fire half): noop-signer swapInstructions, extract whirlpool ix, convert kit metas → ForwardAccountMeta
- [ ] whirlpoolForwardConfig (setup half): 3 dataChecks + pool pinned at index 4, mint validation, unwrapNativeSol flag
- [ ] Constants + index exports
- [ ] Unit tests green, typecheck green
