---
# tributary-b5cs
title: 'M1: Finish utils.rs extraction — split referral, calendar, mint modules'
status: completed
type: task
priority: normal
created_at: 2026-06-22T12:05:07Z
updated_at: 2026-06-22T12:22:11Z
---

utils.rs is 1236 lines with three cohesive concerns that should have moved to shared/ during the prior extraction (commit 36872f3): (1) referral logic → shared/referral.rs; (2) calendar math → extend shared/schedule.rs; (3) mint validation → shared/mint.rs. Pure file move — no behavior change. Run anchor test to confirm.

Report: reports/M1-utils-rs-stalled-extraction-1236-lines.md

## Summary of Changes

M1 extraction complete. utils.rs went from **1236 → 12 lines** (just a stub doc comment).

**Files created:**
- `programs/tributary/src/shared/referral.rs` (514 lines) — `ReferralContext`, `AuthorityMode`, `process_referral_rewards`, `parse_and_validate_referral_accounts`, `validate_referral_chain_topology`, `load_referral_account`, `transfer_referral_reward`, `MAX_REFERRAL_CHAIN_DEPTH`, plus 9 C-02 chain-topology tests.
- `programs/tributary/src/shared/mint.rs` (164 lines) — `validate_mint_compatible`, Token-2022 extension allowlist imports, plus 8 C-03 extension-rejection tests.

**Files extended:**
- `programs/tributary/src/shared/schedule.rs` (272 → 862 lines) — `calculate_next_payment_due`, `add_months`, `is_leap_year`, `get_days_in_month`, `skip_fixed_interval`, `skip_months`, `MAX_MONTHLY_ITERATIONS` + 9 calendar-math chrono-comparison tests lifted verbatim from utils.rs.

**Files updated (call-site imports):**
- `instructions/payment/transfer.rs` — referral + mint imports from shared::*
- `instructions/payment/execute_payment.rs` — referral + mint imports from shared::*
- `instructions/composable/execute_composable.rs` — mint import from shared::*
- `instructions/user/create_user_payment.rs` — mint import from shared::*
- `instructions/payment/create_payment_policy.rs` — mint import from shared::*
- `instructions/composable/create_composable_policy.rs` — mint import from shared::*
- `policies/subscription.rs` — calculate_next_payment_due from shared::schedule
- `shared/mod.rs` — registered `pub mod referral;` and `pub mod mint;`

**Verification:**
- `cargo build -p tributary` → success (3 pre-existing warnings unrelated to refactor)
- `cargo test -p tributary --lib` → **51 passed, 0 failed** (all 34 relocated tests pass under their new module paths)
- `anchor build` → success (pre-existing BPF driftsort_main stack-frame warning unchanged)
- No re-exports from utils.rs — all callers import from `shared::*` directly
- `reports/` directory untouched
