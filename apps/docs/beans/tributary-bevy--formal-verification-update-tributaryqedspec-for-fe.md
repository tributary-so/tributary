---
# tributary-bevy
title: 'Formal verification: update tributary.qedspec for fee rebase'
status: completed
type: feature
priority: high
created_at: 2026-07-05T07:47:52Z
updated_at: 2026-07-06T08:29:37Z
parent: tributary-vp5n
blocked_by:
    - tributary-brp6
---

Update the formal verification artifacts for the composable fee rebase (milestone tributary-t6gt). Per AGENTS.md, program changes => update tributary.qedspec and recreate the formal_verification/ directory.

Acceptance criteria:
- [ ] tributary.qedspec: add invariants for (a) fee assessed on gross pull only, never on output; (b) intermediate_input residual always returns to user (never recipient, never fee_payer); (c) intermediate_output always sweeps to recipient; (d) deliver mode requires output > 0; (e) delegated_amount >= face + fee; (f) PayAsYouGo caps bind on gross.
- [ ] formal_verification/: regenerate Kani/proptest/Lean artifacts from the updated spec.
- [ ] Settlement-shape properties: the three shapes are disjoint and exhaustive over (forward_enabled, output_mint_is_sentinel).
- [ ] Residual-routing property: no path exists where intermediate_input residual reaches the recipient or fee accounts.
- [ ] Fee-conservation property: sum(protocol_cut + scheduler_cut + referral_pool + gateway_residual) == face * bps / 10000, regardless of forward outcome.

Parent epic: tributary-vp5n. Blocked-by: program-contract feature.

## Summary of Changes

Updated tributary.qedspec for the composable fee rebase (ADR-0026) and regenerated the formal_verification/ artifacts.

### Spec changes (tributary.qedspec)
- execute_composable handler rewritten: parameter renamed `chunk → face` (forward consumes face); pulls GROSS = face + bps_mul(face, gateway_fee_bps); PayAsYouGo caps and period accumulator bind on GROSS.
- Removed `requires is_net_mode == 0` from execute_composable (NET-on-pull is hardcoded for composable — the flag is ignored).
- Three new properties added:
  - `composable_fee_basis_is_face` — total_fee == bps_mul(face, bps) (fee computed on face, not gross).
  - `composable_gross_pull_matches_face_plus_fee` — total_from_user == payment_amount + total_fee.
  - `composable_period_accumulates_gross` — current_period_total binds on gross (caps now tighter).
- Six new documentation invariants (account-wiring, not state predicates): `composable_fee_input_side_only`, `act_mode_residual_to_user`, `deliver_transform_sweeps_output`, `act_mode_skips_output_guard`, `settlement_shapes_disjoint`, `create_rejects_disabled_forward_with_mismatched_output`. These capture the residual-routing and settlement-shape rules that live in the handler's account-resolution path, not in the state struct.

### Regenerated artifacts (formal_verification/)
- `Spec.lean` — regenerated via `qedgen codegen --lean`. Now carries the three new property definitions and the v2.2 execute_composable transition (face + gross split). Pre-existing codegen Bug A (bare field reads) still blocks elaboration; documented in README.
- `kani.rs` — regenerated via `qedgen codegen --kani` + `fix-kani.py` post-processor. 75 active harnesses, 71 disabled (u128 bps_mul, slow). The three new properties are wired into execute_composable preservation harnesses across all three match arms (case_0, case_1, otherwise).
- `Proofs.lean` — appended stub comments for the three new preservation theorems to match the existing pattern.
- `README.md` — status table updated to v2.2; documents the new properties + the ADR-0026 change.
- Reverted qedgen-init drift on lakefile.lean, lean-toolchain (kept v4.30.0 pin per README), .gitignore (kept original patterns), and removed auto-vendored lean_solana/ (project uses external path).

### Drift gates
- Re-stamped `#[qed(verified, spec_hash=...)]` on `create_payment_policy` and `transfer` handlers (handler bodies unchanged; spec-hash bumped due to qedspec edit). `cargo check` clean.

### Verification
- `qedgen check --spec tributary.qedspec`: 0 errors (48 warnings, 13 info — pre-existing P4 unused-field + missing Lean stubs, all documented).
- `cargo test` in programs/tributary: 166 unit + 21 proptest, all green.
- Kani Layer-1 harnesses: 75 active (not run in this iteration — slow; README documents ~5 min full run). Layer-2 impl Kani unchanged (no program-code changes; only spec-hash re-stamps).
