# Accounts & PDAs

This is the **#1 integration-bug source**. If you build on Tributary, read
this page in full before writing any account-derivation code. The SDK helper
in `packages/sdk/src/pda.ts` already encodes every seed below — prefer it
over hand-rolling `PublicKey.findProgramAddress`.

## PDA seed table

| PDA                | Seeds                                             | Account struct     | Notes                                                                                                                                                      |
| ------------------ | ------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProgramConfig`    | `[b"config"]`                                     | `ProgramConfig`    | Singleton — one per program deployment. Holds admin, protocol fee recipient, protocol fee bps, `emergency_pause`.                                          |
| `PaymentGateway`   | `[b"gateway", authority]`                         | `PaymentGateway`   | Per gateway authority. Holds fees, signer, feature flags, referral config.                                                                                 |
| `UserPayment`      | `[b"user_payment", owner, mint]`                  | `UserPayment`      | Per user + mint. **Is** the modern delegate. Tracks two independent counters.                                                                              |
| `PaymentPolicy`    | `[b"payment_policy", user_payment, policy_id]`    | `PaymentPolicy`    | Regular pull-payment policy. `policy_id` = `created_policies_count` at creation.                                                                           |
| `ComposablePolicy` | `[b"composable_policy", user_payment, policy_id]` | `ComposablePolicy` | Programmable pull-payment policy. `policy_id` = `created_composable_count` at creation.                                                                    |
| `ValidationPda`    | `[b"composable_validation", composable_policy]`   | `ValidationPda`    | Stores ≤1024 bytes of Lighthouse assertion data for a composable policy.                                                                                   |
| `PaymentsDelegate` | `[b"payments"]`                                   | _(no struct)_      | **Legacy / deprecated.** Global delegate from v0. Still accepted by `execute_payment` for backward compatibility. New code must use the `UserPayment` PDA. |
| `ReferralAccount`  | `[b"referral", gateway, referral_code]`           | `ReferralAccount`  | `referral_code` is a 6-byte alphanumeric code. `zero_copy` account.                                                                                        |

All seeds are the literal byte strings from
`programs/tributary/src/constants.rs` (`CONFIG_SEED`, `USER_PAYMENT_SEED`,
`GATEWAY_SEED`, `PAYMENT_POLICY_SEED`, `PAYMENTS_SEED`, `REFERRAL_SEED`,
`COMPOSABLE_POLICY_SEED`, `VALIDATION_PDA_SEED`).

### Counter separation

`UserPayment` has **two independent monotonically-increasing counters**:

- `created_policies_count` → next `PaymentPolicy.policy_id`
- `created_composable_count` → next `ComposablePolicy.policy_id`

A regular policy `#1` and a composable policy `#1` can coexist on the same
`UserPayment` — they live in different PDA namespaces. IDs are never reused
(counters only increment), which is why `policy_id` is part of the seed.

## Account field reference

Sizes below include the 8-byte Anchor discriminator. "Padding" is reserved
space for future fields — do **not** repurpose it.

### `ProgramConfig` (336 bytes)

| Field              | Type        | Size | Description                                        |
| ------------------ | ----------- | ---- | -------------------------------------------------- |
| `_discriminator`   | `[u8; 8]`   | 8    | Anchor discriminator                               |
| `admin`            | `Pubkey`    | 32   | Can update protocol config / toggle pause          |
| `fee_recipient`    | `Pubkey`    | 32   | Receives protocol fees                             |
| `protocol_fee_bps` | `u16`       | 2    | Default 100 (1%). Max 10000.                       |
| `_deprecated`      | `u32`       | 4    | Formerly `max_active_policies`. Tombstoned.        |
| `emergency_pause`  | `bool`      | 1    | When `true`, all execution fails (`ProgramPaused`) |
| `bump`             | `u8`        | 1    | PDA bump                                           |
| `padding`          | `[u8; 256]` | 256  | Reserved                                           |

### `PaymentGateway` (344 bytes)

| Field                     | Type        | Size | Description                                                   |
| ------------------------- | ----------- | ---- | ------------------------------------------------------------- |
| `_discriminator`          | `[u8; 8]`   | 8    |                                                               |
| `authority`               | `Pubkey`    | 32   | **Immutable** after creation. Gateway owner.                  |
| `fee_recipient`           | `Pubkey`    | 32   | Receives gateway fees                                         |
| `gateway_fee_bps`         | `u16`       | 2    | Gateway cut. Combined with protocol fee must be `< 10000`.    |
| `is_active`               | `bool`      | 1    |                                                               |
| `padding1`                | `u64`       | 8    | Tombstoned field                                              |
| `created_at`              | `i64`       | 8    |                                                               |
| `bump`                    | `u8`        | 1    |                                                               |
| `name`                    | `[u8; 32]`  | 32   | Human-readable gateway name                                   |
| `url`                     | `[u8; 64]`  | 64   | Gateway service URL                                           |
| `signer`                  | `Pubkey`    | 32   | Key authorized to call `execute_*` for this gateway           |
| `feature_flags`           | `u8`        | 1    | Bit 0 referral / Bit 1 net-amount / Bit 2 custom-protocol-fee |
| `referral_allocation_bps` | `u16`       | 2    | Bps **of the gateway fee** routed to referral pool. Cap 2500. |
| `referral_tiers_bps`      | `[u16; 3]`  | 6    | Split of referral pool across L1/L2/L3. Must sum to 10000.    |
| `custom_protocol_fee_bps` | `u16`       | 2    | Used only if `FEATURE_CUSTOM_PROTOCOL_FEE` set                |
| `padding`                 | `[u8; 117]` | 117  | Reserved                                                      |

Feature-flag constants (on `PaymentGateway`):

- `FEATURE_REFERRAL = 0x01`
- `FEATURE_NET_AMOUNT = 0x02` — recipient gets exactly `amount`, fees added on top
- `FEATURE_CUSTOM_PROTOCOL_FEE = 0x04`

### `UserPayment` (382 bytes)

| Field                       | Type        | Size | Description                        |
| --------------------------- | ----------- | ---- | ---------------------------------- |
| `_discriminator`            | `[u8; 8]`   | 8    |                                    |
| `owner`                     | `Pubkey`    | 32   | The user                           |
| `token_account`             | `Pubkey`    | 32   | User's ATA for `token_mint`        |
| `token_mint`                | `Pubkey`    | 32   |                                    |
| `active_policies_count`     | `u32`       | 4    | Live `PaymentPolicy` count         |
| `created_at` / `updated_at` | `i64` × 2   | 16   |                                    |
| `is_active`                 | `bool`      | 1    |                                    |
| `bump`                      | `u8`        | 1    |                                    |
| `created_policies_count`    | `u32`       | 4    | Counter for `PaymentPolicy` IDs    |
| `rent_payer`                | `Pubkey`    | 32   | Refunded on close                  |
| `active_composable_count`   | `u32`       | 4    | Live `ComposablePolicy` count      |
| `created_composable_count`  | `u32`       | 4    | Counter for `ComposablePolicy` IDs |
| `padding`                   | `[u8; 210]` | 210  | Reserved                           |

> **The `UserPayment` PDA is the delegate.** When a user calls
> `spl-token approve <ata> <UserPayment PDA> <amount>`, the program can sign
> CPIs as that PDA to pull tokens. The legacy global `PaymentsDelegate`
> (`[b"payments"]`) still works for backward compat but must not be used by
> new integrations.

### `PaymentPolicy` (602 bytes)

| Field                       | Type            | Size | Description                                                    |
| --------------------------- | --------------- | ---- | -------------------------------------------------------------- |
| `_discriminator`            | `[u8; 8]`       | 8    |                                                                |
| `user_payment`              | `Pubkey`        | 32   | Parent `UserPayment`                                           |
| `recipient`                 | `Pubkey`        | 32   | Final funds recipient                                          |
| `gateway`                   | `Pubkey`        | 32   | Executing gateway                                              |
| `policy_type`               | `PolicyType`    | 129  | 1-byte tag + 128-byte body (Subscription/Milestone/PayAsYouGo) |
| `status`                    | `PaymentStatus` | 1    | `Active` / `Paused`                                            |
| `memo`                      | `[u8; 64]`      | 64   | Human-readable description                                     |
| `total_paid`                | `u64`           | 8    | Cumulative payout                                              |
| `payment_count`             | `u32`           | 4    | Executions so far                                              |
| `created_at` / `updated_at` | `i64` × 2       | 16   |                                                                |
| `policy_id`                 | `u32`           | 4    | Unique within this `UserPayment`                               |
| `bump`                      | `u8`            | 1    |                                                                |
| `rent_payer`                | `Pubkey`        | 32   | Refunded on close                                              |
| `padding`                   | `[u8; 223]`     | 223  | Reserved                                                       |

### `ComposablePolicy`

| Field                          | Type               | Size | Description                                  |
| ------------------------------ | ------------------ | ---- | -------------------------------------------- |
| `_discriminator`               | `[u8; 8]`          | 8    |                                              |
| `bump`                         | `u8`               | 1    |                                              |
| `user_payment`                 | `Pubkey`           | 32   |                                              |
| `gateway`                      | `Pubkey`           | 32   |                                              |
| `status`                       | `PolicyStatus`     | 1    | `Active` / `Paused` / `Completed`            |
| `rent_payer`                   | `Pubkey`           | 32   |                                              |
| `policy_type`                  | `PolicyType`       | 129  | Same enum as `PaymentPolicy`                 |
| `forward_config`               | `ForwardConfig`    | 146  | See below                                    |
| `validation_config`            | `ValidationConfig` | 33   | See below                                    |
| `memo`                         | `[u8; 64]`         | 64   |                                              |
| `recipient`                    | `Pubkey`           | 32   |                                              |
| `total_input` / `total_output` | `u64` × 2          | 16   | Cumulative (input pulled / output delivered) |
| `payment_count`                | `u32`              | 4    |                                              |
| `policy_id`                    | `u32`              | 4    |                                              |
| `created_at` / `updated_at`    | `i64` × 2          | 16   |                                              |
| `padding`                      | `[u8; 32]`         | 32   | Reserved                                     |

#### `ForwardConfig` (146 bytes)

| Field               | Type                  | Size | Notes                                         |
| ------------------- | --------------------- | ---- | --------------------------------------------- |
| `target_program`    | `Pubkey`              | 32   | `Pubkey::default()` = **disabled** (sentinel) |
| `input_mint`        | `Pubkey`              | 32   | Must equal `user_payment.token_mint`          |
| `output_mint`       | `Pubkey`              | 32   | Recipient delivery mint                       |
| `min_output_amount` | `Option<u64>`         | 9    | **Net** (post-fee) minimum. DeFi convention.  |
| `forward_flags`     | `u8`                  | 1    | Bit 0 = `NATIVE_OUTPUT` (WSOL → SOL sweep)    |
| `num_data_checks`   | `u8`                  | 1    | 0–4                                           |
| `data_checks`       | `[ByteRangeCheck; 4]` | 40   | Each: `offset`, `length`, `expected[8]`       |

`target_program` must be in `ALLOWED_FORWARD_PROGRAMS` (currently Meteora DLMM
`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`). When enabled, **at least one**
`ByteRangeCheck` must pin the discriminator at offset 0
(`DiscriminatorCheckRequired`).

#### `ValidationConfig` (33 bytes)

| Field                     | Type     | Size | Notes                                     |
| ------------------------- | -------- | ---- | ----------------------------------------- |
| `validation_program`      | `Pubkey` | 32   | `SystemProgram` = **disabled** (sentinel) |
| `num_validation_accounts` | `u8`     | 1    | 0–10 read-accounts for the assertion      |

`validation_program` must be in `ALLOWED_VALIDATION_PROGRAMS` (currently
Lighthouse `L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`). The assertion data
itself lives in a separate `ValidationPda`.

### `ValidationPda` (1034 bytes max)

| Field            | Type         | Size | Notes                                                   |
| ---------------- | ------------ | ---- | ------------------------------------------------------- |
| `_discriminator` | `[u8; 8]`    | 8    |                                                         |
| `data_len`       | `u16`        | 2    | Actual bytes used                                       |
| `data`           | `[u8; 1024]` | 1024 | Lighthouse assertion bytes (`MAX_VALIDATION_DATA_SIZE`) |

Space is rounded up to 8-byte alignment via `ValidationPda::space_for()` for
rent efficiency. Use the smallest size that fits the assertion.

### `ReferralAccount` (152 bytes, `zero_copy`)

| Field            | Type       | Size | Notes                        |
| ---------------- | ---------- | ---- | ---------------------------- |
| `_discriminator` | `[u8; 8]`  | 8    |                              |
| `gateway`        | `Pubkey`   | 32   | Scopes the code              |
| `owner`          | `Pubkey`   | 32   | Earns rewards                |
| `referral_code`  | `[u8; 6]`  | 6    | Alphanumeric                 |
| `_padding_code`  | `[u8; 2]`  | 2    | Alignment                    |
| `referrer`       | `Pubkey`   | 32   | Parent in chain (or default) |
| `created_at`     | `i64`      | 8    |                              |
| `total_earned`   | `u64`      | 8    | Cumulative                   |
| `bump`           | `u8`       | 1    |                              |
| `_padding_bump`  | `[u8; 7]`  | 7    | Alignment                    |
| `_padding`       | `[u64; 8]` | 64   | Reserved                     |

Chains are validated on execute: max depth 3, no cycles, strict ordering in
`remaining_accounts`.

## Rent exemption

Every Tributary-created account stores a `rent_payer: Pubkey` field (where
present). On account close (`delete_user_payment`,
`delete_payment_policy`, `delete_composable_policy`, etc.) the lamports
are returned to `rent_payer`, **not** to the signer of the close instruction.
This makes it possible for a gateway or dApp to sponsor account creation
up-front and recover the rent when the relationship ends.

- Closing a `UserPayment` requires `active_policies_count == 0` **and**
  `active_composable_count == 0` (`HasActivePolicies` /
  `HasActiveComposables`).
- `rent_payer` validity is enforced — passing an unrelated key fails with
  `InvalidRentPayer`.

## Legacy / deprecated

### `PaymentsDelegate` PDA — `[b"payments"]`

Single global delegate from the v0 program. **Still accepted** by
`execute_payment` for backward compatibility with already-approved token
accounts, but:

- **Do not use for new integrations.** Use the per-user `UserPayment` PDA.
- The program writes new policies against the `UserPayment` delegate.
- If both delegates are approved on the same ATA, the program checks
  `UserPayment` first.

### ProgramConfig `_deprecated: u32`

Was `max_active_policies_per_user`. The on-chain cap was removed; the field
is tombstoned (`_deprecated`) and ignored.

### PaymentGateway `padding1: u64`

Tombstoned former field. Ignored.

## Where sizes come from

Every `impl <Struct>` in `programs/tributary/src/state/*.rs` defines a
`const SIZE`. The `PolicyType` variants are pinned at 128 bytes body by
`PolicyType::VARIANT_SIZE`; do not change this without a full migration.
Account padding is reserved for future fields and must not be repurposed —
deserialization depends on exact sizes.
