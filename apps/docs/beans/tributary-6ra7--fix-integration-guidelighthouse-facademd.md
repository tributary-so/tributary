---
# tributary-6ra7
title: Fix integration-guide/lighthouse-facade.md
status: completed
type: task
priority: critical
created_at: 2026-07-13T11:10:57Z
updated_at: 2026-08-04T20:06:33Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/integration-guide/programmable-pull-payments/lighthouse-facade.md

**Known issues (MODERATE):** Shows only a single `validation_program` / `ValidationPda` — needs dual (pre + post) per ADR-0021. The `.build()` return type omitted `accounts` / `numAccounts`. Missing the `LIGHTHOUSE_PROGRAM_ID` import pattern. The `GuardBuilder` example may reference removed methods.

**Read first:** Read the file, then packages/sdk/src/lighthouse/facade.ts and programs/tributary/src/state/composable.rs (ValidationSpec enum).

**Current code anchors:** packages/sdk/src/lighthouse/, programs/tributary/src/state/composable.rs

**Per ADR:** ADR-0021 (dual ValidationSpec), ADR-0013 (vendored Lighthouse facade)

**Acceptance:** Fix the validation-spec to show pre/post split. Fix .build() to return accounts. All method calls match current facade. Don't rewrite the full doc.

## Summary of Changes

Verified against current code (programs/tributary/src/instructions/composable/execute_composable.rs, state/composable_policy.rs, constants.rs). Applied surgical fixes for code-drift: stale allowlist (1→4 forward programs per ADR-0032), wrong ByteRangeCheck.offset type (u16→u8), wrong function name (process_output_and_sweep→sweep_output_to_recipient), wrong validation data cap (1024→512 bytes), missing degenerate-pin guard, missing cold-relayer OR-gate (ADR-0016), missing CF-001 indexed PinnedAccount section, missing act-mode settlement shape, missing accountsStrict note, missing PDA seeds/fee path/settlement shapes sections in api-reference. All drafts now match v2.2 / ADR-0026 / ADR-0021 / ADR-0032.
