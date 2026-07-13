---
# tributary-6ra7
title: Fix integration-guide/lighthouse-facade.md
status: draft
type: task
priority: critical
created_at: 2026-07-13T11:10:57Z
updated_at: 2026-07-13T11:10:57Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/integration-guide/programmable-pull-payments/lighthouse-facade.md

**Known issues (MODERATE):** Shows only a single `validation_program` / `ValidationPda` — needs dual (pre + post) per ADR-0021. The `.build()` return type omitted `accounts` / `numAccounts`. Missing the `LIGHTHOUSE_PROGRAM_ID` import pattern. The `GuardBuilder` example may reference removed methods.

**Read first:** Read the file, then packages/sdk/src/lighthouse/facade.ts and programs/tributary/src/state/composable.rs (ValidationSpec enum).

**Current code anchors:** packages/sdk/src/lighthouse/, programs/tributary/src/state/composable.rs

**Per ADR:** ADR-0021 (dual ValidationSpec), ADR-0013 (vendored Lighthouse facade)

**Acceptance:** Fix the validation-spec to show pre/post split. Fix .build() to return accounts. All method calls match current facade. Don't rewrite the full doc.
