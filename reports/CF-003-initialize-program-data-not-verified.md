# CF-003: `program_data` Not Verified as Tributary's Own — Initialization Front-Running

> **Severity:** 🟠 7 (HIGH)  
> **Category:** Account Validation / Access Control  
> **Status:** Open — **Fix before mainnet**  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Affected Code

**File:** `programs/tributary/src/instructions/initialize.rs:21–24`

```rust
/// CHECK: Program data account containing upgrade authority info.
/// Enforces that only the upgrade authority can initialize the protocol.
#[account(
    constraint = program_data.upgrade_authority_address == Some(authority.key())
        @ TributaryError::UnauthorizedInitializer
)]
pub program_data: Account<'info, ProgramData>,
```

---

## Root Cause

`Account<'info, ProgramData>` verifies:

1. The account owner is `bpf_loader_upgradeable::ID`
2. The data deserializes as `ProgramData`

It does **not** verify that this ProgramData account belongs to the Tributary program (`crate::ID`). Any valid ProgramData account from any BPF upgradeable program passes the type check. The constraint only verifies `upgrade_authority_address == Some(authority.key())`, which trivially passes when the attacker supplies their own program's ProgramData and signs as its upgrade authority.

The `init` constraint on `config` (with `seeds = [CONFIG_SEED]`) prevents re-initialization, so this is only exploitable in the window between deployment and first initialization. But on mainnet, that window is real — the deployer must submit the deployment tx, wait for confirmation, then submit the initialize tx. An attacker monitoring the mempool can front-run the initialize tx.

---

## Exploit Scenario

```
T=0: Tributary program deployed to mainnet (program ID: TRib...)
     ProgramConfig PDA does not exist yet (no one has called initialize).

T=1: Attacker (who has deployed their own upgradeable program in advance)
     monitors for new Tributary deployment.

T=2: Attacker submits initialize transaction:
       authority    = attacker_upgrade_auth (attacker signs)
       admin        = attacker_key           (attacker signs)
       program_data = attacker's OWN program's ProgramData account
       config       = PDA derived from ["config"] (doesn't exist yet → init succeeds)

     Constraint check:
       program_data.owner == bpf_loader_upgradeable::ID  ✓ (attacker's program is upgradeable)
       program_data.upgrade_authority_address == Some(authority.key())  ✓ (attacker is their own upgrade auth)

     config.admin = attacker_key
     config.fee_recipient = attacker_key

T=3: Deployer's initialize transaction fails (config already initialized).

T=4: Attacker now has full admin control:
       - set_emergency_pause(true) → DoS all payments
       - create_payment_gateway → collect fees
       - change_program_authority → lock out deployer permanently
```

---

## Impact Assessment

| Dimension              | Value                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Fund loss**          | Indirect — attacker gains admin control (can pause all payments, redirect fees, lock out deployer)                 |
| **Preconditions**      | Program deployed but not yet initialized (time window)                                                             |
| **Privilege required** | Upgrade authority of ANY BPF upgradeable program (trivially obtained)                                              |
| **Atomicity**          | Single transaction (front-run the deployer's initialize tx)                                                        |
| **Window size**        | Seconds to minutes (between deployment confirmation and initialize tx confirmation)                                |
| **Permanence**         | If the attacker initializes first, the `init` constraint makes it irreversible — the deployer cannot re-initialize |

---

## Patch

The BPF Upgradeable Loader program account format stores the ProgramData address at offset 4 (after the 4-byte `AccountType` enum):

```
Program account data layout:
  [0..4]   AccountType (1 = Program, 4 = ProgramData)
  [4..36]  ProgramData address (Pubkey)
```

```diff
 // programs/tributary/src/instructions/initialize.rs

 use anchor_lang::prelude::*;
+use anchor_lang::solana_program::bpf_loader_upgradeable;

 #[derive(Accounts)]
 pub struct Initialize<'info> {
     #[account(mut)]
     pub authority: Signer<'info>,

     #[account(mut)]
     pub admin: Signer<'info>,

     #[account(
         init,
         payer = admin,
         space = ProgramConfig::SIZE,
         seeds = [CONFIG_SEED],
         bump
     )]
     pub config: Account<'info, ProgramConfig>,

-    /// CHECK: Program data account containing upgrade authority info.
-    /// Enforces that only the upgrade authority can initialize the protocol.
-    #[account(constraint = program_data.upgrade_authority_address == Some(authority.key()) @ TributaryError::UnauthorizedInitializer)]
+    /// The ProgramData account of THIS program (Tributary). Verified by
+    /// cross-referencing crate::ID → its program account → the ProgramData
+    /// address stored at offset 4 of the program account.
+    #[account(
+        constraint = {
+            // Derive the expected ProgramData address from the executing
+            // program's account. The program account (crate::ID) stores the
+            // ProgramData pubkey at byte offset 4 (after the 4-byte
+            // AccountType discriminator for BPF Upgradeable).
+            //
+            // We need the caller to pass the program account itself or we
+            // read it via SystemProgram. The simplest approach: require the
+            // caller to also pass the program account as an AccountInfo and
+            // extract the ProgramData address from it.
+            let expected_pd = {
+                let program_info = ctx.accounts.program.to_account_info();
+                let data = program_info.try_borrow_data()?;
+                require!(data.len() >= 36, TributaryError::UnauthorizedInitializer);
+                Pubkey::try_from(&data[4..36]).unwrap_or_default()
+            };
+            require_keys_eq!(
+                program_data.key(),
+                expected_pd,
+                TributaryError::UnauthorizedInitializer
+            );
+            require!(
+                program_data.upgrade_authority_address == Some(authority.key()),
+                TributaryError::UnauthorizedInitializer
+            );
+            true
+        } @ TributaryError::UnauthorizedInitializer
+    )]
     pub program_data: Account<'info, ProgramData>,
+
+    /// The executing program account (crate::ID). Used to verify
+    /// program_data belongs to this program.
+    /// CHECK: Verified by constraint above via data extraction.
+    #[account(address = crate::ID)]
+    pub program: AccountInfo<'info>,

     pub system_program: Program<'info, System>,
 }
```

**Simpler alternative** (if adding a new account to the IDL is undesirable):

Use `solana_program::program::get_epoch_info` or a static assertion. In practice, the cleanest approach on-chain is to have the caller pass `program_data` and verify it against `crate::ID` by reading the program account from the instruction's accounts.

If you can't add a new account, the next best approach is to have the deployer call `initialize` in the same transaction as the deployment (atomic), closing the front-running window entirely.

---

## Verification

1. **Negative test:** Pass a ProgramData account from a different program → must fail with `UnauthorizedInitializer`.

2. **Positive test:** Pass the correct Tributary ProgramData → must succeed.

3. **Front-run resistance:** Deploy and initialize in the same transaction (atomic) as defense-in-depth.
