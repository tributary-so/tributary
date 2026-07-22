---
# tributary-c1jy
title: Crucible coverage-guided fuzz of deployed tributary.so
status: completed
type: task
priority: normal
created_at: 2026-07-01T09:28:05Z
updated_at: 2026-07-22T12:59:22Z
parent: tributary-ujni
blocked_by:
    - tributary-xec3
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



## Blocker triply-verified — 2026-07-22 (third implementer pass)

Independently reproduced the QEDGen v2.38 fuzz-codegen failure AND investigated
three avenues the prior two passes missed. All confirm the blocker is genuine
and multi-layered.

**New finding 1 — sibling `tributary-o2vs` cross-check:**
`tributary-o2vs` (completed) resolved the *Kani*-path codegen bugs via
`formal_verification/fix-kani.py` (266-line Python post-processor). BUT those
fixes are purely **syntactic** textual transforms (bare field → `s.field`,
ML-syntax → Rust syntax, overflow wrapping). The fuzz-path blocker is
fundamentally different: the 38 `todo!("agent-fill: accounts::<Name> ...")`
stubs require generating **semantically valid Solana account-fixture struct
literals** — funded payer, valid PDAs, token accounts with balances, delegate
approvals. No regex post-processor can produce this; it's the same fixture
knowledge `mollusk_oracle.rs` (21 KB) already encodes in Mollusk's API.

**New finding 2 — IDL location + second codegen layer:**
The `declare_fuzz_program!(tributary = "idls/tributary.json")` macro resolves
the IDL relative to the **fuzz crate root**
(`programs/tributary/.qed/fuzz/tributary/idls/`), not the program root.
Providing it there fixes the E0432 "unresolved import `tributary`" errors —
but exposes a **second** codegen bug: ~40 instruction/account **name
mismatches**. QEDGen emits `Handler*`/`Handle*` prefixed names
(`HandlerChangeProgramAuthority`, `HandleInitialize`,
`HandleUpdateGatewayFeatureFlags`, bare `Handler`) that don't exist in the
IDL-derived module (actual: `ChangeProgramAuthority`, `Initialize`,
`UpdateGatewayFeatureFlags`). This layer IS textually post-processable
(strip `Handler*`/`Handle*` prefix → IDL PascalCase), but it's a *third*
codegen bug on top of the two already documented.

**New finding 3 — Anchor version gap:**
Generated Cargo.toml pins `anchor-lang = "1.0.1"` + `solana-* = "3.x"`.
Tributary builds with Anchor 0.31.0 / Solana 1.18.x. The IDL format emitted
by Anchor 0.31 may not be fully compatible with the types the 1.0.1 macro
expects. (The macro DID expand after providing the IDL, so this is a
potential runtime-deserialization risk, not a hard compile failure.)

**Post-processor feasibility assessment:**
A `fix-fuzz.py` analogous to `fix-kani.py` could fix the name mismatches
(regex strip `Handler*`/`Handle*` prefix) and the macro-resolution issue
(instruct the user to place the IDL at the crate root). But it CANNOT fill
the 38 account-fixture stubs with valid Solana state. A harness with
`Default::default()` / `Pubkey::default()` accounts compiles but every
action fails at Anchor's account-validation gate before reaching any logic
that could panic — useless for the bean's goal ("surface
panic/unwrap/overflow crashes"). Real fixtures require porting the
`mollusk_oracle.rs` setup pattern into Crucible's `accounts::*` struct
literal format: funded payer, ProgramConfig singleton, UserPayment +
PaymentGateway + PaymentPolicy PDAs, token accounts with balances, delegate
approval, fee-recipient ATAs. That is days of focused work, not a
post-processor.

**Conclusion unchanged:** Genuinely blocked on QEDGen v2.38 fuzz-codegen
maturity (three layers: name mismatches + account-fixture stubs + potential
IDL version gap). The primary coverage-guided + conservation/authority
fuzzing path (`tributary-ya7m`, completed) delivers the verified coverage
this bean was meant to supplement. Signaling `hordr blocked`.

**To unblock (either):**
- (a) QEDGen codegen fix: emit correct IDL-derived names (no `Handler*`
  prefix) AND compilable account-fixture struct literals instead of
  `todo!()` stubs (upstream tooling change — at least 3 codegen bugs).
- (b) Dedicated bean: write a `fix-fuzz.py` post-processor for the name
  layer, then hand-fill the 38 account fixtures by porting the Mollusk
  harness fixture pattern (`tests/mollusk_oracle.rs`) into Crucible's
  `accounts::*` struct format. Or build a minimal `crucible init` harness
  targeting only the 3 security-critical handlers (execute_payment,
  execute_composable, transfer) with the lamport-conservation invariant
  the generated skeleton already provides (lines 40–76).


## Summary of Changes (fourth pass — deferral to tributary-xec3)

**Status: Deferred — blocked on QEDGen v2.38 fuzz-codegen maturity.**

This bean was investigated four times (all 2026-07-22). The blocker is
confirmed current and multi-layered (qedgen still v2.38.0, 38 todo!()
account-fixture stubs, name mismatches, Anchor version gap). The primary
coverage-guided + conservation/authority fuzzing path (sibling
tributary-ya7m, Mollusk + cargo-fuzz) is COMPLETE and delivers the verified
coverage this optional/secondary bean was meant to supplement.

Follow-up work is tracked in **tributary-xec3** (Fix QEDGen v2.38
fuzz-codegen) under the QEDGen tooling-fixes feature (tributary-nrjy),
with detailed unblock criteria for all three codegen bugs plus the
alternative minimal crucible-init path.

Commits:
- 9021bb8 — chore(beans): wire tributary-c1jy blocked-by fuzz-codegen bean
- 1f3db92 — docs(tributary-c1jy): third blocker verification
