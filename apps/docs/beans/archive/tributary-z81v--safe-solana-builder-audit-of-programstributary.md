---
# tributary-z81v
title: Safe Solana Builder audit of programs/tributary
status: completed
type: task
priority: high
created_at: 2026-07-03T05:58:51Z
updated_at: 2026-07-03T06:26:24Z
---

Run Frank Castle's Safe Solana Builder skill against the Tributary Anchor program. Read shared-base.md + anchor.md rules, map program sources, cross-check against tributary.qedspec, ADRs, CONTEXT.md, formal_verification/README.md. Emit one report per finding under ./reports/.

## Summary of Changes

Audited programs/tributary against safe-solana-builder skill (shared-base.md + anchor.md), cross-referenced with tributary.qedspec, all 22 ADRs, CONTEXT.md, and formal_verification/README.md.

Produced 13 distinct reports under ./reports/:
- 1 High (H-01): i64 overflow in PayAsYouGo period-rollover guard (schedule.rs:359,463) — STILL UNFIXED in production code, tracked in bean tributary-vtne, masked at Layer 1 by fix-kani.py Bug E.2.
- 5 Medium (M-01..M-05): one-step gateway-signer rotation; immutable ProgramConfig.admin; delete_payment_policy missing Active-status check; delete_payment_gateway orphans policies + rugs rent; missing distinct-pubkey constraints on fee/recipient accounts.
- 5 Low (L-01..L-05): create_user_payment uses legacy SPL types (Token-2022 inconsistent); referral create lets anyone register on any owner; owner execution routed as 'permissionless' for scheduler cut; memo fields unvalidated; forward pin-check returns misleading ByteRangeCheckFailed error.
- 2 Informational (I-01, I-02): composable mint-validation timing; Anchor 0.31 lacks 0.32's duplicate-mutable-account auto-check.

H-01 is the headline — A2 (period_bounded) silently breaks in release builds when current_period_start + period_length_seconds overflows i64. Fix is one-line saturating_add at two sites.

No findings against the existing ADRs themselves (they are documentation; one nit: ADR-0006 cited as the signer-rotation limitation reference but it actually covers fees, superseded by ADR-0018).
