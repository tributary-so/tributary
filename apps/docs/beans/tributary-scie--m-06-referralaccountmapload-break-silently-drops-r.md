---
# tributary-scie
title: 'M-06: ReferralAccountMap::load — break Silently Drops Referral Accounts'
status: completed
type: task
priority: normal
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-18T10:07:49Z
parent: tributary-4kt4
---

# M-06: `ReferralAccountMap::load` — `break` Silently Drops Referral Accounts After First Non-Match

| Field        | Value                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Severity** | Medium                                                                                                                   |
| **File**     | `programs/tributary/src/state/referral_account_map.rs`                                                                   |
| **Related**  | `programs/tributary/src/utils.rs` (`parse_remaining_accounts`), `programs/tributary/src/instructions/execute_payment.rs` |
| **Status**   | Open                                                                                                                     |

---

## Description

`ReferralAccountMap::load` iterates over `remaining_accounts` and attempts to load each as a `ReferralAccount`. On **four** separate conditions, the function uses `break` to exit the loop entirely:

```rust
// programs/tributary/src/state/referral_account_map.rs:14-34
for account_info in account_info_iter {
    if account_info.is_writable {       // ← break #1
        break;
    }

    if account_info.data_len() < ReferralAccount::SIZE {   // ← break #2
        break;
    }

    let loader = match AccountLoader::<ReferralAccount>::try_from(account_info) {
        Ok(l) => l,
        Err(_) => break,                // ← break #3
    };

    if loader.load().is_err() {         // ← break #4
        break;
    }

    map.0.insert(*account_info.key, loader);
}
```

Every `break` terminates iteration. If a non-referral account appears at position _i_ in `remaining_accounts`, all referral accounts at positions _i+1, i+2, ..._ are **silently ignored**. The function returns `Ok(map)` with a partial result — no error, no log, no indication that accounts were skipped.

### Contrast with the actual payment path

The live `execute_payment` handler does **not** use `ReferralAccountMap::load`. It calls `parse_remaining_accounts` (in `utils.rs:336-385`), which iterates through **all** remaining accounts without `break`, classifying each as either a `ReferralAccount` or a token account:

```rust
// programs/tributary/src/utils.rs:347-373
for acc in remaining_accounts {
    if acc.data_len() == ReferralAccount::SIZE {
        // ... attempt to load as referral account, error on failure
    } else if acc.data_len() >= 165 {
        // ... attempt to load as token account, error on failure
    }
    // implicit continue — all accounts are examined
}
```

This means:

1. `ReferralAccountMap::load` is **currently dead code** — exported from `state/mod.rs:20` but never invoked by any instruction handler.
2. The function is **publicly exported** and available to any future instruction or SDK integration.
3. The behavioral contract differs from the working path: `parse_remaining_accounts` is strict (errors on bad accounts) and exhaustive (examines all), while `ReferralAccountMap::load` is lenient (silently stops) and incomplete (skips tail accounts).

### The contiguity assumption

The `break` pattern implies a **contiguity requirement**: referral accounts must occupy a contiguous prefix of `remaining_accounts`. This may be intentional, but it is:

- **Undocumented** — no comment, no doc string, no constant explains the invariant.
- **Fragile** — the caller must know to place referral accounts first and must never interleave them with other account types.
- **Inconsistent** — the working payment path (`parse_remaining_accounts`) does **not** require contiguity.

---

## Attack Scenario

### Scenario A: Future instruction uses `ReferralAccountMap::load`

A developer adds a new instruction (e.g., `distribute_batch_referral_rewards`) that calls `ReferralAccountMap::load`:

```rust
let referral_map = ReferralAccountMap::load(&mut ctx.remaining_accounts.iter())?;
// Process referral_map...
```

The gateway operator constructs the transaction with referral accounts in `remaining_accounts`. If the SDK or off-chain indexer inserts a non-referral account (system program, recent blockhash sysvar, or a token account) between two referral accounts, `load` silently stops at the gap:

```
remaining_accounts: [ReferralA, ReferralB, TokenAccount, ReferralC, ReferralD]
                                 ↑ break here

Result: map contains {A, B} — C and D are silently dropped.
```

`ReferralC` and `ReferralD` earn **zero** rewards for that payment cycle. No error is thrown. The payment completes successfully with reduced referral payouts.

### Scenario B: RPC node or middleware reorders accounts

While the Solana runtime preserves transaction account ordering, some RPC proxies, relayers, or Jito bundles may normalize or reorganize `remaining_accounts`. If accounts are reordered non-contiguously, the same silent-drop behavior occurs.

### Scenario C: Debugging nightmare in current code

Even though `ReferralAccountMap::load` is dead code today, its existence creates confusion for auditors and developers. Someone reading `referral_account_map.rs` will assume this is the referral loading logic and may port the `break` pattern to new code, propagating the bug.

---

## Impact

- **Referral rewards silently dropped**: Referral accounts after a non-referral gap receive no rewards. No error, no event, no log.
- **Gateway operators lose revenue**: Missing referral rewards undermine the incentive structure of the referral program.
- **Latent bug propagation**: The function is publicly exported and its `break` pattern may be copied into new instruction handlers.
- **Audit confusion**: Two different referral parsing functions with different behavioral contracts (`break` vs. exhaustive iteration) increase the risk of integration bugs.

**Severity justification**: Currently dead code with no direct exploitable path in production. However, the function is publicly exported, has no documentation of its contiguity requirement, and its behavior contradicts the working payment path. Rated **Medium** due to the high likelihood of future integration and the silent nature of the failure.

---

## Proof of Concept

```typescript
// m-06-poc.ts — Demonstrates silent account dropping in ReferralAccountMap::load
//
// Setup: Create a transaction where remaining_accounts contains:
//   [valid_referral_1, non_referral_account, valid_referral_2]
//
// Expected (correct): Both referral accounts are loaded
// Actual (bug):       Only referral_1 is loaded; referral_2 is silently dropped

import { Program } from "@coral-xyz/anchor";
import { Tributary } from "../target/types/tributary";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

async function demonstrateSilentDrop() {
  const program = null as unknown as Program<Tributary>; // placeholder
  const payer = Keypair.generate();
  const mint = PublicKey.unique();
  const gatewayAuthority = Keypair.generate();

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  const [gatewayPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("payment_gateway"), gatewayAuthority.publicKey.toBuffer()],
    program.programId
  );
  const [userPaymentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_payment"), payer.publicKey.toBuffer(), mint.toBuffer()],
    program.programId
  );
  const [policyPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment_policy"),
      userPaymentPda.toBuffer(),
      new Uint8Array(8).fill(0), // policy_id = 0
    ],
    program.programId
  );
  const [delegatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("payments_delegate")],
    program.programId
  );

  // Create two referral accounts for the same gateway
  const referralCode1 = Buffer.from("REF001");
  const referralCode2 = Buffer.from("REF002");
  const [referral1] = PublicKey.findProgramAddressSync(
    [Buffer.from("referral"), gatewayPda.toBuffer(), referralCode1],
    program.programId
  );
  const [referral2] = PublicKey.findProgramAddressSync(
    [Buffer.from("referral"), gatewayPda.toBuffer(), referralCode2],
    program.programId
  );

  // Construct remaining_accounts with a gap:
  // [referral1, SYSTEM_PROGRAM, referral2]
  //                           ^-- break stops here
  //
  // If ReferralAccountMap::load were used, referral2 would be silently dropped.
  // The working path (parse_remaining_accounts) would process both correctly.
  const remainingAccounts = [
    { pubkey: referral1, isWritable: true, isSigner: false },
    // Gap: SystemProgram is neither a ReferralAccount nor a token account
    {
      pubkey: SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
    { pubkey: referral2, isWritable: true, isSigner: false },
  ];

  console.log("remaining_accounts order:");
  console.log("  [0] referral1:", referral1.toBase58());
  console.log("  [1] SYSTEM_PROGRAM (gap)");
  console.log("  [2] referral2:", referral2.toBase58());
  console.log("");
  console.log("ReferralAccountMap::load would return:");
  console.log("  map = { referral1 }  // referral2 SILENTLY DROPPED");
  console.log("");
  console.log("parse_remaining_accounts (current code) would return:");
  console.log("  referrals = [referral1, referral2]  // both processed");
}

demonstrateSilentDrop();
```

### Simulating the break in Rust

```rust
// Minimal reproduction of the break behavior
#[test]
fn test_referral_map_break_drops_trailing_accounts() {
    // Simulate: remaining_accounts = [valid_ref, invalid_account, valid_ref]
    //
    // With `break`: map.len() == 1 (second valid_ref dropped)
    // With `continue`: map.len() == 2 (both valid_refs loaded)
    //
    // The actual test would require setting up AccountInfo mocks,
    // which is non-trivial in Anchor. The behavior can be verified
    // by reading referral_account_map.rs:14-34 and observing all
    // four `break` statements.
}
```

---

## Patch

### Option A: Change `break` to `continue` + add count validation (Recommended)

This aligns the behavior with `parse_remaining_accounts` and adds explicit validation that all expected referral accounts were loaded.

```rust
// programs/tributary/src/state/referral_account_map.rs — OPTION A (full file)

use crate::error::TributaryError;
use crate::state::ReferralAccount;
use anchor_lang::prelude::{AccountInfo, AccountLoader, Pubkey};
use anchor_lang::Result;
use std::collections::BTreeMap;

pub struct ReferralAccountMap<'a>(pub BTreeMap<Pubkey, AccountLoader<'a, ReferralAccount>>);

impl<'a> ReferralAccountMap<'a> {
    pub fn load<'b: 'a>(
        account_info_iter: &mut std::slice::Iter<'b, AccountInfo<'a>>,
        expected_count: Option<usize>,
    ) -> Result<ReferralAccountMap<'a>> {
        let mut map = ReferralAccountMap(BTreeMap::new());

        for account_info in account_info_iter {
            if account_info.is_writable {
                continue;
            }

            if account_info.data_len() < ReferralAccount::SIZE {
                continue;
            }

            let loader = match AccountLoader::<ReferralAccount>::try_from(account_info) {
                Ok(l) => l,
                Err(_) => continue,
            };

            if loader.load().is_err() {
                continue;
            }

            map.0.insert(*account_info.key, loader);
        }

        if let Some(count) = expected_count {
            require!(
                map.len() == count,
                TributaryError::InvalidReferralChainOrdering
            );
        }

        Ok(map)
    }

    #[inline(always)]
    pub fn len(&self) -> usize {
        self.0.len()
    }

    #[inline(always)]
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    #[inline(always)]
    pub fn keys(&self) -> Vec<Pubkey> {
        self.0.keys().cloned().collect()
    }
}
```

**Changes from current code:**

| Line (old) | Behavior          | Line (new) | Behavior                    |
| ---------- | ----------------- | ---------- | --------------------------- |
| 16         | `break;`          | 17         | `continue;`                 |
| 20         | `break;`          | 21         | `continue;`                 |
| 26         | `Err(_) => break` | 27         | `Err(_) => continue`        |
| 31         | `break;`          | 32         | `continue;`                 |
| —          | —                 | 37-42      | `expected_count` validation |

**New parameter:** `expected_count: Option<usize>` — when `Some(n)`, validates that exactly `n` referral accounts were loaded. Callers that know how many referrals to expect (e.g., from gateway configuration or the referral chain depth) pass `Some(depth)`. Callers that don't know pass `None`.

---

### Option B: Keep `break` but document the contiguity invariant and add explicit `expected_count`

If the contiguity requirement is intentional, it should be enforced explicitly rather than implicitly through `break`.

```rust
// programs/tributary/src/state/referral_account_map.rs — OPTION B (full file)

use crate::error::TributaryError;
use crate::state::ReferralAccount;
use anchor_lang::prelude::{AccountInfo, AccountLoader, Pubkey};
use anchor_lang::Result;
use std::collections::BTreeMap;

/// Loads referral accounts from a contiguous prefix of `remaining_accounts`.
///
/// # Contiguity Requirement
///
/// Referral accounts **must** occupy a contiguous prefix of the iterator.
/// The first non-referral account terminates loading. This is intentional:
/// it allows remaining_accounts to contain a mix of account types where
/// referral accounts come first, followed by other account types.
///
/// # Arguments
///
/// * `account_info_iter` — iterator over remaining_accounts
/// * `expected_count` — if `Some(n)`, validates that exactly `n` referral
///   accounts were loaded. Returns `InvalidReferralChainOrdering` if the
///   count does not match.
///
/// # Errors
///
/// Returns `TributaryError::InvalidReferralChainOrdering` if `expected_count`
/// is provided and the number of loaded accounts does not match.
pub struct ReferralAccountMap<'a>(pub BTreeMap<Pubkey, AccountLoader<'a, ReferralAccount>>);

impl<'a> ReferralAccountMap<'a> {
    pub fn load<'b: 'a>(
        account_info_iter: &mut std::slice::Iter<'b, AccountInfo<'a>>,
        expected_count: Option<usize>,
    ) -> Result<ReferralAccountMap<'a>> {
        let mut map = ReferralAccountMap(BTreeMap::new());

        for account_info in account_info_iter {
            // Contiguity boundary: writable accounts mark the end of the
            // referral account section. This is the delimiter between
            // referral accounts and token accounts in remaining_accounts.
            if account_info.is_writable {
                break;
            }

            if account_info.data_len() < ReferralAccount::SIZE {
                break;
            }

            let loader = match AccountLoader::<ReferralAccount>::try_from(account_info) {
                Ok(l) => l,
                Err(_) => break,
            };

            if loader.load().is_err() {
                break;
            }

            map.0.insert(*account_info.key, loader);
        }

        if let Some(count) = expected_count {
            require!(
                map.len() == count,
                TributaryError::InvalidReferralChainOrdering
            );
        }

        Ok(map)
    }

    #[inline(always)]
    pub fn len(&self) -> usize {
        self.0.len()
    }

    #[inline(always)]
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    #[inline(always)]
    pub fn keys(&self) -> Vec<Pubkey> {
        self.0.keys().cloned().collect()
    }
}
```

**Changes from current code:**

| Aspect         | Current               | Option B                              |
| -------------- | --------------------- | ------------------------------------- |
| `break` logic  | Undocumented          | Documented as contiguity delimiter    |
| Validation     | None                  | Optional `expected_count` enforcement |
| Doc comments   | None                  | Full documentation of contract        |
| Error handling | Silent partial result | Explicit error on count mismatch      |

---

## Recommendation

**Adopt Option A** (change to `continue` + count validation). Reasons:

1. **Consistency**: Aligns `ReferralAccountMap::load` with the working `parse_remaining_accounts` in `utils.rs`, which already iterates all accounts exhaustively.
2. **Safety**: The `expected_count` parameter catches missing referrals explicitly rather than silently accepting a partial load.
3. **Future-proof**: If this function is ever used in a new instruction handler, the `continue` pattern prevents the silent-drop footgun.
4. **Dead code hygiene**: If this function is not needed (since `parse_remaining_accounts` handles the job), consider removing it entirely or marking it `#[deprecated]`.

If the `break` pattern is kept for a specific design reason, **Option B** at minimum adds the documentation and validation needed to make the contract explicit and safe.

---

## Testing Instructions

### 1. Unit test: `break` drops trailing accounts (current behavior)

```rust
// Add to programs/tributary/src/state/referral_account_map.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_break_drops_trailing_on_writable() {
        // This test documents the current (broken) behavior.
        // After applying Option A, update this test to verify
        // that all valid accounts are loaded.
        //
        // Setup: Create a mock iterator with:
        //   [valid_referral, writable_account, valid_referral]
        //
        // Current: map.len() == 1
        // After fix: map.len() == 2
    }
}
```

### 2. Integration test: referral rewards with non-contiguous accounts

```typescript
// Add to tests/tributary.test.ts

it("drops referral rewards when accounts are non-contiguous (current bug)", async () => {
  // Setup: Create gateway with referral enabled, two referral accounts
  // Construct execute_payment with remaining_accounts:
  //   [referral_1, system_program, referral_2, referral_2_ata]
  //
  // Verify: referral_2 receives no reward (silently dropped)
  // This test should FAIL after applying Option A (both should get rewards)
});

it("processes all referrals with contiguous accounts", async () => {
  // Setup: Same as above but with contiguous remaining_accounts:
  //   [referral_1, referral_2, referral_1_ata, referral_2_ata]
  //
  // Verify: Both referrals receive their expected rewards
});
```

### 3. Test Option A: expected_count validation

```typescript
it("rejects when expected_count does not match loaded referrals", async () => {
  // If expected_count = Some(3) but only 2 referral accounts are present
  // in remaining_accounts, the function should return
  // InvalidReferralChainOrdering
});
```

### 4. Verify dead code removal (optional)

If the team decides to remove `ReferralAccountMap` entirely:

```bash
# Confirm no references exist
grep -r "ReferralAccountMap" programs/tributary/src/
# Should only appear in the definition file and state/mod.rs

# After removal, confirm build passes
anchor build

# Confirm all existing tests still pass
anchor test
```

### 5. Verify consistency with parse_remaining_accounts

After applying Option A, confirm both functions handle referral accounts identically:

```bash
# Both functions should:
# 1. Skip non-referral accounts (continue, not break)
# 2. Error on invalid referral accounts (bad discriminator, wrong gateway)
# 3. Error on missing token accounts for referrals
```

---

## References

1. **`ReferralAccountMap::load` source** — `programs/tributary/src/state/referral_account_map.rs:9-38`
2. **`parse_remaining_accounts` (working path)** — `programs/tributary/src/utils.rs:336-385`
3. **`execute_payment` handler** — `programs/tributary/src/instructions/execute_payment.rs:262-287`
4. **`ReferralAccount` state** — `programs/tributary/src/state/referral_account.rs:12-31`
5. **`TributaryError::InvalidReferralChainOrdering`** — `programs/tributary/src/error.rs:51-52`
