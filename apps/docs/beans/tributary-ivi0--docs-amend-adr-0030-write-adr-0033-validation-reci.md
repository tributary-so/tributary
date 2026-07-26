---
# tributary-ivi0
title: "Docs: amend ADR-0030 + write ADR-0033 (validation recipe layer)"
status: completed
type: feature
priority: normal
created_at: 2026-07-24T10:34:15Z
updated_at: 2026-07-24T10:35:13Z
parent: tributary-69jm
blocked_by:
  - tributary-eznl
---

Amend ADR-0030 §1: third caller materialized (tests + external integrators want full pipeline with zero overrides). Orchestrator (buildComposableExecutionPayload) now justified. Primitives stay alongside for CLI override path. New ADR-0033: validation recipe layer — three-tier model (β), enforcement posture (s), site-recipe derivation pattern (q), day-one scope, deferral rationale for pool-price/oracle/delta. Update AGENTS.md ADR map.

## Summary of Changes

**Amended ADR-0030** (`apps/docs/adr/0030-composable-execution-primitives.md`):

- §1: appended an `Amendment (2026-07-24)` block — the deferred orchestrator is
  now `buildComposableExecutionPayload` (in `packages/sdk/src/composable.ts`),
  justified by the third caller (ADR-0033 recipe layer + named recipes + tests +
  external integrators wanting the full pipeline with zero overrides).
  Primitives stay alongside for the CLI override path.
- Rejected-alternative #1: updated to note the orchestrator was adopted — **not**
  as the rejected opts-bag shape, but as explicit named params with no override
  bag. The opts-bag rejection stands; only the "deferred" qualifier is resolved.

**New ADR-0033** (`apps/docs/adr/0033-validation-recipe-layer.md`): documents the
three-tier model as actually implemented (code is authority on state):

- Tier 1: unchanged forward builders (ADR-0030).
- Tier 2: validation recipes (`validation-recipes.ts`) — `balanceCheck` generic +
  3 site variants (ATA derived via `getAssociatedTokenAddressSync`, pure sync) +
  `lighthouseValidation` bridge/escape hatch.
- Tier 3: `composablePolicyRecipe` (setup bundle + enforcement) +
  `buildComposableExecutionPayload` (fire helper = ADR-0030 orchestrator).
- Enforcement posture: throw on act-mode-no-post (`allowUnsafeActMode` escape),
  warn on economic gaps. Cross-references ADR-0031 (on-chain posture unchanged;
  recipe is the SDK setup-time enforcement surface, strictly stronger than warn).
- Named recipes per forward builder (3: DLMM/CPMM/CLMM `createSwapWhenBalanceLow`).
- Day-one scope: 7 SDK functions. Deferral rationale for pool-price/oracle/delta
  (covered meanwhile by `lighthouseValidation` escape hatch).

**AGENTS.md** ADR map: added row + link ref for [0033]. Also backfilled the two
pre-existing gaps [0028] (tokens.xyz asset catalog proxy) and [0031]
(settlement-output post_validation posture) so the index is complete — both ADR
files already existed but were missing from the map and link index.

**Verification:** `markdownlint-cli@0.45.0 --disable MD013 MD033 MD041 MD046 MD040`
(clean) on all three changed markdown files — same rules the pre-commit hook
disables. No code/lint/typecheck applies (docs-only). ADRs live outside the
mkdocs `docs_dir`; raw links resolve on GitHub (accepted repo convention, per
bean tributary-ljt9).
