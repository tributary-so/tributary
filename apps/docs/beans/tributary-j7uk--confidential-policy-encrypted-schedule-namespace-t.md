---
# tributary-j7uk
title: Confidential Policy — Encrypted schedule namespace (Tier 3)
status: todo
type: milestone
priority: normal
tags:
    - arcium
    - confidential
    - tier-3
    - policy
    - institutional
created_at: 2026-07-20T10:41:19Z
updated_at: 2026-07-20T10:41:19Z
blocked_by:
    - tributary-nqkn
---

# Confidential Policy — Encrypted schedule namespace

**Tier 3 of the Arcium × Tributary confidentiality roadmap.** The heaviest
integration: a new **ConfidentialPaymentPolicy** account namespace where the
entire schedule — amount, frequency, due dates, renewal counts, milestone
tranches, PAYG caps, recipient identity — lives as `Enc<Mxe, T>`. Every
execute is a queued MPC computation; the callback resolves the schedule and
triggers a Tier-1 confidential transfer for the actual pull.

## What this milestone does

Generalizes Tier 2's "encrypted comparison" into "encrypted schedule
arithmetic." Every PolicyType variant gets a confidential counterpart whose
state is encrypted at rest and at compute:

- `ConfSubscription { amount, next_due, frequency, renewals_remaining, auto_renew }`
- `ConfMilestone { amounts: [u64;4], timestamps: [u64;4], released: [bool;4], release_condition }`
- `ConfPayAsYouGo { max_chunk, max_per_period, period_length, period_used, period_start, expiry }`
- `ConfOneTime`, `ConfUpTo` (analogous)
- Recipient identity: `Enc<Mxe, SerializedSolanaPublicKey>` inside the struct;
  settlement uses Arcium **sealing** (re-encryption to the gateway signer's
  `Shared` key) so the recipient pubkey only materializes at execute time.

Every execute is a queued Arcium computation. The circuit:
1. Decrypts the schedule under MPC.
2. Checks `now >= next_due` (both branches execute).
3. Computes the pull amount + updated schedule.
4. Seals the pull amount + recipient to the gateway signer for settlement.
5. Returns the updated encrypted schedule for the callback to persist.

## What this milestone hides / does NOT hide

| Hidden | Not hidden (structural) |
|---|---|
| Pull amount | Sender/owner pubkey |
| Schedule (due date, frequency, renewal count) | The fact that a confidential policy exists |
| Milestone amounts + timestamps | Block timestamp / slot of the execute tx |
| PAYG caps + usage tracking | Token mint |
| UpTo max_amount + deadline | The Arcium computation being queued |
| Recipient identity (until settlement seal window) | Gateway identity (still public) |

Tier 3 is the **maximal** confidentiality surface. Anything not in the "Not
hidden" column is encrypted.

## Architectural alignment

Turns **PULL** confidential at the schedule level (Tier 1 hid the transfer
amount; Tier 3 hides the *scheduled* amount), generalizes Tier 2's encrypted
WHEN across the whole policy, and seals ROUTE (recipient) until settlement.

Tier 3 is the foundation for **institutional treasury flows**: executive
payroll, tokenized-fund rebalancing, grant tranche release, vendor payments
where neither party wants the public to know the deal size.

## Critical constraints / known risks

1. **Per-pull MPC cost vs unit economics.** Every execute is an MPC round.
   For a 1% protocol fee on a $5 retail subscription, the MPC cost likely
   exceeds revenue. **Tier 3 is only economic for high-value, low-frequency
   flows.** Gate behind `FEATURE_CONFIDENTIAL_POLICY` + a premium protocol
   fee tier. Capture the cost model in Epic 8.
2. **Callback CU limit (1232 bytes).** Encrypted schedules with many fields
   push the callback payload. Mitigations: `EncData<T>` (saves pubkey+nonce),
   `Pack<T>` (bit-packs arrays ~26×), narrow types (`u32` where safe).
3. **Async by default.** Tier 2's async machinery (Validating status,
   timeout refund, idempotency) applies to every Tier 3 execute, not just
   validation. Tier 2 is a hard prerequisite.
4. **Safe division under MPC.** PAYG period math involves division
   (period_used / max_per_period style ratios). Secret-zero division is UB
   in MPC. Every divisor needs the safe-divisor pattern. (Epic 2.)
5. **Both-branches-execute cost.** Schedule checks are comparison-heavy
   (`now >= next_due`, `released[i] == false`, etc.). Every comparison costs
   MPC cycles × 2 branches. Minimize comparison count, narrow types.
6. **Recipient sealing UX.** The recipient is encrypted at rest; settlement
   seals it to the gateway signer's `Shared` key. The gateway learns the
   recipient at execute time (necessary — they're settling). The owner and
   the gateway are the only parties who ever see the recipient plaintext.
7. **Auditor disclosure.** Institutional flows need selective disclosure
   for compliance. Integrate the Arcium Confidential Auditor Adapter so a
   designated auditor can decrypt policy state under programmable conditions.
8. **Fixed-size all the way down.** `[u64; 4]` milestone arrays fit naturally
   (Tributary already uses fixed-size schedule fields). But variable recipient
   lists (future revenue-splitting) do NOT fit Arcium's fixed-bound constraint
   — Tier 3 does not enable N-recipient confidential splits.

## HANDOFF

### 1. Happy Path

1. Owner calls `create_confidential_policy` with an encrypted schedule blob
   (encrypted client-side via `@arcium-hq/client` RescueCipher). Instruction
   queues an `init_schedule` MPC computation that writes the initial
   `Enc<Mxe, ConfSchedule>` to the new ConfidentialPaymentPolicy account.
2. Gateway signer calls `execute_confidential_policy`. Instruction:
   - Freezes the user's confidential source ATA.
   - Queues the per-variant execute circuit (`execute_conf_subscription`,
     `execute_conf_milestone`, etc.).
   - Transitions policy to `Validating`.
3. MPC cluster: decrypts schedule, checks `now >= next_due`, computes pull
   amount + updated schedule, seals (amount, recipient) to gateway signer's
   `Shared` key. Returns signed output.
4. Any gateway signer calls the callback. Program verifies Arcium signature:
   - **fire = true** → unseal (amount, recipient), fire Tier-1 confidential
     transfer CPI, persist updated encrypted schedule.
   - **fire = false** (not due / cap reached / milestone condition unmet) →
     refund any frozen balance, persist unchanged schedule, return to Active.
5. Scheduler cut → callback-signer (ADR-0018 + ADR-0032 amendment).

### 2. Data Contract

- **Public surface**:
  - New PDA: `["confidential_policy", user_payment, policy_id]`.
  - New account: `ConfidentialPaymentPolicy { owner, mint, circuit_offset, schedule_ct: [u8; N], status, pending_comp_id, pending_deadline_slot, owner_x25519, auditor_x25519 }`.
  - New counter on UserPayment: `created_confidential_count` (independent from
    `created_policies_count` and `created_composable_count`).
  - New instructions: `init_<variant>_comp_def`, `create_confidential_policy`,
    `execute_confidential_policy`, `<variant>_callback`,
    `refund_pending_confidential`, `delete_confidential_policy`,
    `change_confidential_policy_status`, `disclose_to_auditor`.
  - `PaymentGateway.feature_flags` gains `FEATURE_CONFIDENTIAL_POLICY`.
  - SDK: `createConfidentialSubscription`, `createConfidentialMilestone`,
    `createConfidentialPayAsYouGo`, `createConfidentialOneTime`,
    `createConfidentialUpTo`, `executeConfidentialPolicy`,
    `decryptMyPolicy` (owner-side), `discloseToAuditor`.
- **Modules touched**:
  - `programs/tribut/src/state/` — new `confidential_policy.rs`.
  - `programs/tributary/src/state/user_payment.rs` — new counter.
  - `programs/tributary/src/instructions/confidential/` — new module.
  - `programs/tributary/src/policies/` — new `conf_*.rs` Arcis circuit files.
  - `packages/sdk/src/` — confidential policy helpers + `@arcium-hq/client` deep integration.
- **Build system**: Arcium Arcis compiler added to `make prep` + CI; new
  `encrypted-ixs` crate sibling to `programs/tributary`.

### 3. Edge Cases & Constraints

- **Never** write a schedule field in plaintext to any account, event, or log.
- **Never** allow `disclose_to_auditor` without owner signature + the policy's
  configured auditor_x25519.
- **Never** divide by a secret without the safe-divisor pattern.
- **Never** assume single-recipient — but ALSO never attempt N-recipient
  splits (Arcium fixed-bound constraint); revenue splitting stays plaintext
  for now.
- The owner's x25519 key MUST be set at create time; loss of the client-side
  key = permanent blindness to own policy state. Document the key-recovery
  model (auditor disclosure as escape hatch, or owner-key rotation via
  Arcium sealing).
- Every `if now >= next_due` doubles circuit cost (both branches run).
  Minimize comparisons; pack schedule checks.
- Callback payload size: if `ConfMilestone` callback exceeds 1232B, switch
  to `EncData<T>` + multi-tx callback (v0.11 supports multi-instruction
  callbacks).

### 4. Business Logic (pseudo-code, Arcis)

```rust
// Arcis circuit — encrypted subscription execute
#[derive(Copy, Clone)]
pub struct ConfSubscription {
    pub amount: u64,
    pub next_due: u64,
    pub frequency: u64,
    pub renewals_remaining: u8,
    pub recipient: SerializedSolanaPublicKey,
}

#[instruction]
pub fn execute_conf_subscription(
    now: u64,                                          // revealed sysvar
    policy_ctxt: Enc<Mxe, ConfSubscription>,
    gateway_signer: Shared,                            // seal recipient+amount to
) -> (Enc<Mxe, ConfSubscription>, Enc<Shared, (u64, SerializedSolanaPublicKey)>, bool) {
    let mut p = policy_ctxt.to_arcis();
    let due = now >= p.next_due;                       // both branches execute
    let new_due = if due { p.next_due + p.frequency } else { p.next_due };
    let new_renewals = if due && p.renewals_remaining > 0 {
        p.renewals_remaining - 1
    } else { p.renewals_remaining };
    p.next_due = new_due;
    p.renewals_remaining = new_renewals;

    // Seal (amount, recipient) to gateway signer — only they can unseal at settle
    let pull = if due { (p.amount, p.recipient) } else { (0u64, p.recipient) };
    let sealed = gateway_signer.from_arcis(pull);

    (Mxe::get().from_arcis(p), sealed, due)
}
```

### 5. Definition of Done

- [ ] All 5 variant circuits compiled + comp_defs initialized + Arcis unit-tested.
- [ ] ConfidentialPaymentPolicy account + PDA namespace + new UserPayment counter.
- [ ] Full instruction set: create / execute / callback / refund / delete / status / disclose.
- [ ] Tier-1 confidential transfer wired as the callback's settle step.
- [ ] `FEATURE_CONFIDENTIAL_POLICY` gating + premium protocol fee tier.
- [ ] Auditor disclosure via Confidential Auditor Adapter.
- [ ] Owner-side decryption (`decryptMyPolicy`) + key-recovery doc.
- [ ] Surfpool test suite per variant: privacy (no schedule leak), correctness (amount conservation, schedule invariants), timeout refund, double-resolution rejection, auditor disclosure, key-recovery.
- [ ] Property tests: amount conservation end-to-end, next_due monotonicity, renewals_remaining non-negativity, milestone bitmap correctness.
- [ ] Fuzz: malformed encrypted inputs, replay, nonce reuse, comp_def migration, signature spoof.
- [ ] Latency + cost benchmark per variant; cost model committed to `reports/`.
- [ ] ADR-0033 merged; AGENTS.md (new PDA + instructions + PolicyType namespace) + tributary.qedspec updated.

### 6. Test Matrix (Given / When / Then)

- Given a ConfSubscription, When `now >= next_due` and callback fires, Then
  the Tier-1 confidential transfer pulls exactly `amount`, `next_due`
  advances by `frequency`, `renewals_remaining` decrements — all under
  encrypted state, no field in plaintext anywhere.
- Given a ConfSubscription with renewals_remaining == 0, When execute fires,
  Then the policy transitions to Completed (encrypted) and no pull occurs.
- Given a ConfMilestone with release_condition bitmap satisfied for tranche
  i, When execute fires, Then amounts[i] is released and released[i] flips
  to true under MPC.
- Given a ConfPayAsYouGo with period_used + claimed > max_per_period, When
  execute fires, Then the pull is capped at (max_per_period - period_used)
  and period tracking updates correctly — no division-by-zero (safe-divisor).
- Given a pending execute past deadline, When anyone calls refund_pending,
  Then frozen balance returns to user, policy returns to Active.
- Given an owner, When they call decryptMyPolicy with their x25519 key, Then
  they recover full schedule plaintext.
- Given an owner + configured auditor, When disclose_to_auditor fires, Then
  the auditor recovers schedule plaintext via sealing — and ONLY the auditor.
- Given an attacker scraping every account + event + log, When they attempt
  to recover the pull amount, Then they fail (information-theoretic argument
  + empirical test over N pulls).
- Given a payload-overflow ConfMilestone, When the callback would exceed
  1232B, Then EncData<T> + multi-tx callback kicks in and settlement still
  completes.

### 7. Open Questions

- **CUSTOMER / REVENUE VALIDATION** — Tier 3 only pencils out for high-value flows. Is there a committed design partner (institutional payroll, treasury, fund admin)? Without one, defer. (Epic 8 gate.)
- **PROTOCOL FEE TIER** — what's the right premium for confidential policies? Cost-plus-MPC, or value-based (institutional privacy premium)? (Epic 8 economics.)
- **OWNER KEY RECOVERY** — if the owner loses their x25519 private key, they're blind to their own policy. Recovery options: (a) auditor disclosure as escape hatch, (b) pre-registered backup key, (c) Arcium key rotation via sealing. Pick one as canonical, document tradeoff. (Epic 5 design task.)
- **CALLBACK FRAGMENTATION** — which variant callbacks fit in 1232B as-is, which need EncData, which need multi-tx? Needs empirical measurement once circuits compile. (Epic 2.)
- **PERMISSIONED CLUSTER vs PERMISSIONLESS** — does Tier 3 use Arcium's permissionless clusters (censorship-resistant, slower) or a permissioned cluster (faster, institution-friendly)? Institutional customers may prefer permissioned. (Epic 8 design + customer.)
- **CIRCUIT UPGRADE PATH** — when a schedule-shape bug is found post-deploy, how is the circuit upgraded without breaking existing encrypted schedules? Arcium has comp_def lifecycle (deactivate → close), but already-created policies reference a specific offset. (Epic 4 design.)
- **REGULATORY FRAMING** — does hiding recipient identity from the public (but not gateway/auditor) satisfy the institutional compliance posture? Engage counsel for target jurisdictions before ADR-0033 locks. (Epic 8.)
