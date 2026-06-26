---
# tributary-0uad
title: 'L-2: Document referral tier semantics relative to allocation'
status: completed
type: task
priority: low
tags:
    - security
    - audit
created_at: 2026-06-20T14:14:43Z
updated_at: 2026-06-20T14:18:31Z
---

Add documentation clarifying that referral_tiers_bps is a split of the referral pool (not gateway fee), and its interaction with referral_allocation_bps. Files: state/payment_gateway.rs, instructions/gateway/update_gateway_referral_settings.rs, utils.rs.

## Summary of Changes

Docs-only fix clarifying that `referral_tiers_bps` is a share of the referral *pool*, not the gateway fee.

- `programs/tributary/src/state/payment_gateway.rs`: rewrote field docs for `referral_allocation_bps` (bps of gateway fee → pool, range 0..=2500) and `referral_tiers_bps` (split of pool, must sum to 10000), with a worked example showing the effective per-level gateway-fee cut.
- `programs/tributary/src/instructions/gateway/update_gateway_referral_settings.rs`: tightened the `UpdateGatewayReferralSettingsArgs` field docs to point at the same relationship.
- `programs/tributary/src/utils.rs`: added a doc comment on `process_referral_rewards` describing the two-stage split, plus inline `Stage 1`/`Stage 2` labels on the calculations.

Verification: `cargo build` passes (exit 0). Clippy `-D warnings` surfaces only pre-existing nits in unrelated code (utils.rs:451+, closures/derefs); no new findings in edited regions.

Deferred (non-urgent): the report's secondary suggestion — a `dry_run` view instruction emitting per-level effective bps — was not implemented. The existing `ReferralRewardDistributedRecord` event already emits actual per-execution rewards, which partially covers operator verification. Open a follow-up bean if a pre-execution preview is wanted.
