---
# tributary-ya7m
title: Behavior/sequence fuzzing of Tributary — Mollusk + cargo-fuzz (conservation + authority oracles)
status: todo
type: task
priority: high
created_at: 2026-07-01T07:22:51Z
updated_at: 2026-07-02T12:01:34Z
parent: tributary-ujni
---

# Mission

Add a standalone behavior/sequence fuzzer to `programs/tributary`. Goal: empirically attack the handler/CPI/account surface that formal verification explicitly *cannot* see (the "OUT" column of the formal-verification bean). "Adversary drains wallets" + "contract loses money" — tested, not proven.

Sibling bean: **tributary-eu41** (formal verification via QEDGen). The two coordinate at one seam — see "Oracle loop" below.

---

## Locked decisions (do not re-litigate without reason)

1. **Layer 2 mechanism: Mollusk + cargo-fuzz, STANDALONE.** NOT Crucible-primary. Tributary owns the oracle outright. (Crucible may stay as an optional secondary input if it matures — do not block on it.)
2. **Two oracles:** (a) **Conservation** — after every fuzzed sequence, `Σ token deltas == 0` across user / recipient / protocol-fee / gateway-fee / scheduler / referral / intermediate accounts. (b) **Authority inversion** — a tx that *must* fail (paused policy, expired OneTime, wrong milestone signer bit, insufficient delegate, wrong gateway signer) *succeeds* → bug.
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

- Pure-fn fuzzing of `calculate_fees` / `validate_policy_execution` — Kani covers exhaustively (see tributary-eu41). Layer 1 *proptest* on them is in scope (fast regression), but libfuzzer-on-pure-fn is redundant.
- Swap-output conservation — Meteora DLMM's responsibility (axiomatic in the formal spec; out of threat model here).

---

## References

- **Sibling bean:** tributary-eu41 (formal verification — `.qedspec` preconditions are the authority oracle; A2 PAYG property is the empirical-twin coordination point)
- **Files:** `shared/schedule.rs` (`advance_policy:397`, `validate_policy_execution:282`, existing proptest at :1375), `shared/fees.rs` (`calculate_fees:30` — conservation-oracle REFERENCE), `instructions/composable/execute_composable.rs` (`process_output_and_sweep:353`, ByteRangeCheck site, `min_output` net check :429), `instructions/payment/execute_payment.rs`
- **Constants:** `src/constants.rs` — `ALLOWED_FORWARD_PROGRAMS` (Meteora DLMM `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`), `ALLOWED_VALIDATION_PROGRAMS` (Lighthouse `L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`)
- **ADRs:** 0008 (CPI privilege boundary / signer sanitization), 0010 (settlement semantics / NET min_output), 0018 (unified fee model — the conservation reference)
- **Existing test harness:** `tests/*.test.ts` (~19K lines, Surfpool) — port the account-fixture setup into the Mollusk harness rather than rebuilding from scratch

## Todos

- [ ] Layer 1: proptest `fees.rs::calculate_fees` (conservation / residual≥0 / no-overflow, randomized)
- [ ] Layer 1: proptest `validate_policy_execution` bounds (all 4 PolicyType variants)
- [ ] Layer 1: proptest `advance_policy` PAYG period reset
- [ ] Layer 2: add `mollusk` + `cargo-fuzz` dev-deps; scaffold fuzz target crate
- [ ] Layer 2: port account-fixture setup from `tests/` TS harness into Rust/Mollusk (user payment, gateway, policy, delegate approval, mints/ATAs)
- [ ] Layer 2: implement conservation oracle (snapshot balances, assert Σ deltas via `calculate_fees` reference)
- [ ] Layer 2: implement authority-inversion oracle (consume `tributary-eu41`'s `.qedspec` must-fail list — coordinate)
- [ ] Layer 2: composable-forward fuzz target (mutate instruction_data, ByteRangeChecks, remaining_accounts ordering, validation_data)
- [ ] Layer 2: PAYG sequence fuzz target (clock advances across period boundaries; assert period cap — coordinate with A2 formal property)
- [ ] Enumerate (not fuzz) milestone `release_condition` 16-bit combinations
- [ ] Commit seed corpus; nightly 10-min CI workflow on `develop`
- [ ] Keep QEDGen Crucible as optional secondary input (do not block on it)
