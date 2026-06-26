---
# tributary-361p
title: 'C-02: Referral Chain Not Re-Validated at Execution'
status: completed
type: bug
priority: critical
tags:
    - security
    - audit
created_at: 2026-06-17T11:56:56Z
updated_at: 2026-06-17T12:51:02Z
parent: tributary-4kt4
---

Implement recommendation from reports/C-02-referral-chain-not-validated-at-execution.md: validate referral chain integrity at payment execution time, bind chain to payer, reject duplicates, fix tier assignment by depth.

## Tasks

- [x] Refactor utils.rs: add payer_wallet to ReferralContext
- [x] Rewrite parse_and_validate_referral_accounts to require payer_referral at position 0
- [x] Walk chain via referrer pointers; bind origin to payer_referral.referrer
- [x] Reject duplicate referral accounts (Vec seen-set, avoids BPF stack overflow)
- [x] Assign reward tiers by chain depth (L1=direct, not array position)
- [x] Update execute_payment.rs and transfer.rs to pass payer_wallet
- [x] Update SDK (executePayment + transfer) to prepend payer_referral via buildReferralRemainingAccounts
- [x] Add Rust unit tests for chain-walk validation (9 cases)
- [x] Update integration tests in tests/tributary.test.ts (added 2 negative tests)
- [x] Run cargo test + anchor test (no pnpm lint script exists)

## Summary of Changes

Implements all five recommendations from reports/C-02-referral-chain-not-validated-at-execution.md plus the hardening recommendation:

1. **Payer binding**: `ReferralContext` now carries `payer_wallet`. `parse_and_validate_referral_accounts` requires `remaining_accounts[0]` to be the payer's own `ReferralAccount` and asserts `data.owner == payer_wallet` (else `PayerReferralMismatch`).
2. **Chain integrity**: `validate_referral_chain_topology` (pure fn, fully unit-tested) walks the `referrer` pointers and requires `chain[i].referrer == chain[i+1].key`, binding the head to `payer_referral.referrer`.
3. **Duplicate rejection**: small fixed-size `Vec<Pubkey>` seen-set covers payer + chain (avoids the BPF stack overflow triggered by `BTreeSet`'s driftsort).
4. **Tier-by-depth**: reward tiers are assigned by walking the chain in order `[L1, L2, L3]` (direct referrer first). This also fixes a pre-existing latent bug where the original `level1 = referral_accounts.last()` mapping reversed the SDK-supplied order.
5. **Hardening**: tail of a sub-max-depth chain must terminate at `Pubkey::default()` — surfaces tampering that would otherwise silently truncate.

**API change** (breaking): `remaining_accounts` layout is now `[payer_referral, L1, L2, L3, ATA_L1, ATA_L2, ATA_L3]` instead of `[L1, L2, L3, ATA_L1, ATA_L2, ATA_L3]`. SDK updated via new `buildReferralRemainingAccounts` helper used by both `executePayment` and `transfer`.

**New error variants**: `PayerReferralMismatch`, `DuplicateReferralAccount`.

**Test results**: 18 Rust unit tests pass (9 new chain-topology cases); 84 integration tests pass (73 tributary + 11 composable), including 2 new negative tests proving the on-chain code rejects (a) a chain not bound to the payer and (b) duplicate referral accounts.
