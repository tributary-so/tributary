---
# tributary-kqhl
title: 'Lean: unblock qedsvm build + fill sorry stubs in Proofs.lean'
status: todo
type: task
priority: high
created_at: 2026-07-01T09:28:05Z
updated_at: 2026-07-06T10:49:30Z
parent: tributary-nrjy
---

lake build in formal_verification/ fails at the qedsvm dependency: SVM/SBPF/Tactic/WP.lean:217 (kernel) deep recursion detected under Lean 4.31.0 (dep reached 261/290; Spec.lean never compiled). Likely a Lean-version mismatch — pin lean-toolchain to the version lean_solana was built against, or bump qedsvm.

Once Spec.lean compiles: fill the sorry stubs in Proofs.lean for the 7 preservation properties (period_bounded A2, fee_conservation, fee_is_bps_decomposition, recipient_net_of_fee, pull_bounded, residual_nonnegative, period_cap_fixed) using omega/simp/unfold for the linear ones and QEDGen.Solana.IndexedState lemmas where relevant. Use 'qedgen fill-sorry' (Leanstral) then escalate hard sub-goals via 'qedgen aristotle'. Target: lake build green with zero sorry.

Serves the honest Lean-theorem claim for bean tributary-eu41.

Update 2026-07-01: recursion blocker SOLVED — pin lean-toolchain to v4.30.0 (matches qedsvm v0.8.0). New blocker: Spec.lean has Bug A (bare field reads, same as kani.rs codegen bug). Lean record-update syntax makes regex fix harder than Rust. Needs Lean-aware fixer or manual editing.

## REWRITTEN SCOPE (2026-07-06 — bare-field blocker RESOLVED)

The named blocker ("Spec.lean has Bug A ... Needs Lean-aware fixer or manual
editing") is **RESOLVED**. A 118-line Lean twin of fix-kani.py —
formal_verification/fix-lean.py — patches all five Lean-backend codegen
defects (L1 bare field reads in guards + effect RHS + abort-theorem hyps;
L2 s.s. double-prefix; L3 period_cap_fixed out-of-scope s'; L4 s.face
parameter-as-field; L5 abort-theorem hypothesis bare reads).

Verified: lake build now compiles qedsvm (290/290, recursion blocker gone)
**and** every transition function + property predicate in Spec.lean. The
bare-field "Unknown identifier" errors are gone.

### New blocker (precisely characterized)

58 generated proof obligations fail — this is proof-strengthening work, NOT a
codegen bug. fix-lean.py has done its job. Breakdown:

- 31 omega counterexamples — the generated preservation proofs assume facts
  not in scope. Lead example: period*bounded_preserved_by_execute_payment*\*
  needs the companion invariant max_chunk_amount <= max_amount_per_period
  (established at create_payment_policy, never threaded as a hypothesis into
  the preservation theorems).
- 18 Application type mismatch — overflow-safety refine proof terms project
  wrong field indices after cases h reconstructs the record.
- 7 No goals to be solved — encoding/tactic-sequencing gaps.
- 2 sorry — fee_share_sum_bounded, milestone_signer_bits_mutually_exclusive.

### Remaining work (next iteration)

Strengthen the proofs: add companion invariants (max_chunk_le_max_period)
and thread through the \_inductive signatures, OR run qedgen fill-sorry /
qedgen aristotle on the 58 failing obligations. See
formal_verification/README.md Lean-proof-status section for the full
counterexample inventory. This is theorem-proving, not tooling — the path
is clear.

Status: bare-field blocker DONE; proof-strengthening blocker OPEN.
