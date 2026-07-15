---
# tributary-jhc2
title: Scheduler refactor — consume SDK primitives + MeteoraDlmmForward (apps/scheduler/)
status: completed
type: task
priority: high
created_at: 2026-07-15T10:13:17Z
updated_at: 2026-07-15T11:31:04Z
parent: tributary-l8wr
blocked_by:
    - tributary-t4je
    - tributary-n1bj
---

# Scheduler Refactor — Consume SDK Primitives + MeteoraDlmmForward

## What

Refactor `apps/scheduler/src/composable.ts` to consume the SDK primitives and
`@tributary-so/forward-builders` instead of its own `buildForwardIx` and
`resolveValidationTargets`.

## Changes

### Delete
- `buildForwardIx` function (lines 89–157) — replaced by `MeteoraDlmmForward.build()`
- `BuiltForward` interface (lines 79–87) — no longer needed
- `resolveValidationTargets` private method (lines 558–576) — replaced by SDK primitive

### Keep (until Bean 2 / HANDOFF)
- `FORWARD_CONTEXT` map, `METEORA_DLMM_SOL_USDC_POOL`, `lookupForwardContext` — these
  provide the static pool config. Bean 2 replaces them with dynamic resolution. For now,
  the scheduler constructs `MeteoraDlmmForward` using the static context.

### Refactor: `fire()` method

Before:
```typescript
const built = await buildForwardIx(policy.account, policy.publicKey,
  policy.forwardContext, amount, this.sdk.connection);
const [preTargets, postTargets] = await Promise.all([...]);
const remainingAccounts = [...preTargets, ...built.forwardAccounts, ...postTargets];
const ixs = await this.sdk.executeComposable(policy.publicKey,
  built.ixData, built.forwardAmount, remainingAccounts);
```

After:
```typescript
import { createMeteoraDlmmForward } from "@tributary-so/forward-builders";
import {
  isForwardEnabled, resolveValidationTargets,
  assembleComposableRemainingAccounts,
} from "@tributary-so/sdk";

const forwardPayload = isForwardEnabled(policy.account)
  ? await createMeteoraDlmmForward({
      pool: policy.forwardContext.pool,
      slippageBps: policy.forwardContext.slippageBps,
      applyHostFeeInFix: policy.forwardContext.applyHostFeeInFix,
    }).build({
      connection: this.sdk.connection,
      policy: policy.account,
      composablePolicyPda: policy.publicKey,
      face: amount,
    })
  : { instructionData: Buffer.alloc(0), forwardAccounts: [] };

const [preTargets, postTargets] = await Promise.all([
  resolveValidationTargets(this.sdk.connection, policy.publicKey,
    policy.account.preValidation, this.sdk.programId, 'pre'),
  resolveValidationTargets(this.sdk.connection, policy.publicKey,
    policy.account.postValidation, this.sdk.programId, 'post'),
]);

const remainingAccounts = assembleComposableRemainingAccounts({
  preTargets,
  forwardAccounts: forwardPayload.forwardAccounts,
  postTargets,
});

const ixs = await this.sdk.executeComposable(
  policy.publicKey, forwardPayload.instructionData, amount, remainingAccounts);
```

### Keep unchanged
- `prefilter()` — batch ValidationPda parsing stays (it's a batch optimization, not duplication)
- `rescanAll()`, `tick()`, `recordFailure()`, cooldown logic
- `evaluator.ts` — `isScheduleReady` stays (it's scheduler-specific readiness + amount)
  BUT: replace inline `maxChunk.muln(10_000).divn(10_000 + feeBps)` at line 184 with
  `grossCapToFace(maxChunk, feeBps)` from SDK

## TDD checklist
- [ ] Scheduler still resolves fireable policies correctly (prefilter unchanged)
- [ ] Fire path produces identical transactions (modulo isWritable per-account change)
- [ ] `evaluator.ts` uses `grossCapToFace` instead of inline formula
- [ ] Integration test: composable fires end-to-end against Surfpool (existing test suite passes)
- [ ] No new package deps beyond `@tributary-so/forward-builders`

## Key references
- Milestone D5 (caller refactor rules)
- `composable.ts:89-157` — `buildForwardIx` to delete
- `composable.ts:454-556` — `fire()` method to refactor
- `composable.ts:558-576` — `resolveValidationTargets` to delete
- `evaluator.ts:177-194` — PayAsYouGo amount derivation, swap inline formula → `grossCapToFace`

## Summary of Changes

### composable.ts (−140 net lines)
- **Deleted**  function +  interface (~80 lines) — replaced by `createMeteoraDlmmForward().build()` from `@tributary-so/forward-builders`
- **Deleted** `ComposableScheduler.resolveValidationTargets()` private method (~19 lines) — replaced by SDK primitive `resolveValidationTargets()`
- **Refactored** `fire()` to consume: `isForwardEnabled`, `createMeteoraDlmmForward`, `resolveValidationTargets`, `assembleComposableRemainingAccounts`
- **Removed** now-unused imports: `DLMM`, `SystemProgram`, `getPostValidationPda`, `METEORA_DLMM_PUBKEY` const
- **Kept** `FORWARD_CONTEXT` / `lookupForwardContext` / prefilter batch logic (per D5 — Bean 2 territory)

### evaluator.ts
- Replaced inline `maxChunk.muln(10_000).divn(10_000 + feeBps)` with `grossCapToFace(maxChunk, feeBps)` from SDK

### package.json
- Added `@tributary-so/forward-builders: workspace:*` dependency

### Verification
- `pnpm run build` (tsup) — clean
- `pnpm run lint` (eslint) — clean
- Surfpool integration tests require a running validator (pre-existing constraint)
