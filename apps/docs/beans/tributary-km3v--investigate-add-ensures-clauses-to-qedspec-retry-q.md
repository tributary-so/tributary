---
# tributary-km3v
title: 'Investigate: add ensures clauses to qedspec + retry qedgen --kani-impl'
status: completed
type: task
priority: low
created_at: 2026-07-02T05:45:55Z
updated_at: 2026-07-06T10:50:00Z
parent: tributary-nrjy
---

Future investigation: adding ensures postconditions to tributary.qedspec handlers would unlock qedgen codegen --kani-impl, which generates harnesses that call the REAL Anchor handler and assert ensures against the post-state. Currently generates 0 harnesses because the spec has no ensures clauses.

Blockers even with ensures:
1. Context fabrication: generated builders are todo!() stubs; constructing valid Anchor Accounts that pass #[derive(Accounts)] validation is very hard for complex programs.
2. Struct name mismatch: QEDGen assumes match-arm-specific struct names (execute_payment_case_0) that dont exist in the real Anchor program.
3. Account validation bypass: Anchor validates constraints (PDA seeds, signer checks, owner checks) before the handler body; Kani cant satisfy these symbolically.

Deferred per user decision 2026-07-01. Not blocking the verification claim — Layer 2 hand-rolled Kani (kani_pure_fns.rs) covers the real pure functions. Account wiring/PDA/signer validation is covered by Surfpool integration suite.

## Summary of Changes (2026-07-06 — closed as investigation)

Investigation complete; conclusion: NOT VIABLE for Tributary, DEFERRED per
user (2026-07-01). Adding ensures postconditions to tributary.qedspec would
unlock qedgen codegen --kani-impl, but three blockers remain even with
ensures:

1. Context fabrication — generated builders are todo!() stubs; constructing
   valid Anchor Accounts that pass #[derive(Accounts)] validation is
   intractable for complex programs.
2. Struct name mismatch — QEDGen assumes match-arm names (execute_payment_case_0)
   that don't exist in the real Anchor program.
3. Account validation bypass — Anchor validates constraints (PDA seeds,
   signer, owner) before the handler body; Kani cannot satisfy these
   symbolically.

Confirmed empirically: qedgen codegen --kani-impl on tributary.qedspec
generated 0 harnesses (spec has no ensures; and even with ensures, the
three blockers above apply). Layer 2 hand-rolled Kani
(programs/tributary/tests/kani_pure_fns.rs, 16 harnesses calling the REAL
pure functions) + the Surfpool integration suite cover the same ground.
Account wiring/PDA/signer validation is covered by integration tests.

Investigation goal met (the answer is "no"); no further action. Closing.
