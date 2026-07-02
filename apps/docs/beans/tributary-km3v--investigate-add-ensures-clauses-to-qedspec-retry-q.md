---
# tributary-km3v
title: 'Investigate: add ensures clauses to qedspec + retry qedgen --kani-impl'
status: todo
type: task
priority: low
created_at: 2026-07-02T05:45:55Z
updated_at: 2026-07-02T05:45:55Z
---

Future investigation: adding ensures postconditions to tributary.qedspec handlers would unlock qedgen codegen --kani-impl, which generates harnesses that call the REAL Anchor handler and assert ensures against the post-state. Currently generates 0 harnesses because the spec has no ensures clauses.

Blockers even with ensures:
1. Context fabrication: generated builders are todo!() stubs; constructing valid Anchor Accounts that pass #[derive(Accounts)] validation is very hard for complex programs.
2. Struct name mismatch: QEDGen assumes match-arm-specific struct names (execute_payment_case_0) that dont exist in the real Anchor program.
3. Account validation bypass: Anchor validates constraints (PDA seeds, signer checks, owner checks) before the handler body; Kani cant satisfy these symbolically.

Deferred per user decision 2026-07-01. Not blocking the verification claim — Layer 2 hand-rolled Kani (kani_pure_fns.rs) covers the real pure functions. Account wiring/PDA/signer validation is covered by Surfpool integration suite.
