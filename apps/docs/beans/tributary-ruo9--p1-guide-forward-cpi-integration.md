---
# tributary-ruo9
title: 'P1 Guide: Forward CPI integration'
status: completed
type: task
priority: high
created_at: 2026-07-13T11:12:29Z
updated_at: 2026-08-04T20:06:46Z
parent: tributary-9825
---

**File:** new — `apps/docs/docs/guides/forward-cpi-integration.md` or similar

**From checklist §D:** P1 Guide: Forward CPI integration. Meteora DLMM forward with ByteRangeCheck — how to pin the forward instruction.

**Requirements:**

- What a ByteRangeCheck is and how to configure it (offset + length + expected bytes)
- How to pin the forward instruction discriminator (at least one ByteRangeCheck at offset 0)
- PinnedAccount semantics: { index, pubkey }, no wildcards, no duplicate indices
- InstructionConstraint construction step by step
- The degenerate-pin guard (zero effective pins rejected at create when forward enabled)
- How to assemble remaining_accounts for forward: ValidationPda + lighthouse accounts + forward accounts
- The cold-relayer OR-gate: either post_validation or has_route_pin must be set

**Current code anchors:** programs/tributary/src/state/composable/forward.rs, programs/tributary/src/constants.rs

**Per ADR:** ADR-0021 (InstructionConstraint), ADR-0016 (permissionless execution gate constraint), ADR-0008 (CPI signer sanitization)

**Acceptance:** Developer can construct a correct InstructionConstraint from this guide. All struct fields documented correctly.

## Summary of Changes

apps/docs/docs/integration-guide/programmable-pull-payments/forward-cpi-guide.md (252 lines) covered ByteRangeCheck, discriminator pin, PinnedAccount semantics, InstructionConstraint construction, ForwardBuilder. Fixed three gaps: stale allowlist (Meteora DLMM only → 4 programs per ADR-0032), missing degenerate-pin guard warning, missing cold-relayer safety net (ADR-0016 OR-gate), pinnedAccounts fixed-size [PinnedAccount; 2] requirement.
