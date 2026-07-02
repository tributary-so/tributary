---
# tributary-kqhl
title: 'Lean: unblock qedsvm build + fill sorry stubs in Proofs.lean'
status: todo
type: task
priority: high
created_at: 2026-07-01T09:28:05Z
updated_at: 2026-07-02T12:01:34Z
parent: tributary-nrjy
---

lake build in formal_verification/ fails at the qedsvm dependency: SVM/SBPF/Tactic/WP.lean:217 (kernel) deep recursion detected under Lean 4.31.0 (dep reached 261/290; Spec.lean never compiled). Likely a Lean-version mismatch — pin lean-toolchain to the version lean_solana was built against, or bump qedsvm.

Once Spec.lean compiles: fill the sorry stubs in Proofs.lean for the 7 preservation properties (period_bounded A2, fee_conservation, fee_is_bps_decomposition, recipient_net_of_fee, pull_bounded, residual_nonnegative, period_cap_fixed) using omega/simp/unfold for the linear ones and QEDGen.Solana.IndexedState lemmas where relevant. Use 'qedgen fill-sorry' (Leanstral) then escalate hard sub-goals via 'qedgen aristotle'. Target: lake build green with zero sorry.

Serves the honest Lean-theorem claim for bean tributary-eu41.

Update 2026-07-01: recursion blocker SOLVED — pin lean-toolchain to v4.30.0 (matches qedsvm v0.8.0). New blocker: Spec.lean has Bug A (bare field reads, same as kani.rs codegen bug). Lean record-update syntax makes regex fix harder than Rust. Needs Lean-aware fixer or manual editing.
