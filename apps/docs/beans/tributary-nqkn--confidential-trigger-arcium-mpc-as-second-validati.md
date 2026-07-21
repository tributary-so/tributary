---
# tributary-nqkn
title: Confidential Trigger — Arcium MPC as second validation program (Tier 2)
status: todo
type: milestone
priority: high
tags:
    - arcium
    - confidential
    - tier-2
    - composable
    - validation
created_at: 2026-07-20T10:40:17Z
updated_at: 2026-07-20T10:50:10Z
blocked_by:
    - tributary-od0m
---

# Confidential Trigger — Arcium MPC as second validation program

**Tier 2 of the Arcium × Tributary confidentiality roadmap.** Adds Arcium as
a second allowlisted validation program alongside Lighthouse, so composable
policies can run **encrypted comparison logic** as their WHEN condition.
Trigger thresholds, oracle prices, and the balance being checked all stay
encrypted; only the boolean fire/veto outcome is revealed.

## What this milestone does

Today, composable `pre_validation` and `post_validation` use Lighthouse
assertions stored as **public** data in a ValidationPda. Anyone with an RPC
can read the trigger threshold ("fire if hot-wallet balance < 50 USDC") and
front-run, trip, or evade it.

Tier 2 introduces a second validation path: Arcium MPC circuits that take
encrypted inputs, run the comparison under MPC, and reveal only the boolean.

- `ALLOWED_VALIDATION_PROGRAMS` gains the Arcium MXE program ID.
- `ValidationSpec` gains (or reuses `ProgramCall`) an Arcium variant carrying
  the computation definition offset.
- `execute_composable` Phase 2 gains an **async branch**: when validation is
  Arcium-typed, the instruction queues an MPC computation, enters a
  `Validating` status, and a callback instruction resolves (continue or veto).
- The scheduler-cut accounting (ADR-0018) updates so the **callback-signer**
  gets the scheduler cut, not the queue-signer — preserving permissionless
  execution incentives under the new async shape.

## What this milestone hides / does NOT hide

| Hidden | Not hidden |
|---|---|
| Trigger threshold value | The fact that *a validation is configured* (policy has a validation PDA) |
| Balance / oracle value being compared | The Arcium computation being queued (queue event is public) |
| Comparison result (only bool revealed to callback) | Block timestamp / slot |
| | Policy schedule (Tier 3 territory) |
| | Pull amount (Tier 1 territory, but callback settles via Tier 1) |

## Architectural alignment

Maps to `WHEN × PULL × ROUTE`: this milestone turns the **WHEN** axis
confidential. It builds on Tier 1 (callback settlement uses confidential
rails) and is the foundation for Tier 3 (which generalizes encrypted compute
across the whole schedule).

## Critical constraints / known risks

1. **Async breaks single-tx atomicity.** `execute_composable` today is
   atomic: pull → validate → forward → settle in one tx. With Arcium
   validation, the flow splits: queue (tx 1) → MPC compute (seconds-minutes)
   → callback continue/veto (tx 2). Intermediate input ATA balance must be
   frozen across the window. **This is the architectural rub of Tier 2.**
2. **Anchor 0.31 vs Arcium Anchor 1.0 / Solana 3.1.10 skew.** Tier 2 needs
   `#[arcium_program]` + `#[arcium_callback]` macros on the Tributary program
   → these come from Arcium's Anchor fork. **Likely forces a Tributary
   toolchain migration** (Anchor 0.31 → 1.0, Solana 1.18 → 3.1). This is the
   single biggest cost in Tier 2 and must be scoped in Epic 0 (preflight).
3. **Pending-state attack surface.** A composable in `Validating` status has
   frozen intermediate funds. Need: concurrent-pull lock, timeout refund,
   replay protection on callbacks, signature verification on MPC outputs.
4. **Callback CU limit (1232 bytes).** Arcium callbacks return
   `SignedComputationOutputs<T>`. Validation outputs are small (a bool + a
   sealed continue-instruction), so this is not a binding constraint in
   Tier 2 — but `EncData<T>` should be used defensively.
5. **Scheduler incentive rewrite.** ADR-0018 pays the scheduler cut to the
   execute-tx signer. Under async, "the execute-tx signer" splits into
   queue-signer and callback-signer. Decision: callback-signer earns the cut
   (they're the one who completes the pull). Document in ADR-0032.
6. **Permissionless execution preservation.** Any gateway signer must be able
   to queue AND to resolve the callback. No custody, no whitelist of
   callback executors.

## HANDOFF

### 1. Happy Path

1. Owner creates a composable policy with `pre_validation = ArciumCall { mxe, comp_def_offset }`.
2. The circuit (e.g. `conf_lt`) is already initialized via `init_conf_lt_comp_def`.
3. Owner (or gateway on owner's behalf) encrypts inputs: balance threshold
   as `Enc<Mxe, u64>`, target ATA as a read-account.
4. Gateway signer calls `execute_composable`. Phase 2 detects Arcium validation,
   freezes the intermediate input ATA, queues the MPC computation, transitions
   policy to `Validating`.
5. MPC cluster computes `encrypted_balance < encrypted_threshold` under MPC.
   Result is a signed boolean.
6. Any gateway signer calls the callback instruction with the signed output.
   Program verifies the Arcium signature, then:
   - **bool = true** (condition met) → continue to Phase 3 (forward) + settle.
   - **bool = false** → veto, refund intermediate to user, transition policy
     back to `Active`.
7. Scheduler cut routes to the callback-signer's ATA.

### 2. Data Contract

- **Public surface**:
  - `ALLOWED_VALIDATION_PROGRAMS` — gains Arcium MXE program ID.
  - `ValidationSpec::ArciumCall { mxe: Pubkey, comp_def_offset: u32 }` (new
    variant) OR `ValidationSpec::ProgramCall` reused with Arcium MXE program_id.
  - `ComposablePolicy.status` gains `Validating` variant (or a separate
    `pending_comp_id: u64` field + slot-anchored timeout).
  - New instructions: `init_conf_lt_comp_def`, `init_conf_range_comp_def`,
    `init_conf_oracle_within_comp_def` (one-time circuit bytecode init).
  - Callback instruction: `#[arcium_callback(encrypted_ix = "conf_lt")]`.
  - New instruction: `refund_pending_validation` (timeout escape hatch).
  - SDK: `arcium.balance(ata).belowEncrypted(threshold)` builder, mirroring
    the `lighthouse` facade.
- **Modules touched**:
  - `programs/tributary/src/constants.rs` — Arcium MXE program ID added.
  - `programs/tributary/src/state/validation_pda.rs` — Arcium comp_def_offset.
  - `programs/tributary/src/state/composable_policy.rs` — pending_comp_id, Validating status.
  - `programs/tributary/src/instructions/composable/execute_composable.rs` — async Phase 2 branch.
  - `programs/tributary/src/instructions/composable/` — new callback + refund instructions.
  - `programs/tributary/src/shared/fees.rs` — scheduler-cut → callback-signer.
  - `packages/sdk/src/` — Arcium validation facade + @arcium-hq/reader for callback tracking.
- **New external deps**: Arcium Arcis toolchain (arcup), `@arcium-hq/client`, `@arcium-hq/reader`.

### 3. Edge Cases & Constraints

- **Never** reveal the comparison operands in any event or account field;
  only the boolean result may surface, and only inside the verified callback.
- **Never** allow a callback to fire without Arcium signature verification
  (`SignedComputationOutputs::verify_output`).
- **Never** allow double-resolution of a pending validation (idempotency key
  on pending_comp_id).
- **Never** allow a callback to continue a policy that has timed out
  (slot-anchored deadline beats MPC latency).
- The intermediate input ATA **must** be frozen (delegate revoked or balance
  moved to a pending sub-account) during `Validating` to prevent the user
  draining it before the veto refund.
- Both branches of any in-circuit `if` execute (MPC cost = sum); keep
  comparison circuits minimal.
- `next_payment_due` / schedule fields are NOT touched by Tier 2; only the
  validation predicate is encrypted.

### 4. Business Logic (pseudo-code, Arcis + Rust)

```rust
// Arcis circuit — encrypted less-than
#[instruction]
pub fn conf_lt(
    balance_ctxt: Enc<Mxe, u64>,
    threshold_ctxt: Enc<Mxe, u64>,
) -> bool {
    let balance = balance_ctxt.to_arcis();
    let threshold = threshold_ctxt.to_arcis();
    (balance < threshold).reveal()
}
```

```rust
// execute_composable Phase 2 — async branch (illustrative)
match &composable.pre_validation {
    ValidationSpec::ProgramCall { program_id } if program_id == &LIGHTHOUSE_ID => {
        // existing synchronous Lighthouse CPI path
        lighthouse_cpi(...)?;
    }
    ValidationSpec::ProgramCall { program_id } if program_id == &ARCIUM_MXE_ID => {
        // freeze intermediate, queue MPC, transition to Validating
        freeze_intermediate(&mut intermediate_input)?;
        let args = ArgBuilder::new()
            .plaintext_u128(nonce)
            .ciphertext(&balance_ct)
            .ciphertext(&threshold_ct)
            .build();
        queue_computation(ctx.accounts, offset, args,
            vec![ConfLtCallback::callback_ix(offset, &mxe,
                &[CallbackAccount { pubkey: composable_policy.key(), is_writable: true }])?],
            1, 0, 0)?;
        composable.status = ComposableStatus::Validating;
        composable.pending_comp_id = Some(comp_id);
        composable.pending_deadline_slot = Clock::get()?.slot + MAX_PENDING_SLOTS;
        return Ok(());  // exit execute_composable early; callback resumes
    }
    _ => { /* disabled / inline */ }
}
```

### 5. Definition of Done

- [ ] Epic 0 preflight: Anchor/Solana toolchain migration scoped (or ruled out with workaround).
- [ ] Arcium MXE program ID pinned in `constants.rs`; Arcis toolchain pinned in CI.
- [ ] Three comparison circuits compiled + comp_defs initialized: conf_lt, conf_range, conf_oracle_within.
- [ ] `execute_composable` Phase 2 async branch + Validating status + pending_comp_id.
- [ ] Callback instruction verifies Arcium sig, continues or vetoes + refunds.
- [ ] Timeout refund instruction works.
- [ ] Scheduler-cut accounting updated (ADR-0018 amendment in ADR-0032).
- [ ] SDK Arcium validation facade + @arcium-hq/reader callback tracking.
- [ ] Surfpool test suite: privacy (no operand leak), veto correctness, timeout refund, double-resolution rejection, permissionless resolution by non-queuing signer, signature-spoof rejection.
- [ ] ADR-0032 merged; AGENTS.md (allowlist now 2 entries) + tributary.qedspec updated.

### 6. Test Matrix (Given / When / Then)

- Given an encrypted balance < threshold, When the MPC callback fires true,
  Then the composable continues to forward + settle AND no operand value
  appears in any account, event, or log.
- Given an encrypted balance >= threshold, When the callback fires false,
  Then the composable vetoes AND the intermediate input is refunded to user
  AND the policy transitions back to Active.
- Given a policy in Validating, When a second execute is attempted, Then it
  reverts (concurrent-pull lock).
- Given a Validating policy past pending_deadline_slot, When anyone calls
  refund_pending_validation, Then the intermediate refunds to user and the
  policy returns to Active.
- Given a pending_comp_id already resolved, When the callback is replayed,
  Then it reverts (idempotency).
- Given a callback with a forged Arcium signature, When verification runs,
  Then it reverts (no privilege escalation).
- Given validation queued by gateway signer A, When gateway signer B (not A)
  submits the callback, Then it succeeds (permissionless).
- Given a trigger threshold, When an observer scrapes every account + event
  in the queue and callback txs, Then the threshold value is unrecoverable.

### 7. Open Questions

- **ARCIUM MXE PROGRAM ID ON MAINNET** — capture exact pubkey for `ALLOWED_VALIDATION_PROGRAMS`. (Epic 0.)
- **ANCHOR/SOLANA TOOLCHAIN MIGRATION** — does Tier 2 force Tributary to Anchor 1.0 / Solana 3.1? If yes, scope the migration as Epic 0 prerequisite. If a compatibility shim exists, document it. (Epic 0 — blocking.)
- **VALIDATIONSPEC SHAPE** — new `ArciumCall` variant, or reuse `ProgramCall` keyed on program_id? Reuse is less code; new variant is more type-safe. (Epic 1 design task.)
- **INTERMEDIATE FREEZE MECHANISM** — revoke delegate, move to pending sub-account, or temporal lock? Each has different fund-safety and CU profiles. (Epic 2 design task.)
- **MAX_PENDING_SLOTS** — what is a safe timeout given Arcium cluster latency? Need empirical queue→callback distribution. (Epic 5 latency test.)
- **CALLBACK CU BUDGET** — does the callback ix (verify + continue forward + settle) fit in one tx's CU budget, or does "continue" need to be a separate instruction the callback-signer fires next? (Epic 2 design task.)
- **COMPARISON CIRCUIT LIBRARY SCOPE** — ship just conf_lt for v1, or all three (lt/range/oracle_within)? conf_lt alone covers stop-loss + rebalancing; range covers band trading; oracle_within covers MEV-blind oracle triggers. (Epic 1.)


### Rewritten scope (2026-07-20 — scheduler-incentive gap, supersedes §3 partial coverage)

**The gap**: the original HANDOFF documented that "scheduler-cut routes to callback-signer" but did not answer *why a scheduler would crank under encrypted validation*. Off-chain simulation is impossible when the trigger is `Enc<Mxe, T>` (no off-chain party holds the decryption key; Arcium has no preview mode). The naive "scheduler pays MPC fee, learns boolean" model has negative expected value for low-`p` triggers and collapses the permissionless scheduler market.

**The resolution (Architecture A — canonical)**: heartbeat + owner-funded bounty.
- `ComposablePolicy` gains a public `max_check_frequency` (cadence only, NOT the trigger).
- Owner deposits a per-check bounty `B` into escrow at create time, where `B > C` (MPC check cost).
- Any scheduler may submit one check per heartbeat window (concurrent-lock awards first-only).
- Bounty disbursed to submitter **regardless** of fire outcome → scheduler EV positive by construction.
- On fire: submitter additionally earns the normal scheduler cut `S`.
- Owner's expected cost per fire = `B / p` — the confidentiality premium, paid by the party who chose to encrypt.

**Rejected alternatives**:
- **Architecture B (public pre-condition + encrypted fine-condition)** — leaks a coarse band; acceptable for some use cases, kept as a documented variant.
- **Architecture C (owner-as-cranker)** — loses permissionlessness; institutional-only fallback.

**Pricing implication for ADR-0032**: confidentiality is not free. The protocol fee model must accommodate per-check bounties. Retail low-value triggers likely stay on public validation; encrypted triggers are a premium tier for institutional flows.

**Tasks added**: feature `tributary-hii7` (bounty mechanism impl/test/review) under the Async State Machine epic; ADR-amendment task `tributary-9k10` under the Docs epic.
