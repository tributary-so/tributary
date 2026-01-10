---
version: 3.0
lastUpdated: 2025-01-06
status: DRAFT - Ready for Implementation Review
---

# Tributary Referral Program Specification

## Overview

Enable viral user acquisition through a simplified referral system where rewards are funded entirely from gateway fees with fixed percentage splits across referral tiers.

## User Story

> "As a user, I want to earn rewards for inviting others to Tributary-enabled businesses, so I can benefit from referral earnings while growing the protocol."

## Table of Contents

1. [Introduction](#introduction)
2. [Core Mechanics](#core-mechanics)
3. [Smart Contract Changes](#smart-contract-changes)
4. [SDK Changes](#sdk-changes)
5. [Frontend Implementation](#frontend-implementation)
6. [Integration Architecture](#integration-architecture)
7. [Testing Strategy](#testing-strategy)
8. [Phased Implementation Plan](#phased-implementation-plan)

---

## Introduction

This specification describes a Viral Referral System for Tributary with a simplified, gateway-funded reward model. This uses fixed percentage splits that ensure perfect accounting and predictability.

### Key Objectives

1. **Perfect Accounting**: Every dollar is accounted for - no money creation or loss
2. **Gateway-Funded**: All referral rewards come from gateway fees (2.5% of payment)
3. **Configurable Budget**: Gateway operators control referral program size (0-100% of gateway fee)
4. **Feature-Gated**: Referral program only active when feature flag is enabled
5. **Simple Math**: Fixed 60/30/10% split across referral tiers - no complex calculations
6. **Predictable Rewards**: Referrers know exactly what they'll earn
7. **Web3 Transparency**: On-chain accounting with complete auditability

---

## Core Mechanics

### Gateway-Specific Referral System

**Key Design**: Each gateway operates as an **independent referral ecosystem** with its own isolated codes and referral accounts.

#### Referral Code Generation

- **Format**: 6-character alphanumeric string `[A-Z0-9]`
- **Case-sensitive**: Code validation is case-sensitive
- **Example**: `TRIB84` (gateway-specific, not global)
- **Generation**: Generated on-chain via new PDA account when user creates first subscription
- **Uniqueness**: Unique per user **per gateway** (derived from user pubkey + gateway pubkey)

#### Gateway-Specific PDA Derivation

```rust
// PDA seeds: ["referral", gateway_pubkey, user_pubkey]
// NOT: ["referral", user_pubkey] (global)

pub fn get_referral_pda(
    owner: &Pubkey,
    gateway: &Pubkey,
    program_id: &Pubkey
) -> (Pubkey, u8) {
    let seeds = [
        "referral".as_bytes(),
        gateway.as_ref(),    // Gateway-scoped - NOT global
        owner.as_ref(),     // User-scoped
        program_id.as_ref(),
    ];
    Pubkey::find_program_address(seeds, program_id)
}
```

#### Isolation Benefits

| Feature             | Global System                            | Gateway-Specific System                                    |
| ------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| **Referral Codes**  | One code per user, works everywhere      | Different codes per gateway, isolated ecosystems           |
| **Competition**     | Gateway A vs Gateway B compete for users | Gateway A has captive market, Gateway B has captive market |
| **Business Model**  | Shared pool, diluted rewards             | Dedicated pool, controlled economics                       |
| **Risk Management** | Protocol bears all risk                  | Gateway bears own referral program risk                    |
| **Customization**   | Same settings for everyone               | Custom referral rates per gateway                          |

### Simplified Referral Fee Structure

#### Fee Distribution Formula

```typescript
// Standard fee structure for $100 payment
const PAYMENT_AMOUNT = 100_000_000; // $100 in smallest units
const PROTOCOL_FEE_BPS = 100; // 1% protocol fee
const GATEWAY_FEE_BPS = 250; // 2.5% gateway fee

// Gateway specifies referral allocation (percentage of gateway fee)
const GATEWAY_REFERRAL_ALLOCATION_BPS = 1250; // 50% of gateway fee (1250/2500 = 50%)
const REFERRAL_FEATURE_ENABLED = true; // Bit 0 set in feature_flags

// Fee calculation (only if referral feature is enabled)
const protocolFee = (PAYMENT_AMOUNT * PROTOCOL_FEE_BPS) / 10000; // $1.00
const gatewayFee = (PAYMENT_AMOUNT * GATEWAY_FEE_BPS) / 10000; // $2.50
const referralPool = REFERRAL_FEATURE_ENABLED
  ? (gatewayFee * GATEWAY_REFERRAL_ALLOCATION_BPS) / 10000
  : 0; // $1.25 or $0
const gatewayBusinessFee = gatewayFee - referralPool; // $1.25 or $2.50

// Referral pool distribution (simple tier split) - only if enabled
const LEVEL_1_SHARE = 60; // 60% of referral pool
const LEVEL_2_SHARE = 30; // 30% of referral pool
const LEVEL_3_SHARE = 10; // 10% of referral pool

const level1Reward = REFERRAL_FEATURE_ENABLED
  ? (referralPool * LEVEL_1_SHARE) / 100
  : 0; // $0.75 or $0
const level2Reward = REFERRAL_FEATURE_ENABLED
  ? (referralPool * LEVEL_2_SHARE) / 100
  : 0; // $0.375 or $0
const level3Reward = REFERRAL_FEATURE_ENABLED
  ? (referralPool * LEVEL_3_SHARE) / 100
  : 0; // $0.125 or $0

// Accounting check: referralPool = level1Reward + level2Reward + level3Reward
// $1.25 = $0.75 + $0.375 + $0.125 ✅ (when enabled)
// $0 = $0 + $0 + $0 ✅ (when disabled)
```

#### Complete Fee Flow

| Component                | Amount       | Source        | Recipient                | Condition            |
| ------------------------ | ------------ | ------------- | ------------------------ | -------------------- |
| Payment Amount           | $100.00      | User          | -                        | Always               |
| Protocol Fee             | $1.00 (1%)   | User          | Protocol Treasury        | Always               |
| Gateway Fee              | $2.50 (2.5%) | User          | Gateway                  | Always               |
| ├── Referral Pool        | $1.25 (50%)  | Gateway Fee   | Referral Program         | Feature flag enabled |
| │ ├── Level 1 Reward     | $0.75 (60%)  | Referral Pool | Direct Referrer          | Feature flag enabled |
| │ ├── Level 2 Reward     | $0.375 (30%) | Referral Pool | Indirect Referrer        | Feature flag enabled |
| │ └── Level 3 Reward     | $0.125 (10%) | Referral Pool | Second Indirect Referrer | Feature flag enabled |
| └── Gateway Business Fee | $1.25 (50%)  | Gateway Fee   | Gateway Operator         | Referral enabled     |
| Gateway Business Fee     | $2.50 (100%) | Gateway Fee   | Gateway Operator         | Referral disabled    |
| Recipient Amount         | $96.50       | User          | Recipient                | Always               |

**Key Design Decisions:**

- **100% Accounting**: Every dollar is accounted for - no money created or lost
- **Simple Math**: Fixed percentage splits eliminate complex calculations
- **Gateway Control**: Operators choose referral program budget (0-100% of gateway fee)
- **Feature-Gated**: Referral program only active when feature flag bit 0 is set
- **Fair Distribution**: Level 1 gets majority share, diminishing for indirect levels

### Multi-Level Referral Chain

#### Simple Tier-Based Distribution

- **Level 1**: Direct referrer gets 60% of referral pool
- **Level 2**: Indirect referrer gets 30% of referral pool
- **Level 3**: Second indirect referrer gets 10% of referral pool
- **Maximum Depth**: 3 levels to prevent abuse

#### Reward Flow Through Tree

```
$100 Payment → Gateway Fee: $2.50 → Referral Allocation (50%): $1.25
├── Level 1: $0.75 (60%) → Direct Referrer A
├── Level 2: $0.375 (30%) → Indirect Referrer B
└── Level 3: $0.125 (10%) → Second Indirect Referrer C
```

**Example with Referral Chain A → B → C:**

- User C makes $100 payment
- Referral chain: A (direct) → B (indirect) → C (payer)
- Referral pool: $1.25 (50% of $2.50 gateway fee)
- A earns $0.75 (Level 1)
- B earns $0.375 (Level 2)
- Protocol treasury: $1.00
- Gateway business fee: $1.25
- Recipient receives: $96.50

#### Optional Referral Chain (Drift-Style)

Referral accounts are **completely optional** and parsed from `remaining_accounts`. If no referrer accounts are provided in the transaction, no referral rewards are distributed. This follows the Drift protocol pattern:

```rust
// Referrers are parsed dynamically from remaining_accounts
// - If 0 referrer accounts: no rewards paid
// - If 1 referrer account: only level 1 gets paid
// - If 2 referrer accounts: levels 1 & 2 get paid
// - If 3 referrer accounts: levels 1, 2 & 3 get paid

let referral_chain = parse_referral_chain(&ctx.remaining_accounts)?;
match referral_chain.len() {
    0 => {} // No rewards
    1 => { /* Pay level 1 referrer */ }
    2 => { /* Pay levels 1 & 2 referrers */ }
    3.. => { /* Pay levels 1, 2 & 3 referrers */ }
}
```

**Benefits:**

- **Truly optional**: Transactions work with or without referrers
- **Dynamic parsing**: No instruction signature changes needed
- **Clean separation**: Referral logic doesn't clutter main instruction
- **Backwards compatible**: Existing transactions continue working

### Security: Circular Reference Protection

#### Threat: Circular Referral Chains

Without proper validation, a malicious user could create circular referral chains that break reward accounting and cause infinite loops in chain traversal.

**Attack Scenario:**

```
1. User A has referrer: None
2. User B has referrer: A
3. User C has referrer: B
4. User A updates referrer: C (CIRCULAR!)
   Chain becomes: A → B → C → A → B → C → ... (infinite)
```

#### Solution: Chain Integrity Validation

Add validation in `CreateReferralAccount` instruction:

```rust
/// Validate that setting a referrer won't create a circular chain
pub fn validate_referral_chain(
    new_referrer: Pubkey,
    current_owner: Pubkey,
    max_depth: u8
) -> Result<()> {
    let mut current = new_referrer;

    for _ in 0..max_depth {
        if current == current_owner {
            return Err(TributaryError::CircularReferralChain.into());
        }

        // Load referral account and get its referrer
        let referral_pda = get_referral_pda(&current, &gateway, &program_id)?;
        if let Ok(referral_account) = ctx.accounts.referral_info.load() {
            match referral_account.referrer {
                Some(ref) => current = ref,
                None => return Ok(()), // Chain ends safely
            }
        } else {
            return Ok(()); // Referral account doesn't exist yet
        }
    }

    Ok(())
}
```

#### Additional Protection: Maximum Chain Depth

The spec already limits depth to 3 levels, which provides natural protection against deep chains. However, the circular reference check ensures that even within 3 levels, no loops can form.

**Example Safe Chain** (max 3 levels):

```
A → B → C (valid, max depth reached)
```

**Example Invalid Chain** (would fail validation):

```
A → B → C → A (circular within 3 levels)
```

#### Error Code Addition

Add to `error.rs`:

```rust
#[error_code]
pub enum TributaryError {
    // ... existing errors ...
    #[msg("Circular referral chain detected")]
    CircularReferralChain,
}
```

#### Implementation in CreateReferralAccount

```rust
pub fn create_referral_account(
    ctx: Context<CreateReferralAccount>,
    referrer: Option<Pubkey>,
) -> Result<()> {
    let referral = &mut ctx.accounts.referral_account;

    // Validate no circular chain before setting referrer
    if let Some(ref) = referrer {
        validate_referral_chain(
            ref,
            ctx.accounts.owner.key(),
            3, // max depth
        )?;
    }

    // ... rest of creation logic
    referral.referrer = referrer;
    // ...
}
```

### Gateway Fee Integration

#### Fee Distribution Flow

```
Payment Amount: $100
Gateway Fee (2.5%): $2.50

├── Gateway keeps: $2.50 × (100 - referral_allocation_bps) / 100
├── Referral pool: $2.50 × referral_allocation_bps / 100
│   ├── Level 1 referrer: X% of referral pool
│   ├── Level 2 referrer: Y% of referral pool
│   └── Level 3 referrer: Z% of referral pool
```

### Referral Usage Flow

1. **User A creates subscription** → System generates referral code
2. **User A shares code** → User B enters code during signup
3. **User B creates subscription** → Referral chain established (A→B)
4. **User B refers User C** → Chain extends (A→B→C)
5. **Payments execute** → Rewards distributed up the referral tree

---

## Smart Contract Changes

### New Account: ReferralAccount

**Purpose:** Track referral codes and chain relationships for reward distribution.

**Location:** `programs/tributary/src/state/` → Create new file `referral_account.rs`

**Structure:**

```rust
#[account]
#[derive(InitSpace)]
pub struct ReferralAccount {
    /// Authority who owns this referral code
    pub owner: Pubkey,
    /// 6-character alphanumeric referral code
    pub referral_code: [u8; 6],
    /// Referrer who brought this user (for chain traversal)
    pub referrer: Option<Pubkey>,
    /// Unix timestamp when account was created
    pub created_at: i64,
    /// Total rewards earned by this referrer (in smallest token units)
    pub total_earned: u64,
    /// PDA bump seed
    pub bump: u8,
}

impl ReferralAccount {
    pub const SIZE: usize = 8 + // discriminator
        32 + // owner: Pubkey
        6 + // referral_code: [u8; 6]
        33 + // referrer: Option<Pubkey>
        8 + // created_at: i64
        8 + // total_earned: u64
        1 + // bump: u8
        200; // padding
}
```

### Modified Account: PaymentGateway

**Location:** `programs/tributary/src/state/` → Modify existing `payment_gateway.rs`

**Add referral configuration fields:**

```rust
#[account]
#[derive(InitSpace)]
pub struct PaymentGateway {
    // ... existing fields ...

    /// Gateway-scoped feature flags (bit-vector)
    /// Bit 0: Referral program enabled (1 = enabled, 0 = disabled)
    pub feature_flags: u8,

    /// Gateway-scoped referral program allocation
    /// 0 = no referral program, 2500 = 25% of gateway fee
    pub referral_allocation_bps: u16,

    /// Gateway-scoped referral tier distribution as [level1, level2, level3]
    /// Must sum to 10000 = 100%
    pub referral_tiers_bps: [u16; 3],  // Default: [6000, 3000, 1000] (60/30/10%)
}
```

**Add validation function:**

```rust
impl PaymentGateway {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority: Pubkey
        32 + // fee_recipient: Pubkey
        2 + // gateway_fee_bps: u16
        1 + // is_active: bool
        8 + // padding1: u64
        8 + // created_at: i64
        1 + // bump: u8
        32 + // name: [u8; 32]
        64 + // url: [u8; 64]
        32 + // signer: Pubkey
        1 + // feature_flags: u8 (NEW)
        2 + // referral_allocation_bps: u16 (NEW)
        6 + // referral_tiers_bps: [u16; 3] (NEW)
        119; // padding: [u8; 119] (reduced to accommodate referral fields)
}
}
```

### New Events

**Location:** `programs/tributary/src/state/events.rs`

```rust
#[event]
pub struct ReferralRewardDistributedRecord {
    pub payment_policy: Pubkey,
    pub gateway: Pubkey,
    pub payment_amount: u64,
    pub timestamp: i64,

    /// Referral chain (up to 3 levels)
    pub level1_referrer: Option<Pubkey>,
    pub level2_referrer: Option<Pubkey>,
    pub level3_referrer: Option<Pubkey>,

    /// Rewards distributed to each level
    pub level1_reward: u64,
    pub level2_reward: u64,
    pub level3_reward: u64,
}
```

### New Instruction: UpdateGatewayReferralSettings

**Location:** `programs/tributary/src/instructions/` → Create new file `update_gateway_referral_settings.rs`

**Purpose:** Allow gateway operators to configure referral program settings.

```rust
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateGatewayReferralSettingsArgs {
    pub feature_flags: Option<u8>,
    pub referral_allocation_bps: Option<u16>,
    pub referral_tiers_bps: Option<[u16; 3]>,
}

pub struct UpdateGatewayReferralSettings<'info> {
    #[account(
        mut,
        seeds = [b"gateway", authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key() @ TributaryError::Unauthorized
    )]
    pub gateway: Account<'info, PaymentGateway>,

    pub authority: Signer<'info>,
}

pub fn update_gateway_referral_settings(
    ctx: Context<UpdateGatewayReferralSettings>,
    args: UpdateGatewayReferralSettingsArgs,
) -> Result<()> {
    let gateway = &mut ctx.accounts.gateway;

    // Update feature flags if provided
    if let Some(flags) = args.feature_flags {
        gateway.feature_flags = flags;
    }

    // Update referral allocation if provided
    if let Some(allocation) = args.referral_allocation_bps {
        require!(allocation <= 2500, TributaryError::InvalidReferralAllocation); // Max 25%
        gateway.referral_allocation_bps = allocation;
    }

    // Update tier percentages if provided
    if let Some(tiers) = args.referral_tiers_bps {
        gateway.referral_tiers_bps = tiers;
    }

    // Validate that tier percentages sum to 100%
    gateway.validate_referral_tiers()?;

    Ok(())
}
```

### Modified Instruction: ExecutePayment

**Location:** `programs/tributary/src/instructions/execute_payment.rs`

**Use remaining_accounts for optional referrer parsing (Drift-style):**

```rust
pub struct ExecutePayment<'info> {
    // ... existing accounts ...
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ExecutePaymentArgs {
    // ... existing args ...
}

/// Parse optional referrer chain from remaining accounts
/// Returns up to 3 levels of referrers if present, or empty vec if none
pub fn parse_referral_chain<'a>(
    remaining_accounts: &'a [AccountInfo<'a>]
) -> Result<Vec<AccountLoader<'a, ReferralAccount>>> {
    let mut referrers = Vec::new();
    let mut account_iter = remaining_accounts.iter();

    // Try to parse up to 3 referrer accounts
    for _ in 0..3 {
        let account_info = match account_iter.next() {
            Some(account) => account,
            None => break, // No more accounts
        };

        // Check if this account is a ReferralAccount by discriminator
        let data = account_info.try_borrow_data()
            .map_err(|_| TributaryError::CouldNotDeserializeReferrer)?;

        if data.len() < ReferralAccount::SIZE {
            break; // Not a valid ReferralAccount
        }

        let discriminator: [u8; 8] = ReferralAccount::discriminator();
        let account_discriminator = array_ref![data, 0, 8];

        if account_discriminator != &discriminator {
            break; // Not a ReferralAccount
        }

        // Validate account is writable (for reward transfer)
        require!(
            account_info.is_writable,
            TributaryError::ReferrerMustBeWritable
        );

        // Load the account
        let referrer = AccountLoader::<ReferralAccount>::try_from(account_info)
            .map_err(|_| TributaryError::CouldNotDeserializeReferrer)?;

        referrers.push(referrer);

        // Stop at 3 levels max
        if referrers.len() >= 3 {
            break;
        }
    }

    Ok(referrers)
}

pub fn distribute_referral_rewards(
    ctx: &Context<ExecutePayment>,
    payment_amount: u64,
) -> Result<()> {
    let gateway = &ctx.accounts.gateway;

    // Skip if referral program is not enabled via feature flag
    if gateway.feature_flags & 0x01 == 0 {
        return Ok(());
    }

    // Skip if no referral allocation configured
    if gateway.referral_allocation_bps == 0 {
        return Ok(());
    }

    // Parse optional referrer chain from remaining accounts
    let referral_chain = parse_referral_chain(&ctx.remaining_accounts)?;

    // If no referrers provided, skip reward distribution
    if referral_chain.is_empty() {
        return Ok(());
    }

    // Calculate referral pool from gateway fee
    let gateway_fee = (payment_amount * gateway.gateway_fee_bps as u64) / 10000;
    let referral_pool = (gateway_fee * gateway.referral_allocation_bps as u64) / 10000;

    // Configurable tier distribution from gateway settings
    let level1_reward = (referral_pool * gateway.referral_tiers_bps[0] as u64) / 10000;
    let level2_reward = (referral_pool * gateway.referral_tiers_bps[1] as u64) / 10000;
    let level3_reward = (referral_pool * gateway.referral_tiers_bps[2] as u64) / 10000;

    let mut distributed_rewards = 0u64;
    let mut level_rewards = [0u64; 3];

    // Transfer to referrers based on chain length
    for (i, referrer_loader) in referral_chain.iter().enumerate() {
        let reward = match i {
            0 => level1_reward,
            1 => level2_reward,
            2 => level3_reward,
            _ => continue, // Shouldn't happen due to max 3 check
        };

        // Load the referrer account to get the owner pubkey
        let referrer_account = referrer_loader.load()?;
        let referrer_owner = referrer_account.owner;

        // Transfer reward to referrer (implement actual transfer logic)
        // transfer_to_referrer(referrer_owner, reward)?;

        level_rewards[i] = reward;
        distributed_rewards += reward;
    }

    // Verification: distributed_rewards should equal referral_pool
    assert_eq!(distributed_rewards, referral_pool, "Referral pool accounting error");

    // Emit event with actual referrer pubkeys
    let level1_referrer = referral_chain.get(0).map(|_| referral_chain[0].load().unwrap().owner);
    let level2_referrer = referral_chain.get(1).map(|_| referral_chain[1].load().unwrap().owner);
    let level3_referrer = referral_chain.get(2).map(|_| referral_chain[2].load().unwrap().owner);

    emit!(ReferralRewardDistributedRecord {
        payment_policy: ctx.accounts.payment_policy.key(),
        gateway: ctx.accounts.gateway.key(),
        payment_amount,
        timestamp: Clock::get()?.unix_timestamp,
        level1_referrer,
        level2_referrer,
        level3_referrer,
        level1_reward: level_rewards[0],
        level2_reward: level_rewards[1],
        level3_reward: level_rewards[2],
    });

    Ok(())
}
```

---

## SDK Changes

### New File: `sdk/src/referral.ts`

**Purpose:** Linear reward calculation utilities and referral chain management.

```typescript
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

/**
 * Referral account for chain tracking
 */
export interface ReferralAccount {
  owner: PublicKey;
  referralCode: Uint8Array; // [u8; 6] in Rust, Uint8Array in TypeScript
  referrer: PublicKey | null;
  createdAt: number;
  totalEarned: BN;
  bump: number; // PDA bump seed - required for client-side PDA verification
}

/**
 * Calculate referral pool from gateway fee
 */
export function calculateReferralPool(
  paymentAmount: BN,
  gatewayReferralAllocationBps: number
): BN {
  // Gateway fee: 2.5% of payment (250 bps)
  const gatewayFee = paymentAmount.mul(new BN(250)).div(new BN(10000));

  // Referral pool: allocation percentage of gateway fee
  // gatewayReferralAllocationBps is percentage (0-100) of gateway fee
  return gatewayFee.mul(new BN(gatewayReferralAllocationBps)).div(new BN(100));
}

/**
 * Calculate simple tier-based reward distribution
 */
export function calculateReferralRewards(
  paymentAmount: BN,
  gatewayReferralAllocationBps: number
): {
  referralPool: BN;
  level1Reward: BN;
  level2Reward: BN;
  level3Reward: BN;
} {
  const referralPool = calculateReferralPool(
    paymentAmount,
    gatewayReferralAllocationBps
  );

  // Simple fixed percentage distribution
  const level1Reward = referralPool.mul(new BN(60)).div(new BN(100)); // 60%
  const level2Reward = referralPool.mul(new BN(30)).div(new BN(100)); // 30%
  const level3Reward = referralPool.mul(new BN(10)).div(new BN(100)); // 10%

  return {
    referralPool,
    level1Reward,
    level2Reward,
    level3Reward,
  };
}

// Level 1 gets full calculated reward
const level1Reward = calculateLinearReferrerReward(
  level1Referrals,
  paymentAmount,
  gatewayReferralAllocationBps
);

// Level 2 gets 50% of level 1 reward
const level2Reward = level1Reward.div(new BN(2));

// Level 3 gets 25% of level 1 reward
const level3Reward = level1Reward.div(new BN(4));
```

### Modifications to `sdk/src/sdk.ts`

**Add referral calculation methods to Tributary class:**

```typescript
// Add to Tributary class
export class Tributary {
  // ... existing fields ...

/**
 * Calculate tier-based reward distribution using gateway settings
 */
export function calculateReferralRewards(
  paymentAmount: BN,
  gateway: PaymentGateway
): {
  referralPool: BN;
  level1Reward: BN;
  level2Reward: BN;
  level3Reward: BN;
} {
  const referralPool = calculateReferralPool(paymentAmount, gateway.referralAllocationBps);

  // Use configurable tier percentages from gateway
  const level1Reward = referralPool.mul(new BN(gateway.referralTiersBps[0])).div(new BN(10000));
  const level2Reward = referralPool.mul(new BN(gateway.referralTiersBps[1])).div(new BN(10000));
  const level3Reward = referralPool.mul(new BN(gateway.referralTiersBps[2])).div(new BN(10000));

  return {
    referralPool,
    level1Reward,
    level2Reward,
    level3Reward,
  };
}

  /**
   * Execute payment with optional referral rewards
   * Referral accounts are automatically added to remaining_accounts if provided
   */
  async executePaymentWithReferrals(
    paymentPolicy: PublicKey,
    amount: BN,
    referrerAccounts?: PublicKey[] // Optional: up to 3 referrer pubkeys
  ): Promise<TransactionInstruction> {
    // Build instruction normally
    const ix = await this.executePayment(paymentPolicy, amount);

    // If referrers provided, add their accounts to remaining_accounts
    // The on-chain program will parse them automatically
    if (referrerAccounts && referrerAccounts.length > 0) {
      // Add up to 3 referrer account pubkeys to remaining accounts
      // (implementation details for adding to transaction)
    }

    return ix;
  }

  /**
   * Update gateway referral settings
   */
  async updateGatewayReferralSettings(
    gatewayAddress: PublicKey,
    settings: {
      featureFlags?: number;
      referralAllocationBps?: number;
      referralTiersBps?: [number, number, number];
    }
  ): Promise<TransactionInstruction> {
    return await this.program.methods
      .updateGatewayReferralSettings(settings)
      .accounts({
        gateway: gatewayAddress,
        authority: this.provider.publicKey,
      })
      .instruction();
  }
}
```

---

## Frontend Implementation

### Component: ReferralDashboard (`app/src/components/referral/referral-dashboard.tsx`)

**Progressive display showing linear reward scaling:**

```tsx
import React, { useState, useEffect } from "react";
import { Card } from "@heroui/react";
import { TrendingUp, Users, Gift, Target } from "lucide-react";
import { useSDK } from "@/lib/client";
import { toast } from "sonner";

export default function ReferralDashboard() {
  const sdk = useSDK();
  const [gatewaySettings, setGatewaySettings] = useState<any>(null);

  return (
    <div className="space-y-6">
      {/* Gateway Referral Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Gateway Referral Configuration
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Referral Allocation</label>
              <p className="text-2xl font-bold">
                {gatewaySettings?.referralAllocationBps
                  ? `${gatewaySettings.referralAllocationBps / 100}%`
                  : "Not configured"}
              </p>
              <p className="text-xs text-gray-600">of gateway fee (2.5%)</p>
            </div>
            <div>
              <label className="text-sm font-medium">
                Referral Pool per $100
              </label>
              <p className="text-2xl font-bold text-green-600">
                $
                {gatewaySettings?.referralAllocationBps
                  ? (
                      (100 * 250 * gatewaySettings.referralAllocationBps) /
                      (10000 * 100)
                    ).toFixed(2)
                  : "0.00"}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Tier Distribution
            </label>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded">
                <div className="font-semibold text-green-600">
                  {gatewaySettings?.referralTiersBps
                    ? `${gatewaySettings.referralTiersBps[0] / 100}%`
                    : "60%"}
                </div>
                <div className="text-xs text-gray-600">Level 1</div>
              </div>
              <div className="p-3 bg-blue-50 rounded">
                <div className="font-semibold text-blue-600">
                  {gatewaySettings?.referralTiersBps
                    ? `${gatewaySettings.referralTiersBps[1] / 100}%`
                    : "30%"}
                </div>
                <div className="text-xs text-gray-600">Level 2</div>
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <div className="font-semibold text-purple-600">
                  {gatewaySettings?.referralTiersBps
                    ? `${gatewaySettings.referralTiersBps[2] / 100}%`
                    : "10%"}
                </div>
                <div className="text-xs text-gray-600">Level 3</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Reward Distribution Calculator */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Reward Distribution</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Direct Referrer (Level 1)</span>
            <span className="font-bold text-green-600">60%</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Indirect Referrer (Level 2)</span>
            <span className="font-bold text-blue-600">30%</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Second Indirect (Level 3)</span>
            <span className="font-bold text-purple-600">10%</span>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm">
            Example with 50% referral allocation and default 60/30/10% tier
            split:
          </p>
          <ul className="text-sm mt-2 space-y-1">
            <li>
              • Referral pool: <strong>$1.25</strong> (50% of $2.50 gateway fee)
            </li>
            <li>
              • Level 1 referrer earns: <strong>$0.75</strong> (60% of pool)
            </li>
            <li>
              • Level 2 referrer earns: <strong>$0.38</strong> (30% of pool)
            </li>
            <li>
              • Level 3 referrer earns: <strong>$0.13</strong> (10% of pool)
            </li>
            <li>
              • Gateway keeps: <strong>$1.25</strong> business fee
            </li>
            <li>
              • Protocol gets: <strong>$1.00</strong>
            </li>
          </ul>
          <p className="text-xs text-gray-600 mt-2">
            Gateway operators can customize these percentages to fit their
            business model.
          </p>
        </div>
      </Card>

      {/* Fee Flow Visualization */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Complete Fee Flow</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-center mb-4">
            <div className="text-2xl font-bold">$100</div>
            <div className="text-sm text-gray-600">User Payment</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold">$1.00</div>
              <div className="text-sm text-gray-600">Protocol Fee (1%)</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">$2.50</div>
              <div className="text-sm text-gray-600">Gateway Fee (2.5%)</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="font-semibold">$1.25</div>
              <div className="text-xs text-gray-600">Referral Pool (50%)</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="font-semibold">$1.25</div>
              <div className="text-xs text-gray-600">
                Gateway Business Fee (50%)
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

---

## Integration Architecture

### Data Flow

```
User C makes $100 payment
├── Has referral chain: A → B → C
├── Include referrer accounts in transaction remaining_accounts
├── Recipient receives: $96.50
├── Protocol fee: $1.00 (1%)
└── Gateway fee: $2.50 (2.5%)
    ├── Referral allocation: 50% = $1.25 pool
    ├── Level 1 (A): $0.75 (60% of pool)
    ├── Level 2 (B): $0.375 (30% of pool)
    ├── Level 3: $0.125 (10% of pool) - no level 3 referrer in this case
    ├── Gateway business fee: $1.25 (remaining 50% of gateway fee)

OR (if no referrers provided):

User C makes $100 payment
├── No referrer accounts in remaining_accounts
├── Gateway fee: $2.50 (2.5%) - all goes to gateway business fee
├── Protocol fee: $1.00 (1%)
└── Recipient receives: $96.50 (no referral rewards paid)

OR (if referral feature flag disabled):

User C makes $100 payment
├── Referral feature disabled (feature_flags bit 0 = 0)
├── Gateway fee: $2.50 (2.5%) - all goes to gateway business fee
├── Protocol fee: $1.00 (1%)
└── Recipient receives: $96.50 (no referral rewards paid regardless of referrers)
```

---

## Testing Strategy

### Unit Tests

**File:** `tests/referral-linear.test.ts`

```typescript
describe("Simplified Referral System", () => {
  describe("Fee Distribution", () => {
    it("should calculate referral pool correctly", () => {
      // $100 payment, 50% referral allocation of 2.5% gateway fee
      const pool = calculateReferralPool(new BN(100_000_000), 5000); // 50% = 5000 bps
      expect(pool.toString()).toBe("1_250_000"); // $1.25 in smallest units
    });

    it("should distribute rewards with configurable percentages", () => {
      const mockGateway = {
        referralAllocationBps: 5000,
        referralTiersBps: [6000, 3000, 1000], // 60/30/10%
      };
      const rewards = calculateReferralRewards(
        new BN(100_000_000),
        mockGateway
      );

      expect(rewards.referralPool.toString()).toBe("1_250_000"); // $1.25
      expect(rewards.level1Reward.toString()).toBe("750_000"); // $0.75 (60%)
      expect(rewards.level2Reward.toString()).toBe("375_000"); // $0.375 (30%)
      expect(rewards.level3Reward.toString()).toBe("125_000"); // $0.125 (10%)
    });

    it("should maintain perfect accounting", () => {
      const mockGateway = {
        referralAllocationBps: 5000,
        referralTiersBps: [6000, 3000, 1000],
      };
      const rewards = calculateReferralRewards(
        new BN(100_000_000),
        mockGateway
      );

      const total = rewards.level1Reward
        .add(rewards.level2Reward)
        .add(rewards.level3Reward);

      expect(total.toString()).toBe(rewards.referralPool.toString());
    });
  });

  describe("Gateway Fee Integration", () => {
    it("should derive referral pool from gateway fee only", () => {
      // $100 → $2.50 gateway fee → 50% = $1.25 referral pool
      const mockGateway = {
        referralAllocationBps: 5000,
        referralTiersBps: [6000, 3000, 1000],
      };
      const rewards = calculateReferralRewards(
        new BN(100_000_000),
        mockGateway
      );

      // Protocol fee (1%) = $1.00 - separate from referral system
      // Gateway business fee = $2.50 - $1.25 = $1.25
      // Total accounting: $100 = $1 + $1.25 + $1.25 + $96.50 ✅
      expect(rewards.referralPool.toString()).toBe("1_250_000");
    });

    it("should handle optional referrers gracefully", () => {
      // Test that transactions work with 0, 1, 2, or 3 referrer accounts
      // On-chain program parses remaining_accounts dynamically
      // If no referrers provided, no rewards are distributed
    });
  });
});
```

### Integration Tests

```bash
# Test complete referral flow
1. Create gateway with referral allocation
2. User A generates referral code
3. User B signs up with referral code
4. User C signs up with User B's code (creating chain)
5. Execute payments and verify reward distribution
6. Verify linear scaling works correctly
7. Verify perfect accounting (all referral pool distributed)
8. Test with different gateway allocation percentages
```

---

## Phased Implementation Plan

### Phase 1: Smart Contract Foundation (Week 1-2)

**Tasks:**

- [ ] Modify PaymentGateway to include feature_flags, referral_allocation_bps, and referral_tiers_bps array
- [ ] Implement remaining_accounts parsing for optional referrers (Drift-style)
- [ ] Add dynamic referral chain distribution using configurable tier percentages and feature flag checks
- [ ] Create UpdateGatewayReferralSettings instruction
- [ ] Create ReferralRewardDistributedRecord event
- [ ] Write comprehensive unit tests for perfect accounting and tier validation

### Phase 2: SDK Development (Week 3)

**Tasks:**

- [ ] Implement referral pool calculation utilities with configurable tiers and feature flag support
- [ ] Add referral chain traversal functions
- [ ] Update Tributary class with referral methods and gateway settings management
- [ ] Add UpdateGatewayReferralSettings method to SDK
- [ ] Write SDK tests and documentation

### Phase 3: Frontend Implementation (Week 4)

**Tasks:**

- [ ] Update ReferralDashboard with simplified fee flow visualization
- [ ] Add referral pool calculator component
- [ ] Implement referral chain visualization
- [ ] Update mobile responsive design
- [ ] Add error handling and loading states

### Phase 4: Testing & Deployment (Week 5)

**Documentation:**

- [ ] Add documentation to mkdocs in docs/
- [ ] Ensure the SDK methods that have been added to the SDK contain proper documentation of their signatures
- [ ] Ensure the new Rust code that has been added to the SDK contain proper documentation of their signatures

**Testing:**

- [ ] End-to-end integration testing
- [ ] Load testing with complex referral chains
- [ ] Security audit of reward calculations
- [ ] Performance testing of chain traversal
- [ ] Devnet deployment and verification
