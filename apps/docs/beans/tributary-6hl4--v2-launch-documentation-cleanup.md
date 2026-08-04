---
# tributary-6hl4
title: v2 Launch — Documentation cleanup
status: completed
type: milestone
priority: critical
created_at: 2026-07-13T11:08:24Z
updated_at: 2026-08-04T20:07:00Z
---

All docs must be fixed or created before the mainnet cutover v2 announcement. See v2-launch/01-launch-readiness-checklist.md §D. Covers: (1) fixing 13+ composable doc files with structural drift from current code, (2) creating P0/P1/P2 quickstarts from scratch, (3) publishing migration note, (4) updating SDK README.

## Summary of Changes

Milestone complete. Both epics closed:
- tributary-qeqc (Fix existing composable docs): 13/13 tasks done.
- tributary-9825 (Create missing launch docs): 7 completed + 1 scrapped (redundant).

Method: dispatched 3 parallel read-only verification agents to build per-file punch-lists against current code (execute_composable.rs, composable_policy.rs, constants.rs, sdk.ts, IDL). Most "draft" files were already substantively written by prior agent runs but never had their bean statuses flipped. Applied surgical fixes only where real drift existed:

Key fixes:
- Stale allowlist everywhere (Meteora DLMM only → 4 programs: Meteora + Raydium CPMM/CLMM + Orca Whirlpool per ADR-0032 + constants.rs).
- ByteRangeCheck.offset u16 → u8 (api-reference).
- Function name process_output_and_sweep → sweep_output_to_recipient (native-output).
- Validation data cap ≤1024 → ≤512 bytes (allowlists-and-sentinels).
- Missing sections: cold-relayer OR-gate (ADR-0016), CF-001 indexed PinnedAccount, act-mode sentinel, settlement shapes table, PDA seeds table, accountsStrict note.
- Quickstarts had compile-breaking bugs: missing imports, PublicKey.default() parens (static getter), pinnedAccounts empty array vs fixed [PinnedAccount; 2], createComposable arg misalignment (11 args → 14 with post-validation params), paymentFrequency BN vs enum, subscription padding 72 → 97 per IDL.
- SDK README composable example: placeholders expanded to compilable literals.

Total: 17 task beans resolved (16 completed + 1 scrapped as redundant).
