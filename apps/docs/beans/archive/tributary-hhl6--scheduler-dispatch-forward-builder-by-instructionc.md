---
# tributary-hhl6
title: "Scheduler: dispatch forward builder by instructionConstraint.programId"
status: completed
type: task
priority: high
created_at: 2026-07-23T18:42:36Z
updated_at: 2026-07-26T12:06:55Z
parent: tributary-z893
blocked_by:
  - tributary-51or
---

`apps/scheduler/src/composable.ts` (fire(), ~line 477) hard-codes `createMeteoraDlmmForward` for every forward-enabled policy — Raydium CPMM/CLMM and Whirlpool policies would be built with the wrong builder and fail the on-chain constraint check.

Replace with a dispatch on `policy.forwardConfig.instructionConstraint.programId` → builder factory covering all four allowlisted programs (Meteora DLMM, Raydium CPMM, Raydium CLMM, Whirlpool). Note the pool is at `pinnedAccounts[0].pubkey` in every config (only the pinned `index` differs), so the existing pool lookup is unchanged. Raydium CLMM additionally needs `ammConfig` — resolve it the way the CLMM test/config does.

Prefer exporting a shared `getForwardBuilderFor(policy, opts)` helper from `@tributary-so/forward-builders` so the CLI can reuse the dispatch; unknown programId → explicit error naming the pubkey.

See milestone tributary-na7u HANDOFF §2/§5.

## Tasks

- [x] Dispatch helper mapping programId → ForwardBuilder (all four programs)
- [x] Scheduler fire() uses the dispatch; unknown program errors loudly
- [x] Typecheck + existing scheduler tests green

## Summary of Changes

- `packages/forward-builders/src/dispatch.ts` — new module: `getForwardBuilderFor(policy, opts)` dispatches by `instructionConstraint.programId` → the four allowlisted builders (Meteora DLMM, Raydium CPMM, Raydium CLMM, Whirlpool). Pool is always at `pinnedAccounts[0].pubkey`; Raydium CPMM/CLMM also read `ammConfig` from `pinnedAccounts[1]`. Unknown programId → explicit error naming the pubkey.
- `packages/forward-builders/src/index.ts` — exported `getForwardBuilderFor` + `ForwardBuilderDispatchOptions`.
- `apps/scheduler/src/composable.ts` — replaced hard-coded `createMeteoraDlmmForward` with `getForwardBuilderFor(policy.account, {...})`. Now all four forward programs are supported.
- forward-builders typecheck + 32 tests green; scheduler typecheck + lint green (composable.ts clean; pre-existing logger.ts errors unrelated).
