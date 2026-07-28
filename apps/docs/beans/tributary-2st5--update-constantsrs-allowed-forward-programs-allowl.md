---
# tributary-2st5
title: Update constants.rs ALLOWED_FORWARD_PROGRAMS + allowlist tests
status: completed
type: task
priority: high
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T12:05:49Z
parent: tributary-teqe
---

Add pubkey!("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C") to ALLOWED_FORWARD_PROGRAMS in programs/tributary/src/constants.rs. Audit existing tests that index ALLOWED_FORWARD_PROGRAMS[0] (create_composable_policy.rs:622-690, state/composable_policy.rs:464, proptest_pure_fns.rs:403,502) — add a [1] variant or make them array-length-agnostic. TDD: write a failing test that creates a composable policy with the CPMM program id first.

## Summary of Changes

- `programs/tributary/src/constants.rs`: added Raydium CPMM program id
  `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C` as the second entry in
  `ALLOWED_FORWARD_PROGRAMS` (Meteora DLMM remains at index `[0]`).
- `programs/tributary/src/instructions/composable/create_composable_policy.rs`:
  added TDD test `enabled_forward_accepts_raydium_cpmm_target` — RED first
  (rejected as non-allowlisted), GREEN after the allowlist edit.
- Audit of the `[0]`-indexed tests (create_composable_policy.rs:622-690,
  state/composable_policy.rs:464, proptest_pure_fns.rs:403,502): no change
  needed. They index `[0]` as "an allowlisted program" and `validate_forward_config`
  uses `.contains()`, so they remain valid and array-length-agnostic. The new
  `[1]`-variant test covers the CPMM path.
- Verification: `cargo test -p tributary --lib` → 196 passed; `cargo test -p tributary --tests` → 23 passed. Pre-existing clippy pedantic errors (`manual_is_multiple_of`, `field_reassign_with_default`) confirmed on HEAD before this change — out of scope.
- Sibling task `tributary-o7u1` (qedspec + formal_verification regen) is
  tracked separately and remains `todo`.
