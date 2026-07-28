---
# tributary-tm1h
title: Update src/index.ts exports + CHANGELOG
status: completed
type: task
priority: normal
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T12:38:23Z
parent: tributary-evkj
blocked_by:
    - tributary-b3jg
---

Re-export createRaydiumCpmmForward, raydiumCpmmForwardConfig, RAYDIUM_CPMM_SWAP_DISCRIMINATOR, RAYDIUM_CPMM_PUBKEY, types. Update CHANGELOG.md for the peerDep restructure (breaking) + new builder.


## Summary of Changes

- `packages/forward-builders/src/index.ts`: Added re-exports for `createRaydiumCpmmForward`, `raydiumCpmmForwardConfig`, `RAYDIUM_CPMM_SWAP_BASE_INPUT_DISCRIMINATOR`, `RAYDIUM_CPMM_PUBKEY`, `RaydiumCpmmForwardOptions`, `RaydiumCpmmForwardConfigOptions`.
- `packages/forward-builders/CHANGELOG.md`: Added Unreleased section documenting the peerDep restructure (breaking) and the new Raydium CPMM builder.

Verification: `tsc --noEmit` clean, `pnpm test` 17/17, `pnpm run build` succeeds, `.d.ts` exports confirmed.
