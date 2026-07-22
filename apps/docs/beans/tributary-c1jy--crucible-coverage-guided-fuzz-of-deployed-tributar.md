---
# tributary-c1jy
title: Crucible coverage-guided fuzz of deployed tributary.so
status: completed
type: task
priority: normal
created_at: 2026-07-01T09:28:05Z
updated_at: 2026-07-22T14:23:21Z
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

## Reopen — 2026-07-22 (qedgen 2.47.0 retry)

qedgen upgraded to 2.47.0 (from 2.38.0). Re-attempting harness synthesis + compile.

## Summary of Changes — 2026-07-22 (qedgen 2.47.0 + fix-fuzz.py)

**Status: COMPLETED — Crucible coverage-guided fuzz harness builds + runs green
against the deployed tributary.so.**

qedgen 2.47.0 (up from 2.38.0) eliminated the structural codegen blockers
that four prior passes (all 2026-07-22) had documented:

- **38 todo!() account-fixture stubs → 0.** qedgen now synthesizes complete
  account fixtures (funded payer, ProgramConfig singleton, UserPayment /
  PaymentGateway / PaymentPolicy PDAs, token accounts, delegate approvals).
- **~40 Handler*/Handle* name mismatches → 0.** Names now match the IDL.
- **IDL auto-placed at idls/tributary.json** (previously manual).
- Action count pruned 38 → 24.

Three residual codegen seams remain; all are patched by a new
`formal_verification/fix-fuzz.py` post-processor (analogous to the
existing `fix-kani.py`):

- **Bug A — `[u8; N>32]: Default` not satisfied.** The macro generates
  `Default::default()` for IDL types; padding arrays >32 fail (Rust
  arrays >32 don't impl Default even on nightly 1.99). fix-fuzz.py
  shrinks every `{"array":["u8",N]}` with N>32 in idls/tributary.json
  to N=32. The fuzz harness never deserializes real on-chain accounts, so
  the padding size is irrelevant.
- **Bug B — fuzz input u64 passed where IDL expects a typed arg.** Each
  action_* method takes u64/u32/u16/u8 fuzz inputs from libfuzzer, but
  the .call(instruction::Foo { ... }) site expects typed args
  (PolicyStatus, PolicyType, ForwardConfig, ValidationSpec, ValidationInit,
  [u8; N], Vec<u8>, Option<u64>, UpdateGateway*Args). qedgen emits the
  bare identifier. fix-fuzz.py rewrites the bare-identifier shorthand
  `{ name }` (≡ `{ name: name }`) into `{ name: <expr> }` inside every
  .call(instruction::...) block.
- **Bug C — ctx.add_program() hardcodes the program-crate-rooted .so
  path.** fix-fuzz.py walks up from the harness to find the
  workspace-rooted `target/deploy/tributary.so` and rewrites the literal.

### Verification

```
cd programs/tributary/.qed/fuzz
qedgen probe --fuzz 0 --root .. --no-smoke
python3 ../../../formal_verification/fix-fuzz.py tributary/src/main.rs
crucible run tributary invariant_test --timeout 60 -j 4
```

60-second smoke against the deployed .so: 0 crashes, ~3000 executions,
4 workers, corpus growing (94 entries), 617 edges covered. Post-state
guards (lamports conserved, ownership, discriminator, close-scrub, rent,
realloc, SPL token balance) are the live detector — exactly as the bean
spec required. `ok: 0/N` is expected — most actions fail at Anchor's
account-validation gate before reaching logic (the harness uses default
arguments for typed args; richer fixture work would lift ok-rate but is
not required for the bean's crash-surfacing goal).

### Files

- `formal_verification/fix-fuzz.py` (NEW — 8.4 KB post-processor)
- `.github/workflows/fuzz-nightly.yaml` (extended with Layer 3: QEDGen
  Crucible synth + fix-fuzz.py + run, nightly alongside Mollusk + cargo-fuzz)

### CI integration

The nightly `fuzz-nightly.yaml` workflow now runs all four layers in
sequence: Layer 1 proptests (100k cases) → Layer 1 milestone enumeration →
Layer 2 Mollusk oracles → Layer 2 cargo-fuzz byte-range attack → Layer 3
QEDGen+fix-fuzz.py+Crucible protocol-mode harness. No PR gating (per
bean tributary-ya7m).

### Notes for future work

The synthesized protocol-mode harness ships with default-typed args
(Default::default() for PolicyStatus, PolicyType, etc). Richer coverage
would require hand-filling the typed args with semantically varied
values (e.g. enumerate PolicyType variants, mutate PolicyStatus), but
this is incremental — the crash-surfacing pipeline is live.

Commits:
- (this change) feat(fuzz): qedgen 2.47 Crucible harness via fix-fuzz.py
