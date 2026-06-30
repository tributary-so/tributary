---
# tributary-4sfi
title: 'M-03: Cfg-Gated Milestone Validation — Different Behavior on Mainnet vs. Devnet'
status: scrapped
type: task
priority: normal
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T06:19:54Z
parent: tributary-4kt4
---

# M-03: Cfg-Gated Milestone Validation — Different Behavior on Mainnet vs. Devnet

| Field        | Value                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| **Severity** | Medium                                                                            |
| **File**     | `programs/tributary/src/policies/milestone.rs`                                    |
| **Related**  | `programs/tributary/src/state/payment_policy.rs`, `programs/tributary/Cargo.toml` |
| **Status**   | Open                                                                              |

---

## Description

The milestone timestamp future-check is gated behind a compile-time `#[cfg(feature = "mainnet")]` directive:

```rust
// programs/tributary/src/policies/milestone.rs:41-48
    // Validate timestamps are in the future (basic check)
    #[cfg(feature = "mainnet")]
    {
        // only on mainnet, simplifies testing
        let current_time = Clock::get()?.unix_timestamp;
        for timestamp in _milestone_timestamps.iter().take(total_milestones as usize) {
            require!(*timestamp > current_time, TributaryError::InvalidInterval);
        }
    }
```

The `mainnet` feature is declared in `Cargo.toml` (line 18):

```toml
[features]
default = []
mainnet = []
```

When the program is compiled **without** `--features mainnet` (the default), the timestamp validation block is entirely compiled out. The `_milestone_timestamps` parameter is prefixed with `_` precisely because it's unused without the feature — Rust's dead-code lint would otherwise complain.

The comment `// only on mainnet, simplifies testing` confirms the intent: the gate exists purely for developer convenience, allowing tests to create policies with arbitrary past timestamps without waiting or mocking clocks.

**The problem:** This creates a behavioral schism between environments:

| Environment    | Feature `mainnet` | Past timestamps accepted? |
| -------------- | ----------------- | ------------------------- |
| `anchor test`  | No                | **Yes**                   |
| devnet deploy  | Depends on build  | **Depends**               |
| mainnet deploy | Yes               | No                        |

---

## Attack Scenario

### Scenario 1: Accidental devnet build promoted to mainnet

1. Operator builds the program locally for integration testing: `anchor build` (no `--features mainnet`).
2. Tests pass. The binary is deployed to mainnet as-is.
3. Milestone policies with **past timestamps** are now accepted on mainnet.
4. A malicious gateway creates a milestone policy where all timestamps are in the past.
5. The gateway immediately calls `execute_payment` for every milestone in rapid succession, draining the user's escrow in a single block.

### Scenario 2: Test/prod divergence masks bugs

1. Tests never exercise the timestamp validation path because the `mainnet` feature is off by default.
2. A logic bug in the timestamp validation (e.g., off-by-one with `>` vs `>=`, or an integer overflow in timestamp arithmetic) goes undetected because no test ever runs that code.
3. On mainnet, the buggy validation either rejects valid timestamps or accepts invalid ones.

### Scenario 3: Gateway front-runs user with past-due milestones

1. User submits a `create_payment_policy` transaction with milestone timestamps `T1, T2, T3` all in the future.
2. Gateway operator sees the transaction in the mempool.
3. If the program was built without `mainnet` feature on a non-mainnet cluster, the gateway can create its own policy with all timestamps set to epoch 0.
4. The gateway then executes all milestones immediately, collecting payments before the user's policy even lands.

---

## Impact

- **Invalid milestone acceptance on non-mainnet builds**: Milestone policies with past timestamps bypass the validation entirely. When deployed without the `mainnet` feature, these policies are accepted and immediately executable.
- **Test/prod behavioral divergence**: Tests never exercise the same code path that runs in production. Any bug in the timestamp validation logic is invisible to the test suite.
- **Escrow drainage**: A gateway can create and immediately execute milestones with past timestamps, extracting escrowed funds without waiting for the actual milestone dates.
- **Build-dependent security**: Whether the program is secure depends on a Cargo feature flag — a deployment configuration detail, not a code invariant.

---

## Proof of Concept

### The cfg gate in context

```rust
// programs/tributary/src/policies/milestone.rs — lines 11-56 (full function)
pub fn validate_milestone_policy(
    milestone_amounts: &[u64; 4],
    current_milestone: u8,
    release_condition: u8,
    total_milestones: u8,
    escrow_amount: u64,
    _milestone_timestamps: &[i64; 4],   // <-- prefixed with _ (unused without mainnet)
) -> Result<()> {
    // ... amount and bounds checks ...

    // Validate timestamps are in the future (basic check)
    #[cfg(feature = "mainnet")]         // <-- COMPILE-TIME gate
    {
        // only on mainnet, simplifies testing
        let current_time = Clock::get()?.unix_timestamp;
        for timestamp in _milestone_timestamps.iter().take(total_milestones as usize) {
            require!(*timestamp > current_time, TributaryError::InvalidInterval);
        }
    }

    // ... release_condition check ...
    Ok(())
}
```

### Demonstration: default build accepts past timestamps

```bash
# Default build (NO mainnet feature)
anchor build
# Deploy to devnet, then:

# Create a milestone policy with timestamps in the year 2000
# This SUCCEEDS because the validation block is compiled out
tributary-sdk create-payment-policy \
  --type milestone \
  --amounts 1000000,1000000,1000000,0 \
  --timestamps 946684800,978307200,1009843200,0 \
  --total 3 \
  --escrow 3000000

# Immediately execute all milestones (timestamps are all in the past)
# The release_condition due-date bit check passes trivially
tributary-sdk execute-payment --policy-id 1
```

### Demonstration: mainnet build rejects past timestamps

```bash
# Mainnet build
anchor build -- --features mainnet
# Now the same create-payment-policy call FAILS with InvalidInterval
```

---

## Patch

### Option A: Runtime flag in `ProgramConfig` (recommended for staged rollout)

Replace the compile-time gate with a runtime check against a flag in `ProgramConfig`, controlled by the admin. This preserves the ability to relax validation in test environments while ensuring mainnet always validates.

#### A.1: Add `strict_validation` field to `ProgramConfig`

```rust
// programs/tributary/src/state/program_config.rs — PATCHED
use anchor_lang::prelude::*;

#[account]
pub struct ProgramConfig {
    /// Admin authority that can update protocol configuration
    pub admin: Pubkey,
    /// Key that receives protocol fees from all payments
    pub fee_recipient: Pubkey,
    /// Protocol fee in basis points (bps). Max 10,000 (100%)
    pub protocol_fee_bps: u16,
    /// DEPRECATED: Maximum number of active policies allowed per user. Attention tumbstone!
    pub _deprecated: u32,
    /// Emergency pause flag - when true, all payments are blocked
    pub emergency_pause: bool,
    /// When true, milestone timestamps must be in the future.
    /// Should be set to true on mainnet, false on devnet/testnet for testing convenience.
    pub strict_validation: bool,
    /// PDA bump seed for address derivation
    pub bump: u8,
    /// Reserved space for future extensions
    pub padding: [u8; 255],
}

impl ProgramConfig {
    pub const SIZE: usize = 8 + // discriminator
        32 + // admin: Pubkey
        32 + // fee_recipient: Pubkey
        2 + // protocol_fee_bps: u16
        4 + // _deprecated: u32
        1 + // emergency_pause: bool
        1 + // strict_validation: bool
        1 + // bump: u8
        255; // padding: [u8; 255]
}
```

Note: `padding` shrinks from `[u8; 256]` to `[u8; 255]` to accommodate the new `bool` field — total account size is unchanged.

#### A.2: Update `validate_milestone_policy` to accept `ProgramConfig`

```rust
// programs/tributary/src/policies/milestone.rs — PATCHED validate_milestone_policy
use crate::{
    error::TributaryError,
    policies::traits::PolicyStrategy,
    state::{
        PaymentGateway, PaymentPolicy, PolicyType, ProgramConfig, RELEASE_DUE_DATE,
        RELEASE_GATEWAY, RELEASE_OWNER, RELEASE_RECIPIENT,
    },
};
use anchor_lang::prelude::*;

pub fn validate_milestone_policy(
    milestone_amounts: &[u64; 4],
    current_milestone: u8,
    release_condition: u8,
    total_milestones: u8,
    escrow_amount: u64,
    milestone_timestamps: &[i64; 4],
    config: &ProgramConfig,
) -> Result<()> {
    require!(
        (1..=4).contains(&total_milestones),
        TributaryError::InvalidAmount
    );

    require!(
        current_milestone < total_milestones,
        TributaryError::InvalidAmount
    );

    require!(escrow_amount > 0, TributaryError::InvalidAmount);

    for amount in milestone_amounts.iter().take(total_milestones as usize) {
        require!(*amount > 0, TributaryError::InvalidAmount);
    }

    if config.strict_validation {
        let current_time = Clock::get()?.unix_timestamp;
        for timestamp in milestone_timestamps.iter().take(total_milestones as usize) {
            require!(*timestamp > current_time, TributaryError::InvalidInterval);
        }
    }

    let signer_bits = release_condition & 0b1110;
    require!(signer_bits.count_ones() <= 1, TributaryError::InvalidAmount);

    Ok(())
}
```

#### A.3: Update `PolicyType::validate` to pass config through

The call chain is: `PolicyType::validate()` → `validate_milestone_policy()`. The `create_payment_policy` handler has access to `config` already (it checks `emergency_pause`).

```rust
// programs/tributary/src/state/payment_policy.rs — PATCHED validate method
impl PolicyType {
    pub const VARIANT_SIZE: usize = 128;
    pub const TOTAL_SIZE: usize = 1 + Self::VARIANT_SIZE;

    pub fn validate(&self, config: &ProgramConfig) -> Result<()> {
        match self {
            PolicyType::Subscription {
                amount,
                payment_frequency,
                max_renewals,
                ..
            } => crate::policies::validate_subscription_policy(
                *amount,
                payment_frequency,
                max_renewals,
            ),
            PolicyType::Milestone {
                milestone_amounts,
                current_milestone,
                release_condition,
                total_milestones,
                escrow_amount,
                milestone_timestamps,
                ..
            } => crate::policies::validate_milestone_policy(
                milestone_amounts,
                *current_milestone,
                *release_condition,
                *total_milestones,
                *escrow_amount,
                milestone_timestamps,
                config,
            ),
            PolicyType::PayAsYouGo {
                max_amount_per_period,
                max_chunk_amount,
                period_length_seconds,
                ..
            } => crate::policies::validate_payg_policy(
                *max_amount_per_period,
                *max_chunk_amount,
                *period_length_seconds,
            ),
        }
    }
}
```

#### A.4: Update the caller in `create_payment_policy.rs`

```rust
// programs/tributary/src/instructions/create_payment_policy.rs — line 66
// BEFORE:
        policy_type.validate()?;
// AFTER:
        policy_type.validate(&ctx.accounts.config)?;
```

#### A.5: Set `strict_validation` in `initialize.rs`

```rust
// programs/tributary/src/instructions/initialize.rs — add after emergency_pause line
        config.strict_validation = true;
```

#### A.6: Add admin instruction to toggle the flag

```rust
// programs/tributary/src/instructions/update_strict_validation.rs — NEW FILE
use crate::{constants::CONFIG_SEED, state::ProgramConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateStrictValidation<'info> {
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == authority.key(),
    )]
    pub config: Account<'info, ProgramConfig>,

    pub authority: Signer<'info>,
}

pub fn handler_update_strict_validation(
    ctx: Context<UpdateStrictValidation>,
    strict_validation: bool,
) -> Result<()> {
    ctx.accounts.config.strict_validation = strict_validation;
    msg!(
        "Strict validation updated to: {}",
        ctx.accounts.config.strict_validation
    );
    Ok(())
}
```

#### A.7: Remove the `mainnet` feature from `Cargo.toml`

```toml
# programs/tributary/Cargo.toml — REMOVE this line:
# mainnet = []
```

---

### Option B: Always validate timestamps, fix the tests (simpler, preferred)

Remove the cfg gate entirely. Always validate timestamps. Adjust tests to use future timestamps or mock the clock.

#### B.1: Remove the cfg gate from `milestone.rs`

```rust
// programs/tributary/src/policies/milestone.rs — PATCHED validate_milestone_policy
pub fn validate_milestone_policy(
    milestone_amounts: &[u64; 4],
    current_milestone: u8,
    release_condition: u8,
    total_milestones: u8,
    escrow_amount: u64,
    milestone_timestamps: &[i64; 4],
) -> Result<()> {
    require!(
        (1..=4).contains(&total_milestones),
        TributaryError::InvalidAmount
    );

    require!(
        current_milestone < total_milestones,
        TributaryError::InvalidAmount
    );

    require!(escrow_amount > 0, TributaryError::InvalidAmount);

    for amount in milestone_amounts.iter().take(total_milestones as usize) {
        require!(*amount > 0, TributaryError::InvalidAmount);
    }

    let current_time = Clock::get()?.unix_timestamp;
    for timestamp in milestone_timestamps.iter().take(total_milestones as usize) {
        require!(*timestamp > current_time, TributaryError::InvalidInterval);
    }

    let signer_bits = release_condition & 0b1110;
    require!(signer_bits.count_ones() <= 1, TributaryError::InvalidAmount);

    Ok(())
}
```

The parameter `_milestone_timestamps` becomes `milestone_timestamps` (no underscore — it's now always used).

#### B.2: Fix tests to use future timestamps

In the test file, replace any hardcoded past timestamps with timestamps computed relative to the current clock:

```typescript
// tests/tributary.test.ts — use future timestamps
const now = Math.floor(Date.now() / 1000);
const ONE_HOUR = 3600;
const ONE_DAY = 86400;

const milestoneTimestamps = [
  new BN(now + ONE_HOUR), // T1: 1 hour from now
  new BN(now + ONE_DAY), // T2: 1 day from now
  new BN(now + ONE_DAY * 7), // T3: 1 week from now
  new BN(0), // T4: unused
];
```

For tests that need to execute milestones immediately (e.g., testing the full payment flow), set the timestamp to the current slot time or 1 second in the future and use `solana-test-validator`'s warp feature:

```bash
# Advance the test validator clock past the milestone
solana-test-validator --warp-slot 100
```

Or use the Anchor test pattern of setting the timestamp just barely in the future and waiting:

```typescript
// Create policy with timestamp 2 seconds from now
const timestamps = [new BN(Math.floor(Date.now() / 1000) + 2), ...];
// Wait for the timestamp to pass
await new Promise((resolve) => setTimeout(resolve, 3000));
// Now execute
```

#### B.3: Remove the `mainnet` feature from `Cargo.toml`

```toml
# programs/tributary/Cargo.toml — REMOVE this line:
# mainnet = []
```

Also remove the `#![allow(unexpected_cfgs)]` suppression in `lib.rs` if no other cfg features need it:

```rust
// programs/tributary/src/lib.rs — can remove if no other cfg features remain
// Stops Rust Analyzer complaining about missing configs
// #![allow(unexpected_cfgs)]
```

---

### Option Comparison

| Criterion              | Option A (Runtime flag)               | Option B (Always validate)       |
| ---------------------- | ------------------------------------- | -------------------------------- |
| Complexity             | Higher (new field, admin instruction) | Lower (delete code, fix tests)   |
| Backward compatibility | Existing accounts must be migrated    | No account changes               |
| Test convenience       | Admin can toggle off on devnet        | Tests must use future timestamps |
| Security guarantee     | Still depends on admin setting it     | Enforced unconditionally         |
| Recommended for        | Programs with staged rollouts         | Programs in active development   |

**Recommendation:** Option B for this stage of the project. The program is pre-mainnet. Fix the tests now, delete the cfg gate, and never worry about build-configuration-dependent security again. If a toggle becomes necessary later, add it as a separate enhancement with a proper design.

---

## Recommendation

1. **Immediate**: Remove `#[cfg(feature = "mainnet")]` from `validate_milestone_policy`. Always validate timestamps.
2. **Remove** the `mainnet` Cargo feature entirely — it should never be the gate for security invariants.
3. **Update tests** to use future timestamps computed from `Clock::get()`.
4. **Add a regression test** that explicitly verifies past timestamps are rejected:

```typescript
it("rejects milestone policy with past timestamps", async () => {
  const pastTimestamp = new BN(Math.floor(Date.now() / 1000) - 86400);
  try {
    await program.methods
      .createPaymentPolicy(
        {
          milestone: {
            milestoneAmounts: [
              new BN(1000),
              new BN(1000),
              new BN(0),
              new BN(0),
            ],
            milestoneTimestamps: [
              pastTimestamp,
              pastTimestamp,
              new BN(0),
              new BN(0),
            ],
            currentMilestone: 0,
            releaseCondition: 0b0001,
            totalMilestones: 2,
            escrowAmount: new BN(2000),
            padding: Array(53).fill(0),
          },
        },
        memo
      )
      .accounts({
        /* ... */
      })
      .rpc();
    assert.fail("Should have rejected past timestamp");
  } catch (err) {
    assert.include(err.toString(), "InvalidInterval");
  }
});
```

5. **Audit other cfg gates**: Search the entire codebase for `#[cfg(feature` to ensure no other security checks are conditionally compiled:

```bash
grep -rn '#\[cfg(feature' programs/tributary/src/
```

---

## Testing Instructions

### 1. Verify the cfg gate exists in current code

```bash
grep -n "cfg(feature" programs/tributary/src/policies/milestone.rs
# Expected output:
# 41:    #[cfg(feature = "mainnet")]
```

### 2. Test that default build accepts past timestamps (demonstrates the bug)

```bash
anchor build
anchor test -- --features ""
```

Create a milestone policy with `milestone_timestamps` set to `[1, 1, 0, 0]` (epoch 1 = Jan 1, 1970). The transaction should **fail** after the fix but **succeeds** before it.

### 3. Test that mainnet build rejects past timestamps

```bash
anchor build -- --features mainnet
anchor test
```

Same test with epoch-1 timestamps should now fail with `InvalidInterval`.

### 4. After applying Option B patch

```bash
anchor build
anchor test
```

- Past timestamps are rejected regardless of features.
- Future timestamps are accepted.
- Full milestone payment flow (create → wait → execute) works.

### 5. Regression test

Add the test case from the Recommendation section (#4) to `tests/tributary.test.ts` and verify it passes:

```bash
anchor test
# Should see: "rejects milestone policy with past timestamps" PASS
```

---

## References

1. **Rust Reference — Conditional Compilation**: `#[cfg(...)]` removes code at compile time. The binary is different depending on features.
   https://doc.rust-lang.org/reference/conditional-compilation.html

2. **Solana Security Best Practices — "No conditional security checks"**: Security invariants must not depend on deployment configuration.
   https://solana.com/docs/programs/security

3. **Anchor `Clock::get()`**: Returns the slot's clock, which reflects the current unix timestamp on-chain.
   https://www.anchor-lang.com/docs/the-accounts-struct#clock

4. **Similar finding**: OpenZeppelin's `require(condition)` vs. `if (condition) revert` pattern — security checks must be unconditional regardless of build target.
   https://forum.openzeppelin.com/t/security-no-conditional-reverts/

5. **Sealevel Attacks (A16Z)** — Attack pattern: "feature-gated validation" where test builds skip checks that production builds enforce.
   https://github.com/a16z/sealevel-attacks
