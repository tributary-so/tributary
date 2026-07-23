# Security Model

This page documents the security-critical invariants of `ComposablePolicy`.
Auditors should read it alongside the inline `reports/*.md` references in
`execute_composable.rs` and `create_composable_policy.rs`.

## 1. Intermediate ATA ownership — ComposablePolicy PDA, NOT UserPayment PDA

The two intermediate ATAs (`intermediate_input_token_account` and
`intermediate_output_token_account`) are owned by the **`ComposablePolicy`
PDA**, not the `UserPayment` PDA.

```
UserPayment PDA
   │ delegate on user_token_account   (signs ONLY the Phase 1 pull)
   │
   │ NOT an owner of any intermediate ATA
   ▼
ComposablePolicy PDA
   │ owns  intermediate_input_ata
   │ owns  intermediate_output_ata
   │ signs forward CPI, fee transfers, sweep, closeAccount
   │
   │ NEVER a token-account delegate anywhere
   ▼
   blast radius = transient intermediate balances only
```

### Why this matters

The `UserPayment` PDA is the delegate on `user_token_account` (that's how
the Phase 1 pull works). If the `UserPayment` PDA _also_ owned the
intermediate ATAs, then any CPI signed by `UserPayment` could move funds
both **out of** the intermediates and **out of** `user_token_account` —
because the same PDA would be both "intermediate-ATA owner" and
"user-source delegate". This is exactly the dual-role coupling that the
C-1 report documented as a drain vector.

By parenting the intermediates under the `ComposablePolicy` PDA (which is
**never** a token-account delegate anywhere), the two roles are decoupled:

- `UserPayment` PDA signs the pull — and nothing else.
- `ComposablePolicy` PDA signs every downstream CPI — but has no authority
  over `user_token_account`.

A forward program that receives the `ComposablePolicy` PDA as a signer can
therefore only move the transient intermediate balances (capped at
`input_amount`), never the user's source funds.

### Address validation

The handler re-derives the expected intermediate ATA addresses from the
`ComposablePolicy` PDA at execute time:

```rust
let intermediate_owner = ctx.accounts.composable_policy.key();
let expected_input_ata = Pubkey::find_program_address(
    &[
        intermediate_owner.as_ref(),
        ctx.accounts.token_program.key().as_ref(),
        ctx.accounts.mint.key().as_ref(),
    ],
    ctx.accounts.associated_token_program.key,
).0;
require!(ctx.accounts.intermediate_input_token_account.key() == expected_input_ata,
         TributaryError::IntermediateAccountMismatch);
```

This forces the intermediates to be the canonical ATAs of the
`ComposablePolicy` PDA — no attacker-controlled lookalikes.

### Freshness on creation

`create_ata` rejects pre-existing accounts:

```rust
require!(ata.lamports() == 0, TributaryError::IntermediateAccountAlreadyExists);
```

This prevents stale or attacker-controlled intermediate accounts from
sneaking in (e.g. an account pre-funded with a hostile `PermanentDelegate`
mint, or an account whose owner is not the ComposablePolicy PDA).

## 2. CPI signer sanitization (C-1 remediation)

The C-1 report (`reports/C-1-validation-cpi-signer-leak.md`) documented
that the validation CPI previously used `invoke_signed` with `UserPayment`
PDA seeds. Because `UserPayment` is the delegate on `user_token_account`,
this granted the validation program (and any program it nested into) the
ability to drain user funds via a nested Token `transfer`.

### Validation CPI — plain `invoke`, no signers

Lighthouse is invoked with plain `invoke` — **no** signer seeds:

```rust
anchor_lang::solana_program::program::invoke(&instruction, &all_infos)?;
```

The validation helper also hard-codes every forwarded account to
`is_signer: false, is_writable: false`:

```rust
fn build_validation_account_metas(accounts: &[AccountInfo<'_>])
    -> Vec<AccountMeta>
{
    accounts.iter().map(|a| AccountMeta {
        pubkey: *a.key,
        is_signer: false,
        is_writable: false,
    }).collect()
}
```

So even if the caller re-passes `fee_payer` (which is a `Signer`) as a
remaining_account, Lighthouse cannot inherit that authority. This is safe
because (a) Lighthouse is read-only by design and (b) the validation CPI
runs **before** Phase 3 funds the intermediates — there is nothing in them
to move yet.

### Forward CPI — `invoke_signed` with ComposablePolicy seeds only

The forward CPI uses `invoke_signed`, but the only PDA whose seeds are
passed is the `ComposablePolicy` PDA:

```rust
fn build_forward_account_metas(
    accounts: &[&AccountInfo<'_>],
    intermediate_owner_pda: Pubkey,
) -> Vec<AccountMeta> {
    accounts.iter().map(|a| AccountMeta {
        pubkey: *(*a).key,
        is_signer: *(*a).key == intermediate_owner_pda,   // ONLY ComposablePolicy
        is_writable: (*a).is_writable,                    // forwarded verbatim
    }).collect()
}
```

`is_writable` forwarding is safe because the Solana runtime rejects any
inner instruction that claims writable access to an account the outer
transaction did not also mark writable — privileges cannot be elevated by
forwarding.

The `ComposablePolicy` PDA owns both intermediates and is therefore a
legitimate signer for any CPI that moves their balances (forward swap, fee
transfers, sweep, closeAccount). Because it is never a delegate on
`user_token_account`, this signing authority cannot reach the user's
source funds.

## 3. Mint re-validation at execute time

Token-2022 extensions (`TransferHook`, `TransferFee`,
`PermanentDelegate`, `ConfidentialTransferMint`) can be **mutated after an
mint is created**. A mint that was clean at `create_user_payment` time
could turn hostile before `execute_composable` runs.

The handler re-runs `validate_mint_compatible` on **both** the input and
output mints at the top of execution:

```rust
validate_mint_compatible(&ctx.accounts.mint.to_account_info())?;
validate_mint_compatible(&ctx.accounts.output_mint.to_account_info())?;
```

The output-mint check matters even though the output mint was validated at
create time: the execute handler creates a PDA-controlled intermediate ATA
for it, and a `PermanentDelegate` output mint would drain that intermediate.
See `reports/L-02-mint-validation-call-sites-incomplete.md`.

## 4. Dual-delegate support (v0 + v1)

The user's `user_token_account` may delegate to **either** of two PDAs:

| Version | Delegate PDA                           | Seeds                           |
| ------- | -------------------------------------- | ------------------------------- |
| v0      | `PaymentsDelegate` (legacy global PDA) | `["payments"]`                  |
| v1      | `UserPayment` PDA (per-user, per-mint) | `["user_payment", owner, mint]` |

`shared::delegation::resolve_delegate` picks whichever is actually set on
the token account, and the pull CPI signs with that PDA's seeds. The
Accounts struct constraint accepts either:

```rust
constraint = token_account_has_any_delegate(
    &user_token_account.delegate,
    &[&payments_delegate.key(), &user_payment.key()]
) @ TributaryError::NoDelegateSet,
```

This is purely a pull-path concern. **All** downstream CPIs (forward,
sweep, close) are signed by the `ComposablePolicy` PDA, so the choice of
pull delegate has no effect on the security model of the hooks.

## 5. Arithmetic and panic safety

- All `+`, `-`, `*` on user-controlled sizes route through `checked_*` and
  return `ArithmeticOverflow` on failure. No silent wrapping.
- `ByteRangeCheck::validate` defends against `length > 8` panics even
  though create-time validation rejects them (H-06).
- `validate_byte_ranges` re-checks `n <= checks.len()` before indexing
  (H-04).
- The `skip_months` calendar loop is bounded by
  `MAX_MONTHLY_ITERATIONS = 1200` (~100 years) before bailing with
  `ArithmeticOverflow` — see `shared/schedule.rs`.

## 6. Emergency pause

`ProgramConfig.emergency_pause` is a global kill switch enforced at the top
of every `execute_composable` (and `execute_payment`) call. See
[allowlists-and-sentinels.md](allowlists-and-sentinels.md) for details.

## 7. Settlement output guards — what the on-chain `>0` covers, and what it doesn't

The composable execution pipeline (ADR-0026) has three settlement shapes.
Each has a different on-chain backstop against a malicious or compromised
gateway that controls the forward CPI's `remaining_accounts` and (within
the pinned `InstructionConstraint`) the instruction data.

| Shape                                                                    | On-chain guard                                                                         | Gateway vector                                                                                         | `post_validation` role                                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **deliver-no-transform** (forward disabled, `output_mint == input_mint`) | n/a — forward never runs; intermediate holds deterministic `face` after fee skim       | none                                                                                                   | not needed                                                            |
| **deliver-transform** (forward enabled, distinct `output_mint`)          | `output_amount > 0` at `sweep_output_to_recipient` (`execute_composable.rs:523`)       | **magnitude (dust)** — gateway sets swap `minimum_amount_out = 0`; recipient gets 1 unit; guard passes | optional; owner-economic magnitude floor                              |
| **act mode** (sentinel `output_mint`)                                    | **none** — no intermediate_output ATA; forward consumes input for non-token settlement | **full** — forward delivers nothing observable to Tributary                                            | the only backstop, but target is use-case-specific (external account) |

### What the `>0` guard closes

- **No output at all.** If the forward produces zero output (empty swap,
  wrong route), the guard reverts the transaction. The user loses only gas.
- **Wrong destination.** The intermediate_output ATA is re-derived from
  the policy's declared `output_mint` at execute time
  (`execute_composable.rs:949`). ATA derivation is deterministic
  (owner + token_program + mint). If the gateway misroutes the forward's
  own destination slot (e.g. Raydium CPMM `swap_base_input` account index
  11, which is not pinned), the swap credits a different account, Tributary
  reads 0 in its own intermediate, the guard fails, tx reverts. Fails
  closed.

### What the `>0` guard does NOT close (the magnitude gap)

The guard is an **existence** assertion, not a **magnitude** assertion.
A gateway can set the swap's `minimum_amount_out` to 0 in the instruction
data (the `InstructionConstraint` pins the discriminator at offset 0 and
the pool, not the amount fields). The swap returns dust (1 unit); the
guard passes; the recipient receives 1 unit of output for a `face`-sized
input pull. This generalizes the `min_output_amount` field removed in
v2.1.

**Owner opt-in magnitude floor** (deliver-transform): add a Lighthouse
`post_validation` assertion on the intermediate_output ATA:

```typescript
import { lighthouse } from "@tributary-so/sdk";

// ownerFloor = the minimum acceptable output amount, or 0 for existence
// parity with the on-chain guard (defense-in-depth).
const guard = lighthouse
  .tokenAccount(intermediateOutputAta)
  .amount(ownerFloor, ">=")
  .build();
// guard.data        → Buffer stored in the post ValidationPda
// guard.numAccounts → 1
// guard.accounts    → [intermediateOutputAta]
```

The post ValidationPda seed is
`["composable_validation_post", composablePolicy]`.

### Act mode — no on-chain backstop

Act mode skips intermediate_output ATA creation, the deliver sweep, AND
the `>0` guard. The forward consumes input for a non-token settlement
(e.g. a Velocity subaccount deposit). Tributary cannot observe the
delivery on-chain — there is no intermediate_output ATA to read.

The owner's `post_validation` is genuinely the only floor here, AND the
target account is use-case-specific (the external settlement account),
not a Tributary-controlled intermediate. The SDK emits a builder-time
warning when an act-mode policy is created without a `post_validation`
ProgramCall — see the [SDK reference](../../integration-guide/programmable-pull-payments/sdk.md).

### Why no on-chain enforcement

Enforcing `post_validation = ProgramCall` on-chain is rejected (ADR-0031):

- **Act mode is unenforceable** — the target account is external and
  use-case-specific; the program cannot know which account to assert
  against.
- **Deliver-transform existence is already covered** — the catastrophic
  vectors revert. The residual magnitude gap is owner-economic.
- **Flexibility** — legitimate use cases accept any non-zero output
  (volatile pools, trusted gateways).

See [ADR-0031](../../../adr/0031-settlement-output-post-validation-posture.md)
for the full decision and rejected alternatives.
