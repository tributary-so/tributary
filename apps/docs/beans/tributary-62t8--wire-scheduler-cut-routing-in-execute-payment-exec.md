---
# tributary-62t8
title: Wire scheduler cut routing in execute_payment + execute_composable
status: todo
type: task
priority: high
created_at: 2026-06-29T12:49:25Z
updated_at: 2026-06-29T12:49:25Z
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
