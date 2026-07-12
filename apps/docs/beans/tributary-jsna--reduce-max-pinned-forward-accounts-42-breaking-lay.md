---
# tributary-jsna
title: Reduce MAX_PINNED_FORWARD_ACCOUNTS 4→2 (greenfield, layout-free)
status: todo
type: task
priority: normal
created_at: 2026-07-12T19:12:17Z
updated_at: 2026-07-12T19:19:49Z
parent: tributary-osli
blocked_by:
    - tributary-ahfg
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
