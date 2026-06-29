---
# tributary-ru3b
title: Promote ValidationPda to typed Anchor account; drop num_validation_accounts
status: completed
type: task
priority: high
created_at: 2026-06-27T14:43:59Z
updated_at: 2026-06-29T16:03:59Z
parent: tributary-pdj8
---

Closes validation-gaming vector (d) from ADR-0016 by pinning validation target accounts at creation. Structural refactor — always-on (not a permissionless-mode gate).

**ValidationPda struct** (`programs/tributary/src/state/validation_pda.rs`): promote from hand-parsed byte blob to typed Anchor account per ADR-0016 spec:
```
bump: u8
num_pinned_accounts: u8          // arity {0,1,2}: 0=sysvarClock, 2=accountDelta
pinned_accounts: [Pubkey; 2]     // owner-declared Lighthouse targets
data_len: u16
data: [u8; 1024]                 // assertion bytes, passed verbatim to Lighthouse
```
Update `ValidationPda::SIZE` / `space_for`. Max arity 2 sets the `[Pubkey; 2]` capacity; the old `num_validation_accounts <= 10` loose bound disappears.

**Drop num_validation_accounts** (`state/composable_policy.rs` `ValidationConfig`, `create_composable_policy` handler args, the `<= 10` check). Arity now lives in `num_pinned_accounts` on the struct.

**create_composable_policy** (`instructions/composable/create_composable_policy.rs`): replace the manual offset-8/10 `invoke_signed(create_account)` + byte writes with Anchor typed init/deserialisation. Accept the pinned account pubkeys + arity from the caller (SDK already has them from `lighthouse.build().accounts` / `.numAccounts`).

**execute_composable / run_validation_cpi** (`instructions/composable/execute_composable.rs`): pull ValidationPda OUT of `remaining_accounts` into a typed `Option<Account<'info, ValidationPda>>` field (`None` when validation disabled via SystemProgram sentinel). Read typed fields. For `i in 0..num_pinned_accounts`: `require!(remaining_accounts[i].key() == pinned_accounts[i])`. Pinned-set length = boundary between validation slice and forward slice (the role num_validation_accounts used to play). `remaining_accounts` collapses to `[...validation_targets, ...forward_accounts]`. Lighthouse still receives assertion bytes verbatim + read-only non-signer accounts (ADR-0008 signer sanitisation unchanged).

**Tests**: Rust unit tests for the pinning/validation logic; update `tests/topup-balance*.test.ts` to supply pinned accounts at create and assert relayer substitution reverts.

**Acceptance**: validation accounts owner-pinned at creation; relayer cannot substitute them; num_validation_accounts gone; Anchor owns the layout (no offset-8/10 reads remain).

## Progress (Task A)

- [x] ValidationPda promoted to typed Anchor account (bump / num_pinned_accounts / pinned_accounts[2] / data_len / data[1024])
- [x] Dropped num_validation_accounts from ValidationConfig + create_composable_policy args
- [x] create_composable_policy writes typed struct via try_to_vec (no more offset-8/10 writes)
- [x] execute_composable: ValidationPda pulled out of remaining_accounts into named UncheckedAccount field, typed-deserialised + seed-checked + pin-checked inside run_validation_cpi (callee frame keeps the 1KiB struct off the handler stack)
- [x] Rust unit tests: size, pinned slice arity, data_len slice, borsh round-trip
- [x] cargo test: 83 passed

## Summary of Changes (Task A)

- `state/validation_pda.rs`: promoted to typed Anchor account. Fields: bump, num_pinned_accounts, pinned_accounts[2], data_len, data[1024]. SIZE=1100. Added pinned()/get_data() helpers + Default impl. 6 new unit tests (size, pinned arity, data_len slice, borsh round-trip, freshness guards).
- `state/composable_policy.rs`: dropped num_validation_accounts from ValidationConfig. SIZE 33→32 (pre-launch, no migration).
- `instructions/composable/create_composable_policy.rs`: handler now accepts (num_pinned_accounts, pinned_accounts: [Pubkey; 2]) instead of num_validation_accounts. Writes the typed ValidationPda via try_to_vec (replaces offset-8/10 manual writes). Arity bounded by MAX_PINNED_ACCOUNTS.
- `instructions/composable/execute_composable.rs`: added named validation_pda UncheckedAccount field. run_validation_cpi now (a) verifies PDA seeds, (b) typed-deserialises ValidationPda via AccountDeserialize (replaces raw offset reads), (c) pin-checks remaining_accounts[0..num_pinned] == pinned_accounts, (d) runs the Lighthouse CPI. The 1KiB struct lives in the callee frame, keeping the handler under the SBF 4KiB stack budget.
- `lib.rs`: create_composable_policy signature updated.
- `error.rs`: existing InvalidValidationPda / ValidationPdaMismatch reused for pin-check failures.

cargo test: 83 passed (7 new ValidationPda tests + all pre-existing green).
