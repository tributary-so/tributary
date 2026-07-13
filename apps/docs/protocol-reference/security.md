# Contract Security

This page documents the **on-chain security measures** Tributary enforces in
program code, each linked to the exact source line that implements it. It is
the contract-level counterpart to the operational security policy in
[`SECURITY.md`](../../SECURITY.md) and the formal verification setup in
[`formal_verification/README.md`](../../formal_verification/README.md).

The code links below point at `master`; if you are reading a checked-out
branch, swap the branch in the URL.

```
┌──────────────────────────────────────────────────────────────────────┐
│  LAYERED DEFENCE                                                     │
│                                                                      │
│   1. Pure drain-resistance math      (validate_policy_execution)     │
│   2. Unified fee conservation         (calculate_fees)               │
│   3. Permissionless, guarded execution (execute_payment/composable)  │
│   4. Composable CPI privilege boundary (ADR-0008)                    │
│   5. Program/gateway allowlists + emergency pause                    │
│   6. Formal spec + (pending) proofs   (.qedspec / Kani / Lean)       │
│   7. Integration tests + fuzzing       (Surfpool suite)              │
└──────────────────────────────────────────────────────────────────────┘
```

## 1. Pull-amount bounds & drain resistance

The core "an adversary cannot drain a wallet" guarantee is centralized in a
**pure** function — no `AccountInfo`, no CPI — which makes it cheap to reason
about and to verify:

- **`validate_policy_execution`** decides the permitted pull amount for every
  policy variant and enforces the per-call bounds.
  [`programs/tributary/src/shared/schedule.rs#L288`](https://github.com/tributary-so/tributary/blob/master/programs/tributary/src/shared/schedule.rs#L288)
  - **PayAsYouGo**: requires `0 < chunk ≤ max_chunk_amount` **and** that the
    projected period total stays within `max_amount_per_period`. This is the
    A2 cross-period drain-resistance property.
  - **Subscription / OneTime / UpTo**: each enforces its own bound and timing
    gate (due date / expiry / deadline).
- **`advance_policy`** performs the post-execution schedule advance (PAYG
  period reset or accumulate; subscription renewal decrement) with
  checked arithmetic.
  [`programs/tributary/src/shared/schedule.rs#L424`](https://github.com/tributary-so/tributary/blob/master/programs/tributary/src/shared/schedule.rs#L424)
- **Milestone release authorization** uses a 4-bit bitmap; bits 1–3
  (gateway / owner / recipient) are mutually exclusive signer requirements.
  [`programs/tributary/src/state/payment_policy.rs#L13`](https://github.com/tributary-so/tributary/blob/master/programs/tributary/src/state/payment_policy.rs#L13)

> **Formal twin:** the A2 period bound and the pull bound are stated as the
> `period_bounded` / `pull_bounded` properties in
> [`tributary.qedspec`](https://github.com/tributary-so/tributary/blob/master/tributary.qedspec).

## 2. Unified fee conservation

Fees are computed by a single pure decomposition so that the four carve-outs
(protocol / scheduler / referral / gateway-residual) **always sum exactly to
`total_fee`** — the residual is the structural balancing item, computed with
`checked_sub` so it can never go negative.

- **`calculate_fees`** — the unified gateway fee model (ADR-0018).
  [`programs/tributary/src/shared/fees.rs#L30`](https://github.com/tributary-so/tributary/blob/master/programs/tributary/src/shared/fees.rs#L30)
- **`bps_mul`** — `amount × bps / 10000`, the basis-points helper used by every
  fee computation; `checked_mul`/`checked_div`, errors on overflow.
  [`programs/tributary/src/shared/fees.rs#L80`](https://github.com/tributary-so/tributary/blob/master/programs/tributary/src/shared/fees.rs#L80)
- The constraint `protocol_share + scheduler_share + referral_allocation ≤
10000` is enforced at **every** gateway-config write site, not inside
  `calculate_fees` (see ADR-0018).

> **Formal twin:** `fee_conservation`, `fee_is_bps_decomposition`,
> `recipient_net_of_fee`, `residual_nonnegative`.

## 3. Permissionless, guarded execution

Payment execution is **permissionless** (ADR-0004) — any holder of the
gateway signer key may trigger an already-authorized payment — but every
guard runs before a single token moves:

- **Emergency pause**: `execute_payment` rejects while
  `ProgramConfig.emergency_pause` is set.
  [`programs/tributary/src/instructions/payment/execute_payment.rs#L61`](https://github.com/tributary-so/tributary/blob/master/programs/tributary/src/instructions/payment/execute_payment.rs#L61)
- **Status / delegate checks**: the policy must be `Active` and the
  `UserPayment` PDA must be the approved delegate with sufficient
  `delegated_amount` before the pull.
- **Composable** reuses the same fee/sweep path via `process_output_and_sweep`,
  so its conservation obligation is identical to the direct path.
  [`programs/tributary/src/instructions/composable/execute_composable.rs`](https://github.com/tributary-so/tributary/blob/master/programs/tributary/src/instructions/composable/execute_composable.rs)

## 4. Composable CPI privilege boundary (ADR-0008)

Composable policies pull funds into an **intermediate ATA owned by the
ComposablePolicy PDA** (not the UserPayment PDA), decoupling intermediate
authority from the user's source funds. Validation and forward CPI builders
**strip `is_signer`** from remaining accounts — closing a privilege
pass-through where the fee payer (a signer) could re-grant Lighthouse/DLMM
unintended signer authority.

- Signer-sanitization comment + implementation:
  [`programs/tributary/src/instructions/composable/execute_composable.rs#L144`](https://github.com/tributary-so/tributary/blob/master/programs/tributary/src/instructions/composable/execute_composable.rs#L144)
- Rationale: [ADR-0008](../adr/0008-composable-cpi-privilege-boundary.md).

## 5. Allowlists & emergency pause

- **Forward allowlist**: composable forward (swap) may only target
  **Meteora DLMM** (`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`); a
  sentinel `Pubkey::default()` disables the forward step entirely.
  [`programs/tributary/src/constants.rs#L13`](https://github.com/tributary-so/tributary/blob/master/programs/tributary/src/constants.rs#L13)
- **Validation allowlist**: composable validation may only target
  **Lighthouse** (`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`); a
  `SystemProgram` sentinel disables validation.
  [`programs/tributary/src/constants.rs#L16`](https://github.com/tributary-so/tributary/blob/master/programs/tributary/src/constants.rs#L16)
- **Forward instruction pinning**: at least one `ByteRangeCheck` must pin the
  forward instruction discriminator at offset 0, preventing a gateway from
  swapping in an arbitrary instruction. See ADR-0009 / ADR-0010.
- **`min_output_amount`** is checked against the **net** (post-fee) output —
  DeFi convention. See [ADR-0010](../adr/0010-composable-settlement-semantics.md).

## 6. Formal specification & proofs

The drain-resistance and fee-conservation logic is captured as a formal
specification (`.qedspec`) and discharged by Kani bounded model checking and
Lean 4 theorems. **Status:** spec authored and validation-clean; executable
proofs are scaffolded and currently blocked on QEDGen v2.38 toolchain fixes
(documented honestly in the verification README).

- Spec: [`tributary.qedspec`](https://github.com/tributary-so/tributary/blob/master/tributary.qedspec)
- Setup, toolchain install, and current status:
  [`formal_verification/README.md`](https://github.com/tributary-so/tributary/blob/master/formal_verification/README.md)

## 7. Integration tests & fuzzing

Account wiring, PDA derivation, CPI behaviour, and end-to-end payment flows
are exercised by the Surfpool integration suite (~19k LOC in `tests/`).
Behaviour / action-sequence fuzzing (Mollusk + cargo-fuzz) is in progress
(sibling bean `tributary-ya7m`); its authority oracle consumes the
`.qedspec` preconditions so a fuzzer counterexample to a `requires` is also a
spec signal.

## Reporting a vulnerability

See the [Reporting section of `SECURITY.md`](../../SECURITY.md#reporting-a-vulnerability).
Do **not** open a public issue.
