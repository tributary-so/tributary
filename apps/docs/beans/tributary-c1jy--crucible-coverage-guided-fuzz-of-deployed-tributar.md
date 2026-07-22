---
# tributary-c1jy
title: Crucible coverage-guided fuzz of deployed tributary.so
status: todo
type: task
priority: normal
created_at: 2026-07-01T09:28:05Z
updated_at: 2026-07-22T12:09:38Z
parent: tributary-ujni
---

Optional (bean tributary-eu41 step 5). Install Crucible, then 'qedgen probe --crucible --root programs/tributary' against the deployed .so to surface panic/unwrap/overflow crashes as findings. Coordinate with the sibling Mollusk+cargo-fuzz bean: the fuzzer's must-fail list consumes tributary.qedspec preconditions, and a fuzzer counterexample to current_period_total <= max_amount_per_period is a counterexample to the A2 formal claim and must be reconciled both sides. Crucible remains a secondary input — do not block the Mollusk fuzzer on it.

## Blocker — QEDGen v2.38 Crucible codegen (same as tributary-eu41 §Blocker 2)

Attempted 2026-07-22. Crucible CLI installed fine (cargo install --git asymmetric-research/crucible crucible-fuzz-cli -> v0.2.0), and qedgen probe --fuzz SYNTHESIZED a 38-action harness under programs/tributary/.qed/fuzz/tributary. But the generated harness does NOT compile — unfilled todo!("agent-fill: accounts::<Name> ...") stubs in every action body + E0422/E0432/E0433 type-resolution errors. This is the SAME QEDGen v2.38 Rust-codegen limitation documented in tributary-eu41 for the Kani harness (bare field reads + ML-syntax ref_impl + unfilled account-context stubs).

Not fixable here without either (a) QEDGen codegen producing compilable account-context stubs, or (b) manually filling 38 action account fixtures (≈ the same fixture work the Mollusk harness in tributary-ya7m already solved, ported into QEDGen's Crucible frame). Both are substantial follow-up work — and this bean is explicitly OPTIONAL/secondary ("do not block the Mollusk fuzzer on it"). The primary Mollusk + cargo-fuzz path (tributary-ya7m, completed) already delivers verified coverage-guided + conservation/authority fuzzing. Defer until QEDGen codegen matures or prioritize via a dedicated codegen-fix bean.
