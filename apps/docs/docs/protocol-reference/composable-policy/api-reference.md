# Composable API Reference

Complete reference for the four composable instructions, their accounts,
and the key types.

## Instructions

| Instruction                | Description                                    |
| -------------------------- | ---------------------------------------------- |
| `create_composable_policy` | Initialize a new ComposablePolicy              |
| `execute_composable`       | Execute a pull + validation + forward + settle |
| `delete_composable_policy` | Close a paused/terminated policy (owner only)  |
| `change_composable_status` | Toggle policy between Active and Paused        |

---

## `create_composable_policy`

Creates a ComposablePolicy PDA and optionally the pre/post ValidationPdas.

### Accounts

| Account                   | Type                        | Signer | Notes                                                            |
| ------------------------- | --------------------------- | ------ | ---------------------------------------------------------------- |
| `fee_payer`               | `Signer`                    | ✅     | Pays for account creation                                        |
| `user`                    | `Signer`                    | ✅     | `user_payment.owner` — must sign                                 |
| `recipient`               | `UncheckedAccount`          | ❌     | Must be non-default                                              |
| `composable_policy`       | `Account<ComposablePolicy>` | PDA    | `init`, seeds = `["composable_policy", user_payment, policy_id]` |
| `user_payment`            | `Account<UserPayment>`      | PDA    | Must be active                                                   |
| `gateway`                 | `Account<PaymentGateway>`   | PDA    | Must be active                                                   |
| `config`                  | `Account<ProgramConfig>`    | PDA    | `!emergency_pause`                                               |
| `pre_validation_program`  | `UncheckedAccount`          | ❌     | Lighthouse or SystemProgram                                      |
| `post_validation_program` | `UncheckedAccount`          | ❌     | Lighthouse or SystemProgram                                      |
| `pre_validation_pda`      | `UncheckedAccount`          | ❌     | `init` if pre-validation enabled                                 |
| `post_validation_pda`     | `UncheckedAccount`          | ❌     | `init` if post-validation enabled                                |
| `input_mint`              | `InterfaceAccount<Mint>`    | ❌     | `== user_payment.token_mint`                                     |
| `output_mint`             | `UncheckedAccount`          | ❌     | SPL Mint or SystemProgram (act mode)                             |
| `system_program`          | `Program`                   | ❌     |                                                                  |

### Arguments

| Arg                    | Type             | Notes                                                  |
| ---------------------- | ---------------- | ------------------------------------------------------ |
| `policy_type`          | `PolicyType`     | subscription / payAsYouGo / milestone / oneTime / upto |
| `memo`                 | `[u8; 32]`       | 32-byte UTF-8 memo                                     |
| `forward_config`       | `ForwardConfig`  | See types below                                        |
| `pre_validation`       | `ValidationSpec` | `Disabled` or `ProgramCall { program_id }`             |
| `pre_validation_init`  | `ValidationInit` | Pinned accounts + assertion data                       |
| `post_validation`      | `ValidationSpec` | Same as pre                                            |
| `post_validation_init` | `ValidationInit` | Same as pre                                            |

### SDK

```typescript
// High-level (handles ATA + UserPayment + delegate approval):
const ixs = await sdk.createComposable(
  tokenMint,
  recipient,
  gateway,
  policyType,
  memo,
  forwardConfig,
  preValidation,
  prePinnedAccounts,
  preValidationData,
  postValidation,
  postPinnedAccounts,
  postValidationData
);

// Low-level (instruction only):
const ix = await sdk.getCreateComposablePolicyInstruction(
  tokenMint,
  recipient,
  gateway,
  policyType,
  memo,
  forwardConfig,
  preValidation,
  prePinnedAccounts,
  preValidationData,
  postValidation,
  postPinnedAccounts,
  postValidationData
);
```

---

## `execute_composable`

Executes the 7-phase flow: Pull → Skim → Pre-validate → Forward →
Post-validate → Settle. Permissionless if the gateway has the
`FEATURE_PERMISSIONLESS` flag.

### Accounts

| Account                      | Type                                     | Signer | Notes                                                            |
| ---------------------------- | ---------------------------------------- | ------ | ---------------------------------------------------------------- |
| `fee_payer`                  | `Signer`                                 | ✅     | Gateway signer, owner, recipient, or any signer (permissionless) |
| `payments_delegate`          | `UncheckedAccount`                       | PDA    | Legacy global delegate `["payments"]`                            |
| `composable_policy`          | `Account<ComposablePolicy>`              | PDA    | Must be `Active`                                                 |
| `user_payment`               | `Account<UserPayment>`                   | PDA    | Must be active                                                   |
| `gateway`                    | `Account<PaymentGateway>`                | PDA    | Must match policy's gateway                                      |
| `config`                     | `Account<ProgramConfig>`                 | PDA    | `!emergency_pause`                                               |
| `pre_validation_program`     | `UncheckedAccount`                       | ❌     | Lighthouse or SystemProgram                                      |
| `post_validation_program`    | `UncheckedAccount`                       | ❌     | Lighthouse or SystemProgram                                      |
| `pre_validation_pda`         | `UncheckedAccount`                       | ❌     | Deserialised in handler if enabled                               |
| `post_validation_pda`        | `UncheckedAccount`                       | ❌     | Deserialised in handler if enabled                               |
| `user_token_account`         | `InterfaceAccount<TokenAccount>`         | ❌     | Delegate must be UserPayment or PaymentsDelegate PDA             |
| `mint`                       | `InterfaceAccount<Mint>`                 | ❌     | `== forward_config.input_mint`                                   |
| `output_mint`                | `UncheckedAccount`                       | ❌     | SPL Mint or SystemProgram (act mode)                             |
| `intermediate_input_ata`     | `InterfaceAccount<TokenAccount>`         | ❌     | Owned by ComposablePolicy PDA                                    |
| `intermediate_output_ata`    | `InterfaceAccount<TokenAccount>`         | ❌     | Owned by ComposablePolicy PDA (deliver-transform only)           |
| `recipient_token_account`    | `InterfaceAccount<TokenAccount>`         | ❌     | Output-mint ATA of recipient                                     |
| `gateway_fee_recipient_ata`  | `InterfaceAccount<TokenAccount>`         | ❌     | Input-mint ATA of gateway.fee_recipient                          |
| `protocol_fee_recipient_ata` | `InterfaceAccount<TokenAccount>`         | ❌     | Input-mint ATA of config.fee_recipient                           |
| `scheduler_ata`              | `Option<InterfaceAccount<TokenAccount>>` | ❌     | Input-mint ATA of caller (scheduler cut, if applicable)          |
| `token_program`              | `Program<Token>`                         | ❌     |                                                                  |
| `system_program`             | `Program<System>`                        | ❌     |                                                                  |
| `remaining_accounts`         | `Vec<AccountInfo>`                       | ❌     | `[...preValTargets, ...forwardAccounts, ...postValTargets]`      |

### Arguments

| Arg                | Type          | Notes                                                          |
| ------------------ | ------------- | -------------------------------------------------------------- |
| `instruction_data` | `Vec<u8>`     | Forward program instruction data (empty if forward disabled)   |
| `forward_amount`   | `Option<u64>` | Pull amount (required for PayAsYouGo; `None` for subscription) |

### SDK

```typescript
const execIxs = await sdk.executeComposable(
  composablePolicyPDA,
  instructionData, // Buffer — forward instruction data
  forwardAmount, // BN | null
  remainingAccounts // AccountMeta[]
);
// Returns: [recipientATAEnsure?, gatewayFeeATAEnsure?, protocolFeeATAEnsure?, executeIx]
```

---

## `delete_composable_policy`

Closes a non-Active ComposablePolicy account and reclaims rent. Owner only.

### Accounts

| Account             | Type                        | Signer | Notes                |
| ------------------- | --------------------------- | ------ | -------------------- |
| `owner`             | `Signer`                    | ✅     | `user_payment.owner` |
| `user_payment`      | `Account<UserPayment>`      | PDA    |                      |
| `composable_policy` | `Account<ComposablePolicy>` | PDA    | Must NOT be `Active` |
| `config`            | `Account<ProgramConfig>`    | PDA    | `!emergency_pause`   |
| `system_program`    | `Program<System>`           | ❌     |                      |

### Arguments

| Arg         | Type  |
| ----------- | ----- |
| `policy_id` | `u32` |

---

## `change_composable_status`

Toggles a ComposablePolicy between `Active` and `Paused`. Owner only.

### Accounts

| Account             | Type                        | Signer | Notes                       |
| ------------------- | --------------------------- | ------ | --------------------------- |
| `owner`             | `Signer`                    | ✅     | `user_payment.owner`        |
| `user_payment`      | `Account<UserPayment>`      | PDA    |                             |
| `composable_policy` | `Account<ComposablePolicy>` | PDA    |                             |
| `gateway`           | `Account<PaymentGateway>`   | PDA    | Must match policy's gateway |
| `config`            | `Account<ProgramConfig>`    | PDA    |                             |

### Arguments

| Arg         | Type           | Notes                |
| ----------- | -------------- | -------------------- |
| `policy_id` | `u32`          |                      |
| `status`    | `PolicyStatus` | `Active` or `Paused` |

---

## Key types

### `ComposablePolicy`

| Field             | Type             | Size | Notes                                                  |
| ----------------- | ---------------- | ---- | ------------------------------------------------------ |
| `user_payment`    | `Pubkey`         | 32   | Parent UserPayment                                     |
| `policy_id`       | `u32`            | 4    | From `created_composable_count`                        |
| `gateway`         | `Pubkey`         | 32   |                                                        |
| `recipient`       | `Pubkey`         | 32   |                                                        |
| `status`          | `PolicyStatus`   | 1    | Active / Paused / Terminated                           |
| `policy_type`     | `PolicyType`     | 128  | subscription / payAsYouGo / milestone / oneTime / upto |
| `forward_config`  | `ForwardConfig`  | 205  | See below                                              |
| `pre_validation`  | `ValidationSpec` | 33   |                                                        |
| `post_validation` | `ValidationSpec` | 33   |                                                        |
| `memo`            | `[u8; 32]`       | 32   | ADR-0017                                               |
| `total_output`    | `u64`            | 8    | Lifetime output accumulated                            |
| `bump`            | `u8`             | 1    |                                                        |
| `padding`         | `[u8; 192]`      | 192  | ADR-0022                                               |

### `ForwardConfig` (205 bytes)

| Field                    | Type                    | Notes                                                               |
| ------------------------ | ----------------------- | ------------------------------------------------------------------- |
| `instruction_constraint` | `InstructionConstraint` | 140 bytes — see below                                               |
| `input_mint`             | `Pubkey`                | `== user_payment.token_mint`                                        |
| `output_mint`            | `Pubkey`                | Concrete mint, `== input_mint` (no swap), or `default()` (act mode) |
| `forward_flags`          | `u8`                    | Bit 0 = `FORWARD_FLAG_NATIVE_OUTPUT`                                |

### `InstructionConstraint` (140 bytes)

| Field                 | Type                  | Notes                                                         |
| --------------------- | --------------------- | ------------------------------------------------------------- |
| `program_id`          | `Pubkey`              | `Pubkey::default()` = forward disabled                        |
| `num_data_checks`     | `u8`                  | Active entries in `data_checks`                               |
| `data_checks`         | `[ByteRangeCheck; 4]` | Fixed-size; at least 1 must pin offset 0 when forward enabled |
| `num_pinned_accounts` | `u8`                  | Active entries in `pinned_accounts`                           |
| `pinned_accounts`     | `[PinnedAccount; 2]`  | Fixed-size                                                    |

### `ByteRangeCheck`

| Field      | Type      | Notes                                       |
| ---------- | --------- | ------------------------------------------- |
| `offset`   | `u16`     | Byte offset in instruction data             |
| `length`   | `u8`      | 1–8                                         |
| `expected` | `[u8; 8]` | Expected value at `[offset, offset+length)` |

### `PinnedAccount`

| Field    | Type     | Notes                                          |
| -------- | -------- | ---------------------------------------------- |
| `index`  | `u8`     | Position in the forward-account slice          |
| `pubkey` | `Pubkey` | Must be concrete (no default-pubkey wildcards) |

### `ValidationSpec`

| Variant       | Payload                  | Notes                                    |
| ------------- | ------------------------ | ---------------------------------------- |
| `Disabled`    | —                        | No validation                            |
| `ProgramCall` | `{ program_id: Pubkey }` | Must be in `ALLOWED_VALIDATION_PROGRAMS` |
| `Inline`      | `{ reserved: u8 }`       | Not implemented; errors at create        |

## Related

- [Overview](./overview.md) — 7-phase execution flow
- [Validation Hook](./validation-hook.md) — Lighthouse CPI mechanics
- [Forward Hook](./forward-hook.md) — Forward CPI mechanics
- [SDK reference](../../integration-guide/programmable-pull-payments/sdk.md)
