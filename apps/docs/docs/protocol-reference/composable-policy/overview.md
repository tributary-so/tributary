# ComposablePolicy — Overview

A `ComposablePolicy` is a **programmable pull-payment policy** that reuses the
same `PolicyType` schedule model as `PaymentPolicy` (see
[vs-payment-policy.md](vs-payment-policy.md)) but inserts **three opt-in hooks**
into the execution path:

1. **Pre-validation** — a read-only assertion CPI (Lighthouse) that runs after
   the pull but before the forward, vetoing the tx if on-chain state doesn't
   satisfy a stored predicate.
2. **Forward** — a token-transform CPI (Meteora DLMM) that swaps the pulled
   input token into an output token before settlement.
3. **Post-validation** — a read-only assertion CPI (Lighthouse) that runs after
   the forward but before settlement, acting as the owner's floor on output
   (replacing the removed `min_output_amount`).

A `ComposablePolicy` with both hooks disabled behaves like a `PaymentPolicy`
but lives in its own PDA namespace and routes the pull through an
intermediate ATA owned by the `ComposablePolicy` PDA.

## The 7-Phase Execution Flow

`execute_composable` is a single transaction handler
(`programs/tributary/src/instructions/composable/execute_composable.rs`)
that runs seven phases — Byte-range checks, `PULL`, `SKIM` (input-side fees),
`PRE-VALIDATE` (optional), `FORWARD` (optional), `POST-VALIDATE` (optional),
and `SETTLE`. The intermediate ATAs are created lazily and closed at the end
so rent returns to the fee payer. **NET-on-pull is hardcoded for composable**
(ADR-0026): the gross pull = face + fee, fees are skimmed from the input
mint _before_ the forward runs.

```
execute_composable(policy, instruction_data, forward_amount)
  │
  ├─── Step 1: BYTE-RANGE CHECKS ───────────────────────────────────────┐
  │     • composable_policy.status == Active                            │
  │     • !config.emergency_pause                                       │
  │     • gateway.is_active && gateway == composable_policy.gateway     │
  │     • fee_payer ∈ {gateway.signer, user_payment.owner, recipient}   │
  │       (or gateway.is_permissionless() — ADR-0016 cold-relayer gate) │
  │     • validate_mint_compatible(input_mint)  AND  (output_mint)      │
  │       (re-checked at execute time — Token-2022 extensions mutate)   │
  │     • validate_byte_ranges(instruction_data, data_checks)           │
  │       (skipped when forward disabled — no selector to pin)          │
  │     • intermediate_input_ata  == ATA(ComposablePolicy PDA, mint)    │
  │     • intermediate_output_ata == ATA(ComposablePolicy PDA, out_mint)│
  │       (only in deliver-transform mode)                              │
  │     • resolve face_amount from PolicyType schedule                  │
  │       (PayAsYouGo: caller-supplied forward_amount as face)          │
  │     • compute gross_pull = face + fee (NET-on-pull hardcoded)       │
  │     • validate PayAsYouGo caps on GROSS (ADR-0026)                  │
  │     • user_token_account.delegated_amount >= gross_pull             │
  │     • recipient_token_account matches output_mint+recipient         │
  │       (skipped in act mode; NATIVE_OUTPUT checks SOL key)           │
  │     • Cold-relayer OR-gate: post_validation OR has_route_pin        │
  └──────────────────────────────────────────────────────────────────────┘
  │
  ├─── Phase 1: PULL (user → intermediate_input) ──────────────────────┐
  │     Resolve pull delegate (UserPayment PDA v1 OR legacy            │
  │     PaymentsDelegate PDA v0). Signer = resolved PDA.               │
  │     transfer_checked: gross_pull                                   │
  │       user_token_account → intermediate_input_ata                  │
  │     (ComposablePolicy PDA owns the intermediate — NOT the          │
  │      UserPayment PDA; this is the security-critical decoupling.)   │
  └─────────────────────────────────────────────────────────────────────┘
  │
  ├─── Phase 1b: SKIM FEES (input-side, ADR-0026) ─────────────────────┐
  │     Fees are split from intermediate_input BEFORE forward runs.    │
  │     After skim, intermediate_input holds exactly `face`.           │
  │     • calculate_fees(face, gateway_bps, protocol_share,            │
  │       scheduler_share, referral_allocation, NET-on-pull=true)      │
  │     • protocol_cut  → protocol_fee_account  (input_mint)           │
  │     • gateway_cut   → gateway_fee_account   (input_mint)           │
  │     • scheduler_cut → scheduler ATA (input_mint, permissionless)   │
  │     • referral allocation handled via gateway residual carve-out   │
  └─────────────────────────────────────────────────────────────────────┘
  │
  ├─── Phase 2: PRE-VALIDATION (optional) ─────────────────────────────┐
  │     Only when pre_validation == ProgramCall{program_id}.           │
  │     CPI into Lighthouse via plain `invoke` — NO signer seeds.      │
  │     pre_validation_pda (seed: composable_validation_pre)           │
  │       contains assertion data + pinned target accounts.            │
  │     remaining accounts pin-checked against pre_validation_pda.     │
  │     Read-only: the validation program cannot move funds.           │
  │     Failure of the assertion aborts the transaction.               │
  └─────────────────────────────────────────────────────────────────────┘
  │
  ├─── Phase 3: FORWARD (optional) ────────────────────────────────────┐
  │     Only when instruction_constraint.program_id != Pubkey::default()│
  │     Indexed pin-check: for each PinnedAccount{index, pubkey},      │
  │       remaining_mid[forward_start + index] == pin.pubkey           │
  │     CPI via `invoke_signed` with ComposablePolicy PDA seeds:       │
  │       • ComposablePolicy PDA is the ONLY signer forwarded          │
  │       • all other remaining_account → is_signer=false              │
  │     Swaps intermediate_input (face) → intermediate_output.         │
  └─────────────────────────────────────────────────────────────────────┘
  │
  ├─── Phase 4: POST-VALIDATION (optional) ────────────────────────────┐
  │     Only when post_validation == ProgramCall{program_id}.          │
  │     CPI into Lighthouse via plain `invoke` — NO signer seeds.      │
  │     post_validation_pda (seed: composable_validation_post)         │
  │       contains assertion data + pinned target accounts.            │
  │     Owner's floor on output (deliver) or settlement (act).         │
  └─────────────────────────────────────────────────────────────────────┘
  │
  └─── Phase 5: SETTLE (shape-dependent, ADR-0026) ────────────────────┐
        Three shapes — fees already skimmed in Phase 1b, only          │
        principal is moved here.                                       │
                                                                       │
        deliver-no-transform:                                          │
          sweep intermediate_input (face) → recipient_token_account    │
                                                                       │
        deliver-transform:                                             │
          sweep intermediate_output → recipient_token_account          │
            (>0 guard KEPT — output exists, floor is owner's job)      │
          return input residue (under-consumed face) → user            │
                                                                       │
        act mode:                                                      │
          forward consumed input for non-token settlement              │
          return input residue → user (no deliver sweep, no >0 guard)  │
                                                                       │
        1. verify both intermediates empty                             │
        2. advance_policy(policy_type, now, advance_amount)            │
           (shared calendar-month math — same as PaymentPolicy)        │
        3. update total_input (gross), total_output (swept), count     │
        4. close both intermediate ATAs → rent to fee_payer            │
        └────────────────────────────────────────────────────────────┘
```

## PDA Layout

| PDA                 | Seeds                                               | Owner             | Purpose                                                     |
| ------------------- | --------------------------------------------------- | ----------------- | ----------------------------------------------------------- |
| `ComposablePolicy`  | `["composable_policy", user_payment, policy_id_le]` | Tributary program | The policy state + **owner of both intermediate ATAs**      |
| `PreValidationPda`  | `["composable_validation_pre", composable_policy]`  | Tributary program | Stores ≤512 bytes of pre-forward Lighthouse assertion data  |
| `PostValidationPda` | `["composable_validation_post", composable_policy]` | Tributary program | Stores ≤512 bytes of post-forward Lighthouse assertion data |

`policy_id_le` is the `u32` `composable_policy.policy_id` serialized as
little-endian bytes. The `policy_id` is sourced from
`user_payment.created_composable_count` (NOT `created_policies_count`).

### Counter separation

`UserPayment` carries **two independent counters**:

| Counter                    | Feeds IDs for          |
| -------------------------- | ---------------------- |
| `created_policies_count`   | `PaymentPolicy` IDs    |
| `created_composable_count` | `ComposablePolicy` IDs |

A regular policy `#1` and a composable policy `#1` can therefore coexist on
the same `UserPayment` without colliding — they live in different PDA
namespaces (`["payment_policy", …]` vs `["composable_policy", …]`).

## Account Model

```
                 owns                                  delegates
  User            ───►   user_token_account  ◄─── user_payment PDA
   │                                              (pull signer only)
   │
   │  creates
   ▼
  ComposablePolicy PDA  ──── owns ────►   intermediate_input_ata
  (signs forward, sweep,                  intermediate_output_ata
   close CPIs; never a
   token-account delegate)
```

The **ComposablePolicy PDA** — not the `UserPayment` PDA — owns the
intermediate ATAs. The `UserPayment` PDA is the delegate on
`user_token_account` and signs **only** the initial pull (Phase 1). All
subsequent CPIs (`FORWARD`, `SETTLE` fee transfers, sweep, intermediate
`closeAccount`) are signed by the ComposablePolicy PDA. Because the
ComposablePolicy PDA is never a token-account delegate anywhere, its signing
authority can only ever move the transient intermediate balances — never the
user's source funds. This is the security-critical decoupling introduced in
the C-1 fix (see [security-model.md](security-model.md)).

## ComposablePolicy account (state)

```rust
#[account]
pub struct ComposablePolicy {
    pub bump: u8,
    pub user_payment: Pubkey,
    pub gateway: Pubkey,
    pub status: PolicyStatus,                   // Active | Paused | Completed
    pub rent_payer: Pubkey,
    pub policy_type: PolicyType,                // same enum as PaymentPolicy (128 B)
    pub forward_config: ForwardConfig,          // see forward-hook.md
    pub pre_validation: ValidationSpec,         // pre-forward hook (Disabled | ProgramCall | Inline)
    pub post_validation: ValidationSpec,        // post-forward hook
    pub memo: [u8; 32],
    pub recipient: Pubkey,
    pub total_input: u64,                       // lifetime gross pulled from user
    pub total_output: u64,                      // lifetime net swept to recipient
    pub payment_count: u32,
    pub policy_id: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub padding: [u8; 192],
}
```

`ValidationSpec` enum:

```rust
pub enum ValidationSpec {
    Disabled,
    ProgramCall { program_id: Pubkey },   // CPI to Lighthouse (allowlisted)
    Inline { reserved: u8 },              // reserved, errors at create
}
```

Source: `programs/tributary/src/state/composable_policy.rs`.

## Instructions

| Instruction                | Description                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `create_composable_policy` | Create the `ComposablePolicy` (+ optional `PreValidationPda` & `PostValidationPda`) account(s). |
| `execute_composable`       | Run the execution flow above. Permissionless — any gateway signer.                              |
| `change_composable_status` | Toggle `Active` ↔ `Paused`.                                                                     |
| `delete_composable_policy` | Close the policy (+ both validation PDAs); refund rent to `rent_payer`.                         |

## Related pages

- [Validation hook](validation-hook.md) — Lighthouse assertion CPI
- [Forward hook](forward-hook.md) — Meteora DLMM swap + `ByteRangeCheck` pinning
- [Native output](native-output.md) — `FORWARD_FLAG_NATIVE_OUTPUT` WSOL→SOL unwrap
- [Allowlists & sentinels](allowlists-and-sentinels.md) — disabling hooks
- [Security model](security-model.md) — intermediate-ATA ownership + signer sanitization
- [vs. PaymentPolicy](vs-payment-policy.md) — which to choose
