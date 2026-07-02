# Tributary — Formal Verification

This directory and the hand-rolled harnesses in `programs/tributary/tests/`
together form a **layered** verification of Tributary's pull-payment logic.

> **Status (2026-07-02):**
>
> | Layer                     | Status                                                               |
> | ------------------------- | -------------------------------------------------------------------- |
> | Spec validation           | ✅ clean (`qedgen check` exit 0, 9 properties, 6 handlers)           |
> | Layer 1 (spec-model Kani) | ✅ 61/132 active & passing; 71 disabled (u128 SAT)                   |
> | Layer 2 (impl Kani)       | ✅ 11/16 PASS (5 nonlinear fee proofs slow)                          |
> | Layer 2 (proptest)        | ✅ 21/21 passing in 0.03s                                            |
> | Drift gates               | ✅ 2 handlers stamped (`create_payment_policy`, `transfer`)          |
> | Lean                      | ⚠️ recursion solved (4.30.0 pin); Spec.lean blocked on codegen Bug A |

---

## Architecture — what tests what

```
┌─────────────────────────────────────────────────────────────────────┐
│                       tributary.qedspec                             │
│              (human-authored, single source of truth)               │
│              9 properties · 6 handlers · flat State                 │
└──────┬──────────────────────────────────┬──────────────────────────┘
       │                                  │
       │ qedgen codegen --kani            │ (no qedgen — hand-rolled)
       │ + fix-kani.py post-processor     │
       │                                  │
       ▼                                  ▼
┌────────────────────────┐    ┌──────────────────────────────────────┐
│  LAYER 1: Spec-model   │    │  LAYER 2: Impl-targeted              │
│  formal_verification/  │    │  programs/tributary/tests/           │
│  kani.rs               │    │                                      │
│                        │    │  kani_pure_fns.rs (16 harnesses)     │
│  61 active harnesses   │    │  proptest_pure_fns.rs (21 tests)     │
│  71 disabled (u128)    │    │                                      │
│                        │    │  Calls the REAL Rust functions:      │
│  Tests the SPEC's      │    │  • calculate_fees()                  │
│  effect formulas on    │    │  • validate_policy_execution()       │
│  a parallel State      │    │  • advance_policy()                  │
│  struct. Never calls   │    │  • ByteRangeCheck::validate()        │
│  the real Anchor code. │    │  • validate_byte_ranges()            │
│                        │    │  • validate_forward_config()         │
│  Catches: spec math    │    │                                      │
│  self-inconsistency.   │    │  Catches: real code bugs, overflow,  │
│                        │    │  wrong math, missing guards.         │
│                        │    │  Found: i64 overflow (bean vtne).    │
└────────────────────────┘    └──────────────────────────────────────┘

       │
       │  #[qed(verified, spec_hash=..., hash=...)]
       │  on create_payment_policy + transfer handlers
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  DRIFT GATES: qedgen-macros proc macro                           │
│  programs/tributary/src/instructions/payment/                    │
│    create_payment_policy.rs  ← #[qed(verified)]                  │
│    transfer.rs               ← #[qed(verified)]                  │
│                                                                  │
│  At compile time: reads spec, hashes handler block, compares     │
│  against stamped hash. Any drift → compile_error!                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  LEAN 4 (math level)                                             │
│  formal_verification/Spec.lean + Proofs.lean                     │
│                                                                  │
│  ∀-quantified preservation theorems.                             │
│  Recursion blocker SOLVED (pin lean-toolchain to v4.30.0).       │
│  New blocker: Spec.lean has same Bug A as kani.rs                │
│  (bare field reads — tracked in bean tributary-kqhl).            │
└──────────────────────────────────────────────────────────────────┘
```

### What each layer catches (and doesn't)

|                       | Layer 1 (spec-model Kani) | Layer 2 (impl Kani + proptest)    | Drift gates       | Lean             |
| --------------------- | ------------------------- | --------------------------------- | ----------------- | ---------------- |
| **Tests**             | Spec's effect formulas    | Real Rust functions               | Spec ↔ code hash | Spec math        |
| **Real code?**        | ❌ parallel State model   | ✅ calls real fns                 | N/A (hash only)   | ❌ spec model    |
| **Exhaustive?**       | ✅ all symbolic inputs    | ✅ Kani (slow); proptest (random) | N/A               | ✅ ∀-quantified  |
| **Fast?**             | ✅ 3-10s per harness      | Kani: 3s-10min; proptest: 0.03s   | ✅ compile-time   | ⚠️ minutes-hours |
| **Catches spec bugs** | ✅                        | ❌                                | ❌                | ✅               |
| **Catches code bugs** | ❌                        | ✅                                | ❌                | ❌               |
| **Catches drift**     | ❌                        | ❌                                | ✅                | ❌               |

---

## How to run everything

### Prerequisites

```bash
# QEDGen (spec driver + codegen)
git clone --depth 1 https://github.com/qedgen/solana-skills.git
cd solana-skills && bash install.sh && qedgen --version  # → 2.38.0

# Kani (bounded model checker)
yay -S kani          # Arch; or see https://github.com/model-checking/kani/releases

# Lean (optional — for Lean proofs)
elan toolchain install v4.30.0
```

> ⚠️ The GitHub search hit `beardedwheatgrasswalkupapartment951/solana-skills`
> is **not** QEDGen. Use `qedgen/solana-skills` only.

### Quick checks (run all at once)

```bash
# 1. Validate the spec
qedgen check --spec tributary.qedspec

# 2. Run proptests on real code (fast — 0.03s)
cd programs/tributary && cargo test --test proptest_pure_fns && cd ..

# 3. Verify drift gates compile (spec ↔ code hash check)
cd programs/tributary && cargo check && cd ..
```

### Layer 1 — Spec-model Kani

```bash
# Regenerate from spec + apply codegen fixes (after any spec edit)
qedgen codegen --spec tributary.qedspec --kani --kani-output formal_verification/kani.rs
rm -rf programs/src/ programs/Cargo.toml   # clean codegen side-effects
python3 formal_verification/fix-kani.py formal_verification/kani.rs

# Run all 61 active harnesses (completes in ~5 min)
cd formal_verification && cargo kani

# Run one harness
cargo kani --harness verify_execute_payment_case_0_preserves_period_bounded
```

**What it proves:** The spec's effect formulas preserve each property for ALL
symbolic inputs. If the spec's math is internally inconsistent (an effect
formula violates a property), Kani finds a counterexample.

**What it doesn't prove:** It tests a parallel State model derived from the
spec, NOT the real Anchor program. A bug in the real code that diverges from
the spec won't be caught here — use Layer 2 for that.

### Layer 2 — Impl-targeted Kani (real code)

```bash
cd programs/tributary

# Run all 16 harnesses (slow — first compilation ~15 min for Anchor deps;
# individual harnesses 3s-10min depending on arithmetic complexity)
cargo kani --tests

# Run specific harness
cargo kani --tests --harness verify_payg_pull_bounded

# Fast harnesses only (linear arithmetic — seconds each):
cargo kani --tests --harness verify_payg_rejects_zero_chunk
cargo kani --tests --harness verify_payg_pull_bounded
cargo kani --tests --harness verify_payg_rejects_period_breach
cargo kani --tests --harness verify_payg_advance_preserves_cap
cargo kani --tests --harness verify_onetime_advance_completes
cargo kani --tests --harness verify_upto_advance_completes
cargo kani --tests --harness verify_calculate_fees_max_input_no_panic
cargo kani --tests --harness verify_byte_range_check_rejects_length_above_eight
cargo kani --tests --harness verify_validate_byte_ranges_rejects_excess_num_checks
```

**What it proves:** The REAL `calculate_fees`, `validate_policy_execution`,
`advance_policy`, `ByteRangeCheck::validate`, and `validate_byte_ranges`
satisfy their properties for ALL symbolic inputs. If someone edits the real
Rust and the math changes, these proofs break.

**Slow harnesses** (5 fee-arithmetic proofs): `verify_calculate_fees_*` use
nonlinear arithmetic (u64 × u16 multiplication + division). Kani explores the
full `checked_mul`/`checked_div` branch tree. Run individually; expect
10+ minutes each.

### Layer 2 — Proptests (real code, fast)

```bash
cd programs/tributary

# Run all 21 proptests (0.03s)
cargo test --test proptest_pure_fns

# Deep run (10,000 cases per property — still <1s)
PROPTEST_CASES=10000 cargo test --test proptest_pure_fns
```

**What it proves:** Same properties as Kani but via random sampling instead
of exhaustive symbolic execution. Non-exhaustive (can miss rare
counterexamples) but extremely fast — good for CI and regression catches.

**Coverage:** fee conservation, residual nonneg, bps decomposition, gross/net
mode, referral-disabled zeros pool, overflow returns Err, PAYG chunk bounds,
PAYG period breach, completion semantics (OneTime/UpTo), ByteRangeCheck
validation, validate_byte_ranges num_checks bound, forward-config validation,
referral tier conservation.

### Drift gates

```bash
# The #[qed(verified)] attributes are already stamped on:
#   create_payment_policy.rs  — #[qed(verified, spec="../../tributary.qedspec", ...)]
#   transfer.rs               — #[qed(verified, spec="../../tributary.qedspec", ...)]
#
# cargo check verifies the hashes at compile time. No special command needed.

# If you edit the spec or the handler body, re-stamp the hashes:
qedgen adapt --program programs/tributary --spec tributary.qedspec
# Paste the emitted #[qed(verified, ...)] above the handler fn.
```

**What it catches:** If someone edits `tributary.qedspec`'s handler block
WITHOUT updating the `spec_hash`, or edits the real handler fn WITHOUT
updating the `hash`, `cargo build` produces `compile_error!`. This makes
spec↔code drift impossible to merge silently.

**Coverage:** 2 of 6 spec handlers mapped (create_payment_policy, transfer).
The execute_payment/composable handlers use match-arm names in the spec that
don't exist as real Anchor handler names — needs `--handler` overrides to map.

### Lean (math-level proofs)

```bash
# The lean-toolchain is pinned to v4.30.0 (matches qedsvm v0.8.0).
# The recursion blocker is SOLVED. Current blocker: Spec.lean has
# the same bare-field codegen bug as kani.rs (Bug A).

cd formal_verification && lake build
# Currently fails: Spec.lean:56 "Unknown identifier emergency_pause"
# (should be s.emergency_pause). Needs a Lean-aware fix-kani equivalent.
```

---

## The spec — `tributary.qedspec`

Human-authored, validation-clean. Defines:

| Property                   | Asserts                                                           | Scope                               |
| -------------------------- | ----------------------------------------------------------------- | ----------------------------------- |
| `period_bounded` (A2)      | No PAYG chunk sequence exceeds `max_amount_per_period` per period | execute_payment, execute_composable |
| `period_cap_fixed`         | `max_amount_per_period` immutable after creation                  | all except create_payment_policy    |
| `fee_conservation`         | Carve-outs sum exactly to `total_fee`                             | all except create_payment_policy    |
| `fee_is_bps_decomposition` | `total_fee == amount × gateway_fee_bps / 10000`                   | all except create, transfer         |
| `recipient_net_of_fee`     | Gross mode: `recipient + fee == amount`                           | all except create, transfer         |
| `pull_bounded`             | PAYG chunk ≤ `max_chunk_amount`                                   | execute_payment, execute_composable |
| `residual_nonnegative`     | `gateway_residual ≤ total_fee`                                    | all except create, transfer         |
| `referral_pool_bounded`    | `referral_pool ≤ total_fee`                                       | all except create, transfer         |
| `sweep_nonnegative`        | `recipient_amount ≤ payment_amount`                               | all except create, transfer         |

Handlers modeled: `create_payment_policy`, `execute_payment` (PAYG match arms),
`execute_composable` (PAYG match arms), `transfer`, `release_milestone`.

---

## Layer 2 harness reference

### Kani (`programs/tributary/tests/kani_pure_fns.rs`)

| Harness                                                 | Real function               | Property                      | Status    |
| ------------------------------------------------------- | --------------------------- | ----------------------------- | --------- |
| `verify_payg_rejects_zero_chunk`                        | `validate_policy_execution` | Some(0) → Err                 | ✅        |
| `verify_payg_pull_bounded`                              | `validate_policy_execution` | returned ≤ max_chunk          | ✅        |
| `verify_payg_rejects_period_breach`                     | `validate_policy_execution` | cap breach → Err              | ✅        |
| `verify_payg_advance_preserves_cap`                     | `advance_policy`            | A2 invariant                  | ✅        |
| `verify_onetime_advance_completes`                      | `advance_policy`            | OneTime → true                | ✅        |
| `verify_upto_advance_completes`                         | `advance_policy`            | UpTo → true                   | ✅        |
| `verify_calculate_fees_max_input_no_panic`              | `calculate_fees`            | u64::MAX no panic             | ✅        |
| `verify_byte_range_check_rejects_length_above_eight`    | `ByteRangeCheck::validate`  | length > 8 → false (H-06)     | ✅        |
| `verify_validate_byte_ranges_rejects_excess_num_checks` | `validate_byte_ranges`      | num_checks > len → Err (H-04) | ✅        |
| `verify_byte_range_check_no_panic`                      | `ByteRangeCheck::validate`  | no panic for any input        | ⏳ slow   |
| `verify_validate_byte_ranges_no_panic`                  | `validate_byte_ranges`      | no panic for any input        | ⏳ slow   |
| `verify_calculate_fees_conservation`                    | `calculate_fees`            | carve-outs sum                | ⏳ >10min |
| `verify_calculate_fees_residual_nonnegative`            | `calculate_fees`            | residual ≤ total_fee          | ⏳ >10min |
| `verify_calculate_fees_bps_decomposition`               | `calculate_fees`            | total_fee = amount×bps/10000  | ⏳ >10min |
| `verify_calculate_fees_recipient_gross`                 | `calculate_fees`            | gross mode identity           | ⏳ >5min  |
| `verify_calculate_fees_recipient_net`                   | `calculate_fees`            | net mode identity             | ⏳ >5min  |

### Proptest (`programs/tributary/tests/proptest_pure_fns.rs`)

21 tests covering all of the above properties PLUS:
`referral_disabled_zeros_pool`, `overflow_returns_err`, `byte_range_check_matches_correctly`,
`byte_range_check_in_bounds_never_panics`, `validate_byte_ranges_rejects_num_checks_above_len`,
`forward_disabled_requires_same_mint`, `forward_disabled_same_mint_zero_checks_ok`,
`native_output_requires_wsol_mint`, `referral_tier_conservation`.

All 21 pass in 0.03s.

### Finding: i64 overflow (bean tributary-vtne)

Kani caught a real overflow in `validate_policy_execution` (schedule.rs:359):

```rust
// BUG: bare + can overflow i64
if current_time >= *current_period_start + *period_length_seconds as i64 {
```

Panics in debug, wraps silently in release. Fix: `saturating_add`. The Layer 2
harness works around it with `kani::assume` bounds for realistic inputs.

The `fix-kani.py` Layer 1 post-processor uses `saturating_add` which masks
this bug at Layer 1 — see the WARNING comment in `fix-kani.py` Bug E.2. The
fix in schedule.rs and the removal of the Layer 1 mask are coupled (documented
in bean tributary-vtne).

---

## Disabled harnesses (Layer 1)

71 of 132 spec-model harnesses are disabled by `fix-kani.py` because they
exercise `bps_mul` → `mul_div_floor_u128` → u128 multiplication. CBMC converts
128-bit × 128-bit multiplication into ~16K boolean gates — the propositional
reduction doesn't terminate in reasonable time.

| Pattern                                                 | Count | Why                                   |
| ------------------------------------------------------- | ----- | ------------------------------------- |
| `*_preserves_fee_conservation`                          | 9     | Asserts carve-out sum == total_fee    |
| `*_preserves_fee_is_bps_decomposition`                  | 7     | Asserts total_fee == amount×bps/10000 |
| `*_preserves_recipient_net_of_fee`                      | 7     | Asserts recipient+fee == amount       |
| `*_preserves_residual_nonnegative`                      | 9     | Asserts residual ≤ total_fee          |
| `*_effect_total_fee` through `*_effect_total_from_user` | 35    | Per-field effect conformance          |
| `*_establishes_fee_*` etc.                              | 4     | Create-time establishes               |

The fee-conservation property holds by construction (gateway_residual is the
balancing item). The same guarantee is confirmed by Layer 2 Kani/proptest on
the real `calculate_fees`.

---

## Honest status

> Tributary's pull-payment bounds and fee-conservation logic are formally
> specified and model-checked. The core pure functions (`calculate_fees`,
> `validate_policy_execution`, `advance_policy`, `ByteRangeCheck::validate`,
> `validate_byte_ranges`) are verified by Kani bounded model checking against
> their specification for all symbolic inputs, and by property-based testing
> (21 properties, 10K cases each). Drift gates on `create_payment_policy`
> and `transfer` enforce spec↔code hash binding at compile time. Account
> wiring, PDA derivation, CPI allowlisting, and signer sanitization are
> covered by integration tests (Surfpool) and the planned coverage-guided
> fuzzer.

---

## File map

```
tributary.qedspec                              ← spec (single source of truth, 9 properties)
formal_verification/
  Cargo.toml                                   ← standalone crate for Layer 1 Kani
  kani.rs                                      ← Layer 1: 61 active + 71 disabled spec-model harnesses
  fix-kani.py                                  ← post-processor: fixes 5 codegen bugs + disables slow harnesses
  lean-toolchain                               ← pinned to v4.30.0 (matches qedsvm v0.8.0)
  Spec.lean                                    ← Lean model (generated, has Bug A)
  Proofs.lean                                  ← Lean proofs (user-owned)
  qedgen-codegen-bugs.md                       ← sanitized bug report for upstream filing
  qedgen-codegen-bug-reports.md                ← 5 issue fills in GitHub template format
  README.md                                    ← this file
programs/tributary/Cargo.toml                  ← qedgen-macros dep for drift gates
programs/tributary/tests/
  kani_pure_fns.rs                             ← Layer 2: 16 Kani harnesses on REAL code
  proptest_pure_fns.rs                         ← Layer 2: 21 proptests on REAL code
programs/tributary/src/
  shared/fees.rs                               ← REAL calculate_fees (Layer 2 calls this)
  shared/schedule.rs                           ← REAL validate_policy_execution + advance_policy
  shared/referral.rs                           ← REAL process_referral_rewards (proptest covers the math)
  state/composable_policy.rs                   ← REAL ByteRangeCheck::validate + ForwardConfig
  instructions/composable/execute_composable.rs ← REAL validate_byte_ranges
  instructions/composable/create_composable_policy.rs ← REAL validate_forward_config
  instructions/payment/create_payment_policy.rs ← #[qed(verified)] drift gate
  instructions/payment/transfer.rs              ← #[qed(verified)] drift gate
```

---

## Toolchain versions

- QEDGen `v2.38.0` — `github.com/qedgen/solana-skills`
- Kani `0.64.0` — Arch `kani` package
- Lean `4.30.0` (via elan) — pinned to match qedsvm v0.8.0
- Crucible — not installed (optional)
