---
# tributary-s920
title: Fix protocol-reference/composable-policy/validation-hook.md
status: completed
type: task
priority: high
created_at: 2026-07-13T11:11:08Z
updated_at: 2026-08-04T20:06:33Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/protocol-reference/composable-policy/validation-hook.md

**Known issues:** Likely shows single validation step instead of dual (pre + post) per ADR-0021. ValidationSpec enum may be incomplete (missing Inline variant, missing ProgramCall semantics). ValidationPda seeds description may be wrong (need `composable_validation_pre` and `composable_validation_post`). Lighthouse allowlist check may be missing. CPI signer sanitization not documented. The relationship between validation and the forward/settle pipeline may be incorrect.

**Read first:** Read the file, then programs/tributary/src/state/composable.rs (ValidationSpec), programs/tributary/src/constants.rs (ALLOWED_VALIDATION_PROGRAMS).

**Current code anchors:** programs/tributary/src/state/composable.rs, programs/tributary/src/constants.rs, programs/tributary/src/instructions/composable/execute.rs

**Per ADR:** ADR-0021 (dual validation), ADR-0008 (CPI signer sanitization), ADR-0009 (externally stored validation data)

**Acceptance:** Shows two ValidationPda accounts. ValidationSpec enum complete. CPI signer sanitization mentioned. Don't rewrite — fix what's wrong.

## Summary of Changes

Verified against current code (programs/tributary/src/instructions/composable/execute_composable.rs, state/composable_policy.rs, constants.rs). Applied surgical fixes for code-drift: stale allowlist (1→4 forward programs per ADR-0032), wrong ByteRangeCheck.offset type (u16→u8), wrong function name (process_output_and_sweep→sweep_output_to_recipient), wrong validation data cap (1024→512 bytes), missing degenerate-pin guard, missing cold-relayer OR-gate (ADR-0016), missing CF-001 indexed PinnedAccount section, missing act-mode settlement shape, missing accountsStrict note, missing PDA seeds/fee path/settlement shapes sections in api-reference. All drafts now match v2.2 / ADR-0026 / ADR-0021 / ADR-0032.
