# Composable execution primitives — ForwardBuilder interface + shared helpers

The composable execution pipeline (validation-target resolution, remaining_accounts
assembly, PayAsYouGo face→gross adjustment, forward-instruction construction) was
duplicated verbatim across `apps/scheduler` and `apps/cli`. This ADR locks in the
shape of the shared primitives extracted into `@tributary-so/sdk`, and the
`ForwardBuilder` interface that decouples the SDK from any specific forward program.

## Decision

### 1. Primitives, not orchestrator

The SDK exports focused, composable functions:

```typescript
isForwardEnabled(policy)                         → boolean
grossCapToFace(grossCap, feeBps)                 → BN
resolveDefaultForwardAmount(policy, gateway)     → BN | null
resolveValidationTargets(connection, policyPda, spec, programId, phase) → Promise<PublicKey[]>
assembleComposableRemainingAccounts({
  preTargets, forwardAccounts, postTargets
})                                               → AccountMeta[]
```

There is **no** `prepareComposableExecution(policy, builder, opts?)` orchestrator.
Callers chain the primitives explicitly. Rationale: the CLI needs to override
individual steps via flags (`--forward-ix`, `--forward-accounts`). Encoding that as
an opts bag (`preTargetsOverride`, `postTargetsOverride`, `forwardAmountOverride`,
`forwardPayloadOverride`) is just the primitives re-encoded as optional params —
more rigid, no safer. Explicit imperative code ("call the primitive, optionally
replace with a flag") reads better and stays honest about what's overridden.

The one real correctness risk — remaining_accounts ordering (ADR-0016 requires
`[...pre, ...forward-writable, ...post]`) — is locked by
`assembleComposableRemainingAccounts` taking **named** params. Callers cannot
assemble the slice in the wrong order because they never assemble it at all.

An orchestrator is deferred until a third caller wants the full pipeline with zero
overrides. Two callers (scheduler, CLI) do not yet justify it.

#### Amendment (2026-07-24): Orchestrator now justified — `buildComposableExecutionPayload`

A third caller materialized: the validation recipe layer (ADR-0033) and its
named recipes (`createSwapWhenBalanceLow` per forward builder), plus external
integrators and the SDK test suite, all want the full pipeline with **zero**
per-step overrides. The straight-line orchestrator
`buildComposableExecutionPayload` (in `packages/sdk/src/composable.ts`) now
exists — it composes `isForwardEnabled` → `ForwardBuilder.build` →
`resolveValidationTargets` (pre/post) → `assembleComposableRemainingAccounts`
into `{ instructionData, remainingAccounts }`. It does **not** derive `face`
(caller-resolved) and does **not** append the scheduler fee ATA (the SDK
`executeComposable` facade owns that, ADR-0016 amended).

The primitives stay alongside for the CLI override path (per-flag replacement).
§1's original stance holds for that caller; the orchestrator serves the
zero-override callers. See ADR-0033 §"Tier 3" and rejected-alternative #1
below (now adopted).

### 2. ForwardBuilder interface in the SDK; implementations in a sibling package

The SDK owns the **interface**:

```typescript
interface ForwardBuilder {
  build(ctx: {
    connection: Connection;
    policy: ComposablePolicy;
    composablePolicyPda: PublicKey;
    face: BN; // amount the forward consumes
  }): Promise<{
    instructionData: Buffer;
    forwardAccounts: ForwardAccountMeta[]; // { pubkey, isWritable } — no isSigner
  }>;
}
```

Concrete implementations live in a new sibling package,
`@tributary-so/forward-builders` (`packages/forward-builders/`). The first
implementation is `MeteoraDlmmForward`, extracted from the scheduler.

Rationale: the SDK gains **zero** forward-program dependencies. Every SDK consumer
(browser apps, the landing page, the showcase) would otherwise bundle
`@meteora-ag/dlmm` whether they use composable forwards or not. Putting the
abstraction in the SDK (where consumers depend on it) and the impl in an opt-in
package makes "pluggable forward programs" real rather than aspirational. Two
consumers (scheduler today, CLI builder support in follow-on work) justify the
extraction.

### 3. The assembler owns ADR-0008 enforcement

`assembleComposableRemainingAccounts` stamps `isSigner: false` on **every** account
it emits:

```
preTargets      → { pubkey, isSigner: false, isWritable: false }
forwardAccounts → { pubkey, isSigner: false, isWritable: <builder-supplied> }
postTargets     → { pubkey, isSigner: false, isWritable: false }
```

The `ForwardBuilder` returns `{ pubkey, isWritable }[]` — the type has **no
`isSigner` field**. A builder cannot leak signer authority because the type does
not carry it. This closes the ADR-0008 privilege-pass-through vector at the type
level: one forgetful builder can never reintroduce the leak, because there is no
field to forget.

### 4. Per-account `isWritable` comes from the forward program

The previous scheduler forced **all** forward accounts `isWritable: true`. That is
over-permissioning: it works for Meteora DLMM (whose accounts are mostly writable)
but does not generalize, and it lies about intent. The builder now preserves
per-account writability from the forward program's own account list
(e.g. DLMM's `swapIx.keys[].isWritable`).

The Solana CPI runtime enforces writability at the boundary — a CPI to a readonly
account that the callee tries to write will fail. Per-account writability is both
tighter and more honest than a blanket `true`.

## Rejected alternatives

1. **Orchestrator function** — `prepareComposableExecution(policy, builder, opts?)`.
   Rejected: `opts` needs a field for every CLI override case
   (`preTargetsOverride`, `postTargetsOverride`, `forwardAmountOverride`,
   `forwardPayloadOverride`). That is just the primitives re-encoded as optional
   parameters — more rigid, no safer, and it hides which steps were overridden.
   Deferred to a third caller that wants the full pipeline with zero overrides.

   **Update (2026-07-24):** the third caller materialized (ADR-0033 recipe
   layer + named recipes + tests + external integrators). The orchestrator was
   adopted as `buildComposableExecutionPayload` — **not** as the rejected
   opts-bag shape. It takes explicit named params (`face`, `forwardBuilder?`)
   with no override bag: zero-override callers get a straight-line function,
   and the CLI keeps calling the primitives directly for per-flag override.
   The opts-bag rejection stands; only the "deferred" qualifier is resolved.

2. **Meteora implementation in SDK core** — adds `@meteora-ag/dlmm` to the SDK's
   dependency surface. Every SDK consumer — browser apps, the marketing landing
   page, the showcase — would bundle DLMM whether they touch composable forwards
   or not. The separate `@tributary-so/forward-builders` package makes the dep
   opt-in. The abstraction still lives in the SDK where consumers depend on it.

3. **Builder returns full `AccountMeta[]`** — distributes ADR-0008 enforcement to
   each builder implementation. One forgetful builder stamps `isSigner: true` and
   reintroduces the privilege-pass-through vector. The type-level enforcement
   (no `isSigner` field on `ForwardAccountMeta`) is strictly safer: the assembler
   is the single chokepoint, and the builder literally cannot express the
   dangerous state.

4. **Force all forward accounts writable** — over-permissioning. Works for DLMM,
   does not generalize to forward programs with readonly inputs. The Solana CPI
   runtime enforces writability at the boundary, so per-account writability
   (mirroring the forward program's own `keys`) is both correct and tighter.
