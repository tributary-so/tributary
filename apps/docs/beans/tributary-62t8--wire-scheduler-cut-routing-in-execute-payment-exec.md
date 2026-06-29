---
# tributary-62t8
title: Wire scheduler cut routing in execute_payment + execute_composable
status: completed
type: task
priority: high
created_at: 2026-06-29T12:49:25Z
updated_at: 2026-06-29T14:24:33Z
parent: tributary-5gf3
blocked_by:
    - tributary-wuhf
---

Settlement-path wiring for the scheduler cut (ADR-0017).

In both execute_payment and execute_composable, after calculate_fees() produces the FeeBreakdown:

Trusted path (signer == gateway.signer):
- scheduler_cut merges into the gateway.fee_recipient transfer
- No extra account needed
- One transfer: (gateway_residual + scheduler_cut) → gateway.fee_recipient

Permissionless path (signer != gateway.signer — includes third-party scheduler, owner, recipient self-cranking):
- scheduler_cut routes to the signer's token account
- The signer's ATA is supplied as a remaining_account
- Program verifies: account.owner == ctx.payer (signer) AND account.mint == source_mint
- Transfer: scheduler_cut → signer ATA; gateway_residual → gateway.fee_recipient (separate)

The routing decision is one branch: if ctx.payer.key() == gateway.signer { merge } else { split + verify remaining_account }.

Referral tier distribution and protocol cut routing are unchanged — they already go to their respective accounts.

TDD: trusted-path merge test, permissionless-path split test, wrong-owner-ATA rejection test, missing-remaining-account rejection test, owner-self-crank routes to owner ATA, recipient-self-crank routes to recipient ATA.

## Summary of Changes

Implemented the scheduler cut routing branch (ADR-0017) in both execute paths.

### Files changed (all in programs/tributary/src/):
- **error.rs**: Added `MissingSchedulerFeeAccount` and `InvalidSchedulerFeeAccount` error variants.
- **instructions/payment/execute_payment.rs**: Added permissionless routing branch.
- **instructions/composable/execute_composable.rs**: Added permissionless routing branch (handler strip + `process_output_and_sweep` split).

### remaining_accounts layout for the scheduler ATA:
The scheduler ATA is the **LAST** remaining_account, appended after referral accounts (payment path) or forward accounts (composable path). The program strips it BEFORE passing the sub-slice to the referral parser or validation/forward CPI, so those parsers see only their own accounts.

**Strip condition (consistent for both paths)**: `is_permissionless (fee_payer != gateway.signer) && gateway.scheduler_share_bps > 0`. This condition is deterministic from on-chain state known before forward CPI, so caller and program always agree on whether the trailing account is present. If `scheduler_cut` rounds to 0 on a small payment, the account is stripped but the transfer is simply skipped.

**Validation**: `owner == fee_payer.key() && mint == source_mint` (payment) or `mint == output_mint` (composable, since fees are taken from swap output).

### Routing logic:
- **Trusted** (`fee_payer == gateway.signer`): `gateway_amount = gateway_residual + scheduler_cut` → single transfer to `gateway.fee_recipient`.
- **Permissionless**: `scheduler_cut → caller ATA` (validated), `gateway_residual → gateway.fee_recipient` (separate transfers).

### Test results:
- `cargo build`: clean
- `cargo test --lib`: 79 passed, 0 failed
- `cargo clippy --lib`: no new warnings from changed code

## Summary of Changes

Implemented in commits a81ca50 (D+E) and c51a201 (F).
