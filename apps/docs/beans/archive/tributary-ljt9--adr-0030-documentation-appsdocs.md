---
# tributary-ljt9
title: ADR-0030 + documentation (apps/docs/)
status: completed
type: feature
priority: high
created_at: 2026-07-15T10:13:59Z
updated_at: 2026-07-15T10:33:15Z
parent: tributary-l8wr
---

# ADR-0030 + Documentation: Composable Execution Primitives

## What

1. New ADR-0030: "Composable execution primitives: ForwardBuilder interface + shared helpers"
2. Update `apps/docs/docs/integration-guide/programmable-pull-payments/forward-cpi-guide.md`
   (or create it if it doesn't exist) to document the new primitives + ForwardBuilder pattern.
3. Update `AGENTS.md` ADR table + ADR map links.
4. Update `apps/docs/mkdocs.yml` nav if new pages are added.

## ADR-0030 content

Follow the format of `apps/docs/adr/0029-program-authority-rotation.md`:

### Title
`# Composable execution primitives — ForwardBuilder interface + shared helpers`

### Decision sections

1. **Primitives, not orchestrator** — SDK exports focused functions
   (`resolveValidationTargets`, `assembleComposableRemainingAccounts`,
   `grossCapToFace`, `resolveDefaultForwardAmount`). No `prepareComposableExecution`
   orchestrator. Rationale: CLI override case is clearer as explicit imperative code
   ("call primitive, optionally replace with flag") than as an opts bag with `*_override`
   fields. Assembly order is locked by `assembleComposableRemainingAccounts` named params.
   Orchestrator deferred until third caller wants full pipeline with zero overrides.

2. **ForwardBuilder interface in SDK, implementations in sibling package** —
   SDK exports `ForwardBuilder` interface + `ForwardAccountMeta` type. Concrete impls
   live in `@tributary-so/forward-builders`. Rationale: SDK gains zero forward-program
   deps; "pluggable forward programs" is real (the abstraction lives where consumers
   depend on it) rather than aspirational. Two consumers (scheduler + CLI-gain-builder
   in Bean 2) justify the extraction.

3. **Assembler owns ADR-0008 enforcement** — `assembleComposableRemainingAccounts`
   stamps `isSigner: false` on ALL accounts. Forward builder returns `{pubkey, isWritable}[]`
   — no `isSigner` field. A builder cannot leak signer authority because the type doesn't
   have the field. One forgetful builder can never reintroduce the privilege leak.

4. **Per-account isWritable from forward program** — previous scheduler forced all
   forward accounts `isWritable: true`. Corrected: builder preserves per-account
   writability from the forward program's own account list (e.g. DLMM `swapIx.keys`).
   Solana CPI runtime enforces writability at the boundary; tighter and more honest.

### Rejected alternatives

1. **Orchestrator function** — `prepareComposableExecution(policy, builder, opts?)`.
   Rejected: opts needs a field for every CLI override case (`preTargetsOverride`,
   `postTargetsOverride`, `forwardAmountOverride`, `forwardPayloadOverride`) — just
   primitives re-encoded as optional params. More rigid, no less safe. Deferred to
   third caller.

2. **Meteora impl in SDK core** — adds `@meteora-ag/dlmm` to SDK deps. Every SDK
   consumer (browser apps, landing, showcase) bundles DLMM whether they use composable
   forwards or not. The separate package makes the dep opt-in.

3. **Builder returns full AccountMeta[]** — distributes ADR-0008 enforcement to each
   builder. One forgetful builder = signer privilege leak. The type-level enforcement
   (no `isSigner` field) is strictly safer.

4. **Force all forward accounts writable** — over-permissioning. Works for DLMM but
   doesn't generalize. Solana CPI runtime enforces writability at the boundary;
   per-account is correct.

## Docs update

### Forward CPI Guide
File: `apps/docs/docs/integration-guide/programmable-pull-payments/forward-cpi-guide.md`

Add section: "Building forward instructions" — show the ForwardBuilder pattern:
```typescript
import { createMeteoraDlmmForward } from "@tributary-so/forward-builders";
import {
  isForwardEnabled, resolveValidationTargets,
  assembleComposableRemainingAccounts,
  resolveDefaultForwardAmount,
} from "@tributary-so/sdk";

const face = resolveDefaultForwardAmount(policy, gateway);
const fwd = isForwardEnabled(policy)
  ? await createMeteoraDlmmForward({ pool, slippageBps: 100 }).build({
      connection, policy, composablePolicyPda, face })
  : { instructionData: Buffer.alloc(0), forwardAccounts: [] };

const remaining = assembleComposableRemainingAccounts({
  preTargets: await resolveValidationTargets(connection, pda, policy.preValidation, programId, 'pre'),
  forwardAccounts: fwd.forwardAccounts,
  postTargets: await resolveValidationTargets(connection, pda, policy.postValidation, programId, 'post'),
});
```

### AGENTS.md
- Add ADR-0030 to the ADR table and ADR map links section
- Add `packages/forward-builders/` to Repository Layout

## TDD checklist
- [x] ADR-0030 follows the format of existing ADRs (Decision + Rejected alternatives)
- [x] Forward CPI Guide updated with ForwardBuilder pattern + code example
- [x] AGENTS.md ADR table updated with 0030 entry
- [x] AGENTS.md Repository Layout includes `packages/forward-builders/`
- [x] `mkdocs.yml` nav unchanged (no new top-level pages) — forward-cpi-guide.md already existed
- [x] `make build` (docs) succeeds (ADRs live outside docs_dir; 0030 link warns identically to existing 0026 link — accepted repo convention)

## Key references
- Milestone D1–D6 (full design decisions)
- `apps/docs/adr/0029-program-authority-rotation.md` — ADR format template
- `apps/docs/mkdocs.yml` — nav structure

## Summary of Changes

- **New ADR-0030** (`apps/docs/adr/0030-composable-execution-primitives.md`): locks in primitives-not-orchestrator (D1), ForwardBuilder interface in SDK + impls in sibling `@tributary-so/forward-builders` package (D2), assembler owns ADR-0008 enforcement at the type level (D3), per-account isWritable from forward program (D4). Includes 4 rejected alternatives.
- **Forward CPI Guide** (`apps/docs/docs/integration-guide/programmable-pull-payments/forward-cpi-guide.md`): new 'Building forward instructions (ForwardBuilder)' section with full code example (resolveDefaultForwardAmount → isForwardEnabled → build → assembleComposableRemainingAccounts), plus a rationale callout for the no-isSigner type enforcement. Updated pre-ship checklist (per-account isWritable instead of blanket true, or use a ForwardBuilder).
- **AGENTS.md**: ADR-0030 row added to the v2 ADR map table + link index; `packages/forward-builders/` added to Repository Layout.
- **mkdocs.yml**: unchanged — the forward-cpi-guide page already exists, no new nav entry needed.

Docs build verified: `make -C apps/docs build` → 'Documentation built in 8.35s'. The 0030 ADR link warns in mkdocs exactly like the pre-existing 0026 link (ADRs live in `apps/docs/adr/`, a sibling of the mkdocs `docs_dir` `apps/docs/docs/`); the raw link resolves correctly on GitHub — accepted repo convention.
