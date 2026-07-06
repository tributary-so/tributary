---
# tributary-yqnw
title: 'H-04: Admin Operations Lack Timelock / Multisig'
status: scrapped
type: task
priority: high
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T06:13:58Z
parent: tributary-4kt4
---

# H-04: Admin Operations Lack Timelock / Multisig

| Field              | Value                                        |
| ------------------ | -------------------------------------------- |
| **Severity**       | High                                         |
| **Status**         | Open                                         |
| **Program ID**     | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6X1Sg42tJ` |
| **Anchor Version** | 0.31.1                                       |

---

## Affected Files

| File                                                                      | Instruction                        | Auth Model                     |
| ------------------------------------------------------------------------- | ---------------------------------- | ------------------------------ |
| `programs/tributary/src/instructions/change_gateway_fee_bps.rs`           | `change_gateway_fee_bps`           | Single signature (`authority`) |
| `programs/tributary/src/instructions/change_gateway_fee_recipient.rs`     | `change_gateway_fee_recipient`     | Single signature (`authority`) |
| `programs/tributary/src/instructions/change_gateway_signer.rs`            | `change_gateway_signer`            | Single signature (`authority`) |
| `programs/tributary/src/instructions/update_gateway_feature_flags.rs`     | `update_gateway_feature_flags`     | Single signature (`authority`) |
| `programs/tributary/src/instructions/update_gateway_protocol_fee.rs`      | `update_gateway_protocol_fee`      | Single signature (`admin`)     |
| `programs/tributary/src/instructions/update_gateway_referral_settings.rs` | `update_gateway_referral_settings` | Single signature (`authority`) |

---

## Description

Every gateway admin operation in the Tributary program requires only the current authority's signature. There is no timelock, no multisig requirement, and no two-step confirmation for any critical state change.

The `PaymentGateway` account (`state/payment_gateway.rs:9-46`) exposes six admin-gated fields that can be changed atomically in a single transaction:

1. **`gateway_fee_bps`** (`change_gateway_fee_bps.rs:31-53`) — Gateway fee rate. Settable from 0 to 10,000 bps (0-100%). A single signed transaction can raise gateway fees to 100%, effectively confiscating the entire payment amount as gateway fees.

2. **`fee_recipient`** (`change_gateway_fee_recipient.rs:33-55`) — The address receiving gateway fees. Changed with only a `Pubkey::default()` check (`change_gateway_fee_recipient.rs:19`). An attacker redirects all future fee revenue to their own wallet instantly.

3. **`signer`** (`change_gateway_signer.rs:33-53`) — The key authorized to call `execute_payment`. This is the operational heart of the payment system. Changing it requires only a non-default check (`change_gateway_signer.rs:19`). An attacker can set their own key and then execute arbitrary payments.

4. **`feature_flags`** (`update_gateway_feature_flags.rs:25-50`) — Controls referral program, net-amount mode, and custom protocol fee behavior. Toggling features can change how payment amounts are calculated and distributed.

5. **`custom_protocol_fee_bps`** (`update_gateway_protocol_fee.rs:37-62`) — Overrides the default 100 bps protocol fee. Set by the protocol `admin` (not gateway authority), but still single-sig with no delay. Can be set to 10,000 bps.

6. **`referral_allocation_bps` / `referral_tiers_bps`** (`update_gateway_referral_settings.rs:32-74`) — Referral fee distribution. Changing tiers changes who gets paid and how much.

The `ProgramConfig` (`state/program_config.rs:6-21`) has the same issue — `admin` can change `protocol_fee_bps` and toggle `emergency_pause` unilaterally.

**Common vulnerability pattern across all instructions:**

```rust
// Every admin instruction follows this pattern:
#[account(
    mut,
    seeds = [GATEWAY_SEED, authority.key().as_ref()],
    bump = gateway.bump,
    constraint = gateway.authority == authority.key() @ TributaryError::Unauthorized
)]
pub gateway: Account<'info, PaymentGateway>,
// authority: Signer<'info> — single key, no delay, no second confirmation
```

No instruction checks for a pending state, elapsed time, or multisig threshold. The `emergency_pause` guard exists on some instructions (lines `change_gateway_fee_bps.rs:22-24`, `change_gateway_fee_recipient.rs:24-28`) but this itself is a single-sig toggle.

---

## Attack Scenario: Compromised Authority Key

**Preconditions:** The gateway authority's private key is compromised (phishing, supply chain attack, insider threat, leaked keypair).

**Step 1 — Fee redirection (1 tx):**

```
change_gateway_fee_recipient(gateway, attacker_wallet)
```

All future gateway fees now flow to the attacker. Existing payment policies continue executing — users are unaware.

**Step 2 — Fee maximization (1 tx):**

```
change_gateway_fee_bps(gateway, 10000)
```

Gateway fee set to 100%. Every payment now routes 100% of the amount to `attacker_wallet` as gateway fees. The recipient receives nothing. The protocol fee (100 bps) is still deducted from this, but 99% goes to the attacker.

Wait — that's not quite right. The payment flow is: `amount → protocol_fee → gateway_fee → recipient`. With gateway_fee_bps = 10000, the gateway takes 100% of what remains after protocol fee. The recipient gets 0.

**Step 3 — Signer hijack (1 tx):**

```
change_gateway_signer(gateway, attacker_key)
```

Attacker now controls payment execution. They can selectively execute payments, skip payments, or front-run legitimate execution.

**Step 4 — Cover tracks (1 tx):**

```
update_gateway_feature_flags(gateway, enable_referral | enable_net_amount)
update_gateway_referral_settings(gateway, tiers=[10000, 0, 0], allocation=2500)
```

Enable referral features and set tier distribution so 100% of referral allocation goes to a single attacker-controlled referrer account.

**Total time: 4 transactions, < 2 seconds.** No monitoring system can react fast enough.

---

## Impact

| Impact Category               | Severity | Detail                                                                                                        |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| **Fee redirection**           | High     | All gateway fees redirected to attacker wallet instantly                                                      |
| **Fee maximization**          | High     | 10,000 bps gateway fee = recipients receive 0 from every payment                                              |
| **Payment execution control** | High     | Hijacked signer can execute/skip payments selectively                                                         |
| **Feature toggle abuse**      | Medium   | Enabling net-amount mode changes payment math; referral abuse siphons fees                                    |
| **Protocol admin risk**       | High     | `update_gateway_protocol_fee` can set custom fees to 10,000 bps (admin-only, but still single-sig)            |
| **User trust**                | High     | Users have no recourse; their approved delegations are spent by the new signer                                |
| **Irreversibility**           | High     | No on-chain mechanism to revert changes. Only another admin tx can fix it — but the attacker IS the admin now |

The key insight: **the `signer` key is what actually executes payments**. Once an attacker controls it, they can drain every user's delegated tokens through legitimate `execute_payment` calls. The timelock isn't just about fee changes — it's about preventing an attacker from gaining execution capability before the legitimate admin can respond.

---

## Proof of Concept

### Test: Single-tx admin takeover

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Tributary } from "../target/types/tributary";
import { expect } from "chai";

describe("H-04: Admin ops lack timelock", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Tributary as Program<Tributary>;

  it("authority can change all gateway params in a single tx with no delay", async () => {
    const [gatewayPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("payment_gateway"), authority.publicKey.toBuffer()],
      program.programId
    );

    // Snapshot original state
    const before = await program.account.paymentGateway.fetch(gatewayPda);

    // --- All three operations in rapid succession (could be same block) ---

    // 1. Redirect fees to attacker
    await program.methods
      .changeGatewayFeeRecipient()
      .accounts({
        authority: authority,
        gateway: gatewayPda,
        newFeeRecipient: attacker.publicKey, // attacker-controlled
        config: configPda,
      })
      .rpc();

    // 2. Maximize fee to 100%
    await program.methods
      .changeGatewayFeeBps(new anchor.BN(10000))
      .accounts({
        authority: authority,
        gateway: gatewayPda,
        config: configPda,
      })
      .rpc();

    // 3. Hijack signer
    await program.methods
      .changeGatewaySigner()
      .accounts({
        authority: authority,
        gateway: gatewayPda,
        newSigner: attacker.publicKey, // attacker-controlled
        config: configPda,
      })
      .rpc();

    // Verify: all three changes applied instantly
    const after = await program.account.paymentGateway.fetch(gatewayPda);

    assert.equal(after.feeRecipient.toBase58(), attacker.publicKey.toBase58());
    assert.equal(after.gatewayFeeBps.toNumber(), 10000);
    assert.equal(after.signer.toBase58(), attacker.publicKey.toBase58());

    // No time elapsed, no multisig, no confirmation step
    // An attacker with a compromised key does all three in < 2 seconds
  });
});
```

### What this demonstrates

- Three critical state changes in consecutive transactions with zero delay.
- No intermediate state where monitoring could trigger an alert before damage is done.
- The compromised key retains full control until manually revoked — but the attacker already changed the signer.

---

## Patch

This finding requires a **layered approach**: off-chain operational hardening (immediate, no code changes) + on-chain protections (code changes, requires upgrade).

### A. Off-chain: Squads Multisig as Gateway Authority (Immediate, No Code Changes)

Use [Squads Protocol](https://squads.so) (multisig program on Solana, `SQDS4ec65m7j2mDdt4sE76L6S4dZ2Q9GnciT8EMxGqYc`) as the gateway authority. This is the highest-priority, lowest-risk fix.

**Deployment steps:**

```bash
# 1. Create a Squads multisig (e.g., 3-of-5 threshold)
# Use the Squads UI at https://app.squads.so or the Squads CLI

# 2. Create the gateway with the multisig address as authority
npx tributary-manager create-gateway \
  --authority <MULTISIG_ADDRESS> \
  --fee-bps 100 \
  --name "production-gateway"

# 3. For all admin operations, submit as Squads proposals:
#    - change_gateway_fee_bps
#    - change_gateway_fee_recipient
#    - change_gateway_signer
#    - update_gateway_feature_flags
#    - update_gateway_referral_settings
# Each proposal requires M-of-N signers to execute.
# There is a built-in timelock in Squads (time-lock period per proposal).

# 4. Rotate the signer key regularly using Squads proposals.
```

**Benefits:**

- No code changes required — works with existing program.
- M-of-N signing eliminates single-key compromise risk.
- Squads has a built-in timelock on proposal execution.
- All operations are on-chain and auditable.

**Limitations:**

- Does not protect against M-of-N collusion.
- Does not add on-chain time delay for individual instruction enforcement.
- Relies on the Squads program not being compromised.

### B. On-chain Optional Timelock: Two-step Signer Change (Code Change)

The signer change is the highest-risk admin operation because it grants payment execution capability. Add a two-step `propose → claim` pattern with a mandatory delay.

**State changes to `PaymentGateway` (`state/payment_gateway.rs`):**

```rust
#[account]
pub struct PaymentGateway {
    // ... existing fields ...

    /// Pending signer for two-step signer change (Pubkey::default() = no pending change)
    pub pending_signer: Pubkey,
    /// Slot when pending_signer was proposed (0 = no pending change)
    pub pending_signer_proposed_slot: u64,
    /// Minimum slots to wait before claiming pending signer
    pub signer_change_delay_slots: u64,

    // Reduce padding to accommodate new fields (was 117 bytes, now 117 - 32 - 8 - 8 = 69)
    pub padding: [u8; 69],
}

impl PaymentGateway {
    pub const SIZE: usize = 8 +     // discriminator
        32 +    // authority
        32 +    // fee_recipient
        2 +     // gateway_fee_bps
        1 +     // is_active
        8 +     // padding1
        8 +     // created_at
        1 +     // bump
        32 +    // name
        64 +    // url
        32 +    // signer
        1 +     // feature_flags
        2 +     // referral_allocation_bps
        6 +     // referral_tiers_bps
        2 +     // custom_protocol_fee_bps
        32 +    // pending_signer          (NEW)
        8 +     // pending_signer_proposed_slot  (NEW)
        8 +     // signer_change_delay_slots     (NEW)
        69;     // padding (reduced from 117)
}
```

**New error variants (`error.rs`):**

```rust
#[error_code]
pub enum TributaryError {
    // ... existing variants ...
    #[msg("No pending signer change to claim")]
    NoPendingSignerChange,
    #[msg("Timelock has not expired for signer change")]
    SignerChangeTimelockNotExpired,
    #[msg("Pending signer does not match claimed signer")]
    PendingSignerMismatch,
}
```

**New event (`state/events.rs`):**

```rust
#[event]
pub struct GatewaySignerChangeProposed {
    pub gateway: Pubkey,
    pub current_signer: Pubkey,
    pub pending_signer: Pubkey,
    pub proposed_slot: u64,
    pub claimable_after_slot: u64,
}

#[event]
pub struct GatewaySignerChangeClaimed {
    pub gateway: Pubkey,
    pub old_signer: Pubkey,
    pub new_signer: Pubkey,
    pub claimed_slot: u64,
}
```

**Replace `change_gateway_signer.rs` with two instructions:**

```rust
// programs/tributary/src/instructions/propose_gateway_signer.rs

use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ProposeGatewaySigner<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key() @ TributaryError::Unauthorized
    )]
    pub gateway: Account<'info, PaymentGateway>,

    /// CHECK: The proposed new signer. Validated to be non-default.
    #[account(
        constraint = proposed_signer.key() != Pubkey::default() @ TributaryError::InvalidAmount
    )]
    pub proposed_signer: UncheckedAccount<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused,
    )]
    pub config: Account<'info, ProgramConfig>,
}

impl<'info> ProposeGatewaySigner<'info> {
    pub fn handler_propose_gateway_signer(
        ctx: Context<ProposeGatewaySigner>,
    ) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;
        let current_slot = Clock::get()?.slot;

        gateway.pending_signer = ctx.accounts.proposed_signer.key();
        gateway.pending_signer_proposed_slot = current_slot;

        let claimable_after = current_slot + gateway.signer_change_delay_slots;

        emit!(GatewaySignerChangeProposed {
            gateway: gateway.key(),
            current_signer: gateway.signer,
            pending_signer: gateway.pending_signer,
            proposed_slot: current_slot,
            claimable_after_slot: claimable_after,
        });

        msg!(
            "Signer change proposed: {:?} -> {:?}, claimable after slot {}",
            gateway.signer,
            gateway.pending_signer,
            claimable_after
        );

        Ok(())
    }
}
```

```rust
// programs/tributary/src/instructions/claim_gateway_signer.rs

use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ClaimGatewaySigner<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key() @ TributaryError::Unauthorized
    )]
    pub gateway: Account<'info, PaymentGateway>,

    /// CHECK: Must match the pending signer stored on the gateway.
    #[account(
        constraint = claimed_signer.key() == gateway.pending_signer @ TributaryError::PendingSignerMismatch
    )]
    pub claimed_signer: UncheckedAccount<'info>,
}

impl<'info> ClaimGatewaySigner<'info> {
    pub fn handler_claim_gateway_signer(
        ctx: Context<ClaimGatewaySigner>,
    ) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;

        require!(
            gateway.pending_signer != Pubkey::default(),
            TributaryError::NoPendingSignerChange
        );

        let current_slot = Clock::get()?.slot;
        let claimable_after = gateway.pending_signer_proposed_slot
            .checked_add(gateway.signer_change_delay_slots)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        require!(
            current_slot >= claimable_after,
            TributaryError::SignerChangeTimelockNotExpired
        );

        let old_signer = gateway.signer;
        gateway.signer = gateway.pending_signer;

        // Clear pending state
        gateway.pending_signer = Pubkey::default();
        gateway.pending_signer_proposed_slot = 0;

        emit!(GatewaySignerChangeClaimed {
            gateway: gateway.key(),
            old_signer,
            new_signer: gateway.signer,
            claimed_slot: current_slot,
        });

        msg!(
            "Gateway signer claimed: {:?} -> {:?} at slot {}",
            old_signer,
            gateway.signer,
            current_slot
        );

        Ok(())
    }
}
```

**Add a cancel instruction for the proposal:**

```rust
// programs/tributary/src/instructions/cancel_gateway_signer_change.rs

use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CancelGatewaySignerChange<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key() @ TributaryError::Unauthorized
    )]
    pub gateway: Account<'info, PaymentGateway>,
}

impl<'info> CancelGatewaySignerChange<'info> {
    pub fn handler_cancel_gateway_signer_change(
        ctx: Context<CancelGatewaySignerChange>,
    ) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;

        require!(
            gateway.pending_signer != Pubkey::default(),
            TributaryError::NoPendingSignerChange
        );

        let cancelled_signer = gateway.pending_signer;
        gateway.pending_signer = Pubkey::default();
        gateway.pending_signer_proposed_slot = 0;

        msg!(
            "Pending signer change cancelled: {:?} for gateway: {:?}",
            cancelled_signer,
            gateway.key()
        );

        Ok(())
    }
}
```

**Wire into `lib.rs` (replace the existing `change_gateway_signer` entry):**

```rust
pub fn propose_gateway_signer(ctx: Context<ProposeGatewaySigner>) -> Result<()> {
    ProposeGatewaySigner::handler_propose_gateway_signer(ctx)
}

pub fn claim_gateway_signer(ctx: Context<ClaimGatewaySigner>) -> Result<()> {
    ClaimGatewaySigner::handler_claim_gateway_signer(ctx)
}

pub fn cancel_gateway_signer_change(
    ctx: Context<CancelGatewaySignerChange>,
) -> Result<()> {
    CancelGatewaySignerChange::handler_cancel_gateway_signer_change(ctx)
}
```

**Set `signer_change_delay_slots` at gateway creation time.** A sensible default: ~43,200 slots (~2 days at 400ms/slot). This should be a parameter in `create_payment_gateway`.

### C. On-chain Timelock: Generic Admin Change Queue (Code Change, More Complex)

For a more comprehensive solution, add a generic timelock queue that covers all admin operations, not just signer changes.

**Additional state fields on `PaymentGateway`:**

```rust
#[account]
pub struct PaymentGateway {
    // ... existing fields ...
    pub pending_signer: Pubkey,
    pub pending_signer_proposed_slot: u64,
    pub signer_change_delay_slots: u64,
    /// Minimum timelock in slots for fee_bps and fee_recipient changes
    pub admin_timelock_slots: u64,
    /// Pending fee bps change
    pub pending_fee_bps: u16,
    pub pending_fee_bps_proposed_slot: u64,
    /// Pending fee recipient change
    pub pending_fee_recipient: Pubkey,
    pub pending_fee_recipient_proposed_slot: u64,
    pub padding: [u8; 27],  // further reduced
}
```

**Instruction pair pattern (shown for fee_bps, same pattern applies to fee_recipient):**

```rust
// programs/tributary/src/instructions/schedule_gateway_fee_bps.rs

use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ScheduleGatewayFeeBpsArgs {
    pub new_fee_bps: u16,
}

#[derive(Accounts)]
pub struct ScheduleGatewayFeeBps<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key() @ TributaryError::Unauthorized
    )]
    pub gateway: Account<'info, PaymentGateway>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused,
    )]
    pub config: Account<'info, ProgramConfig>,
}

impl<'info> ScheduleGatewayFeeBps<'info> {
    pub fn handler(ctx: Context<ScheduleGatewayFeeBps>, args: ScheduleGatewayFeeBpsArgs) -> Result<()> {
        require!(args.new_fee_bps <= 10000, TributaryError::InvalidFeeBps);

        let gateway = &mut ctx.accounts.gateway;
        gateway.pending_fee_bps = args.new_fee_bps;
        gateway.pending_fee_bps_proposed_slot = Clock::get()?.slot;

        msg!(
            "Fee BPS change scheduled: {} -> {}, executes after slot {}",
            gateway.gateway_fee_bps,
            args.new_fee_bps,
            gateway.pending_fee_bps_proposed_slot + gateway.admin_timelock_slots
        );

        Ok(())
    }
}
```

```rust
// programs/tributary/src/instructions/execute_gateway_fee_bps.rs

use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ExecuteGatewayFeeBps<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key() @ TributaryError::Unauthorized
    )]
    pub gateway: Account<'info, PaymentGateway>,
}

impl<'info> ExecuteGatewayFeeBps<'info> {
    pub fn handler(ctx: Context<ExecuteGatewayFeeBps>) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;
        let current_slot = Clock::get()?.slot;

        let executable_after = gateway.pending_fee_bps_proposed_slot
            .checked_add(gateway.admin_timelock_slots)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        require!(
            current_slot >= executable_after,
            TributaryError::SignerChangeTimelockNotExpired  // reuse or add specific error
        );

        let old_fee_bps = gateway.gateway_fee_bps;
        gateway.gateway_fee_bps = gateway.pending_fee_bps;
        gateway.pending_fee_bps = 0;
        gateway.pending_fee_bps_proposed_slot = 0;

        emit!(GatewayFeeBpsChanged {
            gateway: gateway.key(),
            old_fee_bps,
            new_fee_bps: gateway.gateway_fee_bps,
        });

        msg!(
            "Fee BPS change executed: {} -> {} at slot {}",
            old_fee_bps,
            gateway.gateway_fee_bps,
            current_slot
        );

        Ok(())
    }
}
```

**Account size impact:**

Each new field pair (pending value + proposed_slot) costs:

- `u16` + `u64` = 10 bytes (for fee_bps)
- `Pubkey` + `u64` = 40 bytes (for fee_recipient)
- Total: 50 bytes consumed from the 117-byte padding, leaving 67 bytes.

---

## Recommendation

| Priority             | Action                                             | Effort                                        | Risk Reduction                              |
| -------------------- | -------------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| **1 (Immediate)**    | Set up Squads M-of-N multisig as gateway authority | Low (ops only)                                | Eliminates single-key compromise            |
| **2 (Next release)** | Implement two-step signer change (Patch B)         | Medium (3 new instructions + state migration) | Protects the most critical operation        |
| **3 (Future)**       | Generic timelock queue for all admin ops (Patch C) | High (6+ instruction pairs + state migration) | Full protection for all admin state changes |

**Why this order:**

1. Squads multisig requires zero code changes and can be deployed today. It provides M-of-N protection and Squads' built-in timelock.

2. The signer change is the highest-risk single operation — it grants payment execution power. The two-step pattern with on-chain delay ensures that even if the multisig is bypassed (insider attack), there's a time window for detection.

3. The generic timelock is the right long-term architecture but requires significant state migration and testing. Don't let perfect be the enemy of good — ship patches A and B first.

**Minimum viable fix:** Patch A (Squads) + Patch B (two-step signer change). This covers 80% of the risk with 20% of the effort.

---

## Testing Instructions

### Test A: Squads Multisig (Integration)

```bash
# 1. Deploy a Squads multisig on devnet (3-of-5)
# Use Squads SDK or CLI

# 2. Create gateway with multisig as authority
npx tributary-manager create-gateway \
  --keypair <MULTISIG_PDA> \
  --fee-bps 100 \
  --name "test-multisig-gateway"

# 3. Attempt admin operation with single key (should fail)
npx tributary-manager change-signer \
  --keypair <SINGLE_KEY> \
  --new-signer <ATTACKER_KEY>
# Expected: "Unauthorized" error

# 4. Submit proposal through Squads, confirm M-of-N required
# Expected: Transaction succeeds only after threshold signatures
```

### Test B: Two-step Signer Change (Unit)

```typescript
describe("Two-step signer change", () => {
  it("proposes a signer change and rejects immediate claim", async () => {
    // Set delay to 100 slots
    await program.methods
      .createPaymentGateway(100, name, url)
      .accounts({ authority: authority, config: configPda, ... })
      .rpc();

    // Propose
    await program.methods
      .proposeGatewaySigner()
      .accounts({
        authority: authority,
        gateway: gatewayPda,
        proposedSigner: newSigner.publicKey,
        config: configPda,
      })
      .rpc();

    // Attempt to claim before delay (advance only 50 slots)
    await advanceSlots(50);

    await assert.rejects(
      program.methods
        .claimGatewaySigner()
        .accounts({
          authority: authority,
          gateway: gatewayPda,
          claimedSigner: newSigner.publicKey,
        })
        .rpc(),
      /SignerChangeTimelockNotExpired/
    );

    // Verify signer has NOT changed
    const gw = await program.account.paymentGateway.fetch(gatewayPda);
    assert.notEqual(gw.signer.toBase58(), newSigner.publicKey.toBase58());
    assert.equal(gw.pendingSigner.toBase58(), newSigner.publicKey.toBase58());
  });

  it("allows claim after timelock expires", async () => {
    // Advance past the delay
    await advanceSlots(60); // total 110 > 100

    await program.methods
      .claimGatewaySigner()
      .accounts({
        authority: authority,
        gateway: gatewayPda,
        claimedSigner: newSigner.publicKey,
      })
      .rpc();

    const gw = await program.account.paymentGateway.fetch(gatewayPda);
    assert.equal(gw.signer.toBase58(), newSigner.publicKey.toBase58());
    assert.equal(gw.pendingSigner.toBase58(), PublicKey.default.toBase58());
  });

  it("authority can cancel a pending signer change", async () => {
    // Propose again
    await program.methods
      .proposeGatewaySigner()
      .accounts({
        authority: authority,
        gateway: gatewayPda,
        proposedSigner: anotherSigner.publicKey,
        config: configPda,
      })
      .rpc();

    // Cancel
    await program.methods
      .cancelGatewaySignerChange()
      .accounts({ authority: authority, gateway: gatewayPda })
      .rpc();

    const gw = await program.account.paymentGateway.fetch(gatewayPda);
    assert.equal(gw.pendingSigner.toBase58(), PublicKey.default.toBase58());
    assert.equal(gw.pendingSignerProposedSlot.toNumber(), 0);
  });

  it("rejects claim with wrong signer", async () => {
    // Propose newSigner
    await program.methods
      .proposeGatewaySigner()
      .accounts({
        authority: authority,
        gateway: gatewayPda,
        proposedSigner: newSigner.publicKey,
        config: configPda,
      })
      .rpc();

    await advanceSlots(200);

    // Try to claim with a DIFFERENT key
    await assert.rejects(
      program.methods
        .claimGatewaySigner()
        .accounts({
          authority: authority,
          gateway: gatewayPda,
          claimedSigner: wrongSigner.publicKey, // mismatch
        })
        .rpc(),
      /PendingSignerMismatch/
    );
  });

  it("non-authority cannot propose signer change", async () => {
    await assert.rejects(
      program.methods
        .proposeGatewaySigner()
        .accounts({
          authority: unauthorized, // not the gateway authority
          gateway: gatewayPda,
          proposedSigner: someKey.publicKey,
          config: configPda,
        })
        .rpc(),
      /Unauthorized/
    );
  });
});
```

Helper for advancing slots in local validator:

```typescript
async function advanceSlots(count: number) {
  const slot = await provider.connection.getSlot();
  // In tests with local-validator, use:
  await provider.connection.requestAirdrop(
    provider.wallet.publicKey,
    anchor.web3.LAMPORTS_PER_SOL
  );
  // For deterministic slot advancement, use `solana-test-validator --warp-slot`
  // Or in anchor tests: manual slot advancement via the bank
}
```

### Test C: Generic Timelock Queue (Unit)

Same pattern as Test B but applied to `schedule_gateway_fee_bps` / `execute_gateway_fee_bps` and `schedule_gateway_fee_recipient` / `execute_gateway_fee_recipient`. Verify:

- Scheduled change visible in pending state
- Execution rejected before timelock
- Execution succeeds after timelock
- Cancel clears pending state
- Non-authority cannot schedule or execute
