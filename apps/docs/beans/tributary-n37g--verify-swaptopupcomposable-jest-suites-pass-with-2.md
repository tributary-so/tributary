---
# tributary-n37g
title: Verify swap/topup/composable jest suites pass with 2 forward pins
status: completed
type: task
priority: normal
created_at: 2026-07-12T19:12:53Z
updated_at: 2026-07-13T06:46:15Z
parent: tributary-mmmi
blocked_by:
    - tributary-jsna
    - tributary-uizu
---

Parent tributary-mmmi. The integration suites construct InstructionConstraint fixtures with pinned_accounts arrays (currently padded to 4). After the const drops to 2, every fixture must still construct valid configs AND the DLMM swap suite must still execute a real swap CPI against Surfpool.

## Touch points (all in tests/)
- `topup-balance-swap.test.ts:447` — swap forward config pinned_accounts (the critical one — real DLMM CPI).
- `topup-balance.test.ts:396`, `topup-balance-sol.test.ts:425` — no-swap forward configs.
- `composable.test.ts:74,1145` + `defaultForwardConfig` helper — many call sites.
- `composable-fee-rebase.test.ts:316`, `one-time-payment.test.ts:492` — composable fixtures.
- `sdk-composable-constructor.test.ts:61` — SDK constructor forward config.

## Acceptance criteria
- [x] Start Surfpool: `surfpool start --legacy-anchor-compatibility --no-tui`.
- [x] Jest suites green (1 pre-existing failure in sdk-composable-constructor unrelated to pin reduction; fails identically on develop).
- [x] topup-balance-swap.test.ts passes (real DLMM swap with 2 pins — confirms tributary-ahfg FEASIBLE).
- [x] No config supplies >2 real pins — max 1 real pin + sentinels. No escalation.
- [x] No Lighthouse assertion >512B — all simple balance checks <200B. No-op.

## Summary of Changes

### IDL rebuild
- anchor build regenerated target/idl/tributary.json + target/types/tributary.ts — pinned_accounts now [PinnedAccount; 2].

### SDK constant
- packages/sdk/src/constants.ts: MAX_PINNED_FORWARD_ACCOUNTS 4 -> 2. makeValidationInit auto-tracks.

### Test fixtures (8 files)
- All pinnedAccounts arrays 4 -> 2 entries. Real pin counts unchanged (max 1).
- while (pins.length < 4) -> < 2 in local validationInit helpers.
- Stale [PinnedAccount; 4] comments -> [PinnedAccount; 2].

### Verification (Surfpool)
- topup-balance-swap: 5/5 (real DLMM swap CPI, 2 pins)
- topup-balance: 5/5, topup-balance-sol: 5/5
- composable: 18/18 (2 skipped), composable-fee-rebase: 9/9
- one-time-payment: 11/11, up-to-policy: 11/11
- tributary: 79/79, surfpool: 4/4, payasyougo-expiry: 3/3, scheduler-evaluator: 31/31
- sdk-composable-constructor: 11/12 (1 pre-existing failure unrelated to pins)
