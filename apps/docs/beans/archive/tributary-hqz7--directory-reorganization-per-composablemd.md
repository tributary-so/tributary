---
# tributary-hqz7
title: Directory Reorganization per COMPOSABLE.md
status: completed
type: task
priority: high
created_at: 2026-06-17T08:40:32Z
updated_at: 2026-06-17T19:19:36Z
---

Move flat instruction files into payment/, gateway/, user/, referral/ subdirs (per COMPOSABLE.md §Directory Structure). Rename shared/strategies.rs to shared/schedule.rs. Extract token*account_has*\* helpers into shared/delegation.rs. Refactor execute_payment to use shared::fees + shared::delegation. Remove duplicate schedule logic from execute_composable by routing through shared::schedule. Zero behavior changes; cargo check + cargo test --lib must remain green.

Important, take @reports/M-04-inconsistent-month-arithmetic.md into account
understand that monthly is a predefined enum and represents a full month, not
representable via seconds!!

## Plan

### Current state (audit)

- `instructions/` is FLAT — 17 files mixing payment/gateway/user/referral/transfer.
- `instructions/composable/` already exists (only subdir).
- `shared/` exists with: `fees.rs`, `delegation.rs`, `strategies.rs` (spec calls this `schedule.rs`), `validation.rs`.
- `policies/` exists and operates ONLY on `PaymentPolicy`/`PolicyType` — spec says it stays unchanged.
- **Duplication found:**
  - `token_account_has_delegate` + `token_account_has_any_delegate` live in `execute_payment.rs`, imported by `execute_composable.rs` via `crate::instructions::execute_payment::...` — should move to `shared/delegation.rs`.
  - `execute_payment.rs` has inline fee math (lines 209-245) that is a 1:1 port of `shared::fees::calculate_fees` — never calls it.
  - `execute_payment.rs` has inline delegate resolution (lines 152-171) that duplicates `shared::delegation::resolve_delegate` — never calls it.
  - `execute_composable.rs` has `resolve_schedule_amount_and_advance` (lines 24-92) that duplicates `shared::strategies::validate_schedule_execution` + `advance_schedule` — never calls them.
  - `shared/strategies.rs::advance_schedule` for `Timed` recomputes `PaymentFrequency` seconds inline (12 lines) instead of calling `utils::calculate_next_payment_due` which already does it (used by `policies/subscription.rs`).

### Phase 1 — Pure DRY extraction (no renames, no moves)

- [x] Move `token_account_has_delegate` + `token_account_has_any_delegate` from `execute_payment.rs` to `shared/delegation.rs`. Update both call sites.
- [x] Refactor `execute_payment.rs` to call `shared::fees::calculate_fees` (drop inline math).
- [x] Refactor `execute_payment.rs` to call `shared::delegation::resolve_delegate` (drop inline resolution).
- [x] Refactor `execute_composable.rs` to drop `resolve_schedule_amount_and_advance` and call `shared::schedule::validate_schedule_execution` + `advance_schedule`. Preserve the existing PAYG `forward_amount` override path.
- [x] Refactor `shared/strategies.rs::advance_schedule` (Timed branch) to call `utils::calculate_next_payment_due` instead of inline `secs` match. **(M-04 fix)**
- Verify: `cargo check` + `cargo test --lib` still pass (10/10).

### Phase 2 — Rename shared/strategies.rs → shared/schedule.rs (matches spec)

- [x] `git mv shared/strategies.rs shared/schedule.rs`; update `shared/mod.rs`.
- Verify: `cargo check`.

### Phase 3 — Directory reorg (move files, no logic changes)

- [x] Create `instructions/{payment,gateway,user,referral}/mod.rs` files.
- [x] `git mv` files into subdirs (preserves history):
  - `payment/`: execute_payment, create_payment_policy, delete_payment_policy, change_payment_policy_status, transfer
  - `gateway/`: create_payment_gateway, delete_payment_gateway, change_gateway_fee_recipient, change_gateway_signer, change_gateway_fee_bps, update_gateway_feature_flags, update_gateway_protocol_fee, update_gateway_referral_settings
  - `user/`: create_user_payment, delete_user_payment
  - `referral/`: create_referral_account
- [x] Update `instructions/mod.rs` to declare submodules + re-exports.
- [x] Update the ONE cross-module import in `execute_composable.rs` (`crate::instructions::execute_payment::token_account_has_any_delegate`) — already gone after Phase 1.
- Verify: `cargo check` + `cargo test --lib`.

### Phase 4 — Out-of-scope (defer)

- Introducing the `Schedule` trait from the spec (aspirational; current function-based approach works).
- Changing `policies/` module (spec mandates unchanged).
- Composable fee output-based `calculate_fees` variant (different signature; separate task).

### Safety guarantees

- No enum sizes touched, no PDA seeds changed, no validation logic modified.
- All refactors are pure code-motion + DRY call-site swaps.
- Cargo check + lib tests gate every phase.

## Summary of Changes

### M-04 Fix (critical)
- **`shared/schedule.rs::advance_schedule::Timed`** now calls `utils::calculate_next_payment_due` (real calendar-month math with month-end clamping) instead of the legacy fixed-seconds lookup (`Monthly => 2592000`, etc.).
- The composable `Timed` schedule and the subscription path now advance `PaymentFrequency` through the **same** algorithm — no drift.
- Added 9 unit tests in `shared/schedule.rs` guarding the calendar-month path and asserting it differs from the legacy fixed-seconds values.

### Phase 1 — DRY extraction
- Moved `token_account_has_delegate` + `token_account_has_any_delegate` from `execute_payment.rs` into `shared/delegation.rs` (single home for delegate-check helpers).
- Refactored `execute_payment.rs` to call `shared::fees::calculate_fees` (dropped ~35 lines of inline fee math).
- Refactored `execute_payment.rs` to call `shared::delegation::resolve_delegate` (dropped ~20 lines of inline delegate resolution).
- Deleted the inline `resolve_schedule_amount_and_advance` from `execute_composable.rs`; the handler now routes through `shared::schedule::validate_schedule_execution` + `advance_schedule`. PAYG `forward_amount` override path preserved.

### Phase 2 — Rename
- `git mv shared/strategies.rs → shared/schedule.rs` (matches COMPOSABLE.md spec). Updated `shared/mod.rs` and the `execute_composable.rs` import.

### Phase 3 — Directory reorg
- Created `instructions/{payment,gateway,user,referral}/` subdirs with `mod.rs` re-exports.
- `git mv`'d 16 instruction files into their domain subdirs (history preserved).
- Updated top-level `instructions/mod.rs` to declare the new submodules + `initialize` (kept top-level as a singleton).
- All 21 program instructions still present in the generated IDL — verified via `anchor build`.

### Verification
- `cargo check`: clean (3 pre-existing dead-code warnings for the commented-out forward CPI path).
- `cargo test --lib`: **43 passed, 0 failed** (was 34; +9 new M-04 guard tests).
- `cargo clippy --lib`: 25 warnings, same count as before the refactor (no new lint introduced).
- `anchor build`: IDL regenerated, 21 instructions preserved.

### Files touched
```
programs/tributary/src/
├── instructions/
│   ├── mod.rs                        (updated: new submodule declarations)
│   ├── composable/execute_composable.rs (refactored: shared::schedule)
│   ├── payment/                      (NEW subdir + mod.rs)
│   │   ├── execute_payment.rs        (moved + refactored: shared::fees + shared::delegation)
│   │   └── ... 4 more moved files
│   ├── gateway/                      (NEW subdir + mod.rs, 8 moved files)
│   ├── user/                         (NEW subdir + mod.rs, 2 moved files)
│   └── referral/                     (NEW subdir + mod.rs, 1 moved file)
└── shared/
    ├── mod.rs                        (updated: strategies → schedule)
    ├── delegation.rs                 (added token_account_has_* helpers)
    ├── schedule.rs                   (RENAMED from strategies.rs; M-04 fix + tests)
    └── └── ❌ strategies.rs          (deleted via rename)
```
