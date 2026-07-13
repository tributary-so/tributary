---
# tributary-7e7w
title: 'M-04: Referral Chain Traversal — Potential DoS via Compute Budget Exhaustion'
status: scrapped
type: task
priority: normal
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T06:23:38Z
parent: tributary-4kt4
---

# M-04: Referral Chain Traversal — Potential DoS via Compute Budget Exhaustion

| Field          | Value                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------- |
| **Severity**   | Medium                                                                                   |
| **Status**     | Open                                                                                     |
| **File**       | `programs/tributary/src/utils.rs:248-428` (referral reward processing)                   |
| **File**       | `programs/tributary/src/instructions/execute_payment.rs:117-364` (payment execution)     |
| **File**       | `programs/tributary/src/instructions/create_referral_account.rs:36-111` (chain creation) |
| **Program ID** | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6X1Sg42tJ`                                             |
| **Framework**  | Anchor 0.31.1                                                                            |

---

## Description

The Tributary referral system supports up to 3-level referral chains (enforced in `create_referral_account.rs:87`). Each payment execution through `execute_payment` performs a series of `transfer_checked` CPIs to the SPL Token program. When the referral feature is enabled on a gateway (`feature_flags & FEATURE_REFERRAL != 0`), the `process_referral_rewards` function in `utils.rs:248` performs **up to 3 additional CPI calls** — one per referral tier level.

Combined with the base payment transfers, a single `execute_payment` invocation performs the following CPIs:

| Transfer                | CPI Call           | Location                 |
| ----------------------- | ------------------ | ------------------------ |
| Referral level 1 reward | `transfer_checked` | `utils.rs:418`           |
| Referral level 2 reward | `transfer_checked` | `utils.rs:418`           |
| Referral level 3 reward | `transfer_checked` | `utils.rs:418`           |
| Recipient payment       | `transfer_checked` | `execute_payment.rs:298` |
| Gateway fee             | `transfer_checked` | `execute_payment.rs:310` |
| Protocol fee            | `transfer_checked` | `execute_payment.rs:322` |
| **Total**               | **6 CPIs**         |                          |

Beyond the CPIs themselves, the function also performs:

- **Account deserialization**: Up to 3 `ReferralAccount` loads via `AccountLoader` in `parse_remaining_accounts` (`utils.rs:336-385`)
- **Mutable account writes**: Up to 3 `load_mut()` calls to update `total_earned` (`utils.rs:420-424`)
- **Event emission**: `ReferralRewardDistributedRecord` with 3 `Option<ReferralReward>` structs (`utils.rs:299-318`)
- **Linear search**: For each referral tier, a linear scan over `token_accounts` Vec to match owner pubkey (`utils.rs:401-404`)

Additionally, the `parse_remaining_accounts` function iterates all `remaining_accounts` and performs `AccountLoader::<ReferralAccount>::try_from` for each account matching `ReferralAccount::SIZE` (136 bytes), plus `Account::<LegacyTokenAccount>::try_from` for accounts with `data_len() >= 165`. This is O(n) deserialization overhead.

The Solana compute budget default is **1,200,000 CU** (as of Solana 1.18.x). Each `transfer_checked` CPI consumes approximately **250-350 CU** in invocation overhead alone, plus the token program's internal execution (~1,500-2,500 CU per transfer with account loading and signature verification via PDA seeds).

---

## Attack Scenario

A gateway operator enables the referral feature (`feature_flags |= 0x01`) and sets up a 3-level referral chain:

```
Referrer C (Level 3, no referrer)
   └── Referrer B (Level 2, referred by C)
         └── Referrer A (Level 1, referred by B)
               └── User (makes payment)
```

When `execute_payment` is called for this user's policy:

1. The handler deserializes 10+ accounts (payment_policy, user_payment, gateway, config, token accounts, mint, etc.)
2. `process_referral_rewards` is invoked with 6 remaining accounts (3 `ReferralAccount` + 3 token ATAs)
3. `parse_remaining_accounts` iterates and deserializes all 6 accounts
4. Three separate `transfer_referral_reward` calls each perform:
   - `loader.load()` to read owner pubkey
   - Linear scan of token_accounts Vec
   - `token_interface::transfer_checked` CPI (PDA-signed)
   - `loader.load_mut()` to update `total_earned`
5. Back in `execute_payment`, three more `transfer_checked` CPIs for recipient, gateway fee, protocol fee

**Worst-case compute unit estimate:**

| Operation                                          | Estimated CU            |
| -------------------------------------------------- | ----------------------- |
| Anchor account deserialization (10+ accounts)      | ~40,000-60,000          |
| Policy strategy execution + fee calculations       | ~10,000-15,000          |
| `parse_remaining_accounts` (6 accounts)            | ~15,000-25,000          |
| 3x referral reward CPI + load_mut                  | ~15,000-20,000          |
| 3x referral `transfer_checked` CPI                 | ~15,000-18,000          |
| 3x base `transfer_checked` CPI                     | ~15,000-18,000          |
| Event emission (`ReferralRewardDistributedRecord`) | ~3,000-5,000            |
| State updates (payment_policy, user_payment)       | ~5,000-8,000            |
| Anchor overhead (serialization, constraints)       | ~20,000-30,000          |
| **Estimated total**                                | **~138,000-199,000 CU** |

While this alone fits within the 1.2M CU default, the risk compounds with:

1. **Catch-up payments**: The `calculate_next_payment_due` function in `utils.rs:76-88` uses a bounded loop (`MAX_MONTHLY_ITERATIONS = 1200`) for monthly/quarterly/semi-annual/annual frequencies. If a payment is months overdue, this loop iterates multiple times, each involving `add_months` with date arithmetic. A user who hasn't paid in 100 months triggers 100 iterations of month calculation.

2. **Pay-as-you-go validation**: `PayAsYouGoStrategy::validate_payment_constraints` and `update_period_total` add additional compute overhead (`execute_payment.rs:196-207`).

3. **Net amount mode**: When `is_amount_net()` is true, additional arithmetic is performed but this is negligible.

**The critical scenario is a long-overdue monthly payment with full referral chain on a gateway with high `gateway_fee_bps`:**

| Factor                                  | CU Impact               |
| --------------------------------------- | ----------------------- |
| 100-month catch-up (`skip_months` loop) | ~50,000-100,000         |
| Full 3-level referral (6 CPIs)          | ~30,000-38,000          |
| Base payment (3 CPIs)                   | ~15,000-18,000          |
| Account overhead                        | ~60,000-90,000          |
| **Worst-case total**                    | **~155,000-246,000 CU** |

This is still within 1.2M, but leaves **no headroom for future features**. Any additional feature flag or account validation added to `execute_payment` could push complex executions over the limit. The Solana runtime also charges per-account-rent and per-signature costs that aren't captured in these estimates.

**Real risk vector**: If a future PR adds even one more CPI (e.g., an event-logging CPI, a metadata update, or a notification CPI), payments with full referral chains will hit the compute cap. This is a **latent DoS vector** that constrains the program's extensibility.

---

## Impact

- **Payment execution failures**: Payments that previously succeeded could begin failing if the program adds features that increase compute usage in the `execute_payment` path.
- **User fund lockout**: Users with active subscription policies under referral-enabled gateways cannot execute payments. Since `execute_payment` is permissionless (anyone can call it), gateway operators lose the ability to collect revenue on behalf of merchants.
- **Gateway operator revenue loss**: Failed executions mean no fee collection, no referral distribution, and potential SLA violations for subscription services relying on Tributary.
- **Forced migration**: Fixing this retroactively requires reducing referral tiers or restructuring the CPI pattern — both are breaking changes for existing referral chains on-chain.

---

## Proof of Concept

### Step 1: Create a 3-level referral chain

```rust
// Referrer C creates account (no referrer) → referral_accounts = []
let referrer_c = create_referral_account(ctx, code_c, &[]);

// Referrer B creates account, referred by C → remaining = [referrer_c]
let referrer_b = create_referral_account(ctx, code_b, &[referrer_c]);

// Referrer A creates account, referred by B → remaining = [referrer_b, referrer_c]
let referrer_a = create_referral_account(ctx, code_a, &[referrer_b, referrer_c]);

// User creates account, referred by A → remaining = [referrer_a, referrer_b, referrer_c]
// referrer_count = 3, which passes the <= 3 check at create_referral_account.rs:87
let user_referral = create_referral_account(ctx, code_user, &[referrer_a, referrer_b, referrer_c]);
```

### Step 2: Worst-case CPI count calculation

```text
execute_payment with referral enabled and 3-level chain:

  process_referral_rewards:
    parse_remaining_accounts:  6 accounts (3 ReferralAccount + 3 ATA)
    transfer_referral_reward (L1): 1 CPI (transfer_checked) + 1 load + 1 load_mut
    transfer_referral_reward (L2): 1 CPI (transfer_checked) + 1 load + 1 load_mut
    transfer_referral_reward (L3): 1 CPI (transfer_checked) + 1 load + 1 load_mut
                                    ─────────────────
                                    3 CPIs

  execute_payment (base):
    recipient transfer:         1 CPI (transfer_checked)
    gateway_fee transfer:       1 CPI (transfer_checked)
    protocol_fee transfer:      1 CPI (transfer_checked)
                                    ─────────────────
                                    3 CPIs

  TOTAL CPIs:  6 transfer_checked CPIs + PDA signer verification × 6
```

### Step 3: Simulate compute budget pressure

Add this test to `tests/tributary.test.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

async function simulateComputeUnits(
  program: Program,
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair,
  ix: TransactionInstruction,
  signers: anchor.web3.Keypair[]
): Promise<number> {
  const blockhash = await connection.getLatestBlockhash();

  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash.blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 0 }),
      ix,
    ],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign(signers);

  const sim = await connection.simulateTransaction(tx, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });

  if (sim.value.err) {
    console.error("Simulation failed:", sim.value.err);
    return -1;
  }

  const cuConsumed = sim.value.unitsConsumed || 0;
  console.log(`Compute units consumed: ${cuConsumed} / 1,400,000`);
  console.log(
    `Headroom: ${1_400_000 - cuConsumed} CU (${(
      (cuConsumed / 1_400_000) *
      100
    ).toFixed(1)}%)`
  );

  return cuConsumed;
}
```

### Step 4: Instrumented test case

```typescript
it("measures compute usage for full 3-level referral payment execution", async () => {
  // Setup: Create 3-level referral chain A -> B -> C -> user
  // Gateway with referral enabled (feature_flags = 0x01)
  // referral_allocation_bps = 2500 (25% of gateway fee)
  // referral_tiers_bps = [6000, 2500, 1500] (60/25/15 split)

  // Make payment 6+ months overdue to exercise skip_months loop
  // Set next_payment_due to 6 months ago

  const cuUsed = await simulateComputeUnits(
    program,
    program.provider.connection,
    payer,
    executePaymentIx,
    [payer]
  );

  // Assert: Must not exceed 80% of default budget (960,000 CU)
  assert(
    cuUsed < 960_000,
    `Payment execution used ${cuUsed} CU — exceeds 80% safety threshold of 960,000 CU. ` +
      `Referral chain CPIs are consuming too much compute budget.`
  );

  // Log for CI visibility
  console.log(
    `3-level referral payment: ${cuUsed} CU (${(
      (cuUsed / 1_200_000) *
      100
    ).toFixed(1)}% of default budget)`
  );
});
```

---

## Patch Options

### Option A: Add Compute Budget Simulation Test (Detection)

This doesn't fix the issue but establishes a CI regression gate. Add to `tests/tributary.test.ts`:

```typescript
// At the top of the test file, add:
const DEFAULT_COMPUTE_BUDGET = 1_200_000;
const COMPUTE_SAFETY_THRESHOLD = 0.8; // 80% of default budget

async function measureComputeUnits(
  connection: anchor.web3.Connection,
  ixs: TransactionInstruction[],
  payer: anchor.web3.PublicKey,
  signers: anchor.web3.Keypair[]
): Promise<number> {
  const blockhash = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash.blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ...ixs,
    ],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign(signers);

  const sim = await connection.simulateTransaction(tx, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });

  return sim.value.unitsConsumed || 0;
}
```

Then in the referral payment test:

```typescript
it("regression: execute_payment with full referral chain stays under compute budget", async () => {
  // ... setup 3-level chain, overdue payment, referral-enabled gateway ...

  const cuUsed = await measureComputeUnits(
    program.provider.connection,
    [executePaymentIx],
    payer.publicKey,
    [payer]
  );

  const threshold = DEFAULT_COMPUTE_BUDGET * COMPUTE_SAFETY_THRESHOLD;
  assert(
    cuUsed <= threshold,
    `CU regression: ${cuUsed} > ${threshold} (80% of ${DEFAULT_COMPUTE_BUDGET}). ` +
      `Referral chain CPI overhead exceeded safety margin.`
  );
});
```

**Pros**: Non-breaking, provides early warning.
**Cons**: Doesn't reduce actual CU consumption; just detects regressions.

---

### Option B: Cap Referral Levels at 2 (Structural Fix)

Reduce the maximum referral depth from 3 to 2. This eliminates one CPI and its associated overhead.

**Changes required:**

#### `programs/tributary/src/instructions/create_referral_account.rs`

```rust
// Line 87-89: Change depth limit from 3 to 2
        require!(
            referrer_count <= 2,  // Was: <= 3
            TributaryError::MaxReferralDepthExceeded
        );
```

#### `programs/tributary/src/state/payment_gateway.rs`

```rust
// Lines 38-40: Reduce tiers array from 3 to 2
    /// Gateway-scoped referral tier distribution as [level1, level2]
    /// Values are in basis points (e.g., 6000 = 60%). Must sum to 10000 = 100%
    pub referral_tiers_bps: [u16; 2],  // Was: [u16; 3]
```

#### `programs/tributary/src/state/payment_gateway.rs:73-82`

```rust
    pub fn validate_referral_tiers(&self) -> Result<()> {
        if self.referral_tiers_bps.len() != 2 {  // Was: != 3
            return Err(TributaryError::InvalidReferralTiers.into());
        }

        let total: u16 = self.referral_tiers_bps.iter().sum();
        require!(total == 10000, TributaryError::InvalidReferralTiers);

        Ok(())
    }
```

#### `programs/tributary/src/utils.rs:248-333`

```rust
// process_referral_rewards: Update signature and remove level3
pub fn process_referral_rewards<'a, 'info>(
    ctx: ReferralContext<'a, 'info>,
    gateway_fee: u64,
    referral_allocation_bps: u16,
    referral_tiers_bps: &[u16; 2],  // Was: &[u16; 3]
) -> Result<u64> {
    // ... referral_pool and level1_reward calculation unchanged ...

    let level2_reward = referral_pool
        .checked_mul(referral_tiers_bps[1] as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    // REMOVE: level3_reward calculation (lines 276-280)

    // ... parse_remaining_accounts unchanged ...

    let level1_referrer: Option<&AccountLoader<ReferralAccount>> = referral_accounts.last();
    let mut level2_referrer: Option<&AccountLoader<ReferralAccount>> = None;
    // REMOVE: level3_referrer

    if referral_accounts.len() == 2 {
        level2_referrer = referral_accounts.first();
    }

    // REMOVE: 3-referral branch

    emit!(ReferralRewardDistributedRecord {
        // ...
        rewards: [
            level1_referrer.map(|loader| ReferralReward {
                pubkey: loader.key(),
                reward: level1_reward,
            }),
            level2_referrer.map(|loader| ReferralReward {
                pubkey: loader.key(),
                reward: level2_reward,
            }),
            None,  // Level 3 no longer used
        ],
    });

    transfer_referral_reward(&ctx, &token_accounts, level1_referrer, level1_reward)?;
    transfer_referral_reward(&ctx, &token_accounts, level2_referrer, level2_reward)?;
    // REMOVE: transfer_referral_reward for level3

    Ok(referral_pool)
}
```

#### `programs/tributary/src/state/events.rs`

```rust
// Keep rewards array at [Option<ReferralReward>; 3] for backward compatibility
// but level 3 will always be None
```

#### `programs/tributary/src/state/payment_gateway.rs:64`

```rust
// Update SIZE calculation
        4 + // referral_tiers_bps: [u16; 2] = 2*2 = 4  (was: 6)
        // Add 2 bytes to padding to maintain alignment:
        pub padding: [u8; 119],  // Was: [u8; 117]
```

**⚠️ Breaking change**: Existing gateways with `referral_tiers_bps: [u16; 3]` will fail deserialization. Requires a migration or versioned account approach.

**Pros**: Reduces worst-case CPI count from 6 to 5, saves ~5,000-8,000 CU.
**Cons**: Breaking change for existing on-chain data.

---

### Option C: Batch Referral Rewards into Single CPI (Recommended)

Instead of 3 separate `transfer_checked` CPIs, accumulate referral rewards that go to the same token account (if any tier pays to the same wallet) and use a single transfer. More importantly, use a single PDA-signed invocation that internally does all transfers.

This is the most impactful optimization because it reduces CPI cross-program invocation overhead (the most expensive part) without changing on-chain data structures.

**However**, SPL Token doesn't support batch transfers natively. The practical approach is:

1. **Skip zero-reward CPIs** — already partially done (`if reward == 0` check at `utils.rs:394`), but missing for the base transfers in `execute_payment.rs` (recipient, gateway fee, protocol fee already check `> 0`).

2. **Coalesce referral pool into gateway fee account** — pay the full referral pool to the gateway fee account in the existing gateway fee CPI, then have an off-chain settlement process distribute referral rewards. This reduces 3 referral CPIs to 0, at the cost of delayed referral payouts.

3. **Use `transfer_checked` with memo extension** — not a CU savings but adds audit trail without extra CPIs.

**Practical implementation of approach (2) — deferred referral settlement:**

#### `programs/tributary/src/utils.rs` — Replace `process_referral_rewards`

```rust
/// Calculate referral rewards but defer distribution.
/// Returns the referral pool amount to deduct from gateway fee.
/// Actual transfers are handled off-chain via gateway operator.
pub fn calculate_referral_rewards(
    referral_accounts: &[AccountLoader<ReferralAccount>],
    referral_tiers_bps: &[u16; 3],
    referral_pool: u64,
) -> Result<Vec<(Pubkey, u64)>> {
    if referral_pool == 0 || referral_accounts.is_empty() {
        return Ok(Vec::new());
    }

    let level1_reward = referral_pool
        .checked_mul(referral_tiers_bps[0] as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let level2_reward = referral_pool
        .checked_mul(referral_tiers_bps[1] as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let level3_reward = referral_pool
        .checked_mul(referral_tiers_bps[2] as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let mut rewards = Vec::new();

    let level1_referrer = referral_accounts.last();
    let level2_referrer = if referral_accounts.len() >= 2 {
        referral_accounts.get(referral_accounts.len().saturating_sub(2))
    } else {
        None
    };
    let level3_referrer = if referral_accounts.len() >= 3 {
        referral_accounts.first()
    } else {
        None
    };

    if let Some(loader) = level1_referrer {
        let data = loader.load()?;
        rewards.push((data.owner, level1_reward));
    }
    if let Some(loader) = level2_referrer {
        let data = loader.load()?;
        rewards.push((data.owner, level2_reward));
    }
    if let Some(loader) = level3_referrer {
        let data = loader.load()?;
        rewards.push((data.owner, level3_reward));
    }

    Ok(rewards)
}
```

Then in `execute_payment.rs`, replace the referral CPI block with:

```rust
        if gateway.is_referral_enabled() && gateway.referral_allocation_bps > 0 {
            let referral_pool = gateway_fee
                .checked_mul(gateway.referral_allocation_bps as u64)
                .ok_or(TributaryError::ArithmeticOverflow)?
                .checked_div(10000)
                .ok_or(TributaryError::ArithmeticOverflow)?;

            if referral_pool > 0 {
                let (referral_accounts, _token_accounts) =
                    crate::utils::parse_remaining_accounts(
                        remaining_accounts,
                        expected_mint,
                        gateway.key(),
                    )?;

                let _rewards = crate::utils::calculate_referral_rewards(
                    &referral_accounts,
                    &gateway.referral_tiers_bps,
                    referral_pool,
                )?;

                // Emit event for off-chain settlement (no CPI needed)
                emit!(ReferralRewardDistributedRecord {
                    payment_policy: payment_policy_key,
                    gateway: gateway.key(),
                    payment_amount,
                    timestamp: clock.unix_timestamp,
                    rewards: [
                        _rewards.get(0).map(|(pk, r)| ReferralReward { pubkey: *pk, reward: *r }),
                        _rewards.get(1).map(|(pk, r)| ReferralReward { pubkey: *pk, reward: *r }),
                        _rewards.get(2).map(|(pk, r)| ReferralReward { pubkey: *pk, reward: *r }),
                    ],
                });

                gateway_fee = gateway_fee
                    .checked_sub(referral_pool)
                    .ok_or(TributaryError::ArithmeticOverflow)?;
            }
        }
```

**Pros**: Eliminates 3 CPIs from the hot path. No on-chain data structure changes.
**Cons**: Referral payouts become deferred (off-chain). Requires gateway operators to run settlement bots. Changes the referral model from trustless to trusted.

---

## Recommendation

**Implement Option A immediately** (compute budget simulation test) to establish a regression baseline. This is zero-risk and provides CI protection against future CU regressions.

**Evaluate Option B vs Option C based on product priorities:**

- If referral payout immediacy is a product requirement → **Option B** (cap at 2 levels). Accept the breaking change, plan a gateway migration.
- If deferred settlement is acceptable → **Option C** (eliminate referral CPIs entirely). Non-breaking, maximum CU headroom.

Regardless of the chosen path, add an explicit compute budget assertion to all payment execution tests:

```rust
// In test helper:
fn assert_compute_headroom(cu_used: u64, min_headroom_pct: u8) {
    let budget = 1_200_000u64;
    let max_allowed = budget * (100 - min_headroom_pct as u64) / 100;
    assert!(
        cu_used <= max_allowed,
        "CU usage {} exceeds {} (max {}% of {} budget)",
        cu_used,
        max_allowed,
        100 - min_headroom_pct,
        budget
    );
}
```

**Additionally**, document the current worst-case CU profile in `AGENTS.md` or a `docs/architecture/compute-budget.md` so future contributors understand the constraint envelope before adding features to the `execute_payment` path.

---

## Testing Instructions

### 1. Compute Budget Baseline Test

```bash
# Run existing test suite to confirm no regressions
anchor test

# Run specific compute budget measurement test
anchor test -- --grep "compute budget"
```

### 2. Simulate Worst-Case Scenario

Create a test that exercises the maximum referral chain depth:

```bash
# Setup:
# 1. Create gateway with referral enabled, referral_allocation_bps = 5000 (50%)
# 2. Create 3-level referral chain (C → B → A → user)
# 3. Create payment policy with Monthly frequency
# 4. Set next_payment_due 100 months in the past (exercises skip_months loop)
# 5. Execute payment and measure CU consumption via simulation

anchor test -- --grep "referral chain compute"
```

Expected result: CU consumption should be under 960,000 (80% of 1,200,000 default).

### 3. Regression CI Gate

Add to CI pipeline (`.github/workflows/test.yml`):

```yaml
- name: Compute Budget Regression Test
  run: anchor test -- --grep "compute budget"
  env:
    ANCHOR_PROVIDER_URL: http://localhost:8899
```

This test must never fail in CI. If it does, the PR that caused it is adding too much compute overhead to the payment execution path.

---

## Appendix: Current CPI Call Graph

```
execute_payment()
├── get_policy_strategy()                    [~1,000 CU]
├── strategy.execute()                       [~3,000 CU]
├── calculate_next_payment_due()             [~2,000-50,000 CU depending on catch-up]
├── process_referral_rewards()               [if referral enabled]
│   ├── parse_remaining_accounts()           [~15,000-25,000 CU]
│   │   └── AccountLoader::try_from × N
│   ├── transfer_referral_reward(L1)
│   │   ├── loader.load()                    [~500 CU]
│   │   ├── linear scan token_accounts       [~200 CU]
│   │   ├── token_interface::transfer_checked [~3,000-5,000 CU CPI]
│   │   └── loader.load_mut()               [~500 CU]
│   ├── transfer_referral_reward(L2)         [same as L1]
│   └── transfer_referral_reward(L3)         [same as L1]
├── transfer_checked → recipient             [~3,000-5,000 CU CPI]
├── transfer_checked → gateway_fee           [~3,000-5,000 CU CPI]
├── transfer_checked → protocol_fee          [~3,000-5,000 CU CPI]
└── emit!(PaymentRecord)                     [~1,000 CU]
```

**Total CPIs: 6 (worst case), 3 (no referral), 4 (2-level referral)**
