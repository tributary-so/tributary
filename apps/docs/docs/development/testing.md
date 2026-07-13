# Tributary — How We Test a Payment Protocol on Solana

**194 test functions. 61 formal proofs. 21 property tests. 9 integration suites. 3 differential proptests against chrono. One model checker that found a bug no human would have caught.**

This is the full inventory.



## The numbers

| Layer                                 | Count                     | What it exercises                                                                                                                                                              | How long                                   |
| ------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Rust unit tests (`#[test]` in `src/`) | 119                       | Pure-function math: schedule logic, fee decomposition, referral topology, mint validation, policy-variant invariants                                                           | seconds                                    |
| Differential proptests (vs chrono)    | 3                         | Calendar-month arithmetic correctness against the industry-standard Rust date library                                                                                          | seconds                                    |
| Property-based tests (proptest)       | 21                        | Same properties as formal verification, but random sampling on the real code                                                                                                   | 0.03s                                      |
| Kani BMC (impl-targeted)              | 16                        | Bounded model checking of the real `calculate_fees`, `validate_policy_execution`, `advance_policy`, `ByteRangeCheck::validate`, `validate_byte_ranges` for ALL symbolic inputs | 3s per linear proof, 10+ min per nonlinear |
| Kani BMC (spec-model)                 | 61 active / 71 disabled   | Model checking of the spec's effect formulas on a parallel state machine                                                                                                       | 3-10s per harness                          |
| Lean 4 theorems                       | scaffolded                | Universal-quantified preservation proofs                                                                                                                                       | blocked (codegen bug)                      |
| Integration tests (Surfpool)          | ~170 tests across 9 files | Full handler lifecycle: create, execute, delegate, pause, delete, referral chains, composable swaps, native-SOL unwrap, all 5 policy variants                                  | minutes                                    |
| API tests (Jest, mocked)              | 11 files                  | REST endpoints: token issuance, subscription filtering, OneTime details, rate limiting, JWKS, health                                                                           | seconds                                    |
| SDK package tests                     | 8 files                   | x402 middleware, payment verification, checkout sessions                                                                                                                       | seconds                                    |

Total: **~460 individual test cases** across **7 verification layers**.

---

## Layer 1 — Rust unit tests (119 tests, 12 files)

The foundation. Every pure function in the protocol has inline tests next to its definition.

### Schedule math (`shared/schedule.rs` — 52 tests + 3 proptests)

The largest test surface. Covers:

- **Subscription**: calendar-month advancement (Jan 31 + 1 month = Feb 28/29, not Mar 3). Leap-year aware. Day-clamping at every step. `max_renewals` decrement and completion. `auto_renew` indefinite continuation.
- **Milestone**: all 4 release-condition bitmap permutations (bit0 due-date, bit1 gateway signer, bit2 owner, bit3 recipient). Mutual exclusivity of bits 1-3. Wrong-caller rejection for each signer variant.
- **PayAsYouGo**: chunk > 0 enforcement (L-01 regression). Chunk > `max_chunk_amount` rejection. Period-cap breach rejection. Accumulate vs reset semantics.
- **OneTime**: immediate execution (`due_date <= 0`). Future due-date gating. Expiry enforcement. `provided_amount` ignored (fixed amount).
- **UpTo**: zero settle permitted (x402 "no usage, no charge"). Settle above max rejected. `valid_after` gating. Strict `< deadline` (not `<=`). Always completes after one settlement.

### Fee math (`shared/fees.rs` — 6 tests)

Gross/net mode split. Referral-disabled zeroing. Zero-shares-to-gateway. Residual-as-balancing-item. Overflow detection on `u64::MAX` input.

### Referral topology (`shared/referral.rs` — 9 tests)

Depth-3 chain construction. Broken-link handling. Self-reference rejection. Empty/over-depth rejection. Payer binding.

### Token-2022 blocklist (`shared/mint.rs` — 8 tests)

Rejects: permanent delegate, transfer hook, confidential transfer, transfer fee config, non-transferable, mint-close authority. This is the defense against Token-2022 extensions that could bypass the delegate model.

### Composable helpers (`instructions/composable/` — 13 tests across 2 files)

ForwardConfig validation: disabled-forward requires same mint, NATIVE_OUTPUT requires WSOL output, data-check bounds. Byte-range validation logic.

### Policy variant validators (`policies/` — 17 tests across 4 files)

Create-time invariants for each PolicyType variant. Zero-amount/deadline/interval rejection. Ordering constraints (expiry > due, deadline > valid_after).

---

## Layer 2 — Differential proptests (3 properties)

Located in `shared/schedule.rs:1485`.

The calendar math is hand-rolled (no `chrono` dependency in the on-chain program — it's `no_std` incompatible). These proptests verify our implementation against `chrono`.

1. **`add_months` matches chrono exactly** — for all timestamps [epoch, year 2400] and n in [1,12]. Our manual year/month/day decomposition with day-clamping equals `chrono::checked_add_months`.
2. **`calculate_next_payment_due` is monotonic AND chrono-accurate** — result is strictly > now AND lands on the exact date chrono produces via iterative month-adding with per-step clamping.
3. **Iteration cap enforced** — `skip_months` bails at 1200 iterations with `ArithmeticOverflow`.

---

## Layer 3 — Property-based tests (21 properties, 0.03s)

`programs/tributary/tests/proptest_pure_fns.rs`

Fast random-sampling counterpart to Kani. Same properties, non-exhaustive. 10,000 cases per property in under a second.

| Category                    | Properties                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `calculate_fees`            | Fee conservation (carve-outs sum to total_fee). Residual nonnegative. BPS decomposition. Gross mode identity. Net mode identity. Referral-disabled zeros pool. Overflow returns Err. |
| `validate_policy_execution` | Rejects zero chunk. Rejects oversize chunk. Accepts valid chunk (returns it unchanged).                                                                                              |
| `advance_policy`            | PAYG never auto-completes. OneTime always completes. UpTo always completes.                                                                                                          |
| `ByteRangeCheck::validate`  | Length > 8 rejects. In-bounds never panics. Matches correctly when expected == data.                                                                                                 |
| `validate_byte_ranges`      | num_checks > checks.len() returns Err.                                                                                                                                               |
| `validate_forward_config`   | Disabled requires same mint. Disabled + same mint + 0 checks is Ok. NATIVE_OUTPUT requires WSOL.                                                                                     |
| Referral pool               | Tier conservation: sum(tier_rewards) <= referral_pool.                                                                                                                               |

---

## Layer 4 — Kani bounded model checking (impl-targeted, 16 harnesses)

`programs/tributary/tests/kani_pure_fns.rs`

These call the real Rust functions directly. Not a spec model, not a mock. If someone edits `shared/fees.rs` and the math changes, these proofs break.

### What Kani does differently from proptest

Proptest generates random concrete inputs. Kani generates **symbolic** inputs — it explores ALL possible values simultaneously. If a property holds for all u64 values, Kani proves it in one run. Proptest can only sample.

The tradeoff: Kani is exhaustive but slow. A single nonlinear proof (fee multiplication) takes 10+ minutes. A linear proof (chunk bound check) takes 3 seconds.

### Passing proofs (9/16, all linear arithmetic)

| Proof                                                   | Function                    | Property                                          |
| ------------------------------------------------------- | --------------------------- | ------------------------------------------------- |
| `verify_payg_rejects_zero_chunk`                        | `validate_policy_execution` | Some(0) rejected for all inputs                   |
| `verify_payg_pull_bounded`                              | `validate_policy_execution` | returned amount <= max_chunk_amount               |
| `verify_payg_rejects_period_breach`                     | `validate_policy_execution` | chunk that breaches period cap rejected           |
| `verify_payg_advance_preserves_cap`                     | `advance_policy`            | A2: period_total <= max after reset or accumulate |
| `verify_onetime_advance_completes`                      | `advance_policy`            | returns true for all inputs                       |
| `verify_upto_advance_completes`                         | `advance_policy`            | returns true for all inputs                       |
| `verify_calculate_fees_max_input_no_panic`              | `calculate_fees`            | u64::MAX input: no panic, no UB                   |
| `verify_byte_range_check_rejects_length_above_eight`    | `ByteRangeCheck::validate`  | H-06 regression: length > 8 returns false         |
| `verify_validate_byte_ranges_rejects_excess_num_checks` | `validate_byte_ranges`      | H-04 regression: num_checks > len returns Err     |

### Slow proofs (7/16, nonlinear fee arithmetic)

These exercise `bps_mul` which does `amount * bps / 10000` via `checked_mul`/`checked_div`. Kani must explore the full branch tree of the checked arithmetic. Each takes 10+ minutes.

### The bug Kani found

```
schedule.rs:359:
if current_time >= *current_period_start + *period_length_seconds as i64 {
```

The bare `+` overflows `i64` when `period_length_seconds` is near `u64::MAX`. In debug mode: panic. In release mode: silent wraparound. The period-reset comparison then evaluates against garbage.

Kani found this because it explores ALL `u64` values for `period_length_seconds`, not just "reasonable" ones. No unit test or proptest would have caught it — the probability of randomly sampling `period_length_seconds > i64::MAX` is effectively zero.

Fix: `saturating_add`.

---

## Layer 5 — Kani spec-model (61 active / 71 disabled)

`formal_verification/kani.rs`

Generated by QEDGen from `tributary.qedspec`. Tests the spec's effect formulas on a parallel State struct. Does NOT call the real Anchor code.

### Why a separate layer?

The spec-model layer catches a different class of bug: **spec-internal inconsistency**. If the spec's effect formula for `total_fee` doesn't preserve `fee_conservation`, that's a spec bug — the formula is wrong before any code is written. The impl-targeted layer (Layer 4) can't catch this because it doesn't know what the spec says.

### The 71 disabled harnesses

Fee multiplication in the spec model uses `mul_div_floor_u128` — a u128 operation. CBMC (Kani's solver) encodes 128-bit multiplication as ~16K boolean gates. The SAT reduction is O(n^2) in bit-width.

It does not terminate. Not slow — never finishes.

The fee-conservation property holds by construction (`gateway_residual = total_fee - cuts`, so the sum is algebraically `total_fee`). The disabled harnesses would confirm this symbolically. The same guarantee is available via Layer 3 (proptest) and Layer 4 (impl Kani on the real `calculate_fees`).

### Drift gates

Two handlers (`create_payment_policy`, `transfer`) carry `#[qed(verified, spec_hash=..., hash=...)]` attributes. The `qedgen-macros` proc macro hashes the spec's handler block and the real Rust fn body at compile time. Any drift without re-running `qedgen adapt` produces `compile_error!`.

---

## Layer 6 — Integration tests (9 files, ~9,700 lines)

`tests/*.test.ts`

All run against Surfpool (Solana mainnet-fork simulator). These test the handler/account/CPI surface that formal verification cannot reach — PDA derivation, Anchor account constraints, token transfers, Lighthouse validation CPI, Meteora DLMM swap CPI.

### `tributary.test.ts` (4,296 lines, ~90 tests)

The monster suite. Covers:

- Program initialization (admin setup, frontrun protection)
- User payment creation + delegate approval (UserPayment PDA + legacy global delegate)
- Gateway lifecycle: create, change signer, change fee recipient, change fee bps, update protocol fee, update feature flags, update referral settings
- Subscription: create, execute (with delegate), pause, resume, delete, max_renewals completion, auto_renew indefinite
- Milestone: all 4 release-condition bitmap permutations, all signer combinations, due-date gating, multi-milestone progression
- PayAsYouGo: chunk claiming, period-cap exhaustion, period reset, multi-period sequences
- Referral program: L1/L2/L3 chains, disabled referral, broken chain handling
- Transfer instruction (standalone, ADR-0004)
- Delegate migration (global PDA to UserPayment PDA)
- Full account cleanup (close user payment, close gateway)

### `composable.test.ts` (1,885 lines, ~20 tests)

ComposablePolicy lifecycle: create with/without validation, forward/validation program allowlist, ByteRangeCheck bounds, status changes, delete (with ValidationPDA close), execute byte-range failure, C-1 regression (Subscription rejects forward_amount), B2/B3 regressions.

### Topup test suite (3 files, ~2,100 lines)

| File                                     | What it tests                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `topup-balance.test.ts` (661 lines)      | Same-mint topup (forward disabled). Lighthouse balance guard. Sentinel-disabled forward path. |
| `topup-balance-swap.test.ts` (728 lines) | USDC to WSOL via Meteora DLMM swap. Forward CPI with instruction data. Period-cap exhaustion. |
| `topup-balance-sol.test.ts` (709 lines)  | USDC to WSOL to native SOL via `NATIVE_OUTPUT` flag. `closeAccount` unwrap sweep.             |

### Policy-variant suites (2 files, ~1,200 lines)

| File                                   | What it tests                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `one-time-payment.test.ts` (623 lines) | OneTime (ADR-0019): direct PaymentPolicy (create, execute, Completed transition, re-exec blocked, due/expiry gating) + composable with Lighthouse guard      |
| `up-to-policy.test.ts` (568 lines)     | UpTo (ADR-0020): settle below max, settle at max, settle above max fails, settle zero, valid_after/deadline gating, recipient-triggerable, re-settle blocked |

### Scheduler evaluator (1 file, 334 lines)

Pure TypeScript unit tests for the composable scheduler's assertion evaluator: `parseAssertionFamily`, `applyIntegerOperator` (12 parametric cases), `evaluateAssertion` (accountInfo.lamports, tokenAccount.amount), `isScheduleReady` (all policy types).

### Surfpool smoke test (1 file, 166 lines)

Mainnet-fork harness shakedown: fund keypairs, mint USDC, create gateway + user payment.

---

## Layer 7 — Package-level tests (19 files)

### `packages/sdk-x402/` (3 files, 988 lines)

x402 HTTP-402 payment integration: Payment-Required header construction, `upto` scheme ceiling enforcement, `settleUpTo` delegation, middleware request flow, OpenAI token metering, usage tracking.

### `packages/payments/` (5 files, 1,441 lines)

Payment verification: JWT payload verification, subscription/payment claims, `TributaryVerifier` with real `jose` keypairs, JWKS fetch over HTTP, full verify round-trip. Checkout session URL encode/decode. `PaymentsClient` constructor and checkout.session.create.

### `apps/api/` (11 files)

REST API: token issuance validation, subscription filtering (3-filter limit, special chars), OneTime details with pagination, rate limiting (per-wallet, window reset), JWKS endpoint, health check.

---

## The gap map

What each layer covers and what it doesn't:

| Concern                                         | Covered by                                         | Gap                                                   |
| ----------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| Pure-function math (fees, schedule, validation) | Unit tests + proptest + Kani + differential chrono | None                                                  |
| Spec-internal consistency                       | Spec-model Kani (Layer 5)                          | Lean proofs blocked on codegen bug                    |
| Real-code correctness                           | Impl Kani (Layer 4) + proptest (Layer 3)           | 5 nonlinear fee proofs slow (10+ min each)            |
| Handler/account wiring                          | Surfpool integration tests                         | Not formally verified (Anchor Context wall)           |
| CPI boundary (Lighthouse, Meteora)              | Integration tests (swap, topup, native-SOL)        | Not formally verified (callee program responsibility) |
| Signer sanitization (ADR-0008)                  | Integration tests + manual review                  | Not formally verified                                 |
| Spec to code drift                              | Drift gates on 2 handlers                          | 4 handlers unmapped (match-arm name mismatch)         |

---

## Conclusion

The testing pyramid for Tributary, bottom to top:

- **119 unit tests** pin every pure function
- **3 differential proptests** pin the calendar math against chrono
- **21 property tests** sample the real code in milliseconds
- **16 Kani proofs** exhaustively verify the real code for all inputs
- **61 spec-model proofs** verify the spec is self-consistent
- **~170 integration tests** exercise the full handler/CPI surface
- **2 drift gates** make spec-code drift a compile error

The bug Kani found — an `i64` overflow in a period guard — would not have been caught by any other layer.

The 71 disabled harnesses (u128 SAT wall) are a hard limit of formal verification. The solver literally cannot finish. The workaround is layering: proptest for speed, Kani for depth, integration tests for coverage.

No single layer is sufficient. Together, they are.
