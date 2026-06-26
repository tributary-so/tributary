---
# tributary-w7uk
title: 'M-02: Harden manual ValidationPDA init with freshness guard'
status: completed
type: bug
priority: normal
created_at: 2026-06-19T11:02:25Z
updated_at: 2026-06-19T11:05:43Z
---

Re-confirmed finding (reports/M-02-manual-validation-pda-write.md). The manual ValidationPDA init in create_composable_policy.rs bypasses Anchor init safety. Add explicit freshness guard (lamports==0, owner==system_program) before create_account CPI, matching the pattern in execute_composable.rs:61-64. Prior bean tributary-o20o was scrapped but the report marks this Open (re-confirmed).

## Todos
- [x] Write failing Rust unit test for ValidationPda freshness invariant
- [x] Add ValidationPda::is_fresh helper (pure, testable)
- [x] Wire guard into create_composable_policy handler before create_account CPI
- [x] Run cargo test + lint to verify
- [x] Update report M-02 status

## Summary of Changes

- `state/validation_pda.rs`: Added `ValidationPda::is_fresh(info)` — returns true iff `lamports == 0 && owner == system_program`. Documented the invariant as defense-in-depth against type cosplay / re-initialization. Added 3 Rust unit tests (fresh account accepted, non-zero lamports rejected, non-system owner rejected).
- `instructions/composable/create_composable_policy.rs`: Wired `require!(ValidationPda::is_fresh(&validation_pda_info), IntermediateAccountAlreadyExists)` before the `create_account` CPI, matching the existing pattern in `execute_composable.rs:61-64`.
- `reports/M-02-manual-validation-pda-write.md`: Status → Fixed.
- Skipped the redundant "zero after creation" step: `create_account` zero-fills the data region on success, so a second pass adds cost without safety.
- All 51 Rust unit tests pass; clippy clean on touched files.
