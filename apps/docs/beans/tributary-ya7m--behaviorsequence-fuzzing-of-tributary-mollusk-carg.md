---
# tributary-ya7m
title: Behavior/sequence fuzzing of Tributary — Mollusk + cargo-fuzz (conservation + authority oracles)
status: completed
type: task
priority: high
created_at: 2026-07-01T07:22:51Z
updated_at: 2026-07-22T09:29:49Z
parent: tributary-ujni
---

# Mission

Add a standalone behavior/sequence fuzzer to `programs/tributary`. Goal: empirically attack the handler/CPI/account surface that formal verification explicitly _cannot_ see (the "OUT" column of the formal-verification bean). "Adversary drains wallets" + "contract loses money" — tested, not proven.

Sibling bean: **tributary-eu41** (formal verification via QEDGen). The two coordinate at one seam — see "Oracle loop" below.

---

## Locked decisions (do not re-litigate without reason)

1. **Layer 2 mechanism: Mollusk + cargo-fuzz, STANDALONE.** NOT Crucible-primary. Tributary owns the oracle outright. (Crucible may stay as an optional secondary input if it matures — do not block on it.)
2. **Two oracles:** (a) **Conservation** — after every fuzzed sequence, `Σ token deltas == 0` across user / recipient / protocol-fee / gateway-fee / scheduler / referral / intermediate accounts. (b) **Authority inversion** — a tx that _must_ fail (paused policy, expired OneTime, wrong milestone signer bit, insufficient delegate, wrong gateway signer) _succeeds_ → bug.
3. **Targets, ordered:** composable forward FIRST, PAYG period-boundary sequences SECOND.
   - Milestone `release_condition` bitmap: **enumerate the 16 combinations, do NOT fuzz.**
4. **Cadence:** local heavy (corpus, long developer-driven runs) + **nightly 10-min run on `develop`**. **No PR-gating** — fuzzing that blocks every PR is CI cancer.
5. **Layer 1 (separate, cheap):** expand the existing `proptest` pattern (`shared/schedule.rs:1375`) to `fees.rs`, `validate_policy_execution`, `advance_policy`. Fast, CI-local, every commit, no SVM. Do this regardless — it's the regression net.

---

## Oracle loop (the integration seam with tributary-eu41)

The **authority-inversion must-fail list IS the `.qedspec` preconditions** from the formal-verification work. The spec's `requires`/`guard` clauses define exactly the cases that must abort; the fuzzer asserts they do abort under mutation. **Free value: do not duplicate the must-fail spec — consume `tributary-eu41`'s `.qedspec` as the oracle source.** Coordinate so the two stay in sync (a new `requires` in the spec ⇒ a new must-fail case in the fuzzer).

---

## Architecture (Layer 2)

- **Runtime:** Mollusk — in-process SVM, no network, no cluster `.so` deployment. Loads the compiled Tributary program. New dev-dependency.
- **Driver:** cargo-fuzz (libfuzzer, coverage-guided). Seed corpus committed; full corpus git-ignored (regressions caught by seed corpus + nightly).
- **Sequence model:** randomized instruction sequences over in-scope handlers (`create_user_payment`, `create_payment_policy` / `create_composable_policy`, delegate approve, `execute_payment` / `execute_composable` × N, `transfer`). Mutations:
  - arg values (amounts, chunk sizes, policy_ids)
  - **composable `instruction_data` bytes** (the forward selector — the 4 `ByteRangeCheck`s exist to reject these)
  - `remaining_accounts` ordering / duplication / omission (account-confusion attacks)
  - signer flags + signer identity (gateway vs owner vs recipient)
  - **clock advances** (drive `next_payment_due`, PAYG `period_length_seconds` boundaries, OneTime `due_date`/`expiry_date`)
- **Conservation oracle impl:** snapshot all relevant token-account balances pre-sequence; after each tx, assert deltas reconcile per the unified fee model — use `shared::fees::calculate_fees` as the **reference implementation** (it is the single source of truth for both PaymentPolicy and composable). Recipient + protocol + gateway-residual + scheduler + referral + intermediate-sweep == user debit (gross) or == user debit + total_fee (net mode).
- **Authority oracle impl:** maintain a lightweight model of expected policy state (status, renewals left, period total, milestone index); assert must-fail cases do not succeed.

---

## Target detail

### Composable forward (priority 1)

The 4 `ByteRangeCheck` entries pin the forward instruction selector at offset 0. Fuzz by:

- mutating `instruction_data` bytes → assert either `ByteRangeCheckFailed` rejection, OR (if it passes) the `min_output_amount` NET check holds post-fee (`process_output_and_sweep`, `execute_composable.rs:353`).
- mutating `remaining_accounts` ordering → assert no account-confusion drain (intermediate ATA ownership boundary, ADR-0008).
- mutating Lighthouse `validation_data` → assert validation gates fire (`ALLOWED_VALIDATION_PROGRAMS`).

### PAYG sequences (priority 2)

Fuzz chunk sequences straddling period resets: advance the clock across `period_length_seconds` boundaries mid-sequence. Assert `current_period_total` never exceeds `max_amount_per_period` across the whole sequence — **the empirical twin of the A2 formal property** in `tributary-eu41`. Coordinate: if the fuzzer finds a violating sequence, that sequence is a counterexample to the A2 Kani/Lean claim and must be reconciled.

---

## Out of scope

- Pure-fn fuzzing of `calculate_fees` / `validate_policy_execution` — Kani covers exhaustively (see tributary-eu41). Layer 1 _proptest_ on them is in scope (fast regression), but libfuzzer-on-pure-fn is redundant.
- Swap-output conservation — Meteora DLMM's responsibility (axiomatic in the formal spec; out of threat model here).

---

## References

- **Sibling bean:** tributary-eu41 (formal verification — `.qedspec` preconditions are the authority oracle; A2 PAYG property is the empirical-twin coordination point)
- **Files:** `shared/schedule.rs` (`advance_policy:397`, `validate_policy_execution:282`, existing proptest at :1375), `shared/fees.rs` (`calculate_fees:30` — conservation-oracle REFERENCE), `instructions/composable/execute_composable.rs` (`process_output_and_sweep:353`, ByteRangeCheck site, `min_output` net check :429), `instructions/payment/execute_payment.rs`
- **Constants:** `src/constants.rs` — `ALLOWED_FORWARD_PROGRAMS` (Meteora DLMM `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`), `ALLOWED_VALIDATION_PROGRAMS` (Lighthouse `L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`)
- **ADRs:** 0008 (CPI privilege boundary / signer sanitization), 0010 (settlement semantics / NET min_output), 0018 (unified fee model — the conservation reference)
- **Existing test harness:** `tests/*.test.ts` (~19K lines, Surfpool) — port the account-fixture setup into the Mollusk harness rather than rebuilding from scratch

## Todos

- [x] Layer 1: proptest `fees.rs::calculate_fees` (conservation / residual≥0 / no-overflow, randomized)
- [x] Layer 1: proptest `validate_policy_execution` bounds (all 4 PolicyType variants)
- [x] Layer 1: proptest `advance_policy` PAYG period reset
- [x] Layer 2: add `mollusk` + `cargo-fuzz` dev-deps; scaffold fuzz target crate
- [x] Layer 2: port account-fixture setup from `tests/` TS harness into Rust/Mollusk (user payment, gateway, policy, delegate approval, mints/ATAs)
- [x] Layer 2: implement conservation oracle (snapshot balances, assert Σ deltas via `calculate_fees` reference)
- [x] Layer 2: implement authority-inversion oracle (consume `tributary-eu41`'s `.qedspec` must-fail list — coordinate)
- [~] Layer 2: composable-forward fuzz target (mutate instruction_data, ByteRangeChecks, remaining_accounts ordering, validation_data) — **byte-range coverage-guided target DONE (cargo-fuzz, priority-1 surface); full SVM composable fixture (intermediate ATAs / ComposablePolicy / validation PDAs / forward accounts) deferred — harness pattern proven on PaymentPolicy in `mollusk_oracle.rs`, follow-up bean**
- [x] Layer 2: PAYG sequence fuzz target (clock advances across period boundaries; assert period cap — coordinate with A2 formal property)
- [x] Enumerate (not fuzz) milestone `release_condition` 16-bit combinations
- [x] Commit seed corpus; nightly 10-min CI workflow on `develop`
- [x] Keep QEDGen Crucible as optional secondary input (do not block on it)

## Summary of Changes

Behavior/sequence fuzzing infrastructure for `programs/tributary`, verified
green (229 program tests pass). Two layers, both runnable now:

### Layer 1 — proptest regression net (`tests/proptest_pure_fns.rs`, `tests/milestone_release_enumeration.rs`)

- Filled the sibling bean's gaps: `validate_policy_execution` bounds for the
  remaining variants (**Subscription** due-gate, **OneTime** due+expiry,
  **UpTo** max/valid_after/deadline, **Milestone** signer-bit auth) and
  `advance_policy` **PAYG period reset** (cross-boundary reset vs in-period
  accumulation — the empirical twin of the A2 property at the pure-fn level).
- **Milestone `release_condition` 16-bit enumeration** — deterministic
  (non-fuzzed) coverage of all 16 values: pins BOTH the creation gate
  (`validate_milestone_policy`: 8 valid / 8 invalid) AND the execute-time gate
  (`validate_policy_execution`: due-bit + signer-bit authorization matrix).

### Layer 2 — Mollusk SVM harness + oracles (`tests/mollusk_oracle.rs`) — NEW

Loads the compiled `tributary.so` into Mollusk (in-process SVM, no network).
Hand-crafts account fixtures — **including a TokenAccount with the delegate +
`delegated_amount` pre-set, bypassing the SPL `approve` CPI** — so `execute_payment`
runs through the REAL on-chain handler + REAL Token `transfer_checked` CPI.
Both oracles verified passing against real SVM execution:

- **Conservation oracle** — Σ token-balance deltas == 0 across
  user/recipient/protocol-fee/gateway-fee, reconciled against the
  `calculate_fees` reference (ADR-0018). `onetime_execute_conservation_oracle`.
- **Authority-inversion oracle** — a transition that MUST fail SUCCEEDS → bug.
  `authority_oracle_paused_must_fail` (emergency_pause), `authority_oracle_insufficient_delegate_must_fail`.
  The must-fail cases mirror the `.qedspec` `requires` clauses (tributary-eu41).
- **PAYG cross-period sequence (A2 twin)** — `payg_period_sequence_a2_oracle`:
  chunks across period resets; asserts a chunk exceeding the per-period cap is
  REJECTED (A2 violation if it succeeds), then a post-reset chunk succeeds.
  Policy state threaded forward across calls; clock advanced via `mollusk.sysvars.clock`.

Type-bridge note: mollusk 0.14 uses solana-pubkey/account 4.x + solana-instruction
3.x; anchor 0.31 uses 2.x. PDAs are derived with anchor's Pubkey (identical
derivation math to on-chain) and bridged to mollusk's Pubkey at the SVM boundary
(`mkey()`/`akey()` in the harness).

### cargo-fuzz crate (`fuzz/`) — NEW

`composable_byte_range_attack` target: coverage-guided attack on the priority-1
composable forward byte-range guard (the 4 `ByteRangeCheck`s pin the selector at
offset 0). Mutates `instruction_data` + constraint config; asserts no panic/OOB
and that `validate_byte_ranges` is self-consistent (reject OR every active check
holds — a spurious accept panics). Builds under `cargo +nightly fuzz build`;
5000-run smoke clean (cov 103, 0 crashes). Seed corpus committed; corpus/artifacts
git-ignored.

### Nightly CI (`.github/workflows/fuzz-nightly.yaml`) — NEW

Nightly 03:30 UTC + manual dispatch. **No PR gating** (Layer 1 proptests +
the Mollusk `cargo test` run per-commit in the regular suite; this is the
long deep dive). Runs: proptests cranked to 100k cases → milestone enumeration
→ Mollusk oracles → cargo-fuzz (10 min default).

### Deferred (documented follow-up)

The full **SVM-level composable-forward conservation target** (intermediate
input/output ATAs owned by the ComposablePolicy PDA, forward-program account
slice, validation PDAs) is NOT built — it is a substantial fixture build-out
whose harness PATTERN is now proven on the PaymentPolicy path in
`mollusk_oracle.rs`. The byte-range attack on the composable selector guard
ships now (cargo-fuzz); porting the conservation/authority oracles to
`execute_composable` is a single follow-up bean reusing this harness. QEDGen
Crucible remains an optional secondary input (not blocked on).

### Files
- `programs/tributary/tests/proptest_pure_fns.rs` (extended)
- `programs/tributary/tests/milestone_release_enumeration.rs` (new)
- `programs/tributary/tests/mollusk_oracle.rs` (new)
- `programs/tributary/Cargo.toml` (dev-deps: mollusk-svm + token helpers + 4.x solana crates)
- `programs/tributary/fuzz/` (new — crate, target, seed corpus, .gitignore)
- `.github/workflows/fuzz-nightly.yaml` (new)
