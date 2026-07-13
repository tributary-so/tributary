---
# tributary-as09
title: 'M-01: Manual Account Close — Bypasses Anchor Safety Checks'
status: scrapped
type: task
priority: normal
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T06:17:00Z
parent: tributary-4kt4
---

# M-01: Manual Account Close — Bypasses Anchor Safety Checks

| Field              | Value                                                          |
| ------------------ | -------------------------------------------------------------- |
| **Severity**       | Medium                                                         |
| **Status**         | Open                                                           |
| **Files**          | `programs/tributary/src/instructions/delete_payment_policy.rs` |
|                    | `programs/tributary/src/instructions/delete_user_payment.rs`   |
| **Program ID**     | `TRibg8W8zmPH4QqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`                 |
| **Anchor Version** | 0.31.1                                                         |

---

## Description

`delete_payment_policy` and `delete_user_payment` manually zero account data and transfer lamports instead of using Anchor's built-in `close` constraint. The manual pattern sets the discriminator to `[u8::MAX; 8]` and transfers the full rent-exempt balance to a destination account.

This exists by design: both accounts store a `rent_payer: Pubkey` field, and the refund must go to whichever address originally funded the account — which may differ from the transaction signer. Anchor's `close = <account>` constraint only accepts a single static account reference in the `#[derive(Accounts)]` struct, so the program cannot use it when the destination is conditional on runtime state.

The program _does_ use `close = admin` correctly in `delete_payment_gateway` where the destination is always the admin signer.

However, the manual close implementation omits several safety checks that Anchor's `close` constraint enforces automatically:

1. **No system program ownership check** — the destination account is not verified to be owned by the system program. If a program-owned account (e.g. a PDA of another program) is passed, lamports are transferred into an account the recipient may not control.
2. **No data-zeroing** — only the first 8 bytes (discriminator) are overwritten with `[u8::MAX; 8]`. The remaining account data (owner, recipient, gateway, policy details, memos) remains on-chain and can be read by anyone until the slot is finalized and garbage-collected.
3. **No writable check on destination** — the `rent_payer` account is `UncheckedAccount` with only `#[account(mut)]`. If `mut` were ever accidentally removed, lamports would silently fail to transfer.

---

## Attack Scenario

### Scenario 1: Rent Refund to Program-Owned Account

A gateway operator creates a `UserPayment` or `PaymentPolicy` with `rent_payer` set to a PDA of another program (e.g. a vault). When the user deletes the policy, lamports are transferred to this program-owned account. The operator's program can then use these lamports (via `invoke_signed`) or the lamports are effectively locked.

While `rent_payer` is set at account creation time and the current code validates that the passed `rent_payer` matches the stored one, a compromised or malicious gateway could set `rent_payer` to any address during policy creation, forcing rent refunds into dead ends.

### Scenario 2: Residual Data Leakage

After deletion, the account data beyond the discriminator is not zeroed. Until the Solana runtime garbage-collects the account (which requires the account to have zero lamports), the residual data persists on-chain. This includes:

- `PaymentPolicy.recipient` — identifies the payment recipient
- `PaymentPolicy.memo` — may contain user-identifiable information
- `PaymentPolicy.policy_type` — subscription amounts, milestone data
- `UserPayment.token_account` — links owner to their token account

This is a minor privacy concern but violates the principle of least information.

---

## Impact

- **Medium** — Rent lamports could be sent to a program-owned account that the original funder cannot access. No funds are stolen, but rent is permanently locked.
- **Low** — Residual data persists on-chain after account close. Informational only; no direct financial loss.
- The manual close is functionally correct for the lamport transfer itself (discriminator + lamport zeroing), but it skips defense-in-depth checks that Anchor provides.

---

## Proof of Concept

### `delete_payment_policy.rs` — Lines 71–80

```rust
const CLOSE_DISCRIMINATOR: [u8; 8] = [u8::MAX; 8];

// ...

let info = payment_policy.to_account_info();
{
    let mut data = info.try_borrow_mut_data()?;
    data[..8].copy_from_slice(&CLOSE_DISCRIMINATOR); // Only first 8 bytes zeroed
}
**destination.try_borrow_mut_lamports()? = destination
    .lamports()
    .checked_add(info.lamports())
    .ok_or(TributaryError::ArithmeticOverflow)?;
**info.try_borrow_mut_lamports()? = 0;
```

### `delete_user_payment.rs` — Lines 54–63

```rust
let info = user_payment.to_account_info();
{
    let mut data = info.try_borrow_mut_data()?;
    data[..8].copy_from_slice(&CLOSE_DISCRIMINATOR); // Only first 8 bytes zeroed
}
**destination.try_borrow_mut_lamports()? = destination
    .lamports()
    .checked_add(info.lamports())
    .ok_or(TributaryError::ArithmeticOverflow)?;
**info.try_borrow_mut_lamports()? = 0;
```

### Missing checks (contrast with Anchor's `close` constraint)

Anchor's `close` constraint enforces:

1. `dest.owner == System::id()` — destination is system-owned
2. `dest.is_writable` — destination is writable
3. Full data zeroing via `sol_set_return_data` / manual memset
4. Discriminator set to `[u8::MAX; 8]`

The manual implementation only enforces #4.

---

## Patch

### Option A: Keep Manual Close + Add Safety Checks (Recommended)

The conditional rent destination (runtime `rent_payer` field) makes Anchor's `close` constraint unsuitable. Instead, harden the manual close with the same checks Anchor performs.

#### `delete_payment_policy.rs`

```rust
use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

const CLOSE_DISCRIMINATOR: [u8; 8] = [u8::MAX; 8];

#[derive(Accounts)]
#[instruction(policy_id: u32)]
pub struct DeletePaymentPolicy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_PAYMENT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump = user_payment.bump,
        constraint = user_payment.owner == owner.key(),
    )]
    pub user_payment: Account<'info, UserPayment>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [
            PAYMENT_POLICY_SEED,
            user_payment.key().as_ref(),
            policy_id.to_le_bytes().as_ref()
        ],
        bump = payment_policy.bump,
        constraint = payment_policy.user_payment == user_payment.key() @ TributaryError::PolicyNotFound,
    )]
    pub payment_policy: Account<'info, PaymentPolicy>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// CHECK: Rent recipient - validated in handler against stored rent_payer.
    /// System ownership and writability validated in handler.
    #[account(mut)]
    pub rent_payer: UncheckedAccount<'info>,
}

impl<'info> DeletePaymentPolicy<'info> {
    pub fn handler_delete_payment_policy(
        ctx: Context<DeletePaymentPolicy>,
        _policy_id: u32,
    ) -> Result<()> {
        let payment_policy = &ctx.accounts.payment_policy;
        let user_payment = &mut ctx.accounts.user_payment;
        let clock = Clock::get()?;

        let stored_rent_payer = payment_policy.rent_payer;

        let destination = if stored_rent_payer == Pubkey::default() {
            ctx.accounts.owner.to_account_info()
        } else {
            require!(
                ctx.accounts.rent_payer.key() == stored_rent_payer,
                TributaryError::InvalidRentPayer
            );
            ctx.accounts.rent_payer.to_account_info()
        };

        // --- Safety checks mirroring Anchor's close constraint ---
        require!(
            destination.owner == &solana_program::system_program::ID,
            TributaryError::InvalidRentPayer
        );
        require!(
            destination.is_writable,
            TributaryError::InvalidRentPayer
        );

        let rent_refund_target = destination.key();

        let info = payment_policy.to_account_info();
        {
            let mut data = info.try_borrow_mut_data()?;
            // Zero ALL account data, not just the discriminator
            data.fill(0);
            data[..8].copy_from_slice(&CLOSE_DISCRIMINATOR);
        }
        **destination.try_borrow_mut_lamports()? = destination
            .lamports()
            .checked_add(info.lamports())
            .ok_or(TributaryError::ArithmeticOverflow)?;
        **info.try_borrow_mut_lamports()? = 0;

        emit!(PaymentPolicyDeleted {
            payment_policy: payment_policy.key(),
            owner: user_payment.owner,
            policy_id: payment_policy.policy_id,
        });

        user_payment.active_policies_count = user_payment.active_policies_count.saturating_sub(1);
        user_payment.updated_at = clock.unix_timestamp;

        msg!(
            "Payment policy deleted with ID: {} for user: {:?}, rent returned to: {:?}",
            payment_policy.policy_id,
            user_payment.owner,
            rent_refund_target,
        );

        Ok(())
    }
}
```

#### `delete_user_payment.rs`

```rust
use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

const CLOSE_DISCRIMINATOR: [u8; 8] = [u8::MAX; 8];

#[derive(Accounts)]
pub struct DeleteUserPayment<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_PAYMENT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump = user_payment.bump,
        constraint = user_payment.owner == owner.key(),
        constraint = user_payment.active_policies_count == 0 @ TributaryError::HasActivePolicies,
    )]
    pub user_payment: Account<'info, UserPayment>,

    pub token_mint: Account<'info, Mint>,

    /// CHECK: Rent recipient - validated in handler against stored rent_payer.
    /// System ownership and writability validated in handler.
    #[account(mut)]
    pub rent_payer: UncheckedAccount<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused,
    )]
    pub config: Account<'info, ProgramConfig>,
}

impl<'info> DeleteUserPayment<'info> {
    pub fn handler_delete_user_payment(ctx: Context<DeleteUserPayment>) -> Result<()> {
        let user_payment = &ctx.accounts.user_payment;

        let stored_rent_payer = user_payment.rent_payer;

        let destination = if stored_rent_payer == Pubkey::default() {
            ctx.accounts.owner.to_account_info()
        } else {
            require!(
                ctx.accounts.rent_payer.key() == stored_rent_payer,
                TributaryError::InvalidRentPayer
            );
            ctx.accounts.rent_payer.to_account_info()
        };

        // --- Safety checks mirroring Anchor's close constraint ---
        require!(
            destination.owner == &solana_program::system_program::ID,
            TributaryError::InvalidRentPayer
        );
        require!(
            destination.is_writable,
            TributaryError::InvalidRentPayer
        );

        let rent_refund_target = destination.key();

        let info = user_payment.to_account_info();
        {
            let mut data = info.try_borrow_mut_data()?;
            // Zero ALL account data, not just the discriminator
            data.fill(0);
            data[..8].copy_from_slice(&CLOSE_DISCRIMINATOR);
        }
        **destination.try_borrow_mut_lamports()? = destination
            .lamports()
            .checked_add(info.lamports())
            .ok_or(TributaryError::ArithmeticOverflow)?;
        **info.try_borrow_mut_lamports()? = 0;

        emit!(UserPaymentDeleted {
            user_payment: user_payment.key(),
            owner: user_payment.owner,
            rent_payer: rent_refund_target,
        });

        msg!(
            "User payment deleted for owner: {:?}, rent returned to: {:?}",
            user_payment.owner,
            rent_refund_target,
        );

        Ok(())
    }
}
```

### Option B: Refactor to Anchor `close` (Not Viable)

Anchor's `close = <account>` constraint requires the destination to be a named account in the struct — it cannot be conditionally selected at runtime. Since both `PaymentPolicy` and `UserPayment` store a `rent_payer: Pubkey` that may differ from the signer, the `close` constraint cannot express this logic.

The existing `delete_payment_gateway` uses `close = admin` because the gateway always refunds to the admin — a static relationship. This is not the case for policies and user payments.

**Verdict: Option A is the only viable path.**

---

## Testing Instructions

### 1. Unit Test: System Ownership Check

```typescript
it("rejects rent refund to program-owned account", async () => {
  // Create a policy with rent_payer set to a PDA of another program
  // Attempt to delete the policy with that PDA as rent_payer
  // Expect TributaryError.InvalidRentPayer
});
```

### 2. Integration Test: Data Zeroing Verification

```typescript
it("zeros all account data on policy deletion", async () => {
  const policyBefore = await program.account.paymentPolicy.fetch(policyAddress);

  await program.methods
    .deletePaymentPolicy(policyId)
    .accounts({
      /* ... */
    })
    .rpc();

  const accountInfo = await connection.getAccountInfo(policyAddress);
  assert.isNull(
    accountInfo,
    "Account should be garbage-collected (null) or fully zeroed"
  );
});
```

### 3. Regression Test: Normal Close Path

```typescript
it("deletes policy and refunds rent to owner when rent_payer is default", async () => {
  const ownerBalanceBefore = await connection.getBalance(owner.publicKey);

  await program.methods
    .deletePaymentPolicy(policyId)
    .accounts({
      /* rent_payer not needed */
    })
    .rpc();

  const ownerBalanceAfter = await connection.getBalance(owner.publicKey);
  assert.isTrue(
    ownerBalanceAfter > ownerBalanceBefore,
    "Owner should receive rent refund"
  );
});

it("deletes policy and refunds rent to stored rent_payer", async () => {
  const rentPayerBalanceBefore = await connection.getBalance(
    rentPayer.publicKey
  );

  await program.methods
    .deletePaymentPolicy(policyId)
    .accounts({ rentPayer: rentPayer.publicKey })
    .rpc();

  const rentPayerBalanceAfter = await connection.getBalance(
    rentPayer.publicKey
  );
  assert.isTrue(
    rentPayerBalanceAfter > rentPayerBalanceBefore,
    "Rent payer should receive refund"
  );
});
```

### 4. Run Existing Tests

```bash
anchor test                           # Full integration suite
anchor test -- --run-insecure         # If local validator issues
cd tests && npx jest                  # TypeScript test suite
```

---

## Summary of Changes

| Change                             | File                       | Line(s)                      |
| ---------------------------------- | -------------------------- | ---------------------------- |
| Add system ownership check         | `delete_payment_policy.rs` | After destination selection  |
| Add writable check                 | `delete_payment_policy.rs` | After system ownership check |
| Zero all data before discriminator | `delete_payment_policy.rs` | In data borrow block         |
| Add system ownership check         | `delete_user_payment.rs`   | After destination selection  |
| Add writable check                 | `delete_user_payment.rs`   | After system ownership check |
| Zero all data before discriminator | `delete_user_payment.rs`   | In data borrow block         |

---

## References

- [Anchor `close` Constraint Documentation](https://www.anchor-lang.com/docs/the-accounts-struct#close)
- [Anchor Source: `close` constraint implementation](https://github.com/coral-xyz/anchor/blob/v0.31.1/lang/derive/accounts/src/lib.rs)
- [Solana Account Model — Rent & Data](https://docs.solanalabs.com/core/accounts)
- [SECURITY.md — Tributary Responsible Disclosure](https://github.com/tributary-so/tributary/blob/master/SECURITY.md)
