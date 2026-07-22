---
# tributary-c1jy
title: Crucible coverage-guided fuzz of deployed tributary.so
status: todo
type: task
priority: normal
created_at: 2026-07-01T09:28:05Z
updated_at: 2026-07-22T12:30:53Z
parent: tributary-ujni
---

Optional (bean tributary-eu41 step 5). Install Crucible, then 'qedgen probe --crucible --root programs/tributary' against the deployed .so to surface panic/unwrap/overflow crashes as findings. Coordinate with the sibling Mollusk+cargo-fuzz bean: the fuzzer's must-fail list consumes tributary.qedspec preconditions, and a fuzzer counterexample to current_period_total <= max_amount_per_period is a counterexample to the A2 formal claim and must be reconciled both sides. Crucible remains a secondary input — do not block the Mollusk fuzzer on it.

## Blocker — QEDGen v2.38 Crucible codegen (same as tributary-eu41 §Blocker 2)

Attempted 2026-07-22. Crucible CLI installed fine (cargo install --git asymmetric-research/crucible crucible-fuzz-cli -> v0.2.0), and qedgen probe --fuzz SYNTHESIZED a 38-action harness under programs/tributary/.qed/fuzz/tributary. But the generated harness does NOT compile — unfilled todo!("agent-fill: accounts::<Name> ...") stubs in every action body + E0422/E0432/E0433 type-resolution errors. This is the SAME QEDGen v2.38 Rust-codegen limitation documented in tributary-eu41 for the Kani harness (bare field reads + ML-syntax ref_impl + unfilled account-context stubs).

Not fixable here without either (a) QEDGen codegen producing compilable account-context stubs, or (b) manually filling 38 action account fixtures (≈ the same fixture work the Mollusk harness in tributary-ya7m already solved, ported into QEDGen's Crucible frame). Both are substantial follow-up work — and this bean is explicitly OPTIONAL/secondary ("do not block the Mollusk fuzzer on it"). The primary Mollusk + cargo-fuzz path (tributary-ya7m, completed) already delivers verified coverage-guided + conservation/authority fuzzing. Defer until QEDGen codegen matures or prioritize via a dedicated codegen-fix bean.


## Blocker independently re-verified — 2026-07-22 (implementer pass)

Reproduced the QEDGen v2.38 Crucible codegen failure from a clean state to
confirm the blocker is current (not stale notes).

**Reproduction:** `qedgen probe --fuzz 5 --root programs/tributary --no-smoke`

**Result:** harness synthesized at `programs/tributary/.qed/fuzz/tributary/`
(680-line `src/main.rs`), then `cargo build` failed with **42 errors**
(E0422/E0432/E0433 type-resolution) + 40 warnings. Root cause identical to
the documented blocker: **38 unfilled `todo!("agent-fill: accounts::<Name>
{ ... } from spec accounts block")` stubs** — one per action handler. QEDGen
v2.38 synthesizes the action skeletons + the `accounts::*` struct types from
the IDL but emits `todo!()` for every account-fixture struct literal.

**Alternative path assessed — bare `crucible init`:** `crucible init tributary`
produces a clean, compilable 58-line scaffold (`#[fuzz_fixture]` + noop
`#[invariant_test]`). This is viable for a HAND-ROLLED harness. However, the
only non-duplicative value over the completed sibling (tributary-ya7m,
Mollusk + cargo-fuzz) would be Crucible's action-chain pooling engine on the
same compiled .so that Mollusk already loads into an in-process SVM with the
SAME conservation + authority oracles proven green. Building a parallel
Crucible harness with re-implemented fixtures for all ~6 in-scope handlers
(or 38 for full coverage) is speculative duplication for an explicitly
OPTIONAL secondary input. The bean itself says: "Defer until QEDGen codegen
matures or prioritize via a dedicated codegen-fix bean."

**Conclusion:** Genuinely blocked on the QEDGen v2.38 Rust-codegen limitation
(same root cause as tributary-eu41 §Blocker 2 — bare field reads +
ML-syntax ref_impl + unfilled account-context stubs). The primary
coverage-guided + conservation/authority fuzzing path (tributary-ya7m) is
COMPLETE and delivers the verified coverage this bean was meant to
supplement. Signaling `hordr blocked`.

**To unblock (either):**
- (a) QEDGen codegen fix: emit compilable account-fixture struct literals
  instead of `todo!()` stubs (upstream tooling change).
- (b) Dedicated bean: hand-fill the 38 account fixtures by porting the
  Mollusk harness fixture pattern (tributary-ya7m `tests/mollusk_oracle.rs`)
  into QEDGen's Crucible frame, OR build a minimal `crucible init` harness
  targeting only the 3 security-critical handlers (execute_payment,
  execute_composable, transfer) with a single conservation invariant.
