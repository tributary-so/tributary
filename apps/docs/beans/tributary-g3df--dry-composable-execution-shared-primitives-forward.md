---
# tributary-g3df
title: DRY composable execution — shared primitives + forward-builders package
status: todo
type: milestone
priority: high
created_at: 2026-07-15T10:10:52Z
updated_at: 2026-07-15T10:10:52Z
---

# DRY Composable Execution — Shared Primitives + Forward-Builders Package

## Problem

Composable policy execution logic is duplicated across `apps/scheduler/src/composable.ts`
and `apps/cli/src/commands/composable-policy/execute.ts`:

1. **Validation-target resolution** — "fetch ValidationPda → `parseValidationPda` → slice
   `pinnedAccounts[0..n]`" for pre and post, verbatim in both files (×2 each).
2. **remaining_accounts assembly** — `[...pre, ...forward(isWritable), ...post]` in the
   exact ADR-0016 order, duplicated.
3. **PayAsYouGo face→gross adjustment** — `maxChunk.muln(10_000).divn(10_000 + feeBps)`,
   character-for-character identical in `evaluator.ts:184` and `execute.ts:68`.
4. **Forward ix construction** — scheduler's `buildForwardIx` is the only fire-time
   consumer today, but the CLI will need it too, and Mill's `composeSetup` has its own
   swap builder. Not yet duplicated, but on the path.

## Design Decisions (locked in grilling session, 2025-07-15)

### D1 — Package structure

| Package | Role | Deps |
|---|---|---|
| `@tributary-so/sdk` | `ForwardBuilder` **interface** + execution primitives. No forward-program deps. | unchanged |
| `@tributary-so/forward-builders` (NEW, `packages/forward-builders/`) | `MeteoraDlmmForward` + future well-known impls. | SDK + `@meteora-ag/dlmm` |
| `apps/scheduler`, `apps/cli` | Depend on both. Share the Meteora impl. No more duplication. | both |

The SDK owns the **interface**; concrete forward-program implementations live in a sibling
package. This keeps the SDK's dep surface unchanged (zero Meteora deps) and makes the
"pluggable forward programs" claim real rather than aspirational.

### D2 — SDK primitives (all additive, no breaking changes to `executeComposable`)

```
isForwardEnabled(policy)                    → boolean
grossCapToFace(grossCap, feeBps)            → BN
resolveDefaultForwardAmount(policy, gateway) → BN | null
resolveValidationTargets(connection, policyPda, spec, programId, phase) → Promise<PublicKey[]>
assembleComposableRemainingAccounts({ preTargets, forwardAccounts, postTargets }) → AccountMeta[]
```

**No orchestrator.** Callers chain primitives explicitly. An orchestrator (`prepareComposableExecution`)
is deferred until a third caller that wants the full pipeline with zero overrides. The assembly
order correctness risk is handled by `assembleComposableRemainingAccounts` taking named params —
that's sufficient.

### D3 — ForwardBuilder interface

```typescript
interface ForwardBuilder {
  build(ctx: {
    connection: Connection;
    policy: ComposablePolicy;
    composablePolicyPda: PublicKey;
    face: BN;
  }): Promise<{
    instructionData: Buffer;
    forwardAccounts: { pubkey: PublicKey; isWritable: boolean }[];
  }>;
}
```

- Builder receives `face` (the amount the forward consumes; caller resolves via
  `resolveDefaultForwardAmount` or manual override).
- Builder returns `{ pubkey, isWritable }[]` — **no `isSigner` field**. The assembler
  stamps `isSigner: false` on ALL forward accounts (ADR-0008 CPI signer sanitization).
  A builder literally cannot leak signer authority because the type doesn't have the field.
- Per-account `isWritable` comes from the forward program's own account list (e.g.
  Meteora DLMM's `swapIx.keys`). The current scheduler's "force all writable" is a
  behavior change — corrected to per-account writability.

### D4 — ADR-0008 enforcement lives in the assembler

`assembleComposableRemainingAccounts` owns the security boundary:
```
preTargets      → { pubkey, isSigner: false, isWritable: false }
forwardAccounts → { pubkey, isSigner: false, isWritable: <builder-supplied> }
postTargets     → { pubkey, isSigner: false, isWritable: false }
```

### D5 — Caller refactors

- **Scheduler**: `buildForwardIx` deleted. Fire path calls primitives + `MeteoraDlmmForward`.
  `FORWARD_CONTEXT`/`lookupForwardContext` stay until Bean 2 (HANDOFF dynamic pool resolution).
  Prefilter's batch ValidationPda parsing stays as-is (batch optimization, not duplicated).
- **CLI**: validation-target inline blocks → `resolveValidationTargets`. Assembly block →
  `assembleComposableRemainingAccounts`. PayAsYouGo amount → `resolveDefaultForwardAmount`.
  Keeps raw `--forward-ix` / `--forward-accounts` path (no builder support — that's Bean 2).

### D6 — Explicitly NOT in this milestone

- Dynamic DLMM pool resolution (HANDOFF.md) — separate milestone, consumes this work.
- CLI forward-builder support (`--forward-meteora`) — Bean 2 / feature work.
- Orchestrator function — deferred until third caller.
- Prefilter batch refactor — scheduler-specific, not duplicated.

## Scope trace (per AGENTS.md rules)

| Touched area | Bean type | Notes |
|---|---|---|
| `packages/sdk/` | feature | New primitives + ForwardBuilder interface |
| `packages/forward-builders/` (NEW) | feature | MeteoraDlmmForward extracted from scheduler |
| `apps/scheduler/` | task | Refactor to consume primitives |
| `apps/cli/` | task | Refactor to consume primitives |
| `apps/docs/` | feature | ADR-0030 + docs update |
| No program changes | — | No qedspec update needed |
| New ADR ⇒ doc feature | feature | ADR-0030 |

## ADR

New ADR-0030: "Composable execution primitives: ForwardBuilder interface + shared helpers"
locks in D1–D4. The decision is hard to reverse (consumers depend on the interface),
surprising without context (why not orchestrator? why separate package?), and has real
trade-offs (primitives vs orchestrator, SDK dep cleanliness vs convenience).
