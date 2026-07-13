---
# tributary-2wuo
title: Fix integration-guide/sdk.md
status: completed
type: task
priority: critical
created_at: 2026-07-13T11:09:31Z
updated_at: 2026-07-13T12:00:46Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/integration-guide/programmable-pull-payments/sdk.md

**Known issues (CRITICAL):** Stale SDK API signatures - uses `sdk.createComposablePolicy(...)` which doesn't exist; actual method is `sdk.getCreateComposablePolicyInstruction(...)`. Missing `executeComposable` signature with `forwardAmount`. `forward_config` parameter errors - ForwardConfig field types wrong, `InstructionConstraint` struct outdated (2 pinned accounts, not 4). `lighthouse.build()` call omitted `accounts()` return. `output_mint` semantics incomplete. Execution example missing `remainingAccounts` assembly. Many imports point to wrong paths or wrong SDK class name.

**Read first:** Read the file itself, then packages/sdk/src/instructions/composable.ts and packages/sdk/src/pda.ts.

**Current code anchors:** packages/sdk/src/instructions/composable.ts, packages/sdk/src/pda.ts, packages/sdk/src/types.ts

**Per ADR:** ADR-0021 (InstructionConstraint), ADR-0022 (fixed-size PDAs), ADR-0026 (output_mint=default act mode, forward_amount semantics)

**Acceptance:** Every code block must be copy-pasteable and compile. All method signatures match current SDK. Don't add new content beyond what's needed to fix existing errors.

\n\n## Summary of Changes\nFixed 10+ bugs: stale getCreateComposablePolicyInstruction signature, missing dual-validation params, wrong ForwardConfig, removed ValidationConfig in favour of ValidationSpec, wrong PDA seeds, wrong executeComposable return type, broken remaining_accounts description, duplicate imports. All code blocks now match v2.2 SDK.
