---
# tributary-jsna
title: Reduce MAX_PINNED_FORWARD_ACCOUNTS 4→2 (greenfield, layout-free)
status: completed
type: task
priority: normal
created_at: 2026-07-12T19:12:17Z
updated_at: 2026-07-13T06:05:17Z
parent: tributary-osli
---

Parent tributary-osli. NOTE: composable is greenfield (develop-only), so the layout shift is non-blocking — no migration needed. Shrinking 4→2 (−64B) shifts trailing ComposablePolicy field offsets, but no live accounts exist.

## BLOCKED BY
- tributary-ahfg (DLMM feasibility — confirms 2 pins suffice for a real swap CPI)

(Migration-posture blocker tributary-d1qw was scrapped — composable is not deployed.)

## Touch points
- `programs/tributary/src/state/composable_policy.rs:6` — `pub const MAX_PINNED_FORWARD_ACCOUNTS: usize = 4` → `2`.
- `composable_policy.rs:54` — InstructionConstraint::SIZE comment (202 → 138 bytes).
- `composable_policy.rs:82` — Default impl uses the const symbolically (auto-tracks).
- `ComposablePolicy::SIZE` — recomputes (ForwardConfig shrinks 267→203; −64B). Verify the SIZE const + the rent paid at `init`.
- `execute_composable.rs:1258` — `.min(MAX_PINNED_FORWARD_ACCOUNTS)` (auto-tracks).
- `create_composable_policy.rs` test fixtures — use the const symbolically (auto-track), audit for stray literal `4`.

## Acceptance criteria (TDD)
- [ ] Blocker tributary-ahfg resolved (FEASIBLE).
- [ ] Update the const + SIZE comment.
- [ ] `cargo test` clean; InstructionConstraint::SIZE test (if present) updated to 138.
- [ ] `cargo build` clean — ComposablePolicy::SIZE reflects new layout.
- [ ] Audit programs/ for any stray literal `4` tied to forward-pin capacity; replace with the const.

## Summary of Changes

### Const change
- `programs/tributary/src/state/composable_policy.rs:6` — `MAX_PINNED_FORWARD_ACCOUNTS: 4 → 2`.
- SIZE comments updated: `InstructionConstraint::SIZE` 206→140, `ForwardConfig::SIZE` 271→205 (Δ=−66B; bean body's 138/203/−64 were off — PinnedAccount is 33B not 32B).

### Rust test fixes (auto-tracked via const, but literal arrays needed shrinking)
- `composable_policy.rs` — `has_duplicate_indices_false_distinct` (3 pins→2), `instruction_constraint_size` (206→140), `forward_config_size` (271→205), `instruction_constraint_borsh_round_trip` (num=3→2).
- `proptest_pure_fns.rs` — `prop_pin_set` (4 elem→2), `prop_duplicate_index_rejected` + `prop_pins_match_correct_position` (`1..=4`→`1..=MAX`, dropped idx2/idx3).
- `create_composable_policy.rs` test fixture — 4-element `pinned_accounts` literal→2.

### Verification
- `cargo test` — 179 unit + 23 proptest all pass.
- `cargo build` — clean, no warnings.
- Stray-literal-4 audit of `programs/` — clean (the `[ByteRangeCheck; 4]` in execute_composable tests is `MAX_BYTE_RANGE_CHECKS`, which stays 4).

### Follow-up (NOT this bean's scope)
- `formal_verification/kani.rs:22,35` — QEDGEN-generated mirror of the const (`= 4`, `[PinnedAccount; 4]`). Stale after this change; needs qedspec regeneration via qedgen, not a hand-edit (spec-hash contract). Flag for a separate bean.
- TS test fixtures (`tests/helpers/composable.ts` + per-file inline `pinnedAccounts` arrays) — pad-to-4 literals need becoming pad-to-2 after IDL rebuild. Requires `anchor build` to regenerate the IDL first; integration-test scope, not cargo scope.
