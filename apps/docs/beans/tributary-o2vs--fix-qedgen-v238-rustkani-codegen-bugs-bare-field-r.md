---
# tributary-o2vs
title: Fix QEDGen v2.38 Rust/Kani codegen bugs — bare field reads + ML-syntax ref_impl
status: todo
type: bug
priority: high
created_at: 2026-07-01T09:28:05Z
updated_at: 2026-07-02T12:01:34Z
parent: tributary-nrjy
---

Generated formal_verification/kani.rs (131 harnesses) does not compile due to two QEDGen v2.38 Rust-backend codegen bugs:

1. State-field reads lose the receiver: guards and effect RHS use bare field names (emergency_pause, total_fee - protocol_cut) instead of s.emergency_pause / s.total_fee. LHS writes are correct. Repro: formal_verification/kani.rs:128.
2. ref_impl calls render in ML application syntax: (bps_mul (chunk) (gateway_fee_bps)) instead of bps_mul(chunk, gateway_fee_bps). Repro: formal_verification/kani.rs:135.

Investigate: (a) upstream qedgen fix — file issue at github.com/qedgen/solana-skills with the reproductions in formal_verification/README.md; (b) local workaround — inline mul_div_floor(...) (built-in renders correctly) instead of the bps_mul ref_impl to eliminate bug 2, then patch the guard emitter for bug 1. Once kani.rs compiles, run cargo kani --harness <name> against formal_verification/kani_crate (set up per formal_verification/README.md) to execute the 131 BMC proofs (period_bounded, fee_conservation, etc.).

Blocks: the #[qed(verified)] drift-gate CI and the honest 'Kani-verified' claim for bean tributary-eu41.


## Resolution (2026-07-01)

Bug report written to `formal_verification/qedgen-codegen-bugs.md` — sanitized,
generic reproducer for all 5 codegen bugs, ready to file upstream.

A 60-line Python post-processor (`formal_verification/fix-kani.py`) works
around all 5 bugs. Applied after each `qedgen codegen --kani`, it produces
compiling Kani harnesses. Individual harnesses verified PASSING:

- `verify_execute_payment_case_0_preserves_period_bounded` (A2): 313 checks, 0 failed, 10s
- `verify_execute_payment_case_1_preserves_period_bounded` (accumulate): 339 checks, 0 failed, 9s
- `verify_execute_payment_case_0_preserves_fee_conservation`: 313 checks, 0 failed, 78s
- `verify_execute_payment_case_0_rejects_invalid` (guard): 207 checks, 0 failed, 4s
- `verify_execute_payment_case_1_no_overflow`: 231 checks, 0 failed, 3s
- `verify_execute_composable_case_1_no_overflow`: 231 checks, 0 failed, 3s

Full suite (132 harnesses) is slow (~78s per nonlinear-arith proof); user is
running it separately.

Infrastructure: `formal_verification/Cargo.toml` + `[workspace]` table makes
`cargo kani` resolve as a standalone crate.
