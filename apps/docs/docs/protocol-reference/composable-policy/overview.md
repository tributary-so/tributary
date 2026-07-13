# ComposablePolicy — Overview

A `ComposablePolicy` is a **programmable pull-payment policy** that reuses the
same `PolicyType` schedule model as `PaymentPolicy` (see
[vs-payment-policy.md](vs-payment-policy.md)) but inserts two **opt-in hooks**
into the execution path:

1. **Validation** — a read-only assertion CPI (Lighthouse) that can veto the
   transaction if on-chain state does not satisfy a stored predicate.
2. **Forward** — a token-transform CPI (Meteora DLMM) that swaps the pulled
   input token into an output token before settlement.

A `ComposablePolicy` with both hooks disabled behaves like a `PaymentPolicy`
but lives in its own PDA namespace and routes the pull through an
intermediate ATA owned by the `ComposablePolicy` PDA.

## The 3-Phase Execution Flow

`execute_composable` is a single transaction handler
(`programs/tributary/src/instructions/composable/execute_composable.rs`)
that runs four logical phases — `PULL`, `VALIDATE` (optional), `FORWARD`
(optional), and `SETTLE`. The intermediate ATAs are created lazily and
closed at the end so rent returns to the fee payer.

```
execute_composable(policy, instruction_data, forward_amount)
  │
  ├─── Phase 0: GUARD ──────────────────────────────────────────────────┐
  │     • composable_policy.status == Active                            │
  │     • !config.emergency_pause                                       │
  │     • gateway.is_active && gateway == composable_policy.gateway     │
  │     • fee_payer ∈ {gateway.signer, user_payment.owner, recipient}   │
  │     • validate_mint_compatible(input_mint)  AND  (output_mint)      │
  │       (re-checked at execute time — Token-2022 extensions mutate)   │
  │     • validate_byte_ranges(instruction_data, data_checks)           │
  │       (skipped when forward is disabled — no selector to pin)       │
  │     • intermediate_input_ata  == ATA(ComposablePolicy PDA, mint)    │
  │     • intermediate_output_ata == ATA(ComposablePolicy PDA, out_mint)│
  │     • validate_policy_execution(policy_type, now, forward_amount)   │
  │       → returns schedule_amount (Subscription/Milestone/PayAsYouGo) │
  │     • user_token_account.delegated_amount >= input_amount           │
  │     • recipient_token_account matches output_mint+recipient         │
  │       (or, in NATIVE_OUTPUT mode, key == composable_policy.recipient)│
  └──────────────────────────────────────────────────────────────────────┘
  │
  ├─── Phase 1: PULL ───────────────────────────────────────────────────┐
  │     Resolve pull delegate (UserPayment PDA v1 OR legacy             │
  │     PaymentsDelegate PDA v0). Signer = resolved PDA.                │
  │     transfer_checked:                                              │
  │       user_token_account → intermediate_input_ata                   │
  │     (ComposablePolicy PDA owns the intermediate — NOT the           │
  │      UserPayment PDA; this is the security-critical decoupling.)    │
  └──────────────────────────────────────────────────────────────────────┘
  │
  ├─── Phase 2: VALIDATE  (optional) ──────────────────────────────────┐
  │     Only when validation_config.validation_program != Pubkey::default()│
  │     remaining_accounts[0]   = ValidationPda (stores assertion data)  │
  │     remaining_accounts[1..N] = Lighthouse read-accounts (≤ 10)       │
  │     CPI into Lighthouse uses PLAIN `invoke` — NO signer seeds.       │
  │     Read-only: the validation program cannot move funds.             │
  │     Failure of the assertion aborts the transaction.                 │
  └───────────────────────────────────────────────────────────────────────┘
  │
  ├─── Phase 3: FORWARD  (optional) ───────────────────────────────────┐
  │     Only when forward_config.target_program != Pubkey::default().   │
  │     remaining_accounts[N..] = forward program accounts (Meteora     │
  │     DLMM pool + token program + event authority, …).                │
  │     CPI into Meteora DLMM via `invoke_signed` with ComposablePolicy │
  │     PDA seeds. ComposablePolicy is the ONLY signer forwarded; every │
  │     other remaining_account is forced is_signer=false.              │
  │     Swaps intermediate_input_ata → intermediate_output_ata.         │
  └──────────────────────────────────────────────────────────────────────┘
  │
  └─── Phase 4: SETTLE ────────────────────────────────────────────────┐
        process_output_and_sweep(intermediate_output):                  │
        1. read gross output_amount from intermediate_output_ata        │
        2. fee_breakdown = shared::fees::calculate_fees(output_amount)  │
           (single source of truth shared with execute_payment)         │
        3. sweep_amount = output_amount − gateway_fee − protocol_fee    │
        4. if min_output_amount.is_some():                              │
              require!(sweep_amount >= min_output_amount)               │
              (NET post-fee check — DeFi convention)                    │
        5. transfer_checked(gateway_fee   → gateway_fee_account)        │
           transfer_checked(protocol_fee → protocol_fee_account)        │
           transfer_checked(sweep_amount → recipient_token_account)     │
           — OR, when NATIVE_OUTPUT: closeAccount(WSOL → recipient SOL) │
        6. require!(intermediate_input  balance == 0)                   │
           require!(intermediate_output balance == 0)  (unless native)  │
        7. advance_policy(policy_type, now, input_amount)               │
           (shared calendar-month math — same as PaymentPolicy)         │
        8. close both intermediate ATAs → rent to fee_payer             │
        └─────────────────────────────────────────────────────────────┘
```

## PDA Layout

| PDA                | Seeds                                               | Owner             | Purpose                                                                   |
| ------------------ | --------------------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `ComposablePolicy` | `["composable_policy", user_payment, policy_id_le]` | Tributary program | The policy state + **owner of both intermediate ATAs**                    |
| `ValidationPda`    | `["composable_validation", composable_policy]`      | Tributary program | Stores ≤512 bytes of Lighthouse assertion data (separate from the policy) |

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
    pub status: PolicyStatus,                 // Active | Paused | Completed
    pub rent_payer: Pubkey,
    pub policy_type: PolicyType,              // same enum as PaymentPolicy (128 B)
    pub forward_config: ForwardConfig,        // see forward-hook.md
    pub validation_config: ValidationConfig,  // see validation-hook.md
    pub memo: [u8; 64],
    pub recipient: Pubkey,
    pub total_input: u64,                     // lifetime input pulled
    pub total_output: u64,                    // lifetime net swept to recipient
    pub payment_count: u32,
    pub policy_id: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub padding: [u8; 32],
}
```

Source: `programs/tributary/src/state/composable_policy.rs`.

## Instructions

| Instruction                | Description                                                            |
| -------------------------- | ---------------------------------------------------------------------- |
| `create_composable_policy` | Create the `ComposablePolicy` (+ optional `ValidationPda`) account(s). |
| `execute_composable`       | Run the 3-phase flow above. Permissionless — any gateway signer.       |
| `change_composable_status` | Toggle `Active` ↔ `Paused`.                                           |
| `delete_composable_policy` | Close the policy (+ `ValidationPda`); refund rent to `rent_payer`.     |

## Related pages

- [Validation hook](validation-hook.md) — Lighthouse assertion CPI
- [Forward hook](forward-hook.md) — Meteora DLMM swap + `ByteRangeCheck` pinning
- [Native output](native-output.md) — `FORWARD_FLAG_NATIVE_OUTPUT` WSOL→SOL unwrap
- [Allowlists & sentinels](allowlists-and-sentinels.md) — disabling hooks
- [Security model](security-model.md) — intermediate-ATA ownership + signer sanitization
- [vs. PaymentPolicy](vs-payment-policy.md) — which to choose
